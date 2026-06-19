import { calculateSleepDebt } from './physiological-engine.js';
import { calculateSleepNeed } from './training-impact-engine.js';
import * as RC from './physio-constants.js';

// ─── Recovery & Score Engine ───────────────────────────────────────────────

function clamp(value, min = 0, max = 100) {
  const n = Number(value);
  if (!isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function resolveCheckinField(checkin, fieldName) {
  const aliases = {
    energy: ['energy', 'energy_level'],
    stress: ['stress', 'stress_level'],
    muscle_soreness: ['muscle_soreness', 'muscle_soreness_level'],
    mood: ['mood', 'mood_level'],
    resting_hr: ['resting_hr', 'resting_heart_rate'],
    hydration: ['hydration', 'hydration_liters'],
  };

  const candidates = aliases[fieldName] || [fieldName];

  for (const candidate of candidates) {
    if (checkin?.[candidate] !== null && checkin?.[candidate] !== undefined) {
      return checkin[candidate];
    }
  }

  return null;
}

function resolveHrvValue(checkin) {
  if (checkin?.hrv_manual != null && Number(checkin.hrv_manual) > 0) {
    return Number(checkin.hrv_manual);
  }

  if (checkin?.hrv != null && Number(checkin.hrv) > 0) {
    return Number(checkin.hrv);
  }

  return null;
}




function normalizeDeepSleep(deepSleepPct) {
  // Profundo em BANDA, não "mais=melhor": faixa saudável de adulto ~13-22% do
  // sono. Abaixo falta sono restaurador; muito acima (>26%) costuma ser rebote
  // de privação ou erro de fase do wearable, não "melhor". Profundo não se
  // controla de propósito (é homeostático), então não cobramos máximo. Ancorado
  // nos seus dados (mediana 16%, faixa 8-25%). Teto 92 (igual duração).
  if (deepSleepPct == null) return null;
  const v = Number(deepSleepPct);
  if (!Number.isFinite(v)) return null;
  return Math.round(
    bandScore(v, {
      idealLow: 13, idealHigh: 22,
      softLow: 9, softHigh: 28,
      hardLow: 5, hardHigh: 40,
      points: 92,
    })
  );
}

function normalizeRemSleep(remSleepPct) {
  if (remSleepPct == null) return null;

  const v = Number(remSleepPct);

  if (v < 10) return 28;
  if (v < 15) return 42;
  if (v < 18) return 56;
  if (v < 22) return 68;
  if (v < 26) return 78;
  if (v < 30) return 86;

  // acima disso, não seguimos premiando muito
  return 90;
}

// Protege contra "baseline móvel": quando uma queda sustentada faz a média curta
// despencar, o app poderia passar a tratar o valor baixo como "normal" e parar de
// alertar. Comparamos a janela curta (recente) com uma longa (~30d). Se a curta
// está mais de 5% ABAIXO da longa, misturamos (70% curta + 30% longa) para o
// baseline não normalizar completamente o declínio. Em estabilidade, usa a curta.
function _driftProtectedBaseline(shortValues, longValues, lowerIsBetter = false) {
  if (!shortValues.length) return null;
  const shortAvg = shortValues.reduce((s, v) => s + v, 0) / shortValues.length;
  if (longValues.length < 10) return shortAvg; // sem histórico longo, usa a curta

  const longAvg = longValues.reduce((s, v) => s + v, 0) / longValues.length;
  const driftPct = ((shortAvg - longAvg) / longAvg) * 100;

  // "Piora" depende da métrica: para HRV, cair (drift negativo) é piora;
  // para RHR, subir (drift positivo) é piora.
  const worsening = lowerIsBetter ? driftPct > 5 : driftPct < -5;
  if (worsening) {
    return shortAvg * 0.7 + longAvg * 0.3; // segura o baseline contra a deriva
  }
  return shortAvg;
}

function getRecentHrvBaseline(recentCheckins = []) {
  const all = (recentCheckins || [])
    .map((c) => resolveHrvValue(c))
    .filter((v) => v != null && v > 0);

  const shortValues = all.slice(0, 7);   // janela curta (responsiva)
  const longValues = all.slice(0, 30);   // janela longa (estável)

  if (shortValues.length < 3) return null;
  // HRV: maior é melhor → lowerIsBetter = false
  return _driftProtectedBaseline(shortValues, longValues, false);
}

function getHrvTrend(hrvValue, hrv7dAvg) {
  if (hrvValue == null || hrv7dAvg == null || hrv7dAvg <= 0) return null;

  const pctDiff = ((Number(hrvValue) - Number(hrv7dAvg)) / Number(hrv7dAvg)) * 100;

  if (pctDiff >= 10) return 'above_avg';
  if (pctDiff <= -10) return 'below_avg';
  return 'at_avg';
}


function getRecentRhrBaseline(recentCheckins = []) {
  const all = (recentCheckins || [])
    .map((c) => resolveCheckinField(c, 'resting_hr'))
    .filter((v) => v != null && v > 0);

  const shortValues = all.slice(0, 14);  // janela curta
  const longValues = all.slice(0, 30);   // janela longa

  if (shortValues.length < 5) return null;
  // RHR: menor é melhor → lowerIsBetter = true (subir é piora)
  return _driftProtectedBaseline(shortValues, longValues, true);
}



// Pontuação por faixa: platô de crédito cheio + ombros suaves + caudas lineares.
// Substitui as escadas (degraus de 8 pts por 0,01h). Reaproveitado depois por
// profundo e REM. Teto = `points`; usamos 92 p/ alinhar ao teto dos outros
// sub-scores e NÃO inflar o sono (validado vs Zepp: fica conservador, sem placebo).
function bandScore(value, { idealLow, idealHigh, softLow, softHigh, hardLow, hardHigh, points }) {
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  const cl = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  if (v >= idealLow && v <= idealHigh) return points;                       // platô: cheio
  if (v < idealLow && v >= softLow)                                         // ombro inferior
    return points * (0.65 + 0.35 * ((v - softLow) / (idealLow - softLow)));
  if (v > idealHigh && v <= softHigh)                                       // ombro superior
    return points * (0.65 + 0.35 * ((softHigh - v) / (softHigh - idealHigh)));
  if (v < softLow)                                                          // cauda inferior
    return points * 0.65 * cl((v - hardLow) / (softLow - hardLow), 0, 1);
  return points * 0.65 * cl((hardHigh - v) / (hardHigh - softHigh), 0, 1);  // cauda superior
}

function getSleepHoursScore(hours) {
  // Faixa ASPIRACIONAL (escolha do Grégory): piso ideal em 7.5h pra o score
  // DESAFIAR a dormir mais — cada meia hora até 7.5h aparece na nota (7.0h≈81,
  // 7.5h=92). Platô até 9.0h pra NÃO punir sono de recuperação. Teto 92 (igual
  // profundo/REM). Validado em dados reais jun/2026: sem inflar (gap vs Zepp +2).
  const h = Number(hours ?? 0);
  if (!h || h <= 0) return null;
  return Math.round(
    bandScore(h, {
      idealLow: 7.5, idealHigh: 9.0,
      softLow: 6.0, softHigh: 9.5,
      hardLow: 4.5, hardHigh: 11.0,
      points: 92,
    })
  );
}
function getPreviewConfidence(checkin, recentCheckins = []) {
  const hrvValue = resolveHrvValue(checkin);
const rhrValue = resolveCheckinField(checkin, 'resting_hr');

const hasHrv = !!(hrvValue && hrvValue > 0);
const hasRhr = !!(rhrValue && rhrValue > 0);
const hasSleepHours = !!(checkin?.sleep_hours && checkin.sleep_hours > 0);
  const hasSleepScore = !!(checkin?.sleep_score != null);
  // Sinais "duros": só existem se informados HOJE (default null → presença = informado).
  const hasAwakenings = checkin?.sleep_awakenings != null;
  const hasRegularity = checkin?.sleep_regularity_pct != null;
  const hasSleepHr = checkin?.sleep_heart_rate != null;

  // Maturidade do baseline: o z-score só é confiável se "seu normal" já existe.
  // Conta noites prévias com HRV; abaixo de BL_TRUST_NIGHTS, o baseline ainda é jovem.
  const priorHrvNights = (recentCheckins || []).filter((c) => {
    const v = resolveHrvValue(c);
    return v && v > 0;
  }).length;
  const baselineMature = priorHrvNights >= RC.BL_TRUST_NIGHTS;

  // Conta só sinais duros. sleep_score/horas/profundo/REM têm default não-nulo,
  // então "estar preenchido" não prova que foram informados — ficam fora da contagem.
  const hardSignals =
    (hasHrv ? 1 : 0) +
    (hasRhr ? 1 : 0) +
    (hasAwakenings ? 1 : 0) +
    (hasRegularity ? 1 : 0) +
    (hasSleepHr ? 1 : 0);

  // "high": sinal cardíaco real (HRV ou FC) + ao menos 2 sinais duros no total.
  if ((hasHrv || hasRhr) && hardSignals >= 2 && baselineMature) {
    return 'high';
  }

  // "medium": qualquer sinal cardíaco real, ou cobertura de sono base informada.
  if (hasHrv || hasRhr || (hasSleepHours && hasSleepScore)) {
    return 'medium';
  }

  return 'low';
}

function getPreviewConfidenceReason(checkin, recentCheckins = []) {
  const confidence = getPreviewConfidence(checkin, recentCheckins);

  const hrvValue = resolveHrvValue(checkin);
  const rhrValue = resolveCheckinField(checkin, 'resting_hr');

  const hasHrv = !!(hrvValue && hrvValue > 0);
  const hasRhr = !!(rhrValue && rhrValue > 0);

  if (confidence === 'high') {
    // Cita apenas os sinais cardíacos que de fato foram informados hoje.
    if (hasHrv && hasRhr) {
      return 'HRV, FC de repouso e sono dão boa sustentação para esta leitura.';
    }
    if (hasHrv) {
      return 'HRV e sono informados dão boa sustentação para esta leitura.';
    }
    return 'FC de repouso e sono informados dão boa sustentação para esta leitura.';
  }

  if (confidence === 'medium') {
    return hasHrv || hasRhr
      ? 'A leitura já tem alguma base fisiológica, mas ainda não está completa.'
      : 'Boa leitura pelo sono, mas sem HRV ou FC de repouso ela ainda não está completa.';
  }

  return 'Faltam HRV e/ou FC de repouso. Esta leitura está mais apoiada em percepção e sono informado.';
}



// ─── Core scores ───────────────────────────────────────────────────────────

// ─── CAMADA 1: Recuperação fisiológica (portátil, sem dupla contagem) ───────
//
// Princípio (hierarquia estilo WHOOP): cada SINAL BRUTO entra UMA única vez.
// - HRV é o sinal autonômico dominante (peso maior).
// - Sono entra como UM componente agregado (calculateSleepScore), não como
//   sleep_score + horas + deep + rem soltos. Isso elimina a contagem 5x.
// - biocharge_morning (HybridCharge do Zepp) NÃO entra aqui. Ele é uma FUSÃO
//   dos mesmos sinais brutos; somá-lo junto seria contar tudo de novo, e
//   além disso prende o app ao Zepp. Fica reservado para calibração/exibição.
//
// Saída: recovery 0..100 derivável de QUALQUER relógio que exporte HRV/RHR/sono.
/**
 * Score do dia canônico (estilo WHOOP: número fisiológico).
 * Usa o recovery salvo; cai para a âncora da manhã só se recovery faltar.
 * Sempre via ?? (nunca ||) para não engolir um score 0 legítimo.
 * Esta é a ÚNICA fonte de "Score do dia" — todas as telas devem usá-la.
 */
export function getDayScore(checkin) {
  if (!checkin) return null;
  return checkin.recovery_score ?? checkin.morning_recovery_score ?? null;
}

// ─── Recovery v3 — baseline EWMA winsorizado + z relativo ao próprio ─────────
// Migra de curvas absolutas → z contra o baseline pessoal. Validado em dados
// reais (jun/2026, B-final): seu normal (z=0) → 64. Zonas recalibradas (70/42).

function _blLambda(hl) { return 1 - Math.pow(0.5, 1 / hl); }

// Avança o estado EWMA com uma noite. Fora-de-faixa/null = segura (skip-and-hold);
// outlier duro (>5σ, já semeado) é visto mas NÃO dobra o centro; Winsor clamp
// (±3σ) impede uma noite de puxar o baseline; spread = EWMA do desvio absoluto.
function _blUpdate(state, value, cfg) {
  const lb = _blLambda(cfg.halfLifeB);
  const ls = _blLambda(cfg.halfLifeS);
  if (state == null) {
    if (value != null && value >= cfg.min && value <= cfg.max) return { b: value, s: cfg.floorSpread, n: 1 };
    return { b: (cfg.min + cfg.max) / 2, s: cfg.floorSpread, n: 0 };
  }
  if (value == null || value < cfg.min || value > cfg.max) return state;
  if (state.n >= RC.BL_SEED_NIGHTS && Math.abs(value - state.b) > RC.BL_HARD_OUTLIER_K * state.s) return state;
  if (state.n === 0) return { b: value, s: cfg.floorSpread, n: 1 };
  const lo = state.b - RC.BL_WINSOR_K * state.s;
  const hi = state.b + RC.BL_WINSOR_K * state.s;
  const clamped = Math.max(lo, Math.min(hi, value));
  const nb = lb * clamped + (1 - lb) * state.b;
  const ns = Math.max(cfg.floorSpread, ls * Math.abs(value - nb) + (1 - ls) * state.s);
  return { b: nb, s: ns, n: state.n + 1 };
}

// recentCheckins vem DESCENDENTE (mais novo 1º, sem o dia atual). Inverte p/
// oldest→newest e dobra. Retorna {b, s, n} ou null.
function _blFoldDesc(valuesDesc, cfg) {
  let state = null;
  for (let i = valuesDesc.length - 1; i >= 0; i--) state = _blUpdate(state, valuesDesc[i], cfg);
  return state;
}
const _blUsable = (st) => st != null && st.n >= RC.BL_SEED_NIGHTS;
const _robustZ = (v, st) => (v - st.b) / Math.max(RC.BL_SIGMA_FROM_SPREAD * st.s, 1e-9);

// z de sono: score portável (calculateSleepScore) de HOJE contra a média/SD
// pessoal dos dias ANTERIORES (causal, sem look-ahead). Floor de SD = 5.
function _sleepZ(todayScore, recentCheckins) {
  if (todayScore == null) return null;
  const prior = (recentCheckins || []).map((c) => calculateSleepScore(c)).filter((v) => v != null);
  if (prior.length < 4) return null;
  const w = prior.slice(0, 14);
  const m = w.reduce((a, b) => a + b, 0) / w.length;
  const sd = Math.max(Math.sqrt(w.reduce((a, b) => a + (b - m) * (b - m), 0) / (w.length - 1)), 5);
  const z = (todayScore - m) / sd;
  // Cap: como o sono tem baixa variância, uma única noite ruim/ótima não pode dominar o recovery.
  return Math.max(-2.5, Math.min(2.5, z));
}

export function calculateRecoveryScore(checkin, recentCheckins = []) {
  // Baselines pessoais (excluem o dia atual; recentCheckins é descendente).
  // Janela de baseline FIXA: usa no máx. BL_WINDOW_NIGHTS dias mais recentes,
  // independentemente de quantos o chamador passar (evita score path-dependent).
  const blWindow = (recentCheckins || []).slice(0, RC.BL_WINDOW_NIGHTS);
  const hrvDesc = blWindow.map((c) => resolveHrvValue(c)).filter((v) => v != null && v > 0);
  const rhrDesc = blWindow.map((c) => resolveCheckinField(c, 'resting_hr')).filter((v) => v != null && v > 0);
  const hrvBl = _blFoldDesc(hrvDesc, RC.BL_HRV);
  const rhrBl = _blFoldDesc(rhrDesc, RC.BL_RHR);

  const hrv = resolveHrvValue(checkin);
  const rhr = resolveCheckinField(checkin, 'resting_hr');

  // Cold-start: HRV é o sinal dominante. Sem baseline de HRV utilizável → null
  // (não inventa número). Só ocorre com < 4 noites de HRV no histórico.
  if (!(_blUsable(hrvBl) && hrv != null && hrv > 0)) return null;

  const zHrv = _robustZ(hrv, hrvBl);                                   // maior = melhor
  const zRhr = (_blUsable(rhrBl) && rhr != null && rhr > 0)
    ? (rhrBl.b - rhr) / Math.max(RC.BL_SIGMA_FROM_SPREAD * rhrBl.s, 1e-9) // menor = melhor
    : null;
  const zSono = _sleepZ(calculateSleepScore(checkin), recentCheckins);

  // Composto ponderado (renormaliza se faltar termo).
  const terms = [[zHrv, RC.REC_W_HRV]];
  if (zRhr != null) terms.push([zRhr, RC.REC_W_RHR]);
  if (zSono != null) terms.push([zSono, RC.REC_W_SONO]);
  const wSum = terms.reduce((a, t) => a + t[1], 0);
  const zComposite = terms.reduce((a, t) => a + t[0] * t[1], 0) / wSum;

  // Logística ancorada: z=0 (seu normal) → 64.
  let score = clamp(Math.round(100 / (1 + Math.exp(-RC.REC_LOGISTIC_K * (zComposite - RC.REC_LOGISTIC_Z0)))));

  // Teto autonômico: sono bom NÃO resgata dia autonomicamente ruim.
  const awSum = RC.REC_W_HRV + (zRhr != null ? RC.REC_W_RHR : 0);
  const autonZ = (RC.REC_W_HRV * zHrv + (zRhr != null ? RC.REC_W_RHR * zRhr : 0)) / awSum;
  if (autonZ <= RC.REC_CAP_HARD_AUTON) score = Math.min(score, RC.REC_CAP_HARD_CEIL);
  else if (autonZ <= RC.REC_CAP_NOGREEN_AUTON) score = Math.min(score, RC.REC_CAP_NOGREEN_CEIL);

  // Override só-pra-baixo ("estou muito mal"): combinação subjetiva extrema só
  // PUXA pra baixo, nunca levanta. Inerte no seu histórico (raramente dispara).
  const energy = resolveCheckinField(checkin, 'energy');
  const stress = resolveCheckinField(checkin, 'stress');
  const soreness = resolveCheckinField(checkin, 'muscle_soreness');
  if (energy != null && energy <= 1 && ((stress != null && stress >= 4) || (soreness != null && soreness >= 4))) {
    score = Math.min(score, RC.REC_CAP_HARD_CEIL);
  }

  return score;
}

export function calculateSleepScore(checkin) {
  // SONO v2 — sinais CRUS e portáveis, SEM o score proprietário do Zepp (que
  // duplicava duração/fases — multicolinearidade — e quebrava a portabilidade;
  // o próprio Zepp diz que é "apenas referência"). Pesos pela ciência: duração
  // + regularidade + continuidade são os mais confiáveis; profundo/REM entram
  // com peso baixo (wearables erram nas fases). Renormaliza pelo peso presente.
  const hours = getSleepHoursScore(checkin.sleep_hours);
  const deep = normalizeDeepSleep(checkin.deep_sleep_pct);
  const rem = normalizeRemSleep(checkin.rem_sleep_pct);

  // Continuidade a partir dos despertares (Zepp: "saltos")
  let continuity = null;
  const aw = checkin.sleep_awakenings;
  if (aw != null && !Number.isNaN(Number(aw))) {
    const n = Number(aw);
    continuity = n <= 1 ? 92 : n === 2 ? 80 : n === 3 ? 65 : n === 4 ? 50 : 38;
  }

  // Regularidade (Sleep Regularity Index do Zepp, 0–100) — sinal forte e portável.
  let regularity = null;
  const reg = checkin.sleep_regularity_pct;
  if (reg != null && !Number.isNaN(Number(reg))) {
    regularity = clamp(Number(reg));
  }

  const weighted = [
    { value: hours, weight: 0.42 },       // duração (vs sua meta realista)
    { value: regularity, weight: 0.25 },  // regularidade — forte preditor
    { value: continuity, weight: 0.15 },  // continuidade (despertares)
    { value: deep, weight: 0.10 },        // profundo — peso baixo (pouco confiável)
    { value: rem, weight: 0.08 },         // REM — peso baixo; só conta quando salvo
  ];

  let total = 0;
  let weightSum = 0;
  for (const item of weighted) {
    if (item.value != null) {
      total += item.value * item.weight;
      weightSum += item.weight;
    }
  }
  if (weightSum <= 0) return 0;
  return clamp(Math.round(total / weightSum));
}

// "Performance do sono" exibida ao usuário usa EXATAMENTE a mesma fonte de
// verdade que alimenta o recovery (calculateSleepScore). Antes havia duas
// fórmulas divergentes: esta ignorava o sleep_score do Zepp e misturava HRV
// (que é recuperação, não sono), gerando até 12 pontos de diferença para a
// mesma noite. Um número de sono só, coerente em todas as telas.
export function calculateSleepPerformance(checkin) {
  const score = calculateSleepScore(checkin);
  // calculateSleepScore retorna 0 quando não há dados; preservamos null nesse caso
  // para a UI poder esconder a métrica em vez de mostrar "0%".
  const hasAnySleepData =
    checkin?.sleep_score != null ||
    checkin?.sleep_hours != null ||
    checkin?.deep_sleep_pct != null ||
    checkin?.rem_sleep_pct != null;

  return hasAnySleepData ? score : null;
}

export function calculateBaevskyProxy(rmssd, restingHR) {
  if (rmssd == null || restingHR == null) {
    return {
      si_proxy: null,
      autonomic_state: null,
    };
  }

  const rmssdNorm = Math.max(0, Math.min(1, (Number(rmssd) - 15) / 85));
  const rhrNorm = Math.max(0, Math.min(1, 1 - (Number(restingHR) - 40) / 50));

  const si_proxy = Math.round((1 - (rmssdNorm * 0.65 + rhrNorm * 0.35)) * 100);

  const autonomic_state =
    si_proxy < 30
      ? 'parasympathetic'
      : si_proxy < 60
      ? 'balanced'
      : 'sympathetic';

  return {
    si_proxy,
    autonomic_state,
  };
}

export function calculateFatigueScore(checkin) {
  const base = clamp(checkin.fatigue ?? 0);
  const sorenessRaw = resolveCheckinField(checkin, 'muscle_soreness') ?? 0;
  const soreness = clamp((Number(sorenessRaw) / 5) * 100);

  const stressRaw = resolveCheckinField(checkin, 'stress') ?? 0;
  const stress = clamp((Number(stressRaw) / 5) * 100);

  const score =
    base * 0.65 +
    soreness * 0.20 +
    stress * 0.15;

  return clamp(Math.round(score));
}

export function calculateStressScore(checkin) {
  const stressRaw = resolveCheckinField(checkin, 'stress') ?? 0;
  const stress = clamp((Number(stressRaw) / 5) * 100);

  const moodPenalty = clamp(((5 - Number(resolveCheckinField(checkin, 'mood') ?? 3)) / 5) * 100);
  const energyPenalty = clamp(((5 - Number(resolveCheckinField(checkin, 'energy') ?? 3)) / 5) * 100);

  const score =
    stress * 0.50 +
    moodPenalty * 0.30 +
    energyPenalty * 0.20;

  return clamp(Math.round(score));
}

export function calculateReadinessScore(checkin, recentCheckins = []) {
  // Prontidão = recuperação fisiológica (Camada 1) MODULADA pela carga
  // subjetiva (Camada 2: fadiga/soreness/stress percebidos).
  // recovery JÁ contém HRV + RHR + sono — não re-somamos esses sinais aqui,
  // senão voltaríamos a contar em dobro. A fadiga entra porque captura o que
  // o sensor não vê (dano muscular, contexto do dia).
  const recovery = calculateRecoveryScore(checkin, recentCheckins);
  const fatigue = calculateFatigueScore(checkin);

  const weighted = [
    { value: recovery, weight: 0.80 },        // base fisiológica
    { value: 100 - fatigue, weight: 0.20 },   // carga subjetiva (Camada 2)
  ];

  let total = 0;
  let weightSum = 0;

  for (const item of weighted) {
    if (item.value != null) {
      total += item.value * item.weight;
      weightSum += item.weight;
    }
  }

  if (weightSum <= 0) return 0;

  return clamp(Math.round(total / weightSum));
}

// ─── Zones / Labels ────────────────────────────────────────────────────────

export function getZone(recoveryScore) {
  const score = clamp(recoveryScore ?? 0);

  // Zonas recalibradas p/ a escala v3 (z relativo ao próprio; seu normal = 64).
  if (score >= RC.ZONE_GREEN_MIN) return 'green';   // ≥70 : acima do seu normal
  if (score >= RC.ZONE_YELLOW_MIN) return 'yellow'; // ≥42 : em torno/abaixo do normal
  return 'red';
}

export function getZoneColor(zone) {
  const colors = {
    green: 'hsl(142, 70%, 50%)',
    yellow: 'hsl(45, 93%, 58%)',
    red: 'hsl(0, 72%, 55%)',
  };
  return colors[zone] || colors.yellow;
}

export function getZoneLabel(zone) {
  const labels = {
    green: 'Recovery alto',
    yellow: 'Recovery moderado',
    red: 'Recovery baixo',
  };
  return labels[zone] || 'Indefinido';
}

export function getRecommendation(zone, preWorkout) {
  const pre = clamp(preWorkout ?? 0);

  if (zone === 'green' && pre >= 60) {
    return 'Hoje existe margem para um treino mais forte, se o aquecimento confirmar.';
  }

  if (zone === 'green') {
    return 'Boa janela para um treino produtivo, sem precisar exagerar.';
  }

  if (zone === 'yellow' && pre >= 50) {
    return 'Treino moderado é a melhor dose hoje.';
  }

  if (zone === 'yellow') {
    return 'Hoje vale sustentar consistência com controle.';
  }

  return 'Hoje faz mais sentido recuperar ou manter movimento leve.';
}

// ─── Old compatibility exports ─────────────────────────────────────────────

export function getDeltaPre(morning, preWorkout) {
  if (morning == null || preWorkout == null) return null;
  return Number(morning) - Number(preWorkout);
}

export function getDeltaPost(preWorkout, postWorkout) {
  if (preWorkout == null || postWorkout == null) return null;
  return Number(preWorkout) - Number(postWorkout);
}

export function getAlert(recoveryScore, deltaPre, fatigue) {
  const recovery = clamp(recoveryScore ?? 0);
  const fat = clamp(fatigue ?? 0);

  if (recovery >= 80 && (deltaPre == null || deltaPre < 30)) return 'high_performance';
  if (recovery < 65 || (deltaPre != null && deltaPre > 40) || fat > 50) return 'attention';
  return 'normal';
}

export function getTrainingLoad(recoveryScore, deltaPost) {
  const recovery = clamp(recoveryScore ?? 0);

  if (recovery >= 80 && (deltaPost == null || deltaPost < 20)) {
    return 'Treino eficiente para seu estado atual';
  }

  if (recovery >= 70) {
    return 'Boa carga com recuperação ainda sustentável';
  }

  if (deltaPost != null && deltaPost > 30) {
    return 'Carga relativamente pesada — vale monitorar a recuperação';
  }

  return 'Hoje o desgaste foi alto para sua margem atual';
}

// ─── Daily signal normalization ─────────────────────────────────────────────

/**
 * Limiar pessoal de "recovery alto" = ~p80 do seu próprio recovery recente.
 * Autorregulação (Altini/Ibrahim): "forte" libera nos seus ~20% melhores dias,
 * não num corte absoluto não validado pro indivíduo. Exige baseline mínimo
 * (14 dias); senão cai num absoluto moderado. Clampa para faixa segura.
 */
export function getPersonalHighRecovery(recentCheckins = []) {
  const vals = (recentCheckins || [])
    .map((c) => Number(c?.recovery_score))
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  if (vals.length < 14) return 74;
  const idx = Math.min(vals.length - 1, Math.max(0, Math.ceil(vals.length * 0.8) - 1));
  return Math.round(Math.max(70, Math.min(78, vals[idx]))); // escala v3: p80 adaptativo, teto verde-forte
}

function getDailyMasterSignal(checkinLike, recoveryHighThreshold = 74) {
  const recovery = clamp(checkinLike?.recovery_score ?? 0);
  const readiness = clamp(checkinLike?.readiness_score ?? recovery);
  const fatigue = clamp(checkinLike?.fatigue_score ?? checkinLike?.fatigue ?? 0);
  const sleep = clamp(checkinLike?.sleep_quality ?? checkinLike?.sleep_score ?? 0);
  const deepSleep = Number(checkinLike?.deep_sleep_pct ?? 0);
  const soreness = Number(resolveCheckinField(checkinLike, 'muscle_soreness') ?? 0);
  const restDay = !!checkinLike?.rest_day;
  const confidence = checkinLike?.preview_confidence ?? 'low';

  const hrvValue = resolveHrvValue(checkinLike);
  const rhrValue = resolveCheckinField(checkinLike, 'resting_hr');

  const hasHrv = !!(hrvValue && hrvValue > 0);
  const hasRhr = !!(rhrValue && rhrValue > 0);
  const strongPhysiology = hasHrv || hasRhr;

  if (restDay) return 'recover';

  if (
    recovery < 42 ||
    readiness < 42 ||
    fatigue >= 72 ||
    soreness >= 4 ||
    (deepSleep > 0 && deepSleep < 8)
  ) {
    return 'recover';
  }

  // "Treino forte" libera quando o recovery está na SUA faixa-alta pessoal (p80),
  // com fisiologia real e leitura confiável. Dias genuinamente ruins já foram
  // barrados pelo bloco de red-flags acima — não exigimos "dia perfeito".
  if (
    recovery >= recoveryHighThreshold &&
    readiness >= recoveryHighThreshold &&
    strongPhysiology &&
    confidence !== 'low'
  ) {
    return 'train_high';
  }

  if (recovery >= 55 && readiness >= 52) {
    return 'train_moderate';
  }

  if (recovery >= 42) {
    return 'train_light';
  }

  return 'recover';
}

function getRecentTextValues(recentCheckins = [], fieldName, limit = 3) {
  return (recentCheckins || [])
    .slice(0, limit)
    .map((c) => c?.[fieldName])
    .filter((v) => typeof v === 'string' && v.trim().length > 0);
}

function buildNarrativeContext(checkinLike) {
  const deepSleep = Number(checkinLike?.deep_sleep_pct ?? 0);
  const remSleep = Number(checkinLike?.rem_sleep_pct ?? 0);
  const soreness = Number(resolveCheckinField(checkinLike, 'muscle_soreness') ?? 0);
  const stress = Number(resolveCheckinField(checkinLike, 'stress') ?? 0);
  const sleepNeed = Number(checkinLike?.sleep_need_tonight ?? 0);
  const fatigue = clamp(checkinLike?.fatigue_score ?? checkinLike?.fatigue ?? 0);
  const readiness = clamp(checkinLike?.readiness_score ?? checkinLike?.recovery_score ?? 0);
  const sleepPerf = checkinLike?.sleep_performance_pct ?? null;
  const hrvTrend = checkinLike?.hrv_trend ?? null;
  const confidence = checkinLike?.preview_confidence ?? 'low';

  return {
    deepSleepLow: deepSleep > 0 && deepSleep < 18,
    remSleepLow: remSleep > 0 && remSleep < 18,
    sorenessHigh: soreness >= 3,
    stressHigh: stress >= 4,
    sleepNeedHigh: sleepNeed >= 8,
    fatigueHigh: fatigue >= 65,
    fatigueLow: fatigue > 0 && fatigue <= 25,
    readinessHigh: readiness >= 82,
    readinessMid: readiness >= 65,
    sleepPerfHigh: sleepPerf != null && sleepPerf >= 85,
    sleepPerfLow: sleepPerf != null && sleepPerf < 70,
    hrvHigh: hrvTrend === 'above_avg',
    hrvLow: hrvTrend === 'below_avg',
    confidence,
    restDay: !!checkinLike?.rest_day,
  };
}

function makeNarrativeSeed(checkinLike, salt = 0) {
  const dateStr = String(checkinLike?.date || '');
  let _djb2Hash = 5381;
  for (let _i = 0; _i < dateStr.length; _i++) {
    _djb2Hash = ((_djb2Hash << 5) + _djb2Hash) ^ dateStr.charCodeAt(_i);
    _djb2Hash = _djb2Hash >>> 0;
  }
  const dateSeed = _djb2Hash;

  const readiness = Math.round(Number(checkinLike?.readiness_score ?? 0));
  const recovery = Math.round(Number(checkinLike?.recovery_score ?? 0));
  const sleep = Math.round(Number(checkinLike?.sleep_score ?? 0));
  const fatigue = Math.round(Number(checkinLike?.fatigue_score ?? checkinLike?.fatigue ?? 0));

  return dateSeed + readiness + recovery + sleep + fatigue + salt;
}

function pickNarrativeVariant(options, avoidValues = [], seed = 0) {
  if (!options || options.length === 0) return null;
  if (options.length === 1) return options[0];

  const normalizedSeed = Math.abs(seed) % options.length;
  const avoidSet = new Set((avoidValues || []).map((v) => String(v).trim()));

  // tenta primeiro a escolha determinística
  const preferred = options[normalizedSeed];
  if (!avoidSet.has(preferred)) return preferred;

  // se bateu num texto repetido, busca o próximo diferente
  for (let offset = 1; offset < options.length; offset++) {
    const candidate = options[(normalizedSeed + offset) % options.length];
    if (!avoidSet.has(candidate)) return candidate;
  }

  // fallback: aceita a escolha determinística se todas já apareceram
  return preferred;
}

function buildHeadline(masterSignal, checkinLike, recentCheckins = []) {
  const ctx = buildNarrativeContext(checkinLike);
  const recentHeadlines = getRecentTextValues(recentCheckins, 'headline_today', 3);

  let options = [];

  if (masterSignal === 'train_high') {
    options = [
      'Boa janela para intensidade hoje',
      'Seu corpo acordou com margem hoje',
      'Hoje existe espaço para acelerar',
      ctx.hrvHigh ? 'RMSSD favorece intensidade hoje' : null,
      ctx.sleepPerfHigh ? 'Seu sono abriu margem hoje' : null,
    ].filter(Boolean);
  } else if (masterSignal === 'train_moderate') {
    if (ctx.deepSleepLow || ctx.hrvLow || ctx.sleepPerfLow) {
      options = [
        'Moderado protege sua margem hoje',
        'Seu corpo pede controle na dose hoje',
        'Hoje vale sustentar sem exagerar',
        'Recuperação parcial pede moderação',
      ];
    } else {
      options = [
        'Moderado é a melhor dose hoje',
        'Hoje o ganho está na consistência',
        'Treino controlado rende mais hoje',
        'Dose certa hoje: moderado',
      ];
    }
  } else if (masterSignal === 'train_light') {
    options = [
      'Hoje vale manter leve',
      'Movimento leve faz mais sentido hoje',
      'Seu corpo pede leveza hoje',
      ctx.sorenessHigh ? 'Leve para absorver melhor hoje' : null,
    ].filter(Boolean);
  } else {
    options = [
      'Seu corpo pede recuperação hoje',
      'Hoje recuperar vale mais do que insistir',
      'Recuperação gera mais retorno hoje',
      ctx.sleepNeedHigh ? 'Sono e calma rendem mais hoje' : null,
    ].filter(Boolean);
  }

  return pickNarrativeVariant(
    options,
    recentHeadlines,
    makeNarrativeSeed(checkinLike, 11)
  );
}

function buildRecommendation(masterSignal, checkinLike, recentCheckins = []) {
  const ctx = buildNarrativeContext(checkinLike);
  const recentRecommendations = getRecentTextValues(recentCheckins, 'recommendation', 3);

  let options = [];

  if (masterSignal === 'train_high') {
    options = [
      'Seu corpo acordou com boa margem. Se o aquecimento confirmar, hoje é um bom dia para um estímulo mais forte.',
      'Os sinais da manhã sugerem boa capacidade de absorver carga. Se o corpo responder bem no aquecimento, hoje há espaço para intensidade.',
      'Hoje o contexto favorece um treino mais forte, desde que a execução continue controlada e técnica.',
      ctx.hrvHigh ? 'Seu RMSSD está favorecendo prontidão. Se o aquecimento encaixar, intensidade pode fazer sentido hoje.' : null,
    ].filter(Boolean);
  } else if (masterSignal === 'train_moderate') {
    if (ctx.deepSleepLow || ctx.hrvLow || ctx.sleepPerfLow) {
      options = [
        'Seu corpo está funcional, mas o sono ou os sinais fisiológicos reduzem a margem de intensidade. Moderado é a melhor dose hoje.',
        'Hoje existe espaço para treinar, mas a recuperação não está larga o suficiente para exagero. Moderado tende a render melhor.',
        'A leitura do dia favorece consistência com controle. Vale manter o treino sob medida, sem transformar moderado em forte.',
      ];
    } else {
      options = [
        'Hoje o ganho está em consistência, não em exagero. Um treino moderado tende a render mais do que forçar.',
        'Seu sistema está estável para sustentar um treino moderado. A melhor resposta hoje vem de controle, não de excesso.',
        'Você tem margem para treinar bem hoje, mas o melhor custo-benefício ainda está numa dose moderada.',
      ];
    }
  } else if (masterSignal === 'train_light') {
    options = [
      'Hoje vale usar movimento leve como manutenção, sem exigir demais do sistema.',
      'A melhor escolha de hoje é manter o corpo ativo com leveza, priorizando absorção e não intensidade.',
      'Há espaço para se mover, mas o retorno maior hoje está em preservar margem para amanhã.',
      ctx.sorenessHigh ? 'Há espaço para movimento, mas a dor muscular sugere manter a sessão curta e leve.' : null,
    ].filter(Boolean);
  } else {
    options = [
      'Hoje faz mais sentido priorizar descanso ou recuperação ativa do que buscar intensidade.',
      'Seu corpo tende a responder melhor a recuperação do que a mais carga hoje.',
      'A melhor decisão hoje é proteger o sistema: recuperar gera mais retorno do que insistir em treino.',
      ctx.sleepNeedHigh ? 'O sono desta noite pode ter mais impacto do que qualquer treino hoje. Vale priorizar recuperação.' : null,
      ctx.stressHigh ? 'O stress atual reduz a margem útil do dia. Recuperação e redução de carga fazem mais sentido agora.' : null,
    ].filter(Boolean);
  }

  return pickNarrativeVariant(
    options,
    recentRecommendations,
    makeNarrativeSeed(checkinLike, 29)
  );
}


function buildTrainingLoadLabel(masterSignal) {
  if (masterSignal === 'train_high') return 'Boa carga / recuperação sustentável';
  if (masterSignal === 'train_moderate') return 'Carga moderada / controlada';
  if (masterSignal === 'train_light') return 'Carga leve / manutenção';
  return 'Descanso / recuperação ativa';
}

export function normalizeDailySignals(checkinLike, recentCheckins = []) {
  const recoveryHighThreshold = getPersonalHighRecovery(recentCheckins);
  const masterSignal = getDailyMasterSignal(checkinLike, recoveryHighThreshold);

  const zone =
    masterSignal === 'train_high' ? 'green' :
    masterSignal === 'train_moderate' ? 'yellow' :
    masterSignal === 'train_light' ? 'yellow' :
    'red';

  return {
    ...checkinLike,
    decision_mode: masterSignal,
    recovery_high_threshold: recoveryHighThreshold,
    zone,
    headline_today: buildHeadline(masterSignal, checkinLike, recentCheckins),
    recommendation: buildRecommendation(masterSignal, checkinLike, recentCheckins),
    training_load: buildTrainingLoadLabel(masterSignal),
  };
}


// ─── Delayed Fatigue Alert ─────────────────────────────────────────────────

export function calcDelayedFatigueAlert(checkin, recentCheckins, recentSessions) {
  if (!recentCheckins || recentCheckins.length < 2) return null;

  const recoveryToday = checkin.recovery_score ?? calculateRecoveryScore(checkin);
  const sorted = [...recentCheckins].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const twoDaysAgo = sorted[1];
  if (!twoDaysAgo) return null;

  const recoveryTwoDaysAgo = twoDaysAgo.recovery_score ?? calculateRecoveryScore(twoDaysAgo);
  if (recoveryToday >= recoveryTwoDaysAgo - 15) return null;

  const soreness = resolveCheckinField(checkin, 'muscle_soreness') ?? 0;
  if (soreness < 3) return null;

  if (!recentSessions || recentSessions.length === 0) return null;
  const todayDate = checkin.date;

  const sessionsNotToday = [...recentSessions]
    .filter((s) => s.date !== todayDate)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const lastSession = sessionsNotToday[0];
  if (!lastSession) return null;

  const daysDiff = Math.round(
    (new Date(todayDate + 'T12:00:00') - new Date(lastSession.date + 'T12:00:00')) /
      (1000 * 60 * 60 * 24)
  );

  if (daysDiff < 1 || daysDiff > 2) return null;

  return `Fadiga retardada detectada — seu corpo ainda parece estar absorvendo o treino de ${daysDiff} ${daysDiff === 1 ? 'dia' : 'dias'} atrás.`;
}

// ─── Sleep Need & Forecast ────────────────────────────────────────────────

export function calcSleepNeedTonight(recoveryScore, strainAccumulated, recentCheckins) {
  // Fonte única: delega para calculateSleepNeed (personalizada + científica).
  return calculateSleepNeed(strainAccumulated, recoveryScore, recentCheckins);
}

export function calcNextDayForecast(checkinLike, recentCheckins = []) {
  const recovery = clamp(checkinLike?.recovery_score ?? 0);
  const sleepNeedTonight = Number(checkinLike?.sleep_need_tonight ?? 0);
  const recentForecasts = getRecentTextValues(recentCheckins, 'next_day_forecast', 3);
  const ctx = buildNarrativeContext(checkinLike);

  let options = [];

  if (checkinLike?.rest_day) {
    options = [
      `Se você realmente recuperar bem hoje, amanhã a leitura pode abrir mais margem. Meta prática de sono: ${sleepNeedTonight}h.`,
      `Hoje é um dia em que o descanso pode influenciar bastante a leitura de amanhã. Tente chegar perto de ${sleepNeedTonight}h de sono.`,
      `Amanhã tende a responder ao quanto você conseguir reduzir carga e proteger o sono hoje. Meta sugerida: ${sleepNeedTonight}h.`,
    ];
  } else if (recovery >= 78 && sleepNeedTonight > 0 && sleepNeedTonight <= 7.5) {
    options = [
      `Se você dormir bem hoje, a tendência para amanhã é manter uma boa recuperação. Meta de sono: ${sleepNeedTonight}h.`,
      `O cenário de hoje sugere boa chance de sustentar uma leitura positiva amanhã, desde que o sono acompanhe. Meta: ${sleepNeedTonight}h.`,
      `Se a execução de hoje terminar bem e o sono vier forte, amanhã você tem boa chance de seguir com margem. Meta prática: ${sleepNeedTonight}h.`,
    ];

    if (ctx.hrvHigh) {
      options.push(
        `Seu contexto fisiológico está favorável hoje. Se o sono desta noite fechar bem, amanhã pode continuar positivo. Meta: ${sleepNeedTonight}h.`
      );
    }
  } else if (recovery < 60 || sleepNeedTonight > 8 || ctx.deepSleepLow || ctx.sleepPerfLow) {
    options = [
      `Hoje à noite, o sono será decisivo. Se você chegar perto de ${sleepNeedTonight}h, a chance de recuperar melhor amanhã aumenta.`,
      `A leitura de amanhã depende bastante de como você fechar o dia de hoje. Tentar chegar em ${sleepNeedTonight}h pode fazer diferença.`,
      `Seu corpo ainda não mostra uma margem larga. O sono desta noite pode ser o principal fator para melhorar amanhã. Meta: ${sleepNeedTonight}h.`,
    ];

    if (ctx.hrvLow) {
      options.push(
        `Os sinais fisiológicos ainda pedem atenção. Uma noite melhor hoje pode ser importante para mudar a direção da leitura de amanhã. Meta: ${sleepNeedTonight}h.`
      );
    }
  } else if (ctx.stressHigh || ctx.fatigueHigh) {
    options = [
      `Amanhã tende a depender menos do treino em si e mais de como você absorver o estresse de hoje. Meta de sono: ${sleepNeedTonight}h.`,
      `Se você reduzir a carga total do dia e proteger o sono, a leitura de amanhã pode responder melhor. Meta prática: ${sleepNeedTonight}h.`,
      `Hoje o contexto ainda exige recuperação suficiente para sustentar amanhã. Sono e redução de estresse devem ajudar. Meta: ${sleepNeedTonight}h.`,
    ];
  } else {
    options = [
      `Amanhã vai depender bastante da qualidade do sono desta noite. Meta prática: ${sleepNeedTonight}h.`,
      `A resposta de amanhã ainda está em aberto e depende de como você fechar o dia de hoje. Meta de sono: ${sleepNeedTonight}h.`,
      `Seu próximo dia deve responder principalmente ao sono desta noite e à carga total de hoje. Meta sugerida: ${sleepNeedTonight}h.`,
    ];
  }

  return pickNarrativeVariant(
    options,
    recentForecasts,
    makeNarrativeSeed(checkinLike, 47)
  );
}

// ─── AI helpers ────────────────────────────────────────────────────────────

export async function generateTrainingReasonAI(checkin, scores, recentCheckins, acwr) {
  const { base44 } = await import('@/api/base44Client');

  const hrvValues = (recentCheckins || []).slice(0, 7).map((c) => resolveHrvValue(c)).filter(Boolean);
  const hrvAvg =
    hrvValues.length > 0
      ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length)
      : null;

const hrvToday = resolveHrvValue(checkin);
  const hrvDeltaPct =
    hrvToday && hrvAvg
      ? Math.round(((hrvToday - hrvAvg) / hrvAvg) * 100)
      : null;

  const sleepDebt = calculateSleepDebt(recentCheckins)?.debt ?? 0;

  const prompt = `Você é um coach de performance. Gere UMA frase curta (máx 2 linhas) explicando por que a recomendação de treino de hoje faz sentido. Em português brasileiro. Tom direto e pessoal. Não use título, bullet ou aspas. Evite contradições entre recuperação e treino.

Dados do dia:
- Recovery: ${scores?.recovery_score ?? checkin.biocharge_morning ?? '—'}
- Readiness: ${scores?.readiness_score ?? '—'}
- RMSSD delta vs semana: ${hrvDeltaPct != null ? `${hrvDeltaPct >= 0 ? '+' : ''}${hrvDeltaPct}%` : '—'}
- ACWR: ${acwr != null ? acwr.toFixed(2) : '—'}
- Dívida de sono (7 dias): ${sleepDebt.toFixed(1)}h
- Estado fisiológico: ${checkin.current_body_state ?? scores?.current_body_state ?? '—'}
- Dor muscular: ${resolveCheckinField(checkin, 'muscle_soreness') ?? '—'}/5

Exemplos de tom:
- "Seu sono está limitando sua margem, então moderado é a melhor dose hoje."
- "Seu corpo acordou bem e a carga recente está controlada — há espaço para um treino mais forte."
- "A recuperação de hoje não sustenta intensidade. Vale proteger para render melhor amanhã."

Frase:`;

  const result = await base44.integrations.Core.InvokeLLM({ prompt });
  if (typeof result !== 'string') return null;
  return result.trim().replace(/^["']|["']$/g, '');
}

export async function generateContextualBulletsAI(checkin, scores, recentCheckins, recentSessions, acwr) {
  const { base44 } = await import('@/api/base44Client');

  const hrvValues = (recentCheckins || []).slice(0, 7).map((c) => resolveHrvValue(c)).filter(Boolean);
  const hrvAvg =
    hrvValues.length > 0
      ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length)
      : null;

const hrvToday = resolveHrvValue(checkin);
  const hrvDeltaPct =
    hrvToday && hrvAvg
      ? Math.round(((hrvToday - hrvAvg) / hrvAvg) * 100)
      : null;

  const sleepDebt = calculateSleepDebt(recentCheckins)?.debt ?? 0;

  const lastSession =
    (recentSessions || [])
      .filter((s) => s.date !== checkin.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;

  const decisaoHoje = scores?.decision_mode ?? checkin.decision_mode ?? null;
  const recomendacaoHoje = scores?.recommendation ?? checkin.recommendation ?? null;
  const notaUsuario = (checkin?.notes && String(checkin.notes).trim())
    ? String(checkin.notes).trim().slice(0, 200)
    : null;

  const prompt = `Você é um coach de performance. Gere EXATAMENTE 2 bullets curtos para o dia de hoje. Em português brasileiro. Cada bullet deve:
- começar com emoji
- ser direto
- usar os dados reais quando relevante
- OBRIGATÓRIO: ser 100% consistente com a decisão do dia abaixo
- ajudar o atleta a executar melhor o dia
- se houver "Anotação do usuário" abaixo e ela explicar algum dado (ex: "dormi tarde" → sono baixo), transforme isso numa ação concreta (ex: "deite 30min mais cedo hoje"), sem nunca contrariar a decisão do dia

DECISÃO DO DIA (não contrarie isto): ${decisaoHoje ?? 'não definida'}
RECOMENDAÇÃO ATUAL: ${recomendacaoHoje ?? 'não definida'}

Dados:
- Recovery: ${scores?.recovery_score ?? checkin.biocharge_morning ?? '—'}
- Readiness: ${scores?.readiness_score ?? '—'}
- RMSSD delta vs semana: ${hrvDeltaPct != null ? `${hrvDeltaPct >= 0 ? '+' : ''}${hrvDeltaPct}%` : 'sem dados'}
- ACWR: ${acwr != null ? acwr.toFixed(2) : 'sem dados'}
- Dívida de sono (7 dias): ${sleepDebt.toFixed(1)}h
- Dor muscular: ${resolveCheckinField(checkin, 'muscle_soreness') ?? '—'}/5
- Stress: ${resolveCheckinField(checkin, 'stress') ?? '—'}/5
- Estado fisiológico: ${checkin.current_body_state ?? scores?.current_body_state ?? '—'}
- Último treino: ${lastSession ? `${lastSession.sport} (${lastSession.intensity}) em ${lastSession.date}` : 'sem dados'}
- Anotação do usuário (contexto que os números não capturam): ${notaUsuario ?? 'nenhuma'}

Responda apenas com os 2 bullets, um por linha.`;

  const result = await base44.integrations.Core.InvokeLLM({ prompt });
  if (typeof result !== 'string') return null;

  const lines = result
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 10);

  return lines.slice(0, 2);
}

export async function generateHeadlineTodayAI(checkin, scores, recentCheckins) {
  const { base44 } = await import('@/api/base44Client');

  const sortedRecent = [...(recentCheckins || [])].sort((a, b) =>
    String(b.date).localeCompare(String(a.date))
  );

  let lowDeepSleepNights = 0;
  for (const c of [checkin, ...sortedRecent]) {
    if (c.deep_sleep_pct != null && c.deep_sleep_pct < 18) lowDeepSleepNights++;
    else break;
  }

  const hrvValues = (recentCheckins || []).slice(0, 7).map((c) => resolveHrvValue(c)).filter(Boolean);
  const hrvAvg =
    hrvValues.length > 0
      ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length)
      : null;

const hrvToday = resolveHrvValue(checkin);
  const hrvStatus =
    hrvToday && hrvAvg
      ? hrvToday > hrvAvg + 5
        ? 'alto'
        : hrvToday < hrvAvg - 5
        ? 'baixo'
        : 'normal'
      : null;

  const prompt = `Você é um coach de alta performance. Gere um headline curto para a tela de hoje. Máximo 12 palavras. Em português brasileiro. Sem aspas. Sem ponto final. O headline deve refletir a decisão principal do dia, sem exagerar.

Dados:
- Prontidão: ${scores?.readiness_score ?? checkin.biocharge_morning ?? '—'}
- Recovery: ${scores?.recovery_score ?? '—'}
- Zone: ${scores?.zone ?? checkin.zone ?? '—'}
- HRV (RMSSD): ${hrvToday ?? '—'} ms${hrvStatus ? ` (${hrvStatus})` : ''}
- Sono profundo: ${checkin.deep_sleep_pct ?? '—'}%${lowDeepSleepNights >= 2 ? ` (${lowDeepSleepNights} noites consecutivas baixas)` : ''}
- Horas de sono: ${checkin.sleep_hours ?? '—'}h
- Fadiga: ${checkin.fatigue ?? '—'}
- Estado fisiológico: ${checkin.current_body_state ?? scores?.current_body_state ?? '—'}
- Alerta fadiga retardada: ${scores?.delayed_fatigue_alert ?? 'nenhum'}
- Dia de descanso: ${checkin.rest_day ? 'sim' : 'não'}

Exemplos de tom:
- "Moderado é a melhor dose hoje"
- "Hoje vale recuperar bem"
- "Boa janela para intensidade"
- "Sono limitando sua margem hoje"

Headline:`;

  const result = await base44.integrations.Core.InvokeLLM({ prompt });
  if (typeof result !== 'string') return null;

  const words = result
    .trim()
    .replace(/^["']|["']$/g, '')
    .split(/\s+/);

  return words.slice(0, 15).join(' ');
}

export async function generateNextDayForecastAI(checkin, scores, recentCheckins) {
  const { base44 } = await import('@/api/base44Client');

  const hrvValues = (recentCheckins || []).slice(0, 7).map((c) => resolveHrvValue(c)).filter(Boolean);
  const hrvAvg =
    hrvValues.length > 0
      ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length)
      : null;

const hrvToday = resolveHrvValue(checkin);
  const hrvDelta =
    hrvToday && hrvAvg
      ? hrvToday - hrvAvg
      : null;

  const deepSleepLow = (recentCheckins || []).slice(0, 3).filter((c) => (c.deep_sleep_pct || 0) < 15).length;

  const prompt = `Você é um coach de performance esportiva. Escreva uma projeção curta para amanhã em 2–3 frases. Em português brasileiro. Seja cauteloso: trate como tendência, não como garantia. Deixe claro que depende do sono desta noite.

Dados do check-in de hoje:
- BioCharge manhã: ${checkin.biocharge_morning ?? '—'}
- HRV (RMSSD): ${hrvToday ?? '—'} ms${hrvDelta != null ? ` (${hrvDelta >= 0 ? '+' : ''}${hrvDelta}ms vs média da semana)` : ''}
- Horas de sono: ${checkin.sleep_hours ?? '—'}h
- Sono profundo: ${checkin.deep_sleep_pct ?? '—'}%${deepSleepLow >= 3 ? ' (3ª noite baixa seguida)' : ''}
- Fadiga: ${checkin.fatigue ?? '—'}
- Dor muscular: ${resolveCheckinField(checkin, 'muscle_soreness') ?? '—'}/5
- Estresse: ${resolveCheckinField(checkin, 'stress') ?? '—'}/5
- Energia: ${resolveCheckinField(checkin, 'energy') ?? '—'}/5
- Estado fisiológico: ${checkin.current_body_state ?? scores?.current_body_state ?? '—'}
- Strain acumulado hoje: ${checkin.daily_strain_accumulated ?? '—'}
- Recovery score calculado: ${scores?.recovery_score ?? '—'}
- Sono necessário esta noite: ${scores?.sleep_need_tonight ?? '—'}h

Responda apenas com a projeção, sem título, sem bullet points.`;

  const result = await base44.integrations.Core.InvokeLLM({ prompt });
  return typeof result === 'string' ? result.trim() : null;
}

// ─── Main compute ──────────────────────────────────────────────────────────

export function computeCheckinScores(checkin, recentCheckins = [], recentSessions = []) {
  const canonicalCheckin = {
    ...checkin,
    energy: resolveCheckinField(checkin, 'energy'),
    stress: resolveCheckinField(checkin, 'stress'),
    muscle_soreness: resolveCheckinField(checkin, 'muscle_soreness'),
    mood: resolveCheckinField(checkin, 'mood'),
    resting_hr: resolveCheckinField(checkin, 'resting_hr'),
    hydration: resolveCheckinField(checkin, 'hydration'),
    hrv: resolveHrvValue(checkin),
  };

const recoveryScore = calculateRecoveryScore(canonicalCheckin, recentCheckins);
  const sleepScore = calculateSleepScore(canonicalCheckin);
  const sleepPerformance = calculateSleepPerformance(canonicalCheckin);
  const fatigueScore = calculateFatigueScore(canonicalCheckin);
  const stressScore = calculateStressScore(canonicalCheckin);
  const readinessScore = calculateReadinessScore(canonicalCheckin, recentCheckins);
  const effectiveHrv = resolveHrvValue(canonicalCheckin);
const hrv7dAvg = getRecentHrvBaseline(recentCheckins);
const hrvTrend = getHrvTrend(effectiveHrv, hrv7dAvg);
const baevsky = calculateBaevskyProxy(
  effectiveHrv,
  canonicalCheckin.resting_hr
);

  const deltaPre = getDeltaPre(canonicalCheckin.biocharge_morning, canonicalCheckin.biocharge_pre_workout);
  const deltaPost = getDeltaPost(canonicalCheckin.biocharge_pre_workout, canonicalCheckin.biocharge_post_workout);

  const alert = getAlert(recoveryScore, deltaPre, canonicalCheckin.fatigue || 0);
  const baseRecommendation = getRecommendation(getZone(recoveryScore), canonicalCheckin.biocharge_pre_workout || 0);

  const strainAccumulated = canonicalCheckin.daily_strain_accumulated ?? 0;
  const sleepNeedTonight = calcSleepNeedTonight(recoveryScore, strainAccumulated, recentCheckins);
  const previewConfidence = getPreviewConfidence(canonicalCheckin, recentCheckins);
  const previewConfidenceReason = getPreviewConfidenceReason(canonicalCheckin, recentCheckins);

  const forecastInput = {
    ...canonicalCheckin,
    recovery_score: recoveryScore,
    readiness_score: readinessScore,
    sleep_performance_pct: sleepPerformance,
    fatigue_score: fatigueScore,
    stress_score: stressScore,
    sleep_need_tonight: sleepNeedTonight,
    hrv_trend: hrvTrend,
    preview_confidence: previewConfidence,
  };

  const nextDayForecast =
    canonicalCheckin.next_day_forecast ??
    calcNextDayForecast(forecastInput, recentCheckins);

  const delayedFatigueAlert = calcDelayedFatigueAlert(
    canonicalCheckin,
    recentCheckins,
    recentSessions
  );


  const normalizedInput = {
    ...canonicalCheckin,
    recovery_score: recoveryScore,
    sleep_quality: sleepScore,
    sleep_performance_pct: sleepPerformance,
    fatigue_score: fatigueScore,
    stress_score: stressScore,
    readiness_score: readinessScore,
    hrv_7d_avg: hrv7dAvg != null ? Math.round(hrv7dAvg) : null,
    hrv_trend: hrvTrend,
    baevsky_si: baevsky.si_proxy,
    autonomic_state: baevsky.autonomic_state,
    preview_confidence: previewConfidence,
    preview_confidence_reason: previewConfidenceReason,
    delta_pre: deltaPre,
    delta_post: deltaPost,
    alert,
    recommendation: canonicalCheckin.recommendation || baseRecommendation,
    sleep_need_tonight: canonicalCheckin.sleep_need_tonight ?? sleepNeedTonight,
    next_day_forecast: canonicalCheckin.next_day_forecast ?? nextDayForecast,
    delayed_fatigue_alert: canonicalCheckin.delayed_fatigue_alert ?? delayedFatigueAlert,
  };

  const normalized = normalizeDailySignals(normalizedInput, recentCheckins);

  return normalized;
}

// ─── Smart insights ────────────────────────────────────────────────────────

export function getSmartMessage(checkin, recentCheckins) {

  const messages = [];

  if (recentCheckins && recentCheckins.length >= 4) {
    const hrvValues = recentCheckins.slice(0, 4).map((c) => resolveHrvValue(c)).filter(Boolean);
    if (hrvValues.length >= 3) {
      const trend = hrvValues[0] - hrvValues[hrvValues.length - 1];
      if (trend < -10) {
        messages.push(`Seu RMSSD caiu ${Math.abs(Math.round(trend))}ms nos últimos dias — sinal de estresse acumulado.`);
      }
    }

    const intenseDays = recentCheckins.slice(0, 4).filter((c) => c.rpe >= 7).length;
    if (intenseDays >= 3) {
      messages.push(`${intenseDays} dias seguidos de carga alta detectados. Vale considerar recuperação ativa.`);
    }
  }

  if (recentCheckins && recentCheckins.length >= 7) {
    const goodSleepDays = recentCheckins.filter((c) => (c.sleep_hours || 0) >= 7.5);
    if (goodSleepDays.length >= 3) {
      const avgRecoveryGoodSleep =
        goodSleepDays.reduce((s, c) => s + (c.recovery_score || 0), 0) / goodSleepDays.length;
      const avgRecoveryAll =
        recentCheckins.reduce((s, c) => s + (c.recovery_score || 0), 0) / recentCheckins.length;

      if (avgRecoveryGoodSleep > avgRecoveryAll + 5) {
        messages.push(`Dias com mais sono melhoram sua recuperação em cerca de ${Math.round(avgRecoveryGoodSleep - avgRecoveryAll)} pontos.`);
      }
    }
  }

  if (checkin.zone === 'green') messages.push('Seu corpo mostra boa margem hoje.');
  if (checkin.zone === 'red') messages.push('Hoje sua margem está baixa e vale priorizar recuperação.');
  if ((checkin.fatigue || 0) > 60) messages.push('A fadiga acumulada está alta — sono e hidratação ficam ainda mais importantes.');

  if (recentCheckins && recentCheckins.length >= 3) {
    const avgRecovery =
      recentCheckins.slice(0, 3).reduce((s, c) => s + (c.recovery_score || 0), 0) / 3;

    if (avgRecovery >= 75) {
      messages.push('Seu corpo vem respondendo bem ao protocolo recente.');
    }
  }

  if (messages.length === 0) {
    messages.push('Continue mantendo consistência nos check-ins.');
  }

  return messages.slice(0, 3);
}

// ─── Streak & gamification ─────────────────────────────────────────────────

export function calculateStreak(checkins) {
  if (!checkins || checkins.length === 0) return 0;

  // Dias ÚNICOS (vários check-ins no mesmo dia não inflam o streak).
  const uniqueDays = [...new Set(checkins.map((c) => String(c.date).slice(0, 10)))]
    .map((d) => {
      const dt = new Date(d + 'T12:00:00');
      dt.setHours(0, 0, 0, 0);
      return dt;
    })
    .sort((a, b) => b - a);

  let streak = 0;
  let current = new Date();
  current.setHours(0, 0, 0, 0);

  for (const d of uniqueDays) {
    const diff = Math.round((current - d) / (1000 * 60 * 60 * 24));
    if (diff <= 1) {
      streak++;
      current = d;
    } else {
      break;
    }
  }

  return streak;
}

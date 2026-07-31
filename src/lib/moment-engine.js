/* ═══ O RECK NOTOU — motor de revelação determinística ════════════════════════
   O app deixa de só EXPLICAR (por que o score é o score) e PRESCREVER (o verbo
   do dia) e passa a PERCEBER: uma observação por dia, dita sem ser perguntada,
   "ei, isto aqui é diferente, e eu reparei em você".

   Princípio (painel WHOOP/APPLE/ART, unânime): cada momento é um FATO
   infalsificável — uma contagem, um rank, um recorde, um limiar cruzado — nunca
   uma interpretação e nunca um número fabricado. Número é prova, data é drama:
   "subiu 4 manhãs seguidas", "mais baixo em 23 dias", "menor FC que já registrei".
   O LLM nunca diria isso porque não conta as manhãs. A engine conta.

   Anti-placebo (CONTEXT §2, BRAND §8 — INVIOLÁVEL): todo detector tem portão de
   dado mínimo; abaixo dele, SILÊNCIO. `detectMoments` pode devolver [] — e []
   é a resposta certa num dia comum. Nunca um card genérico de preenchimento.

   Pureza: função pura de `checkins` (mesma forma do resto do app). A não-
   repetição entre dias é decidida FORA (o card guarda a última assinatura vista),
   pra este módulo continuar testável sem estado. */

const MIN_HISTORY = 8;         // abaixo disto o app está calibrando — silêncio
const RANK_WINDOW_DAYS = 30;   // janela do "mais baixo/alto em N dias"
const RANK_MIN_READINGS = 10;  // leituras mínimas na janela pra afirmar um rank
const RANK_MIN_DEPTH = 12;     // só vira momento se o recorde tiver ≥12 dias de profundidade
const STREAK_MIN_RISES = 3;    // ≥3 altas consecutivas pra nomear a sequência
const RECORD_MIN_HISTORY = 14; // "que já registrei" exige histórico com lastro
const SLEEP_DEBT_LINE = 6;     // horas — o limiar cuja TRAVESSIA vira evento
const ZONE_GREEN_STREAK = 6;   // verde é raro/troféu: só celebra sequência longa
const ZONE_RED_STREAK = 2;     // vermelho sustentado importa cedo (espelha o Monitor §7)
const AWAKE_MIN_HISTORY = 10;  // "incomum pra você" precisa de régua pessoal
const AWAKE_MIN_ABS = 2;       // e de uma diferença absoluta mínima pra ser "muito"

const day = (s) => Math.round(Date.parse(s) / 86400000); // 'YYYY-MM-DD' → índice de dia (UTC)
const daysBetween = (a, b) => Math.abs(day(b) - day(a));
const num = (v) => (v != null && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
const num0 = (v) => (v != null && Number.isFinite(Number(v)) ? Number(v) : null); // aceita 0 (ex.: despertares)
const rhrOf = (c) => num(c?.resting_hr) ?? num(c?.resting_heart_rate);

/* Zona a partir do que está gravado (fonte única), com fallback pelos MESMOS
   cortes de getZone (green≥70, yellow≥42, red<42) quando só há o score cru. */
function zoneOf(c) {
  if (c?.zone === 'green' || c?.zone === 'yellow' || c?.zone === 'red') return c.zone;
  const r = num(c?.recovery_score);
  if (r == null) return null;
  return r >= 70 ? 'green' : r >= 42 ? 'yellow' : 'red';
}

/* Média/desvio de um campo sobre o histórico (exclui hoje), para z pessoal. */
function meanStd(values) {
  if (values.length < 2) return null;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  const v = values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length;
  return { mean: m, std: Math.sqrt(v) };
}

function sortedDesc(checkins) {
  return [...(checkins || [])]
    .filter((c) => c && c.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

/* Profundidade do recorde: há quantos dias existe uma leitura tão ou mais
   extrema que a de hoje. null = nunca houve no histórico (recorde absoluto). */
function recordDepthDays(desc, getVal, todayVal, mode) {
  for (let i = 1; i < desc.length; i++) {
    const v = getVal(desc[i]);
    if (v == null) continue;
    const asExtreme = mode === 'min' ? v <= todayVal : v >= todayVal;
    if (asExtreme) return daysBetween(desc[i].date, desc[0].date);
  }
  return null; // recorde absoluto no histórico conhecido
}

function countIn(desc, getVal, sinceDayIdx) {
  let n = 0;
  for (const c of desc) {
    if (day(c.date) < sinceDayIdx) break;
    if (getVal(c) != null) n++;
  }
  return n;
}

/* Dívida de sono (soma do déficit vs meta nas últimas 7 noites), floor 0. */
function sleepDebt(desc, target = 7.5) {
  const last7 = desc.slice(0, 7);
  if (!last7.length) return null;
  const total = last7.reduce((s, c) => s + (num(c.sleep_hours) ?? 0), 0);
  return Math.max(0, target * last7.length - total);
}

// ─── Detectores ───────────────────────────────────────────────────────────────
// Cada um: fato + portão → candidato { id, priority, tone, text, evidence, signature } | null.
// priority = raridade×impacto (recorde absoluto > sequência > rank profundo > limiar).

function detectHrvRisingStreak(desc) {
  const pts = desc.filter((c) => num(c.hrv) != null);
  if (pts.length < STREAK_MIN_RISES + 1) return null;
  // conta altas consecutivas entre manhãs de dias adjacentes (newest→older)
  let rises = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const newer = pts[i], older = pts[i + 1];
    if (daysBetween(older.date, newer.date) === 1 && num(newer.hrv) > num(older.hrv)) rises++;
    else break;
  }
  if (rises < STREAK_MIN_RISES) return null;
  return {
    id: 'hrv_rising',
    priority: 88 + rises,
    tone: 'positive',
    text: `Teu HRV subiu ${rises} manhãs seguidas. Tua base está se reconstruindo.`,
    evidence: { label: 'HRV', value: `${Math.round(num(pts[0].hrv))}ms` },
    signature: `hrv_rising:${rises}`,
  };
}

function detectRhrRecord(desc) {
  const today = rhrOf(desc[0]);
  if (today == null) return null;
  const history = desc.filter((c) => rhrOf(c) != null);
  if (history.length < RECORD_MIN_HISTORY) return null;
  const depth = recordDepthDays(desc, rhrOf, today, 'min');
  if (depth !== null) return null; // não é recorde absoluto
  return {
    id: 'rhr_record',
    priority: 100,
    tone: 'positive',
    text: `Menor FC de repouso que já registrei em você: ${Math.round(today)} bpm. Teu coração está trabalhando com folga.`,
    evidence: { label: 'FC repouso', value: `${Math.round(today)} bpm` },
    signature: `rhr_record:${Math.round(today)}`,
  };
}

function detectHrvLow(desc) {
  const today = num(desc[0].hrv);
  if (today == null) return null;
  const since = day(desc[0].date) - RANK_WINDOW_DAYS;
  if (countIn(desc, (c) => num(c.hrv), since) < RANK_MIN_READINGS) return null;
  const depth = recordDepthDays(desc, (c) => num(c.hrv), today, 'min');
  const history = desc.filter((c) => num(c.hrv) != null);
  if (depth === null && history.length >= RECORD_MIN_HISTORY) {
    return {
      id: 'hrv_low', priority: 95, tone: 'caution',
      text: `Teu HRV hoje é o mais baixo que já registrei. Não é o fim do mundo — mas é sinal de segurar.`,
      evidence: { label: 'HRV', value: `${Math.round(today)}ms` },
      signature: `hrv_low:absolute:${Math.round(today)}`,
    };
  }
  if (depth != null && depth >= RANK_MIN_DEPTH) {
    return {
      id: 'hrv_low', priority: 60 + Math.min(depth, 40), tone: 'caution',
      text: `Teu HRV hoje é o mais baixo em ${depth} dias. Não é o fim do mundo — mas é sinal de segurar.`,
      evidence: { label: 'HRV', value: `${Math.round(today)}ms` },
      signature: `hrv_low:${depth}`,
    };
  }
  return null;
}

function detectRecoveryHigh(desc) {
  const today = num(desc[0].recovery_score);
  if (today == null) return null;
  const since = day(desc[0].date) - RANK_WINDOW_DAYS;
  if (countIn(desc, (c) => num(c.recovery_score), since) < RANK_MIN_READINGS) return null;
  const depth = recordDepthDays(desc, (c) => num(c.recovery_score), today, 'max');
  const history = desc.filter((c) => num(c.recovery_score) != null);
  if (depth === null && history.length >= RECORD_MIN_HISTORY) {
    return {
      id: 'recovery_high', priority: 92, tone: 'positive',
      text: `Melhor recovery que já registrei em você: ${Math.round(today)}. Se a vontade pedir, hoje aguenta.`,
      evidence: { label: 'Recovery', value: `${Math.round(today)}` },
      signature: `recovery_high:absolute:${Math.round(today)}`,
    };
  }
  if (depth != null && depth >= RANK_MIN_DEPTH) {
    return {
      id: 'recovery_high', priority: 58 + Math.min(depth, 40), tone: 'positive',
      text: `Melhor recovery em ${depth} dias. Se a vontade pedir, hoje aguenta.`,
      evidence: { label: 'Recovery', value: `${Math.round(today)}` },
      signature: `recovery_high:${depth}`,
    };
  }
  return null;
}

function detectSleepDebtCrossing(desc) {
  if (desc.length < 8) return null;
  const today = sleepDebt(desc);
  const yesterday = sleepDebt(desc.slice(1));
  if (today == null || yesterday == null) return null;
  if (!(today > SLEEP_DEBT_LINE && yesterday <= SLEEP_DEBT_LINE)) return null;
  return {
    id: 'sleep_debt_cross',
    priority: 80,
    tone: 'caution',
    text: `Tua dívida de sono passou de ${SLEEP_DEBT_LINE}h esta semana. Hoje o ganho está em dormir, não em treinar.`,
    evidence: { label: 'Dívida', value: `${Math.round(today * 10) / 10}h` },
    signature: `sleep_debt_cross:${Math.round(today)}`,
  };
}

function detectHrvFallingStreak(desc) {
  const pts = desc.filter((c) => num(c.hrv) != null);
  if (pts.length < STREAK_MIN_RISES + 1) return null;
  let falls = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const newer = pts[i], older = pts[i + 1];
    if (daysBetween(older.date, newer.date) === 1 && num(newer.hrv) < num(older.hrv)) falls++;
    else break;
  }
  if (falls < STREAK_MIN_RISES) return null;
  return {
    id: 'hrv_falling',
    priority: 82 + falls,
    tone: 'caution',
    text: `Teu HRV caiu ${falls} manhãs seguidas. Vale segurar a intensidade até estabilizar.`,
    evidence: { label: 'HRV', value: `${Math.round(num(pts[0].hrv))}ms` },
    signature: `hrv_falling:${falls}`,
  };
}

function detectZoneStreak(desc) {
  const z0 = zoneOf(desc[0]);
  if (!z0 || z0 === 'yellow') return null; // amarelo é o meio-termo: não é evento
  let streak = 1;
  for (let i = 0; i < desc.length - 1; i++) {
    if (daysBetween(desc[i + 1].date, desc[i].date) === 1 && zoneOf(desc[i + 1]) === z0) streak++;
    else break;
  }
  if (z0 === 'green') {
    if (streak < ZONE_GREEN_STREAK) return null;
    return {
      id: 'zone_streak', priority: 55 + Math.min(streak, 20), tone: 'positive',
      text: `${streak} dias seguidos na faixa verde. Consistência virou tua vantagem.`,
      evidence: { label: 'Verde', value: `${streak}d` },
      signature: `zone_streak:green:${streak}`,
    };
  }
  if (streak < ZONE_RED_STREAK) return null;
  return {
    id: 'zone_streak', priority: 85 + Math.min(streak, 12), tone: 'caution',
    text: `${streak}º dia seguido no vermelho. O corpo está pedindo recuperação de verdade, não só um dia leve.`,
    evidence: { label: 'Vermelho', value: `${streak}d` },
    signature: `zone_streak:red:${streak}`,
  };
}

function detectSleepDebtCleared(desc) {
  if (desc.length < 8) return null;
  const today = sleepDebt(desc);
  const yesterday = sleepDebt(desc.slice(1));
  if (today == null || yesterday == null) return null;
  if (!(today <= SLEEP_DEBT_LINE && yesterday > SLEEP_DEBT_LINE)) return null;
  return {
    id: 'sleep_debt_cleared',
    priority: 72,
    tone: 'positive',
    text: `Tua dívida de sono voltou pra baixo de ${SLEEP_DEBT_LINE}h — o descanso pegou. Dá pra voltar a construir.`,
    evidence: { label: 'Dívida', value: `${Math.round(today * 10) / 10}h` },
    signature: `sleep_debt_cleared:${Math.round(today)}`,
  };
}

function detectUnusualAwakenings(desc) {
  const today = num0(desc[0]?.sleep_awakenings);
  if (today == null) return null;
  const hist = desc.slice(1).map((c) => num0(c.sleep_awakenings)).filter((v) => v != null);
  if (hist.length < AWAKE_MIN_HISTORY) return null;
  const ms = meanStd(hist);
  if (!ms || ms.std <= 0) return null;
  const z = (today - ms.mean) / ms.std;
  if (z < 1.5 || today - ms.mean < AWAKE_MIN_ABS) return null;
  return {
    id: 'unusual_awakenings',
    priority: 70,
    tone: 'caution',
    text: `${today} despertares essa noite — pra você isso é muito. Tuas noites costumam ter ~${Math.round(ms.mean)}.`,
    evidence: { label: 'Despertares', value: `${today}` },
    signature: `unusual_awakenings:${today}`,
  };
}

const DETECTORS = [
  detectRhrRecord,
  detectHrvLow,
  detectRecoveryHigh,
  detectZoneStreak,
  detectHrvRisingStreak,
  detectHrvFallingStreak,
  detectSleepDebtCrossing,
  detectSleepDebtCleared,
  detectUnusualAwakenings,
];

/**
 * detectMoments(checkins) → array de momentos, rankeado por prioridade (maior
 * primeiro). [] quando nada cruza o portão (silêncio honesto). Puro e determinístico.
 * O consumidor escolhe o 1º cuja assinatura difere da última mostrada (não-repetição).
 */
export function detectMoments(checkins) {
  const desc = sortedDesc(checkins);
  if (desc.length < MIN_HISTORY) return [];
  const out = [];
  for (const d of DETECTORS) {
    try {
      const m = d(desc);
      if (m) out.push(m);
    } catch { /* um detector nunca derruba os outros */ }
  }
  return out.sort((a, b) => b.priority - a.priority);
}

/**
 * pickMoment(checkins, lastSignature) → o momento a mostrar hoje, ou null.
 * Pula a assinatura já mostrada (não repete o mesmo card em dias seguidos);
 * uma sequência que CRESCE (3→4 manhãs) tem assinatura nova e reaparece de propósito.
 */
export function pickMoment(checkins, lastSignature = null) {
  const moments = detectMoments(checkins);
  return moments.find((m) => m.signature !== lastSignature) || null;
}

/**
 * buildMomentTimeline(checkins, opts) → o ACERVO: o que o Reck notou ao longo do
 * tempo. Reproduz os detectores COMO-SE-FOSSE cada dia (histórico até aquele dia),
 * pega o momento de maior prioridade, e COLAPSA repetições consecutivas (uma
 * sequência que persiste vira uma entrada, na data mais recente em que valeu).
 * A Today é o palco; isto é o arquivo consultável (painel ART).
 * Determinístico e puro. [] quando não há histórico suficiente.
 */
export function buildMomentTimeline(checkins, { maxDays = 90, limit = 40 } = {}) {
  const desc = sortedDesc(checkins);
  if (desc.length < MIN_HISTORY) return [];
  const cutoff = day(desc[0].date) - maxDays;
  const out = [];
  let lastKey = null;
  for (let i = 0; i < desc.length && out.length < limit; i++) {
    if (day(desc[i].date) < cutoff) break;
    const asOf = desc.slice(i); // desc[i] = "hoje" daquele dia; os mais antigos vêm depois
    if (asOf.length < MIN_HISTORY) break;
    const top = detectMoments(asOf)[0];
    if (!top) continue;
    // Colapsa por FAMÍLIA (tipo + tom), não por assinatura: uma sequência que
    // cresce (verde 8→28d) vira UMA entrada no pico, não 20 quase-iguais — mas
    // verde e vermelho (mesmo id, tons diferentes) seguem separados.
    const key = `${top.id}:${top.tone}`;
    if (key === lastKey) continue;
    out.push({ date: desc[i].date, ...top });
    lastKey = key;
  }
  return out;
}

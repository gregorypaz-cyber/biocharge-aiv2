/**
 * Training Impact Engine
 * Deterministic engine for:
 * - strain score
 * - body state
 * - remaining capacity
 * - recovery demand
 * - sleep need
 * - post-workout impact message
 * - next-day forecast
 *
 * Objetivo:
 * reduzir dependência de IA em decisões operacionais e manter coerência.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MAX_HR = 185;

const INTENSITY_FACTORS_VISUAL = {
  very_light: 0.50,
  light: 0.63,
  moderate: 0.74,
  hard: 0.86,
  very_hard: 0.93,
};

const SPORT_FACTORS = {
  Corrida: 1.0,
  Caminhada: 0.42,
  Musculação: 0.72,
  CrossFit: 1.03,
  Ciclismo: 0.9,
  Natação: 0.95,
  Yoga: 0.45,
  'Jiu-jitsu': 0.88,
  Futsal: 0.9,
  Futebol: 0.88,
  Padel: 0.8,
  HIIT: 1.05,
  Outro: 0.8,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clamp(value, min, max) {
  const n = Number(value);
  if (!isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}

function resolveSportFactor(sport) {
  const normalized = String(sport || '').toLowerCase().trim();

  const match = Object.keys(SPORT_FACTORS).find((key) => {
    const k = key.toLowerCase();
    return normalized === k || normalized.includes(k);
  });

  return SPORT_FACTORS[match || 'Outro'];
}

function strainTo100(strain) {
  return Math.round((clamp(strain || 0, 0, 21) / 21) * 100);
}

function getBodyStateDescription(state) {
  const map = {
    Recovered: 'Boa margem fisiológica disponível.',
    Activated: 'O corpo respondeu bem à carga do dia.',
    Balanced: 'Seu sistema está em zona relativamente estável.',
    Loaded: 'A carga do dia já está começando a pesar.',
    Sympathetic_Load: 'O sistema parece mais ativado do que o ideal.',
    Fatigued: 'Há sinais claros de fadiga acumulada.',
    Overreached: 'A margem fisiológica ficou muito comprometida.',
  };

  return map[state] || 'Estado fisiológico não definido.';
}

// ─────────────────────────────────────────────────────────────────────────────
// Strain score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate strain score on a 0–21 scale.
 * Mais estável que a versão antiga:
 * - usa FC média / FC máx pessoal como principal
 * - FC máxima observada só ajusta levemente
 * - mistura com duração + RPE
 */
// Converte o Efeito do Treino do Zepp (Firstbeat) para a escala de strain 0-21.
// Usa o EFEITO DOMINANTE (maior entre aeróbico e anaeróbico), não a soma —
// são escalas independentes 0-5; somar distorce. Ancorado na semântica do
// Firstbeat: TE 1≈menor, 2≈mantém, 3≈melhora, 4≈muito, 5≈exagero.
function trainingEffectToStrain(aerobic, anaerobic) {
  const te = Math.max(safeNumber(aerobic, 0), safeNumber(anaerobic, 0));
  if (te <= 0) return null;
  return round1(clamp(te * 3.7 + 0.5, 0, 21));
}

export function calculateStrainScore(session, maxHr) {
  const isRunning = String(session?.sport || '').toLowerCase().includes('corr');

  // CORRIDA: se o Efeito do Treino do Zepp foi informado, usa ele como base.
  // É carga cardiovascular medida por zonas de FC contínuas (Firstbeat) — mais
  // preciso que estimar por FC média + RPE.
  if (isRunning) {
    const teStrain = trainingEffectToStrain(
      session?.training_effect_aerobic,
      session?.training_effect_anaerobic
    );
    if (teStrain != null) return teStrain;
    // sem Efeito do Treino informado → cai no cálculo por FC/RPE abaixo
  }

  const personalMaxHr = safeNumber(maxHr, DEFAULT_MAX_HR);
  const duration = clamp(safeNumber(session?.duration_minutes, 30), 5, 300);
  const effort = clamp(safeNumber(session?.perceived_effort, 6), 1, 10);

  const hrAvg = safeNumber(session?.heart_rate_avg, 0);
  const hrMaxObserved = safeNumber(session?.heart_rate_max, 0);
  const sportFactor = resolveSportFactor(session?.sport);

  let intensityBase;

  if (hrAvg > 0) {
    const avgHrFactor = clamp(hrAvg / personalMaxHr, 0.4, 1.0);

    if (hrMaxObserved > 0) {
      const peakFactor = clamp(hrMaxObserved / personalMaxHr, 0.5, 1.0);
      intensityBase = avgHrFactor * 0.8 + peakFactor * 0.2;
    } else {
      intensityBase = avgHrFactor;
    }
  } else {
    intensityBase = INTENSITY_FACTORS_VISUAL[session?.intensity] || 0.74;
  }

  // Duração cresce, mas com retorno decrescente
  const durationFactor = Math.pow(duration / 45, 0.85);

  // MUSCULAÇÃO / não-corrida: RPE pesa MAIS, como proxy da carga muscular que
  // a FC não captura (o WHOOP descreve strain como inspirado no RPE de Borg).
  // Range ampliado: antes 0.86–1.27, agora ~0.73–1.42.
  const effortFactor = isRunning
    ? 0.82 + effort / 22
    : 0.65 + effort / 13;

  const raw = intensityBase * durationFactor * sportFactor * effortFactor * 13.5;
  return round1(clamp(raw, 0, 21));
}

// ─────────────────────────────────────────────────────────────────────────────
// Body state
// ─────────────────────────────────────────────────────────────────────────────

export function calculateBodyState(morningRecovery, accumulatedStrain) {
  const recovery = clamp(safeNumber(morningRecovery, 0), 0, 100);
  const strain = clamp(safeNumber(accumulatedStrain, 0), 0, 21);
  const strain100 = strainTo100(strain);

  if (strain <= 0) {
    if (recovery >= 80) return 'Recovered';
    if (recovery >= 65) return 'Balanced';
    if (recovery >= 50) return 'Loaded';
    return 'Fatigued';
  }

  const margin = recovery - strain100;

  if (recovery >= 75 && strain <= 8 && margin >= 30) return 'Activated';
  if (margin >= 15) return 'Balanced';
  if (margin >= 0) return 'Loaded';
  if (margin >= -15) return 'Sympathetic_Load';
  if (margin >= -35) return 'Fatigued';
  return 'Overreached';
}

// ─────────────────────────────────────────────────────────────────────────────
// Remaining capacity
// ─────────────────────────────────────────────────────────────────────────────

export function calculateRemainingCapacity(morningRecovery, accumulatedStrain) {
  const recovery = clamp(safeNumber(morningRecovery, 0), 1, 100);
  const strain100 = strainTo100(accumulatedStrain || 0);

  const usedPct = (strain100 / recovery) * 100;

  if (usedPct < 30) return 'High';
  if (usedPct < 60) return 'Moderate';
  if (usedPct < 85) return 'Low';
  return 'Minimal';
}

// ─────────────────────────────────────────────────────────────────────────────
// Recovery demand
// ─────────────────────────────────────────────────────────────────────────────

export function calculateRecoveryDemand(accumulatedStrain, morningRecovery) {
  const strain100 = strainTo100(accumulatedStrain || 0);
  const recovery = clamp(safeNumber(morningRecovery, 0), 0, 100);

  let demand = strain100;

  if (recovery < 60) demand += (60 - recovery) * 0.35;
  if (recovery < 45) demand += 6;

  return Math.min(100, Math.round(demand));
}

// ─────────────────────────────────────────────────────────────────────────────
// Sleep need
// ─────────────────────────────────────────────────────────────────────────────

export function calculateSleepNeed(accumulatedStrain, morningRecovery, recentCheckins = []) {
  const strain = clamp(safeNumber(accumulatedStrain, 0), 0, 21);
  const recovery = clamp(safeNumber(morningRecovery, 0), 0, 100);

  // 1) Baseline PESSOAL: sono médio nos dias de boa recuperação (top tercil do histórico).
  //    Ancora na realidade do usuário; default científico (7.5h) se faltam dados.
  let personal = 7.5;
  let achievable = null;
  const pairs = (recentCheckins || [])
    .map((c) => ({
      s: safeNumber(c.sleep_hours, 0),
      r: safeNumber(c.recovery_score ?? c.morning_recovery_score, 0),
    }))
    .filter((p) => p.s >= 4 && p.s <= 12 && p.r > 0);

  if (pairs.length >= 8) {
    const recos = pairs.map((p) => p.r).sort((a, b) => a - b);
    const thr = recos[Math.floor(recos.length * 0.66)];
    const good = pairs.filter((p) => p.r >= thr).map((p) => p.s);
    if (good.length >= 3) personal = good.reduce((a, b) => a + b, 0) / good.length;
    const sl = pairs.map((p) => p.s).sort((a, b) => a - b);
    achievable = sl[Math.floor(sl.length * 0.85)]; // teto realista = o que ele consegue dormir
  }

  // 2) Ajustes do dia: recuperação baixa / carga alta / débito (vs SUA baseline) pedem +sono.
  let need = personal;
  if (recovery < 55) need += 0.5;
  if (strain > 14) need += 0.5;
  const deficit = (recentCheckins || [])
    .slice(0, 7)
    .reduce((sum, c) => sum + Math.max(0, personal - safeNumber(c.sleep_hours, personal)), 0);
  if (deficit > 4) need += 0.5;

  // 3) Piso de saúde (7h, mínimo adulto) e teto realista (o que ele consegue + 0,5h; nunca > 9h).
  const ceiling = Math.min(9, Math.max(7.5, (achievable ?? 8) + 0.5));
  need = Math.max(7, Math.min(ceiling, need));

  return Math.round(need * 2) / 2; // passos de 0,5h
}

// ─────────────────────────────────────────────────────────────────────────────
// Post-workout impact message
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mensagem curta e determinística.
 * Não depende de IA.
 * Deve ser estável, rápida e coerente.
 */
export async function generateTrainingImpactMessage(session, checkin, allSessionsToday = []) {
  const recovery = checkin?.morning_recovery_score || checkin?.recovery_score || 70;
  const strainScore = session?.strain_score || calculateStrainScore(session);
  const totalStrain = allSessionsToday.reduce((s, t) => s + (t.strain_score || 0), 0);

  const bodyState = calculateBodyState(recovery, totalStrain);
  const capacity = calculateRemainingCapacity(recovery, totalStrain);

  const stateDesc = getBodyStateDescription(bodyState);

  let practical;
  if (bodyState === 'Overreached' || bodyState === 'Fatigued') {
    practical = 'Agora o melhor retorno vem de hidratação, comida e sono, não de mais carga.';
  } else if (bodyState === 'Sympathetic_Load' || capacity === 'Low' || capacity === 'Minimal') {
    practical = 'O treino já contou. O restante do dia deve focar em recuperar bem.';
  } else if (capacity === 'High' || capacity === 'Moderate') {
    practical = 'Seu dia ainda está relativamente controlado, mas dormir bem hoje continua sendo decisivo.';
  } else {
    practical = 'Feche o dia com recuperação adequada para consolidar o benefício do treino.';
  }

  return `Este treino adicionou ${strainScore} de strain e levou seu total do dia para ${round1(totalStrain)}. Seu corpo agora está em estado ${bodyState}. ${stateDesc} ${practical}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delayed fatigue pattern helper
// ─────────────────────────────────────────────────────────────────────────────

export async function analyzeDelayedFatigue(checkins, sessions, todayCheckin) {
  if (!checkins || checkins.length < 7) return null;

  const sortedCheckins = [...checkins].sort(
    (a, b) => new Date(b.date + 'T12:00:00') - new Date(a.date + 'T12:00:00')
  );

  const patterns = [];

  for (let i = 0; i < sortedCheckins.length - 1; i++) {
    const nextDay = sortedCheckins[i];
    const prevDay = sortedCheckins[i + 1];
    if (!nextDay?.date || !prevDay?.date) continue;

    const prevSessions = (sessions || []).filter(
      (s) =>
        s.date === prevDay.date &&
        (s.intensity === 'hard' || s.intensity === 'very_hard')
    );

    if (prevSessions.length > 0 && (nextDay.recovery_score || 0) < 65) {
      patterns.push({
        sport: prevSessions[0].sport,
        recoveryDrop: (prevDay.recovery_score || 0) - (nextDay.recovery_score || 0),
      });
    }
  }

  if (patterns.length < 2) return null;

  const sportCounts = {};
  patterns.forEach((p) => {
    sportCounts[p.sport] = (sportCounts[p.sport] || 0) + 1;
  });

  const topSport = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0];
  if (!topSport || topSport[1] < 2) return null;

  const matching = patterns.filter((p) => p.sport === topSport[0]);
  const avgDrop = Math.round(
    matching.reduce((s, p) => s + p.recoveryDrop, 0) / matching.length
  );

  if (avgDrop < 5) return null;

  return `Padrão detectado: sessões intensas de ${topSport[0]} costumam derrubar sua recuperação em cerca de ${avgDrop} pontos no dia seguinte.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Next-day forecast
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Projeção determinística e cautelosa.
 * Tendência, não garantia.
 */
export async function generateNextDayForecast(checkin, sessions = []) {
  const recovery = checkin?.morning_recovery_score || checkin?.recovery_score || 70;
  const totalStrain = sessions.reduce((s, t) => s + (t.strain_score || 0), 0);
  const bodyState = calculateBodyState(recovery, totalStrain);
  const sleepNeed = calculateSleepNeed(totalStrain, recovery);

  if (bodyState === 'Overreached' || totalStrain >= 16) {
    return `Se você não recuperar bem hoje à noite, a tendência para amanhã é de prontidão baixa. Mire em cerca de ${sleepNeed}h de sono.`;
  }

  if (bodyState === 'Fatigued' || bodyState === 'Sympathetic_Load' || totalStrain >= 12) {
    return `Amanhã tende a depender bastante de como você fechar hoje. Com cerca de ${sleepNeed}h de sono, há chance de manter ou recuperar parte da prontidão.`;
  }

  if (bodyState === 'Balanced' || bodyState === 'Activated') {
    return `Se você dormir bem hoje, a tendência para amanhã é de manter uma recuperação funcional. Meta prática: ${sleepNeed}h.`;
  }

  return `A tendência para amanhã depende principalmente do seu sono desta noite. Tente chegar perto de ${sleepNeed}h.`;
}

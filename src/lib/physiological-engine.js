// ─── Physiological Intelligence Engine ───────────────────────────────────────
// All analysis compares the user to THEMSELVES — no generic population averages.

import { ensureNormalized } from './physio-normalize.js';
import * as C from './physio-constants.js';
import { prescribeWorkout } from './workout-prescription.js';

// ─── Constants aliases (nullish fallback protects against undefined imports) ──
const TRAINING_LOAD_MIN_CHECKINS              = C.TRAINING_LOAD_MIN_CHECKINS              ?? 14;
const TRAINING_RATIO_HIGH                     = C.TRAINING_RATIO_HIGH                     ?? 1.5;
const TRAINING_RATIO_MODERATE                 = C.TRAINING_RATIO_MODERATE                 ?? 1.3;
const RPE_LOAD_MULTIPLIER                     = C.RPE_LOAD_MULTIPLIER                     ?? 2;
const HRV_POSITIVE_DELTA_PCT                  = C.HRV_POSITIVE_DELTA_PCT                  ?? 10;
const HRV_NEGATIVE_DELTA_PCT                  = C.HRV_NEGATIVE_DELTA_PCT                  ?? -10;
const RHR_HIGH_DELTA_PCT                      = C.RHR_HIGH_DELTA_PCT                      ?? 8;
const RHR_LOW_DELTA_PCT                       = C.RHR_LOW_DELTA_PCT                       ?? -5;
const STRESS_HIGH_THRESHOLD                   = C.STRESS_HIGH_THRESHOLD                   ?? 4;
const STRESS_LOW_THRESHOLD                    = C.STRESS_LOW_THRESHOLD                    ?? 2;
const RECOVERY_HIGH_THRESHOLD                 = C.RECOVERY_HIGH_THRESHOLD                 ?? 80;
const RECOVERY_LOW_THRESHOLD                  = C.RECOVERY_LOW_THRESHOLD                  ?? 55;
const FATIGUE_HIGH_THRESHOLD                  = C.FATIGUE_HIGH_THRESHOLD                  ?? 65;
const FATIGUE_STATE_THRESHOLD                 = C.FATIGUE_STATE_THRESHOLD                 ?? 60;
const SLEEP_DEBT_HIGH_HOURS                   = C.SLEEP_DEBT_HIGH_HOURS                   ?? 5;
const PHYSIO_SCORE_RECOVERED                  = C.PHYSIO_SCORE_RECOVERED                  ?? 4;
const PHYSIO_SCORE_BALANCED                   = C.PHYSIO_SCORE_BALANCED                   ?? 2;
const PHYSIO_SCORE_OVERREACHED                = C.PHYSIO_SCORE_OVERREACHED                ?? -4;
const PHYSIO_SCORE_STRESSED                   = C.PHYSIO_SCORE_STRESSED                   ?? -2;
const WHY_HRV_NEGATIVE_PCT                    = C.WHY_HRV_NEGATIVE_PCT                    ?? -8;
const WHY_HRV_POSITIVE_PCT                    = C.WHY_HRV_POSITIVE_PCT                    ?? 8;
const WHY_RHR_HIGH_PCT                        = C.WHY_RHR_HIGH_PCT                        ?? 8;
const WHY_SLEEP_NEGATIVE_PCT                  = C.WHY_SLEEP_NEGATIVE_PCT                  ?? -10;
const WHY_SLEEP_POSITIVE_PCT                  = C.WHY_SLEEP_POSITIVE_PCT                  ?? 10;
const WHY_STRESS_HIGH                         = C.WHY_STRESS_HIGH                         ?? 4;
const WHY_FATIGUE_HIGH                        = C.WHY_FATIGUE_HIGH                        ?? 65;
const WHY_SORENESS_HIGH                       = C.WHY_SORENESS_HIGH                       ?? 4;
const WHY_ENERGY_HIGH                         = C.WHY_ENERGY_HIGH                         ?? 4;
const WHY_MOOD_HIGH                           = C.WHY_MOOD_HIGH                           ?? 4;
const NARRATIVE_HRV_POSITIVE_PCT              = C.NARRATIVE_HRV_POSITIVE_PCT              ?? 8;
const NARRATIVE_HRV_NEGATIVE_PCT              = C.NARRATIVE_HRV_NEGATIVE_PCT              ?? -8;
const NARRATIVE_SLEEP_MORE_PCT                = C.NARRATIVE_SLEEP_MORE_PCT                ?? 10;
const NARRATIVE_SLEEP_LESS_PCT                = C.NARRATIVE_SLEEP_LESS_PCT                ?? -10;
const NARRATIVE_RECOVERY_HIGH                 = C.NARRATIVE_RECOVERY_HIGH                 ?? 80;
const NARRATIVE_RECOVERY_MODERATE             = C.NARRATIVE_RECOVERY_MODERATE             ?? 65;
const NARRATIVE_RECOVERY_LIGHT                = C.NARRATIVE_RECOVERY_LIGHT                ?? 50;
const BASELINE_INSIGHT_MIN_DELTA_PCT          = C.BASELINE_INSIGHT_MIN_DELTA_PCT          ?? 5;
const CORRELATION_MIN_CHECKINS                = C.CORRELATION_MIN_CHECKINS                ?? 7;
const SLEEP_HIGH_HOURS                        = C.SLEEP_HIGH_HOURS                        ?? 7.5;
const SLEEP_LOW_HOURS                         = C.SLEEP_LOW_HOURS                         ?? 6.5;
const SLEEP_RECOVERY_DIFF_MIN                 = C.SLEEP_RECOVERY_DIFF_MIN                 ?? 8;
const RPE_HIGH_THRESHOLD                      = C.RPE_HIGH_THRESHOLD                      ?? 8;
const RPE_RECOVERY_DROP_MIN                   = C.RPE_RECOVERY_DROP_MIN                   ?? 8;
const STRESS_HIGH_CORR                        = C.STRESS_HIGH_CORR                        ?? 4;
const STRESS_LOW_CORR                         = C.STRESS_LOW_CORR                         ?? 2;
const STRESS_HRV_DIFF_MIN                     = C.STRESS_HRV_DIFF_MIN                     ?? 5;
const HYDRATION_GOOD_THRESHOLD                = C.HYDRATION_GOOD_THRESHOLD                ?? 4;
const HYDRATION_POOR_THRESHOLD                = C.HYDRATION_POOR_THRESHOLD                ?? 2;
const HYDRATION_RECOVERY_DIFF_MIN             = C.HYDRATION_RECOVERY_DIFF_MIN             ?? 6;
const LAGGED_MIN_CHECKINS                     = C.LAGGED_MIN_CHECKINS                     ?? 5;
const LAGGED_RECOVERY_DROP_MIN                = C.LAGGED_RECOVERY_DROP_MIN                ?? 8;
const LAGGED_SLEEP_DROP_MIN                   = C.LAGGED_SLEEP_DROP_MIN                   ?? 0.5;
const REC_RECOVERY_HIGH                       = C.REC_RECOVERY_HIGH                       ?? 80;
const REC_RECOVERY_MODERATE                   = C.REC_RECOVERY_MODERATE                   ?? 65;
const REC_RECOVERY_LOW                        = C.REC_RECOVERY_LOW                        ?? 55;
const REC_SLEEP_DEBT_MIN                      = C.REC_SLEEP_DEBT_MIN                      ?? 3;
const REC_HYDRATION_LOW                       = C.REC_HYDRATION_LOW                       ?? 2;
const REC_STRESS_HIGH                         = C.REC_STRESS_HIGH                         ?? 4;
const REC_MAX_COUNT                           = C.REC_MAX_COUNT                           ?? 4;
const RUNNING_ECONOMY_MIN_SESSIONS            = C.RUNNING_ECONOMY_MIN_SESSIONS            ?? 4;
const RUNNING_ECONOMY_IMPROVEMENT_MIN_PCT     = C.RUNNING_ECONOMY_IMPROVEMENT_MIN_PCT     ?? 2;
const RUNNING_ECONOMY_HIGH_CONFIDENCE_SESSIONS= C.RUNNING_ECONOMY_HIGH_CONFIDENCE_SESSIONS?? 8;
const CARDIAC_DRIFT_MIN_RUNS                  = C.CARDIAC_DRIFT_MIN_RUNS                  ?? 3;
const CARDIAC_DRIFT_THRESHOLD                 = C.CARDIAC_DRIFT_THRESHOLD                 ?? 0.15;
const CARDIAC_DRIFT_MIN_DURATION_MINUTES      = C.CARDIAC_DRIFT_MIN_DURATION_MINUTES      ?? 30;
const CARDIAC_DRIFT_HIGH_CONFIDENCE_RUNS      = C.CARDIAC_DRIFT_HIGH_CONFIDENCE_RUNS      ?? 5;
const CARDIAC_DRIFT_RECENT_N                  = C.CARDIAC_DRIFT_RECENT_N                  ?? 3;
const HRV_ANOMALY_MIN_CHECKINS                = C.HRV_ANOMALY_MIN_CHECKINS                ?? 5;
const HRV_ANOMALY_MIN_READINGS                = C.HRV_ANOMALY_MIN_READINGS                ?? 5;
const HRV_ANOMALY_ZSCORE_THRESHOLD            = C.HRV_ANOMALY_ZSCORE_THRESHOLD            ?? -1.5;
const HRV_ANOMALY_RHR_ELEVATED_PCT            = C.HRV_ANOMALY_RHR_ELEVATED_PCT            ?? 1.07;
const SLEEP_CONSISTENCY_MIN_ENTRIES           = C.SLEEP_CONSISTENCY_MIN_ENTRIES           ?? 5;
const SLEEP_CONSISTENCY_GOOD_STDDEV           = C.SLEEP_CONSISTENCY_GOOD_STDDEV           ?? 20;
const SLEEP_CONSISTENCY_BAD_STDDEV            = C.SLEEP_CONSISTENCY_BAD_STDDEV            ?? 60;
const SLEEP_CONSISTENCY_THRESHOLD             = C.SLEEP_CONSISTENCY_THRESHOLD             ?? 30;
const SLEEP_CONSISTENCY_HIGH_CONFIDENCE       = C.SLEEP_CONSISTENCY_HIGH_CONFIDENCE       ?? 10;
const PERF_WINDOW_MIN_DATA                    = C.PERF_WINDOW_MIN_DATA                    ?? 6;
const PERF_WINDOW_MIN_PER_PERIOD              = C.PERF_WINDOW_MIN_PER_PERIOD              ?? 2;
const PERF_WINDOW_MIN_PERIODS                 = C.PERF_WINDOW_MIN_PERIODS                 ?? 2;
const PERF_WINDOW_HIGH_CONFIDENCE_COUNT       = C.PERF_WINDOW_HIGH_CONFIDENCE_COUNT       ?? 5;

function _ensure(checkins) {
  try { return ensureNormalized(checkins); }
  catch (e) { console.warn('physio normalize failed', e); return Array.isArray(checkins) ? checkins : []; }
}

// ─── Unit / Conversion Utils ──────────────────────────────────────────────────

/** Returns a finite Number or null. Never returns NaN/Infinity. */
function toNumber(v) {
  const n = Number(v);
  return isFinite(n) ? n : null;
}

/**
 * Normalises any date-like value to 'YYYY-MM-DD' string, or null if invalid.
 * Uses !isNaN(dt.getTime()) for validity — safe across all JS engines.
 */
function toDateKey(d) {
  if (d == null) return null;
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const dt = d instanceof Date ? d : new Date(d);
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return null;
}

/**
 * Derives speed in km/h from a session using the best available field.
 * Priority: avg_pace_min_per_km > avg_pace_seconds_per_km > speed_mps > speed_kmh
 * Returns speed rounded to 2 decimal places, or null if no valid source found.
 */
function parseSpeedFromSession(s) {
  const pace_min  = toNumber(s.avg_pace_min_per_km);
  const pace_sec  = toNumber(s.avg_pace_seconds_per_km);
  const mps       = toNumber(s.speed_mps);
  const kmh_raw   = toNumber(s.speed_kmh);

  let speed = null;
  if (pace_min  != null && pace_min  > 0) { speed = 60   / pace_min; }
  else if (pace_sec != null && pace_sec > 0) { speed = 3600 / pace_sec; }
  else if (mps  != null && mps  > 0) { speed = mps   * 3.6; }
  else if (kmh_raw != null && kmh_raw > 0) { speed = kmh_raw; }

  if (speed == null || !isFinite(speed) || speed <= 0) return null;
  return Math.round(speed * 100) / 100;
}

// ─── Moving Averages & Baseline ──────────────────────────────────────────────

export function movingAvg(checkins, key, days) {
  const vals = checkins
    .slice(0, days)
    .map(c => c[key])
    .filter(v => v != null && v > 0);
  if (!vals.length) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function movingAvgRhr(checkins, days) {
  const vals = checkins.slice(0, days).map(c => c.resting_hr ?? c.resting_heart_rate).filter(v => v != null && v > 0);
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

export function buildBaseline(checkins) {
  checkins = _ensure(checkins);
  // Use training days only for performance metrics
  const training = checkins.filter(c => !c.rest_day);

  return {
    hrv: {
      d7: movingAvg(training, 'hrv', 7),
      d14: movingAvg(training, 'hrv', 14),
      d30: movingAvg(training, 'hrv', 30),
    },
    rhr: {
      d7: movingAvgRhr(training, 7),
      d14: movingAvgRhr(training, 14),
      d30: movingAvgRhr(training, 30),
    },
    sleep: {
      d7: movingAvg(checkins, 'sleep_hours', 7),
      d14: movingAvg(checkins, 'sleep_hours', 14),
      d30: movingAvg(checkins, 'sleep_hours', 30),
    },
    stress: {
      d7: movingAvg(checkins, 'stress', 7),
      d14: movingAvg(checkins, 'stress', 14),
      d30: movingAvg(checkins, 'stress', 30),
    },
    recovery: {
      d7: movingAvg(checkins, 'recovery_score', 7),
      d14: movingAvg(checkins, 'recovery_score', 14),
      d30: movingAvg(checkins, 'recovery_score', 30),
    },
    sleepScore: {
      d7: movingAvg(checkins, 'sleep_quality', 7),
      d14: movingAvg(checkins, 'sleep_quality', 14),
      d30: movingAvg(checkins, 'sleep_quality', 30),
    },
  };
}

export function pctDelta(current, baseline) {
  if (baseline == null || baseline <= 0 || current == null) return null;
  return Math.round(((current - baseline) / baseline) * 100);
}

// ─── Sleep Debt ───────────────────────────────────────────────────────────────

export function calculateSleepDebt(checkins, targetHours = 8) {
  checkins = _ensure(checkins);
  const last7 = checkins.slice(0, 7);
  if (!last7.length) return null;
  const totalSleep = last7.reduce((s, c) => s + (c.sleep_hours || 0), 0);
  const expected = targetHours * last7.length;
  const debt = Math.max(0, expected - totalSleep);
  return { debt: Math.round(debt * 10) / 10, days: last7.length, avg: Math.round((totalSleep / last7.length) * 10) / 10 };
}

// ─── Training Load Model ─────────────────────────────────────────────────────

// BACKUP (original logic, kept for quick rollback):
// const getDailyLoadOld = (checkin) => {
//   const daySessions = sessions.filter(s => s.date === checkin.date);
//   if (daySessions.length > 0) return daySessions.reduce((s, t) => s + (t.strain_score || 0), 0);
//   if (checkin.daily_strain_accumulated > 0) return checkin.daily_strain_accumulated;
//   if (!checkin.rpe || checkin.rest_day) return 0;
//   return checkin.rpe * 1.5;
// };
// chronicAvg = chronic42Total / Math.max(1, Math.min(last42.length, 42) / 7);

export function calculateTrainingLoad(checkins, sessions = []) {
  checkins = _ensure(checkins);
  if (checkins.length < TRAINING_LOAD_MIN_CHECKINS) {
    return { acute: null, chronic: null, ratio: null, risk: 'insufficient_data' };
  }

  try {
    // Priority: a) sessions strain sum, b) daily_strain_accumulated, c) rpe proxy, d) 0
    const getDailyLoad = (checkin) => {
      const dayStr = checkin.date;
      const daySessions = sessions.filter(s => s.date === dayStr);
      if (daySessions.length > 0) {
        // a) Sum strain_score from sessions for this day
        return daySessions.reduce((s, t) => s + (Number(t.strain_score) || 0), 0);
      }
      const dsa = Number(checkin.daily_strain_accumulated);
      if (dsa > 0) {
        // b) Use accumulated strain saved on checkin
        return dsa;
      }
      const rpe = Number(checkin.rpe);
      if (rpe > 0 && checkin.rest_day !== true) {
        // c) RPE proxy — rpe * 2 maps RPE 1-10 to ~2-20 load units (approximate, not clinical)
        return rpe * RPE_LOAD_MULTIPLIER;
      }
      // d) No load data
      return 0;
    };

    const last7  = checkins.slice(0, 7);
    const last42 = checkins.slice(0, 42);

    const acuteSum      = last7.reduce((s, c)  => s + getDailyLoad(c), 0);
    const chronic42Sum  = last42.reduce((s, c) => s + getDailyLoad(c), 0);
    const weeks         = Math.max(1, last42.length / 7);
    const chronicWeeklyAvg = chronic42Sum / weeks;

    const round2 = v => Math.round(v * 100) / 100;
    const ratio = chronicWeeklyAvg > 0 ? round2(acuteSum / chronicWeeklyAvg) : 1;

    let risk = 'low';
    if (ratio > TRAINING_RATIO_HIGH) risk = 'high';
    else if (ratio > TRAINING_RATIO_MODERATE) risk = 'moderate';

    return {
      acute:   Math.round(acuteSum),
      chronic: Math.round(chronicWeeklyAvg),
      ratio,
      risk,
    };
  } catch (e) {
    console.warn('calculateTrainingLoad error, falling back:', e);
    return { acute: null, chronic: null, ratio: null, risk: 'insufficient_data' };
  }
}

// ─── Physiological State Engine ──────────────────────────────────────────────

export function getPhysiologicalState(today, baseline, trainingLoad, sleepDebt) {
  if (!today) return null;

  const hrv = today.hrv;
  const rhr = today.resting_hr;
  const stress = today.stress || 3;
  const recovery = today.recovery_score || 50;
  const fatigueScore = today.fatigue_score || 50;
  const baseHrv = baseline?.hrv?.d14 || baseline?.hrv?.d7;
  const baseRhr = baseline?.rhr?.d14 || baseline?.rhr?.d7;

  let score = 0; // higher = better
  let signals = [];

  // HRV signal
  if (hrv && baseHrv) {
    const delta = pctDelta(hrv, baseHrv);
    if (delta > HRV_POSITIVE_DELTA_PCT) { score += 2; signals.push({ type: 'positive', text: 'HRV acima do baseline' }); }
    else if (delta < HRV_NEGATIVE_DELTA_PCT) { score -= 2; signals.push({ type: 'negative', text: 'HRV abaixo do baseline' }); }
  }

  // RHR signal
  if (rhr && baseRhr) {
    const delta = pctDelta(rhr, baseRhr);
    if (delta > RHR_HIGH_DELTA_PCT) { score -= 2; signals.push({ type: 'negative', text: 'FC de repouso elevada' }); }
    else if (delta < RHR_LOW_DELTA_PCT) { score += 1; signals.push({ type: 'positive', text: 'FC de repouso baixa' }); }
  }

  // Stress signal
  if (stress >= STRESS_HIGH_THRESHOLD) { score -= 2; signals.push({ type: 'negative', text: 'Stress elevado' }); }
  else if (stress <= STRESS_LOW_THRESHOLD) { score += 1; signals.push({ type: 'positive', text: 'Stress controlado' }); }

  // Recovery signal
  if (recovery >= RECOVERY_HIGH_THRESHOLD) score += 2;
  else if (recovery < RECOVERY_LOW_THRESHOLD) score -= 2;

  // Fatigue
  if (fatigueScore > FATIGUE_HIGH_THRESHOLD) { score -= 2; signals.push({ type: 'negative', text: 'Fadiga acumulada alta' }); }

  // Sleep debt
  if (sleepDebt?.debt > SLEEP_DEBT_HIGH_HOURS) { score -= 2; signals.push({ type: 'negative', text: 'Déficit de sono acumulado' }); }

  // Training load spike
  if (trainingLoad?.risk === 'high') { score -= 2; signals.push({ type: 'negative', text: 'Spike de carga de treino' }); }
  else if (trainingLoad?.risk === 'moderate') { score -= 1; }

  // Determine state
  let state;
  if (score >= PHYSIO_SCORE_RECOVERED) state = 'Recovered';
  else if (score >= PHYSIO_SCORE_BALANCED) state = 'Balanced';
  else if (score <= PHYSIO_SCORE_OVERREACHED) state = 'Overreached';
  else if (score <= PHYSIO_SCORE_STRESSED) {
    state = fatigueScore > FATIGUE_STATE_THRESHOLD ? 'Fatigued' : 'High Stress';
  } else {
    state = 'Balanced';
  }

  return { state, score, signals };
}

// ─── Why Engine ───────────────────────────────────────────────────────────────

export function explainRecoveryScore(today, baseline) {
  if (!today) return [];

  const reasons = [];
  const baseHrv = baseline?.hrv?.d14 || baseline?.hrv?.d7;
  const baseRhr = baseline?.rhr?.d14 || baseline?.rhr?.d7;
  const baseSleep = baseline?.sleepScore?.d14 || baseline?.sleepScore?.d7;

  if (today.hrv && baseHrv) {
    const d = pctDelta(today.hrv, baseHrv);
    if (d != null && d < WHY_HRV_NEGATIVE_PCT) reasons.push({ impact: 'negative', text: `HRV reduzido (${d}% abaixo do seu baseline de ${Math.round(baseHrv)}ms)` });
    else if (d != null && d > WHY_HRV_POSITIVE_PCT) reasons.push({ impact: 'positive', text: `HRV elevado (${d}% acima do seu baseline)` });
  }

  if (today.resting_hr && baseRhr) {
    const d = pctDelta(today.resting_hr, baseRhr);
    if (d != null && d > WHY_RHR_HIGH_PCT) reasons.push({ impact: 'negative', text: `FC em repouso acima do normal (+${d}% vs. baseline de ${Math.round(baseRhr)} bpm)` });
  }

  if (today.sleep_quality && baseSleep) {
    const d = pctDelta(today.sleep_quality, baseSleep);
    if (d != null && d < WHY_SLEEP_NEGATIVE_PCT) reasons.push({ impact: 'negative', text: `Qualidade do sono abaixo do seu padrão (${d}%)` });
    else if (d != null && d > WHY_SLEEP_POSITIVE_PCT) reasons.push({ impact: 'positive', text: `Sono de boa qualidade (${d}% acima do normal)` });
  }

  if ((today.stress || 0) >= WHY_STRESS_HIGH) reasons.push({ impact: 'negative', text: 'Nível de stress elevado impactando recuperação' });
  if ((today.fatigue_score || 0) > WHY_FATIGUE_HIGH) reasons.push({ impact: 'negative', text: 'Fadiga muscular acumulada acima do limiar' });
  if ((today.muscle_soreness || 0) >= WHY_SORENESS_HIGH) reasons.push({ impact: 'negative', text: 'Soreness muscular significativo' });
  if ((today.energy || 0) >= WHY_ENERGY_HIGH) reasons.push({ impact: 'positive', text: 'Energia subjetiva elevada' });
  if ((today.mood || 0) >= WHY_MOOD_HIGH) reasons.push({ impact: 'positive', text: 'Mood e disposição positivos' });

  return reasons;
}

// ─── Recovery Narrative ───────────────────────────────────────────────────────

export function buildRecoveryNarrative(today, baseline, state) {
  if (!today || !state) return '';

  const { state: physiState } = state;
  const baseHrv = baseline?.hrv?.d14 || baseline?.hrv?.d7;
  const hrvDelta = today.hrv && baseHrv ? pctDelta(today.hrv, baseHrv) : null;
  const baseSleep = baseline?.sleep?.d14 || baseline?.sleep?.d7;
  const sleepDelta = today.sleep_hours && baseSleep ? pctDelta(today.sleep_hours, baseSleep) : null;
  const recovery = today.recovery_score || 50;

  let intro = '';
  let hrv_part = '';
  let sleep_part = '';
  let action = '';

  // Intro based on state
  if (physiState === 'Recovered') intro = 'Seu sistema nervoso apresenta ótima recuperação hoje.';
  else if (physiState === 'Balanced') intro = 'Seu organismo está em equilíbrio fisiológico moderado.';
  else if (physiState === 'Fatigued') intro = 'Sinais de fadiga acumulada detectados no seu perfil de hoje.';
  else if (physiState === 'High Stress') intro = 'Seu sistema está sob carga de stress acima do seu padrão.';
  else if (physiState === 'Overreached') intro = 'Atenção: múltiplos indicadores apontam sobrecarga fisiológica.';

  // HRV part
  if (today.hrv && baseHrv && hrvDelta != null) {
    if (hrvDelta > NARRATIVE_HRV_POSITIVE_PCT) hrv_part = ` Seu HRV está ${hrvDelta}% acima do seu baseline — sinal de boa adaptação ao treino.`;
    else if (hrvDelta < NARRATIVE_HRV_NEGATIVE_PCT) hrv_part = ` Seu HRV está ${Math.abs(hrvDelta)}% abaixo do seu baseline — o sistema nervoso ainda está se recuperando.`;
    else hrv_part = ` Seu HRV está dentro do seu padrão habitual.`;
  }

  // Sleep part
  if (sleepDelta != null) {
    if (sleepDelta > NARRATIVE_SLEEP_MORE_PCT) sleep_part = ' O sono desta noite foi mais longo que o usual.';
    else if (sleepDelta < NARRATIVE_SLEEP_LESS_PCT) sleep_part = ' Você dormiu menos que o seu padrão — isso impacta a recuperação.';
    else sleep_part = ' O sono foi consistente com seu padrão.';
  }

  // Action
  if (recovery >= NARRATIVE_RECOVERY_HIGH) action = 'É um bom dia para treino de alta intensidade.';
  else if (recovery >= NARRATIVE_RECOVERY_MODERATE) action = 'Intensidade moderada é recomendada hoje.';
  else if (recovery >= NARRATIVE_RECOVERY_LIGHT) action = 'Prefira atividades leves ou recuperação ativa.';
  else action = 'Priorize descanso, hidratação e sono de qualidade hoje.';

  return `${intro}${hrv_part}${sleep_part} ${action}`;
}

// ─── Baseline Comparison Insights ────────────────────────────────────────────

export function getBaselineInsights(today, baseline) {
  if (!today || !baseline) return [];
  const insights = [];

  const checks = [
    { key: 'hrv', baseKey: 'hrv', label: 'HRV', unit: 'ms', higherIsBetter: true },
    { key: 'resting_hr', baseKey: 'rhr', label: 'FC de Repouso', unit: 'bpm', higherIsBetter: false },
    { key: 'stress', baseKey: 'stress', label: 'Stress', unit: '/5', higherIsBetter: false },
    { key: 'sleep_hours', baseKey: 'sleep', label: 'Sono', unit: 'h', higherIsBetter: true },
    { key: 'recovery_score', baseKey: 'recovery', label: 'Recovery', unit: 'pts', higherIsBetter: true },
  ];

  for (const { key, baseKey, label, unit, higherIsBetter } of checks) {
    const current = today[key];
    const base = baseline[baseKey]?.d14 || baseline[baseKey]?.d7 || baseline[baseKey]?.d30;
    if (current == null || !base) continue;
    const delta = pctDelta(current, base);
    if (delta == null || Math.abs(delta) < BASELINE_INSIGHT_MIN_DELTA_PCT) continue;

    const isPositive = higherIsBetter ? delta > 0 : delta < 0;
    const absDelta = Math.abs(delta);
    const direction = delta > 0 ? 'acima' : 'abaixo';
    const baseVal = Math.round(base * 10) / 10;

    insights.push({
      label,
      current,
      unit,
      delta,
      isPositive,
      text: `Seu ${label} está ${absDelta}% ${direction} do seu baseline (${baseVal}${unit})`,
    });
  }

  return insights;
}

// ─── Correlation Engine ───────────────────────────────────────────────────────

export function detectCorrelations(checkins) {
  checkins = _ensure(checkins);
  const insights = [];
  if (checkins.length < CORRELATION_MIN_CHECKINS) return insights;

  // Sleep hours → Recovery correlation
  const sleepHigh = checkins.filter(c => (c.sleep_hours || 0) >= SLEEP_HIGH_HOURS);
  const sleepLow = checkins.filter(c => c.sleep_hours > 0 && c.sleep_hours < SLEEP_LOW_HOURS);
  if (sleepHigh.length >= 3 && sleepLow.length >= 2) {
    const avgHigh = sleepHigh.reduce((s, c) => s + (c.recovery_score || 0), 0) / sleepHigh.length;
    const avgLow = sleepLow.reduce((s, c) => s + (c.recovery_score || 0), 0) / sleepLow.length;
    const diff = avgHigh - avgLow;
    if (diff > SLEEP_RECOVERY_DIFF_MIN) {
      insights.push({
        icon: '🌙',
        type: 'positive',
        text: `Noites com +7h30 de sono elevam seu Recovery em média ${Math.round(diff)} pontos`,
      });
    }
  }

  // High RPE → Next day recovery (checkins are DESC, so "next day" = idx - 1)
  const highRpeDays = checkins.filter((c, i) => c.rpe >= RPE_HIGH_THRESHOLD && i - 1 >= 0);
  if (highRpeDays.length >= 2) {
    const afterHighRpe = highRpeDays.map((_, i) => {
      const idx = checkins.indexOf(highRpeDays[i]);
      return checkins[idx - 1];
    }).filter(Boolean);
    if (afterHighRpe.length >= 2) {
      const avgAfter = afterHighRpe.reduce((s, c) => s + (c.recovery_score || 0), 0) / afterHighRpe.length;
      const avgAll = checkins.reduce((s, c) => s + (c.recovery_score || 0), 0) / checkins.length;
      if (avgAll - avgAfter > RPE_RECOVERY_DROP_MIN) {
        insights.push({
          icon: '⚡',
          type: 'warning',
          text: `Treinos com RPE ≥8 reduzem seu Recovery no dia seguinte em ~${Math.round(avgAll - avgAfter)} pts`,
        });
      }
    }
  }

  // High stress → Low HRV
  const highStressDays = checkins.filter(c => (c.stress || 0) >= STRESS_HIGH_CORR && c.hrv);
  const lowStressDays = checkins.filter(c => (c.stress || 0) <= STRESS_LOW_CORR && c.hrv);
  if (highStressDays.length >= 2 && lowStressDays.length >= 2) {
    const avgHrvHigh = highStressDays.reduce((s, c) => s + c.hrv, 0) / highStressDays.length;
    const avgHrvLow = lowStressDays.reduce((s, c) => s + c.hrv, 0) / lowStressDays.length;
    if (avgHrvLow - avgHrvHigh > STRESS_HRV_DIFF_MIN) {
      insights.push({
        icon: '🧠',
        type: 'warning',
        text: `Dias de stress alto reduzem seu HRV em média ${Math.round(avgHrvLow - avgHrvHigh)}ms`,
      });
    }
  }

  // Hydration → Recovery
  const goodHydration = checkins.filter(c => (c.hydration || 0) >= HYDRATION_GOOD_THRESHOLD);
  const poorHydration = checkins.filter(c => c.hydration > 0 && c.hydration <= HYDRATION_POOR_THRESHOLD);
  if (goodHydration.length >= 2 && poorHydration.length >= 2) {
    const avgGood = goodHydration.reduce((s, c) => s + (c.recovery_score || 0), 0) / goodHydration.length;
    const avgPoor = poorHydration.reduce((s, c) => s + (c.recovery_score || 0), 0) / poorHydration.length;
    if (avgGood - avgPoor > HYDRATION_RECOVERY_DIFF_MIN) {
      insights.push({
        icon: '💧',
        type: 'positive',
        text: `Boa hidratação melhora seu Recovery em ~${Math.round(avgGood - avgPoor)} pts`,
      });
    }
  }

  return insights.slice(0, 4);
}

// ─── Lagged Effect Analysis ───────────────────────────────────────────────────

export function detectLaggedEffects(checkins) {
  checkins = _ensure(checkins);
  const effects = [];
  if (checkins.length < LAGGED_MIN_CHECKINS) return effects;

  // Check 48h effect (checkins are DESC, so "48h after" = i - 2)
  const intenseDays = checkins.map((c, i) => ({ c, i })).filter(({ c, i }) => c.rpe >= RPE_HIGH_THRESHOLD && !c.rest_day && i - 2 >= 0);

  if (intenseDays.length >= 2) {
    const recoveries48 = intenseDays
      .map(({ i }) => checkins[i - 2])
      .filter(Boolean)
      .map(c => c.recovery_score || 0);

    if (recoveries48.length >= 2) {
      const avg48 = recoveries48.reduce((s, v) => s + v, 0) / recoveries48.length;
      const avgAll = checkins.reduce((s, c) => s + (c.recovery_score || 0), 0) / checkins.length;
      if (avgAll - avg48 > LAGGED_RECOVERY_DROP_MIN) {
        effects.push({
          icon: '⏱️',
          text: `Treinos intensos afetam seu Recovery com pico de queda ~48h depois (média: −${Math.round(avgAll - avg48)} pts)`,
        });
      }
    }
  }

  // Night sleep after high RPE (checkins are DESC, so "next day" = i - 1)
  const afterIntense = intenseDays.map(({ i }) => checkins[i - 1]).filter(Boolean);
  if (afterIntense.length >= 2) {
    const avgSleep = afterIntense.reduce((s, c) => s + (c.sleep_hours || 0), 0) / afterIntense.length;
    const baseAvgSleep = checkins.reduce((s, c) => s + (c.sleep_hours || 0), 0) / checkins.length;
    if (baseAvgSleep - avgSleep > LAGGED_SLEEP_DROP_MIN) {
      effects.push({
        icon: '😴',
        text: `Treinos intensos reduzem seu sono na noite seguinte em ~${Math.round((baseAvgSleep - avgSleep) * 10) / 10}h`,
      });
    }
  }

  return effects;
}

// ─── Actionable Recommendations ──────────────────────────────────────────────

export function getActionableRecs(today, state, sleepDebt, trainingLoad) {
  const recs = [];
  if (!today || !state) return recs;

  const { state: physiState } = state;
  const recovery = today.recovery_score || 50;
  const fatigue = today.fatigue_score || 50;

  // Training recommendation
  if (physiState === 'Recovered' && recovery >= REC_RECOVERY_HIGH) {
    recs.push({ id: 'train_high', icon: '🏋️', category: 'Treino', text: 'Dia ideal para alta intensidade — seu corpo está pronto para desafio.' });
  } else if (physiState === 'Balanced' || recovery >= REC_RECOVERY_MODERATE) {
    recs.push({ id: 'train_moderate', icon: '🚴', category: 'Treino', text: 'Intensidade moderada recomendada. Monitore como se sente durante o esforço.' });
  } else if (physiState === 'Fatigued' || recovery < REC_RECOVERY_LOW) {
    recs.push({ id: 'mobility', icon: '🧘', category: 'Mobilidade', text: 'Priorize mobilidade e alongamento. Evite cargas altas hoje.' });
  }

  if (physiState === 'Overreached') {
    recs.push({ id: 'rest', icon: '🛌', category: 'Recuperação', text: 'Descanso ativo necessário. Considere pelo menos 48h sem intensidade.' });
  }

  // Sleep debt
  if (sleepDebt?.debt > REC_SLEEP_DEBT_MIN) {
    recs.push({ id: 'sleep_debt', icon: '🌙', category: 'Sono', text: `Déficit de ${sleepDebt.debt}h detectado esta semana. Antecipe o horário de dormir esta noite.` });
  }

  // Hydration
  if ((today.hydration || 3) <= REC_HYDRATION_LOW) {
    recs.push({ id: 'hydration', icon: '💧', category: 'Hidratação', text: 'Seu padrão de hidratação está abaixo — mire em 35ml/kg de peso corporal hoje.' });
  }

  // Stress
  if ((today.stress || 3) >= REC_STRESS_HIGH) {
    recs.push({ id: 'stress', icon: '🧠', category: 'Stress', text: 'Stress elevado — 10 minutos de respiração diafragmática ou meditação podem ajudar o HRV.' });
  }

  // Training load spike
  if (trainingLoad?.risk === 'high') {
    recs.push({ id: 'load_spike', icon: '⚠️', category: 'Carga', text: `Ratio aguda/crônica em ${trainingLoad.ratio} — risco de overreaching. Reduza o volume esta semana.` });
  }

  // Attach confidence + provenance to each rec (non-breaking, best-effort)
  try {
    const hasLoad = trainingLoad && trainingLoad.risk && trainingLoad.risk !== 'insufficient_data';
    const hasDebt = sleepDebt && (sleepDebt.debt || 0) > 0;
    const hasRatio = hasLoad && trainingLoad.ratio != null;

    const confidence =
      (hasLoad && (hasDebt || hasRatio)) ? 'Alta' :
      (hasLoad || sleepDebt) ? 'Média' :
      'Baixa';

    const provenance = [
      hasLoad ? 'training_load' : null,
      hasDebt ? 'sleep_debt' : null,
      today.hrv ? 'hrv' : null,
      today.recovery_score ? 'recovery_score' : null,
    ].filter(Boolean);

    return recs.slice(0, REC_MAX_COUNT).map(r => ({ ...r, confidence, provenance }));
  } catch (e) {
    console.warn('getActionableRecs: failed to attach confidence', e);
    return recs.slice(0, REC_MAX_COUNT);
  }
}

// ─── Master Analysis ──────────────────────────────────────────────────────────

export function runPhysiologicalAnalysis(checkins, sessions = []) {
  checkins = _ensure(checkins);
  if (!checkins || checkins.length === 0) return null;

  const today = checkins[0];
  const baseline = buildBaseline(checkins);
  const trainingLoad = calculateTrainingLoad(checkins, sessions);
  const sleepDebt = calculateSleepDebt(checkins);
  const physioState = getPhysiologicalState(today, baseline, trainingLoad, sleepDebt);
  const whyScore = explainRecoveryScore(today, baseline);
  const narrative = buildRecoveryNarrative(today, baseline, physioState);
  const baselineInsights = getBaselineInsights(today, baseline);
  const correlations = detectCorrelations(checkins);
  const laggedEffects = detectLaggedEffects(checkins);
  const actionableRecs = getActionableRecs(today, physioState, sleepDebt, trainingLoad);
  const runningEconomy = calculateRunningEconomy(sessions);
  const performanceWindow = calculatePerformanceWindow(sessions, checkins);
  const cardiacDrift = detectCardiacDrift(sessions);
  const hrvAnomaly = detectHRVAnomaly(checkins, baseline);

  const result = {
    today,
    baseline,
    trainingLoad,
    sleepDebt,
    physioState,
    whyScore,
    narrative,
    baselineInsights,
    correlations,
    laggedEffects,
    actionableRecs,
    runningEconomy,
    performanceWindow,
    cardiacDrift,
    hrvAnomaly,
  };

  result.workoutPrescription = prescribeWorkout(result, { preferred_sports: ['Corrida'] });

  return result;
}

// ─── Running Economy Engine ───────────────────────────────────────────────────
// economy = bpm / (km/h) — lower is better (heart works less per unit of speed)

export function calculateRunningEconomy(sessions) {
  // 1. Normalise dates and discard invalid
  const withValidDate = (sessions || []).filter(s => {
    const dk = toDateKey(s.date);
    if (!dk) { console.warn('physio: calculateRunningEconomy — skipping session with invalid date', s.date); return false; }
    s._dateKey = dk;
    return true;
  });

  // 2. Filter running sessions robustly (covers 'Corrida', 'corrida', 'corrida leve', etc.)
  const runCandidates = withValidDate.filter(s => s.sport && s.sport.toLowerCase().includes('corr'));

  // 3. Build ratio entries — normalise units via parseSpeedFromSession
  let skippedCount = 0;
  const ratios = [];
  for (const s of runCandidates) {
    const hr = toNumber(s.heart_rate_avg);
    let speed = parseSpeedFromSession(s);

    // Legacy fallback: if parseSpeedFromSession returns null but pace field exists, try it directly
    if (speed == null && toNumber(s.avg_pace_min_per_km) != null && toNumber(s.avg_pace_min_per_km) > 0) {
      console.warn('physio: using legacy running economy fallback for session', s._dateKey);
      speed = Math.round((60 / s.avg_pace_min_per_km) * 100) / 100;
    }

    if (!hr || hr <= 0 || !speed || speed <= 0) { skippedCount++; continue; }

    // economy = bpm per km/h — lower value means heart works less for the same speed
    const economy = hr / speed;
    if (!isFinite(economy)) { skippedCount++; continue; }

    ratios.push({
      date: s._dateKey,
      ratio: economy,       // kept as 'ratio' for shape compatibility
      fc: hr,
      pace: toNumber(s.avg_pace_min_per_km) ?? null,
    });
  }

  if (skippedCount > 0) console.warn(`physio: calculateRunningEconomy — skipped ${skippedCount} sessions (missing hr or speed)`);

  // 4. Sort ASC by date, require ≥4 valid sessions
  ratios.sort((a, b) => (a.date > b.date ? 1 : -1));
  if (ratios.length < RUNNING_ECONOMY_MIN_SESSIONS) return null;

  // 5. Split old / recent
  const mid = Math.floor(ratios.length / 2);
  const older = ratios.slice(0, mid);
  const recent = ratios.slice(mid);

  const avgOld    = older.reduce((s, r)  => s + r.ratio, 0) / older.length;
  const avgRecent = recent.reduce((s, r) => s + r.ratio, 0) / recent.length;

  if (!isFinite(avgOld) || avgOld <= 0) return null;

  const improvement = Math.round(((avgOld - avgRecent) / avgOld) * 100);
  const isImproving = improvement > 0;

  if (Math.abs(improvement) < RUNNING_ECONOMY_IMPROVEMENT_MIN_PCT) return null;

  const last = ratios[ratios.length - 1];

  return {
    improvement,
    isImproving,
    sessionsAnalyzed: ratios.length,
    latestFC: last.fc,
    latestPace: last.pace,
    discovery: isImproving
      ? {
          icon: '🏃',
          title: 'Economia de corrida melhorou',
          text: `Você está ${improvement}% mais eficiente nas últimas ${recent.length} corridas — mesma velocidade com menos esforço cardíaco. Continue mantendo o volume de treino.`,
          sentiment: 'positive',
          confidence: ratios.length >= RUNNING_ECONOMY_HIGH_CONFIDENCE_SESSIONS ? 'Alta' : 'Média',
          days: ratios.length,
        }
      : {
          icon: '📉',
          title: 'Eficiência de corrida caindo',
          text: `Seu coração está trabalhando ${Math.abs(improvement)}% mais para a mesma velocidade nas últimas ${recent.length} corridas. Isso pode indicar fadiga acumulada, calor ou necessidade de mais base aeróbica.`,
          sentiment: 'negative',
          confidence: ratios.length >= RUNNING_ECONOMY_HIGH_CONFIDENCE_SESSIONS ? 'Alta' : 'Média',
          days: ratios.length,
        },
  };
}

// ─── Performance Window Analysis ─────────────────────────────────────────────

export function calculatePerformanceWindow(sessions, checkins) {
  if (sessions.length < PERF_WINDOW_MIN_DATA || checkins.length < PERF_WINDOW_MIN_DATA) return null;

  const periods = ['morning', 'afternoon', 'evening', 'night'];
  const periodData = {};

  periods.forEach(period => {
    const periodSessions = sessions.filter(s => s.time_of_day === period);
    if (periodSessions.length < PERF_WINDOW_MIN_PER_PERIOD) return;

    const nextDayRecoveries = periodSessions.map(s => {
      const sessionDate = s.date;
      const nextDay = checkins.find(c => {
        const d1 = new Date(sessionDate + 'T12:00:00');
        const d2 = new Date(c.date + 'T12:00:00');
        return Math.round((d2 - d1) / 86400000) === 1;
      });
      return nextDay?.recovery_score ?? null;
    }).filter(v => v != null);

    if (nextDayRecoveries.length >= PERF_WINDOW_MIN_PER_PERIOD) {
      periodData[period] = {
        avgRecovery: Math.round(
          nextDayRecoveries.reduce((s, v) => s + v, 0) / nextDayRecoveries.length
        ),
        count: nextDayRecoveries.length,
      };
    }
  });

  if (Object.keys(periodData).length < PERF_WINDOW_MIN_PERIODS) return null;

  const best = Object.entries(periodData)
    .sort((a, b) => b[1].avgRecovery - a[1].avgRecovery)[0];

  const labels = {
    morning: 'manhã', afternoon: 'tarde',
    evening: 'noite', night: 'madrugada',
  };

  return {
    bestPeriod: best[0],
    avgRecovery: best[1].avgRecovery,
    discovery: {
      icon: '⏰',
      title: 'Melhor janela de treino identificada',
      text: `Treinos de ${labels[best[0]]} geram recovery médio de ${best[1].avgRecovery} no dia seguinte — seu melhor horário com base em ${best[1].count} sessões.`,
      sentiment: 'positive',
      confidence: best[1].count >= PERF_WINDOW_HIGH_CONFIDENCE_COUNT ? 'Alta' : 'Média',
      days: best[1].count,
    },
  };
}

// ─── Cardiac Drift Detector ───────────────────────────────────────────────────

export function detectCardiacDrift(sessions) {
  // 1. Normalise dates; discard invalid
  const withValidDate = (sessions || []).filter(s => {
    const dk = toDateKey(s.date);
    if (!dk) return false;
    s._dateKey = dk;
    return true;
  });

  // 2. Filter long running sessions robustly
  const longRuns = withValidDate.filter(s => {
    if (!s.sport || !s.sport.toLowerCase().includes('corr')) return false;
    const hr_avg  = toNumber(s.heart_rate_avg);
    const hr_max  = toNumber(s.heart_rate_max);
    const dur     = toNumber(s.duration_minutes);
    return hr_avg != null && hr_avg > 0 &&
           hr_max != null && hr_max > 0 &&
           dur    != null && dur >= CARDIAC_DRIFT_MIN_DURATION_MINUTES;
  });

  if (longRuns.length < CARDIAC_DRIFT_MIN_RUNS) return null;

  // 3. Sort ASC by date
  longRuns.sort((a, b) => (a._dateKey > b._dateKey ? 1 : -1));

  // 4. Compute drift entries
  const driftEntries = longRuns.map(s => {
    const hrStart = toNumber(s.heart_rate_avg);
    const hrMax   = toNumber(s.heart_rate_max);
    const denom   = Math.max(1, hrStart);      // guard: avoid /0
    const driftRel = (hrMax - hrStart) / denom;
    return { date: s._dateKey, drift: driftRel, duration: s.duration_minutes };
  }).filter(e => isFinite(e.drift));

  if (driftEntries.length < CARDIAC_DRIFT_MIN_RUNS) return null;

  // 5. Use last N sessions
  const recent = driftEntries.slice(-CARDIAC_DRIFT_RECENT_N);
  const validDrifts = recent.map(r => r.drift).filter(isFinite);
  if (!validDrifts.length) return null;

  const recentAvgDrift = validDrifts.reduce((s, v) => s + v, 0) / validDrifts.length;
  if (!isFinite(recentAvgDrift) || recentAvgDrift <= CARDIAC_DRIFT_THRESHOLD) return null;

  const avgDriftPct = Math.round(recentAvgDrift * 100);

  return {
    avgDrift: avgDriftPct,                    // integer percentage — same scale as before
    discovery: {
      icon: '🌡️',
      title: 'Deriva cardíaca detectada nas corridas',
      text: `Sua frequência cardíaca sobe em média ${avgDriftPct}% acima da FC média durante os treinos longos. Isso pode indicar desidratação, estresse térmico ou fadiga cardiovascular. Hidrate-se regularmente ao longo da corrida e monitore a evolução nas próximas sessões.`,
      sentiment: 'negative',
      confidence: longRuns.length >= CARDIAC_DRIFT_HIGH_CONFIDENCE_RUNS ? 'Alta' : 'Média',
      days: longRuns.length,
    },
  };
}

// ─── HRV Anomaly Detector ─────────────────────────────────────────────────────

export function detectHRVAnomaly(checkins, baseline) {
  checkins = _ensure(checkins);
  if (checkins.length < HRV_ANOMALY_MIN_CHECKINS) return null;

  const today = checkins[0];
  const yesterday = checkins[1];

  if (!today.hrv || !yesterday?.hrv) return null;

  const baseHrv = baseline?.hrv?.d14 || baseline?.hrv?.d7;
  if (!baseHrv) return null;

  const recentHrv = checkins
    .slice(0, 14)
    .map(c => c.hrv)
    .filter(v => v != null && v > 0);

  if (recentHrv.length < HRV_ANOMALY_MIN_READINGS) return null;

  const mean = recentHrv.reduce((s, v) => s + v, 0) / recentHrv.length;
  const stdDev = Math.sqrt(
    recentHrv.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / recentHrv.length
  );

  if (!stdDev || stdDev === 0) return null;

  const zScore = (today.hrv - mean) / stdDev;
  const drop = Math.round(((mean - today.hrv) / mean) * 100);

  if (zScore > HRV_ANOMALY_ZSCORE_THRESHOLD) return null;

  const baseRhr = baseline?.rhr?.d14 || baseline?.rhr?.d7;
  const rhrElevated = today.resting_hr && baseRhr &&
    today.resting_hr > baseRhr * HRV_ANOMALY_RHR_ELEVATED_PCT;

  return {
    zScore: Math.round(zScore * 10) / 10,
    drop,
    rhrElevated,
    alert: {
      icon: rhrElevated ? '🚨' : '⚠️',
      title: rhrElevated ? 'Sinais vitais fora do padrão' : 'Queda abrupta de HRV',
      text: rhrElevated
        ? `HRV caiu ${drop}% e sua FC de repouso está elevada. Seu corpo pode estar combatendo algo ou sob sobrecarga severa. Priorize descanso e hidratação.`
        : `HRV ${drop}% abaixo do seu padrão pessoal — queda de ${Math.abs(Math.round(today.hrv - mean))}ms. Reduza a intensidade hoje.`,
      type: rhrElevated ? 'critical' : 'warning',
    },
  };
}

// ─── Async Analysis Wrapper ───────────────────────────────────────────────────
// perf(physio): async analysis via worker + safe cache (non-breaking)
//
// MIGRATION NOTE for call-sites (gradual opt-in):
//   Before: const analysis = runPhysiologicalAnalysis(checkins, sessions);
//   After:  const analysis = await runPhysiologicalAnalysisAsync(checkins, sessions);
//   The sync version is still exported and unchanged — no call-site changes required.

// djb2 hash — no btoa, no TextEncoder, safe in all environments
function _djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return hash.toString(36);
}

function _cacheKey(checkins, sessions) {
  try {
    const c = JSON.stringify(checkins.slice(0, 15).map(c => ({
      d: c.date,
      r: c.recovery_score,
      h: c.hrv,
      sh: c.sleep_hours,
      sq: c.sleep_quality,
      snt: c.sleep_need_tonight
    })));
    const s = JSON.stringify((sessions || []).slice(0, 10).map(s => ({ d: s.date, st: s.strain_score })));
    return 'physio_v1_' + _djb2(c + s);
  } catch {
    return null;
  }
}

// In-memory fallback when localStorage is unavailable
const _memCache = new Map();

function _readCache(key, ttlMinutes) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > ttlMinutes * 60 * 1000) { localStorage.removeItem(key); return null; }
    return data;
  } catch {
    const entry = _memCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > ttlMinutes * 60 * 1000) { _memCache.delete(key); return null; }
    return entry.data;
  }
}

function _writeCache(key, data, ttlMinutes) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // localStorage full or unavailable — fall back to memory, cap at 20 entries
    if (_memCache.size >= 20) _memCache.delete(_memCache.keys().next().value);
    _memCache.set(key, { ts: Date.now(), data });
  }
}

function _runInWorker(checkins, sessions, timeoutMs) {
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(new URL('./physio-worker.js', import.meta.url), { type: 'module' });
    } catch (e) {
      return reject(e);
    }
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('worker_timeout'));
    }, timeoutMs);

    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      const { ok, result, error } = e.data || {};
      if (ok) resolve(result);
      else reject(new Error(error || 'worker_error'));
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(e.message || 'worker_onerror'));
    };
    worker.postMessage({ checkins, sessions });
  });
}

/**
 * Async version of runPhysiologicalAnalysis.
 * Uses a Web Worker (with 8s timeout) and localStorage cache (TTL: 15 min by default).
 * Falls back to synchronous execution if Worker is unavailable or times out.
 * Never throws — returns null on total failure.
 *
 * @param {Array} checkins
 * @param {Array} [sessions=[]]
 * @param {{ useWorker?: boolean, cacheTTLMinutes?: number }} [options]
 * @returns {Promise<object|null>}
 */
export async function runPhysiologicalAnalysisAsync(
  checkins,
  sessions = [],
  options = {}
) {
  const { useWorker = true, cacheTTLMinutes = 15 } = options;

  const key = _cacheKey(checkins, sessions);
  if (key) {
    const cached = _readCache(key, cacheTTLMinutes);
    if (cached) return cached;
  }

  let result = null;

  if (useWorker && typeof Worker !== 'undefined') {
    try {
      result = await _runInWorker(checkins, sessions, 8000);
    } catch (workerErr) {
      console.warn('physio-worker failed, falling back to sync:', workerErr?.message);
      try {
        result = runPhysiologicalAnalysis(checkins, sessions);
      } catch (syncErr) {
        console.warn('runPhysiologicalAnalysis sync fallback failed:', syncErr?.message);
        return null;
      }
    }
  } else {
    try {
      result = runPhysiologicalAnalysis(checkins, sessions);
    } catch (e) {
      console.warn('runPhysiologicalAnalysis failed:', e?.message);
      return null;
    }
  }

  if (result && key) _writeCache(key, result, cacheTTLMinutes);
  return result;
}

// ─── Sleep Consistency ────────────────────────────────────────────────────────

export function calculateSleepConsistency(checkins) {
  checkins = _ensure(checkins);
  const withTimes = checkins
    .slice(0, 14)
    .filter(c => c.sleep_start_time)
    .map(c => {
      const [h, m] = c.sleep_start_time.split(':').map(Number);
      let mins = h * 60 + m;
      // Normalize midnight wraparound: times after noon treated as negative (yesterday)
      if (mins > 12 * 60) mins -= 24 * 60;
      return mins;
    });

  if (withTimes.length < SLEEP_CONSISTENCY_MIN_ENTRIES) return null;

  const mean = withTimes.reduce((s, v) => s + v, 0) / withTimes.length;
  const variance = withTimes.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / withTimes.length;
  const stdDev = Math.sqrt(variance);

  const consistencyScore = Math.max(0, Math.round(100 - (stdDev / 30) * 100));
  const avgHour = Math.floor(mean / 60);
  const avgMin = String(Math.round(mean % 60)).padStart(2, '0');

  return {
    stdDevMinutes: Math.round(stdDev),
    consistencyScore,
    avgBedtime: `${avgHour}:${avgMin}`,
    isConsistent: stdDev < SLEEP_CONSISTENCY_THRESHOLD,
    discovery: stdDev < SLEEP_CONSISTENCY_GOOD_STDDEV ? {
      icon: '⏰',
      title: 'Horário de sono consistente',
      text: `Você dorme no mesmo horário com variação de apenas ${Math.round(stdDev)} minutos. Regularidade aumenta a qualidade do sono profundo.`,
      sentiment: 'positive',
      confidence: withTimes.length >= SLEEP_CONSISTENCY_HIGH_CONFIDENCE ? 'Alta' : 'Média',
      days: withTimes.length,
    } : stdDev > SLEEP_CONSISTENCY_BAD_STDDEV ? {
      icon: '🌙',
      title: 'Horário de sono irregular',
      text: `Seu horário de dormir varia ${Math.round(stdDev)} minutos em média. Regularidade no sono melhora o HRV matinal.`,
      sentiment: 'negative',
      confidence: withTimes.length >= SLEEP_CONSISTENCY_HIGH_CONFIDENCE ? 'Alta' : 'Média',
      days: withTimes.length,
    } : null,
  };
}
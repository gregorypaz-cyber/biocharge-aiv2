// ─── Physiological Intelligence Engine ───────────────────────────────────────
// All analysis compares the user to THEMSELVES — no generic population averages.

import { ensureNormalized } from './physio-normalize.js';
import * as C from './physio-constants.js';
import { prescribeWorkout, buildWorkoutDecision } from './workout-prescription.js';

// ─── Constants aliases (nullish fallback protects against undefined imports) ──
const TRAINING_LOAD_MIN_CHECKINS               = C.TRAINING_LOAD_MIN_CHECKINS               ?? 14;
const TRAINING_RATIO_HIGH                      = C.TRAINING_RATIO_HIGH                      ?? 1.5;
const TRAINING_RATIO_MODERATE                  = C.TRAINING_RATIO_MODERATE                  ?? 1.3;
const RPE_LOAD_MULTIPLIER                      = C.RPE_LOAD_MULTIPLIER                      ?? 2;
const HRV_POSITIVE_DELTA_PCT                   = C.HRV_POSITIVE_DELTA_PCT                   ?? 10;
const HRV_NEGATIVE_DELTA_PCT                   = C.HRV_NEGATIVE_DELTA_PCT                   ?? -10;
const RHR_HIGH_DELTA_PCT                       = C.RHR_HIGH_DELTA_PCT                       ?? 8;
const RHR_LOW_DELTA_PCT                        = C.RHR_LOW_DELTA_PCT                        ?? -5;
const STRESS_HIGH_THRESHOLD                    = C.STRESS_HIGH_THRESHOLD                    ?? 4;
const STRESS_LOW_THRESHOLD                     = C.STRESS_LOW_THRESHOLD                     ?? 2;
const RECOVERY_HIGH_THRESHOLD                  = C.RECOVERY_HIGH_THRESHOLD                  ?? 80;
const RECOVERY_LOW_THRESHOLD                   = C.RECOVERY_LOW_THRESHOLD                   ?? 55;
const FATIGUE_HIGH_THRESHOLD                   = C.FATIGUE_HIGH_THRESHOLD                   ?? 65;
const FATIGUE_STATE_THRESHOLD                  = C.FATIGUE_STATE_THRESHOLD                  ?? 60;
const SLEEP_DEBT_HIGH_HOURS                    = C.SLEEP_DEBT_HIGH_HOURS                    ?? 5;
const PHYSIO_SCORE_RECOVERED                   = C.PHYSIO_SCORE_RECOVERED                   ?? 4;
const PHYSIO_SCORE_BALANCED                    = C.PHYSIO_SCORE_BALANCED                    ?? 2;
const PHYSIO_SCORE_OVERREACHED                 = C.PHYSIO_SCORE_OVERREACHED                 ?? -4;
const PHYSIO_SCORE_STRESSED                    = C.PHYSIO_SCORE_STRESSED                    ?? -2;
const WHY_HRV_NEGATIVE_PCT                     = C.WHY_HRV_NEGATIVE_PCT                     ?? -8;
const WHY_HRV_POSITIVE_PCT                     = C.WHY_HRV_POSITIVE_PCT                     ?? 8;
const WHY_RHR_HIGH_PCT                         = C.WHY_RHR_HIGH_PCT                         ?? 8;
const WHY_SLEEP_NEGATIVE_PCT                   = C.WHY_SLEEP_NEGATIVE_PCT                   ?? -10;
const WHY_SLEEP_POSITIVE_PCT                   = C.WHY_SLEEP_POSITIVE_PCT                   ?? 10;
const WHY_STRESS_HIGH                          = C.WHY_STRESS_HIGH                          ?? 4;
const WHY_FATIGUE_HIGH                         = C.WHY_FATIGUE_HIGH                         ?? 65;
const WHY_SORENESS_HIGH                        = C.WHY_SORENESS_HIGH                        ?? 4;
const WHY_ENERGY_HIGH                          = C.WHY_ENERGY_HIGH                          ?? 4;
const WHY_MOOD_HIGH                            = C.WHY_MOOD_HIGH                            ?? 4;
const NARRATIVE_HRV_POSITIVE_PCT               = C.NARRATIVE_HRV_POSITIVE_PCT               ?? 8;
const NARRATIVE_HRV_NEGATIVE_PCT               = C.NARRATIVE_HRV_NEGATIVE_PCT               ?? -8;
const NARRATIVE_SLEEP_MORE_PCT                 = C.NARRATIVE_SLEEP_MORE_PCT                 ?? 10;
const NARRATIVE_SLEEP_LESS_PCT                 = C.NARRATIVE_SLEEP_LESS_PCT                 ?? -10;
const BASELINE_INSIGHT_MIN_DELTA_PCT           = C.BASELINE_INSIGHT_MIN_DELTA_PCT           ?? 5;
const CORRELATION_MIN_CHECKINS                 = C.CORRELATION_MIN_CHECKINS                 ?? 7;
const SLEEP_HIGH_HOURS                         = C.SLEEP_HIGH_HOURS                         ?? 7.5;
const SLEEP_LOW_HOURS                          = C.SLEEP_LOW_HOURS                          ?? 6.5;
const SLEEP_RECOVERY_DIFF_MIN                  = C.SLEEP_RECOVERY_DIFF_MIN                  ?? 8;
const RPE_HIGH_THRESHOLD                       = C.RPE_HIGH_THRESHOLD                       ?? 8;
const RPE_RECOVERY_DROP_MIN                    = C.RPE_RECOVERY_DROP_MIN                    ?? 8;
const STRESS_HIGH_CORR                         = C.STRESS_HIGH_CORR                         ?? 4;
const STRESS_LOW_CORR                          = C.STRESS_LOW_CORR                          ?? 2;
const STRESS_HRV_DIFF_MIN                      = C.STRESS_HRV_DIFF_MIN                      ?? 5;
const HYDRATION_GOOD_THRESHOLD                 = C.HYDRATION_GOOD_THRESHOLD                 ?? 4;
const HYDRATION_POOR_THRESHOLD                 = C.HYDRATION_POOR_THRESHOLD                 ?? 2;
const HYDRATION_RECOVERY_DIFF_MIN              = C.HYDRATION_RECOVERY_DIFF_MIN              ?? 6;
const LAGGED_MIN_CHECKINS                      = C.LAGGED_MIN_CHECKINS                      ?? 5;
const LAGGED_RECOVERY_DROP_MIN                 = C.LAGGED_RECOVERY_DROP_MIN                 ?? 8;
const LAGGED_SLEEP_DROP_MIN                    = C.LAGGED_SLEEP_DROP_MIN                    ?? 0.5;
const REC_MAX_COUNT                            = C.REC_MAX_COUNT                            ?? 4;
const RUNNING_ECONOMY_MIN_SESSIONS             = C.RUNNING_ECONOMY_MIN_SESSIONS             ?? 4;
const RUNNING_ECONOMY_IMPROVEMENT_MIN_PCT      = C.RUNNING_ECONOMY_IMPROVEMENT_MIN_PCT      ?? 2;
const RUNNING_ECONOMY_HIGH_CONFIDENCE_SESSIONS = C.RUNNING_ECONOMY_HIGH_CONFIDENCE_SESSIONS ?? 8;
const CARDIAC_DRIFT_MIN_RUNS                   = C.CARDIAC_DRIFT_MIN_RUNS                   ?? 3;
const CARDIAC_DRIFT_THRESHOLD                  = C.CARDIAC_DRIFT_THRESHOLD                  ?? 0.15;
const CARDIAC_DRIFT_MIN_DURATION_MINUTES       = C.CARDIAC_DRIFT_MIN_DURATION_MINUTES       ?? 30;
const CARDIAC_DRIFT_HIGH_CONFIDENCE_RUNS       = C.CARDIAC_DRIFT_HIGH_CONFIDENCE_RUNS       ?? 5;
const CARDIAC_DRIFT_RECENT_N                   = C.CARDIAC_DRIFT_RECENT_N                   ?? 3;
const HRV_ANOMALY_MIN_CHECKINS                 = C.HRV_ANOMALY_MIN_CHECKINS                 ?? 5;
const HRV_ANOMALY_MIN_READINGS                 = C.HRV_ANOMALY_MIN_READINGS                 ?? 5;
const HRV_ANOMALY_ZSCORE_THRESHOLD             = C.HRV_ANOMALY_ZSCORE_THRESHOLD             ?? -1.5;
const HRV_ANOMALY_RHR_ELEVATED_PCT             = C.HRV_ANOMALY_RHR_ELEVATED_PCT             ?? 1.07;
const HEALTH_MIN_BASELINE_NIGHTS               = C.HEALTH_MIN_BASELINE_NIGHTS               ?? 7;
const HEALTH_FLAG_GATE                         = C.HEALTH_FLAG_GATE                         ?? 2;
const BL_FRESH_MAX_DAYS                        = C.BL_FRESH_MAX_DAYS                        ?? 2;
const BL_STALE_MIN_DAYS                        = C.BL_STALE_MIN_DAYS                        ?? 7;
const SLEEP_CONSISTENCY_MIN_ENTRIES            = C.SLEEP_CONSISTENCY_MIN_ENTRIES            ?? 5;
const SLEEP_CONSISTENCY_GOOD_STDDEV            = C.SLEEP_CONSISTENCY_GOOD_STDDEV            ?? 20;
const SLEEP_CONSISTENCY_BAD_STDDEV             = C.SLEEP_CONSISTENCY_BAD_STDDEV             ?? 60;
const SLEEP_CONSISTENCY_THRESHOLD              = C.SLEEP_CONSISTENCY_THRESHOLD              ?? 30;
const SLEEP_CONSISTENCY_HIGH_CONFIDENCE        = C.SLEEP_CONSISTENCY_HIGH_CONFIDENCE        ?? 10;
const PERF_WINDOW_MIN_DATA                     = C.PERF_WINDOW_MIN_DATA                     ?? 6;
const PERF_WINDOW_MIN_PER_PERIOD               = C.PERF_WINDOW_MIN_PER_PERIOD               ?? 2;
const PERF_WINDOW_MIN_PERIODS                  = C.PERF_WINDOW_MIN_PERIODS                  ?? 2;
const PERF_WINDOW_HIGH_CONFIDENCE_COUNT        = C.PERF_WINDOW_HIGH_CONFIDENCE_COUNT        ?? 5;

function _ensure(checkins) {
  try {
    return ensureNormalized(checkins);
  } catch (e) {
    console.warn('physio normalize failed', e);
    return Array.isArray(checkins) ? checkins : [];
  }
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
  const pace_min = toNumber(s.avg_pace_min_per_km);
  const pace_sec = toNumber(s.avg_pace_seconds_per_km);
  const mps = toNumber(s.speed_mps);
  const kmh_raw = toNumber(s.speed_kmh);

  let speed = null;
  if (pace_min != null && pace_min > 0) {
    speed = 60 / pace_min;
  } else if (pace_sec != null && pace_sec > 0) {
    speed = 3600 / pace_sec;
  } else if (mps != null && mps > 0) {
    speed = mps * 3.6;
  } else if (kmh_raw != null && kmh_raw > 0) {
    speed = kmh_raw;
  }

  if (speed == null || !isFinite(speed) || speed <= 0) return null;
  return Math.round(speed * 100) / 100;
}

// ─── Moving Averages & Baseline ──────────────────────────────────────────────

export function movingAvg(checkins, key, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const vals = checkins
    .filter((c) => c.date >= cutoffStr)
    .map((c) => c[key])
    .filter((v) => v != null && v > 0);

  if (!vals.length) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function movingAvgRhr(checkins, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const vals = checkins
    .filter((c) => c.date >= cutoffStr)
    .map((c) => c.resting_hr ?? c.resting_heart_rate)
    .filter((v) => v != null && v > 0);

  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

export function buildBaseline(checkins) {
  checkins = _ensure(checkins);
  const training = checkins.filter((c) => !c.rest_day);

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
    deepSleep: {
      d7: movingAvg(checkins, 'deep_sleep_pct', 7),
      d14: movingAvg(checkins, 'deep_sleep_pct', 14),
      d30: movingAvg(checkins, 'deep_sleep_pct', 30),
    },
    sleepHr: {
      d7: movingAvg(checkins, 'sleep_heart_rate', 7),
      d14: movingAvg(checkins, 'sleep_heart_rate', 14),
      d30: movingAvg(checkins, 'sleep_heart_rate', 30),
    },
  };
}

export function pctDelta(current, baseline) {
  if (baseline == null || baseline <= 0 || current == null) return null;
  return Math.round(((current - baseline) / baseline) * 100);
}

// ─── Sleep Debt ───────────────────────────────────────────────────────────────

export function calculateSleepDebt(checkins, targetHours = 7.5) {
  checkins = _ensure(checkins);
  const last7 = checkins.slice(0, 7);
  if (!last7.length) return null;

  const totalSleep = last7.reduce((s, c) => s + (c.sleep_hours || 0), 0);
  const expected = targetHours * last7.length;
  const debt = Math.max(0, expected - totalSleep);

  return {
    debt: Math.round(debt * 10) / 10,
    days: last7.length,
    avg: Math.round((totalSleep / last7.length) * 10) / 10,
  };
}

// ─── Training Load Model ─────────────────────────────────────────────────────

export function calculateTrainingLoad(checkins, sessions = []) {
  checkins = _ensure(checkins);
  if (checkins.length < TRAINING_LOAD_MIN_CHECKINS) {
    return { acute: null, chronic: null, ratio: null, risk: 'insufficient_data' };
  }

  try {
    const getDailyLoad = (checkin) => {
      const dayStr = checkin.date;
      const daySessions = sessions.filter((s) => s.date === dayStr);

      if (daySessions.length > 0) {
        return daySessions.reduce((s, t) => s + (Number(t.strain_score) || 0), 0);
      }

      const dsa = Number(checkin.daily_strain_accumulated);
      if (dsa > 0) return dsa;

      const rpe = Number(checkin.rpe);
      if (rpe > 0 && checkin.rest_day !== true) {
        return rpe * RPE_LOAD_MULTIPLIER;
      }

      return 0;
    };

    const last7 = checkins.slice(0, 7);
    const last42 = checkins.slice(0, 42);

    const acuteSum = last7.reduce((s, c) => s + getDailyLoad(c), 0);
    const chronic42Sum = last42.reduce((s, c) => s + getDailyLoad(c), 0);

    // Usa semanas completas reais disponíveis, não uma fração de 7 dias.
    // Ex: 15 check-ins = 2 semanas completas (14 dias), não 2.14.
    // Isso evita que a carga crônica fique artificialmente alta com histórico curto.
    const completedWeeks = Math.max(1, Math.floor(last42.length / 7));
    const chronicWeeklyAvg = chronic42Sum / completedWeeks;

    const round2 = (v) => Math.round(v * 100) / 100;
    const ratio = chronicWeeklyAvg > 0 ? round2(acuteSum / chronicWeeklyAvg) : 1;

    // Com histórico menor que 3 semanas completas, o ACWR é calculado mas marcado
    // como baixa confiança para não gerar alertas de risco excessivos.
    const lowConfidence = completedWeeks < 3;

    let risk = 'low';
    if (!lowConfidence) {
      if (ratio > TRAINING_RATIO_HIGH) risk = 'high';
      else if (ratio > TRAINING_RATIO_MODERATE) risk = 'moderate';
    } else {
      // Com pouco histórico, nunca sinalizar risco alto — pode ser falso positivo.
      if (ratio > TRAINING_RATIO_HIGH) risk = 'moderate';
    }

    return {
      acute: Math.round(acuteSum),
      chronic: Math.round(chronicWeeklyAvg),
      ratio,
      risk,
      lowConfidence,
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
  const recovery = today.recovery_score ?? 50;   // ?? (não ||): um recovery legítimo de 0 não pode virar 50
  const fatigueScore = today.fatigue_score ?? 50;
  const baseHrv = baseline?.hrv?.d14 || baseline?.hrv?.d7;
  const baseRhr = baseline?.rhr?.d14 || baseline?.rhr?.d7;

  let score = 0;
  const signals = [];

  if (hrv && baseHrv) {
    const delta = pctDelta(hrv, baseHrv);
    if (delta > HRV_POSITIVE_DELTA_PCT) {
      score += 2;
      signals.push({ type: 'positive', text: 'HRV acima do baseline' });
    } else if (delta < HRV_NEGATIVE_DELTA_PCT) {
      score -= 2;
      signals.push({ type: 'negative', text: 'HRV abaixo do baseline' });
    }
  }

  if (rhr && baseRhr) {
    const delta = pctDelta(rhr, baseRhr);
    if (delta > RHR_HIGH_DELTA_PCT) {
      score -= 2;
      signals.push({ type: 'negative', text: 'FC de repouso elevada' });
    } else if (delta < RHR_LOW_DELTA_PCT) {
      score += 1;
      signals.push({ type: 'positive', text: 'FC de repouso baixa' });
    }
  }

  if (stress >= STRESS_HIGH_THRESHOLD) {
    score -= 2;
    signals.push({ type: 'negative', text: 'Stress elevado' });
  } else if (stress <= STRESS_LOW_THRESHOLD) {
    score += 1;
    signals.push({ type: 'positive', text: 'Stress controlado' });
  }

  if (recovery >= RECOVERY_HIGH_THRESHOLD) score += 2;
  else if (recovery < RECOVERY_LOW_THRESHOLD) score -= 2;

  if (fatigueScore > FATIGUE_HIGH_THRESHOLD) {
    score -= 2;
    signals.push({ type: 'negative', text: 'Fadiga acumulada alta' });
  }

  if (sleepDebt?.debt > SLEEP_DEBT_HIGH_HOURS) {
    score -= 2;
    signals.push({ type: 'negative', text: 'Déficit de sono acumulado' });
  }

  if (trainingLoad?.risk === 'high') {
    score -= 2;
    signals.push({ type: 'negative', text: 'Spike de carga de treino' });
  } else if (trainingLoad?.risk === 'moderate') {
    score -= 1;
  }

  let state;
  const hasTrainingStimulus = trainingLoad?.acute > 0;

  if (score >= PHYSIO_SCORE_RECOVERED && hasTrainingStimulus) state = 'Activated';
  else if (score >= PHYSIO_SCORE_RECOVERED) state = 'Recovered';
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
  const baseDeepSleep = baseline?.deepSleep?.d14 || baseline?.deepSleep?.d7;

  // RECOVERY = fisiologia + sono.
  // Não incluir subjetivo aqui (energia, mood, stress, dor, fadiga),
  // porque esses sinais não explicam o recovery_score oficial do dia.

  if (today.hrv && baseHrv) {
    const d = pctDelta(today.hrv, baseHrv);
    if (d != null && d < WHY_HRV_NEGATIVE_PCT) {
      reasons.push({
        impact: 'negative',
        text: `HRV reduzido (${Math.abs(d)}% abaixo do seu baseline de ${Math.round(baseHrv)}ms)`,
      });
    } else if (d != null && d > WHY_HRV_POSITIVE_PCT) {
      reasons.push({
        impact: 'positive',
        text: `HRV elevado (${d}% acima do seu baseline de ${Math.round(baseHrv)}ms)`,
      });
    }
  }

  if (today.resting_hr && baseRhr) {
    const d = pctDelta(today.resting_hr, baseRhr);
    if (d != null && d > WHY_RHR_HIGH_PCT) {
      reasons.push({
        impact: 'negative',
        text: `FC de repouso acima do normal (+${d}% vs seu baseline de ${Math.round(baseRhr)} bpm)`,
      });
    } else if (d != null && d < 0) {
      reasons.push({
        impact: 'positive',
        text: `FC de repouso abaixo do seu normal (${Math.abs(d)}% melhor que seu baseline de ${Math.round(baseRhr)} bpm)`,
      });
    }
  }

  if (today.sleep_quality && baseSleep) {
    const d = pctDelta(today.sleep_quality, baseSleep);
    if (d != null && d < WHY_SLEEP_NEGATIVE_PCT) {
      reasons.push({
        impact: 'negative',
        text: `Qualidade do sono abaixo do seu padrão (${Math.abs(d)}% abaixo do normal)`,
      });
    } else if (d != null && d > WHY_SLEEP_POSITIVE_PCT) {
      reasons.push({
        impact: 'positive',
        text: `Sono de boa qualidade (${d}% acima do seu padrão)`,
      });
    }
  }

  // Quebra do sono dentro do eixo "sono" — ajuda a explicar por que o score de sono subiu/caiu.
  if (today.deep_sleep_pct != null && today.deep_sleep_pct > 0 && baseDeepSleep) {
    const pct = Math.round(today.deep_sleep_pct);
    const avg = Math.round(baseDeepSleep);

    if (pct < avg - 4) {
      reasons.push({
        impact: 'negative',
        text: `Sono profundo baixo (${pct}% vs sua média de ${avg}%)`,
      });
    } else if (pct > avg + 4) {
      reasons.push({
        impact: 'positive',
        text: `Sono profundo acima da sua média (${pct}% vs ${avg}%)`,
      });
    }
  }

  if (today.sleep_awakenings != null && today.sleep_awakenings >= 4) {
    reasons.push({
      impact: 'negative',
      text: `Sono fragmentado: ${today.sleep_awakenings} despertares durante a noite`,
    });
  } else if (today.sleep_awakenings != null && today.sleep_awakenings <= 1) {
    reasons.push({
      impact: 'positive',
      text: `Sono contínuo: poucos despertares (${today.sleep_awakenings}x)`,
    });
  }

  // Teto autonômico / estado autonômico — esse sinal pode limitar o recovery mesmo com sono ok.
  if (today.autonomic_state === 'sympathetic') {
    reasons.push({
      impact: 'negative',
      text:
        today.baevsky_si != null
          ? `Sistema nervoso em alerta (Baevsky ${Math.round(today.baevsky_si)}) limitando o recovery`
          : 'Sistema nervoso em alerta limitando o recovery',
    });
  } else if (today.autonomic_state === 'parasympathetic') {
    reasons.push({
      impact: 'positive',
      text:
        today.baevsky_si != null
          ? `Sistema nervoso em modo recuperação (Baevsky ${Math.round(today.baevsky_si)})`
          : 'Sistema nervoso em modo recuperação',
    });
  }

  return reasons;
}

// ─── Recovery Narrative ───────────────────────────────────────────────────────

export function buildRecoveryNarrative(today, baseline, state, trainingLoad, sleepDebt) {
  if (!today || !state) return '';

  const analysisLike = {
    today,
    baseline,
    trainingLoad,
    sleepDebt,
    physioState: state,
  };

  const decision = buildWorkoutDecision(analysisLike, {});
  if (!decision) return '';

  const baseHrv = baseline?.hrv?.d14 || baseline?.hrv?.d7;
  const hrvDelta = today.hrv && baseHrv ? pctDelta(today.hrv, baseHrv) : null;

  const baseSleep = baseline?.sleep?.d14 || baseline?.sleep?.d7;
  const sleepDelta = today.sleep_hours && baseSleep ? pctDelta(today.sleep_hours, baseSleep) : null;

  const pieces = [];

  pieces.push(decision.subheadline);

  if (hrvDelta != null) {
    if (hrvDelta > NARRATIVE_HRV_POSITIVE_PCT) {
      pieces.push(`Seu HRV está ${hrvDelta}% acima do seu baseline.`);
    } else if (hrvDelta < NARRATIVE_HRV_NEGATIVE_PCT) {
      pieces.push(`Seu HRV está ${Math.abs(hrvDelta)}% abaixo do seu baseline.`);
    } else {
      pieces.push('Seu HRV está próximo do seu padrão.');
    }
  }

  if (sleepDelta != null) {
    if (sleepDelta > NARRATIVE_SLEEP_MORE_PCT) {
      pieces.push('O sono desta noite foi melhor do que seu padrão recente.');
    } else if (sleepDelta < NARRATIVE_SLEEP_LESS_PCT) {
      pieces.push('Você dormiu menos do que seu padrão recente.');
    } else {
      pieces.push('O sono ficou próximo do seu padrão.');
    }
  }

  if (decision.mode === 'train_high') {
    pieces.push('Hoje existe margem para intensidade se o aquecimento confirmar essa sensação.');
  } else if (decision.mode === 'train_moderate') {
    pieces.push('Hoje a melhor escolha é uma dose moderada e controlada.');
  } else if (decision.mode === 'train_light') {
    pieces.push('Hoje vale manter o corpo em movimento, mas sem exigir demais.');
  } else {
    pieces.push('Hoje recuperar traz mais retorno do que insistir em treino.');
  }

  return pieces.join(' ');
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
  if (checkins.length < CORRELATION_MIN_CHECKINS) return [];

  // Ordena do mais ANTIGO p/ o mais RECENTE para parear sinal[i] com alvo[i+1].
  // (Sem dedup: a RLS + o filtro por usuário já garantem 1 registro por dia.)
  const chrono = [...checkins].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  // ANTI-CIRCULARIDADE: só correlacionamos contra alvos INDEPENDENTES do sinal.
  // Nunca contra recovery_score quando o sinal já é componente dele (HRV/RHR/sono)
  // — seria tautologia. Alvos válidos: HRV do dia seguinte (independente) e recovery
  // do dia seguinte SÓ p/ sinais que NÃO entram no recovery (dor, strain). Todo
  // achado passa pelos mesmos portões do gargalo: variação mínima, valores distintos,
  // anti quase-binário, |r|>=0,35 e p<=0,05.
  const HRV_NEXT = (c) => c?.hrv;
  const RECOVERY_NEXT = (c) => c?.recovery_score;

  const relations = [
    { signal: (c) => c.sleep_hours, target: HRV_NEXT, lag: 1, icon: '🌙',
      pos: 'Noites de mais sono aparecem com HRV ~{d}ms melhor no dia seguinte.',
      neg: 'Noites de mais sono aparecem com HRV ~{d}ms mais baixo no dia seguinte — vale observar o contexto.' },
    { signal: (c) => c.deep_sleep_pct, target: HRV_NEXT, lag: 1, icon: '🔬',
      pos: 'Mais sono profundo vem com HRV ~{d}ms melhor no dia seguinte.',
      neg: 'Mais sono profundo aparece com HRV ~{d}ms mais baixo no dia seguinte.' },
    { signal: (c) => c.stress ?? c.stress_level, target: HRV_NEXT, lag: 1, icon: '🧠',
      pos: 'Dias de stress mais alto aparecem com HRV ~{d}ms melhor no dia seguinte.',
      neg: 'Dias de stress mais alto reduzem seu HRV no dia seguinte em ~{d}ms.' },
    { signal: (c) => c.muscle_soreness ?? c.muscle_soreness_level, target: RECOVERY_NEXT, lag: 1, icon: '💪',
      pos: 'Mais dor muscular aparece com recovery ~{d} pts melhor no dia seguinte.',
      neg: 'Mais dor muscular puxa o recovery do dia seguinte para baixo (~{d} pts).' },
    { signal: (c) => c.daily_strain_accumulated ?? c.strain_accumulated, target: RECOVERY_NEXT, lag: 1, icon: '⚡',
      pos: 'Dias de carga mais alta aparecem com recovery ~{d} pts melhor no dia seguinte.',
      neg: 'Dias de carga mais alta reduzem o recovery do dia seguinte (~{d} pts).' },
  ];

  const out = [];
  for (const rel of relations) {
    const xs = [];
    const ys = [];
    for (let i = 0; i < chrono.length - rel.lag; i++) {
      const x = rel.signal(chrono[i]);
      const y = rel.target(chrono[i + rel.lag]);
      if (x != null && y != null && !Number.isNaN(Number(x)) && !Number.isNaN(Number(y))) {
        xs.push(Number(x));
        ys.push(Number(y));
      }
    }
    if (xs.length < CORRELATION_MIN_CHECKINS) continue;
    if (_coefVariation(xs) < BOTTLENECK_MIN_VARIATION) continue;
    if (new Set(xs).size < BOTTLENECK_MIN_DISTINCT) continue;
    const counts = {};
    for (const v of xs) counts[v] = (counts[v] || 0) + 1;
    const top2 = Object.values(counts).sort((a, b) => b - a).slice(0, 2).reduce((s, c) => s + c, 0);
    if (top2 / xs.length > 0.85) continue;

    const r = _pearson(xs, ys);
    if (r == null || Math.abs(r) < TREND_MIN_R) continue;          // |r| >= 0,35
    if (_corrPValue(r, xs.length) > CORRELATION_MAX_P) continue;   // p <= 0,05

    const meanX = xs.reduce((s, v) => s + v, 0) / xs.length;
    const meanY = ys.reduce((s, v) => s + v, 0) / ys.length;
    const hiY = ys.filter((_, i) => xs[i] > meanX);
    const loY = ys.filter((_, i) => xs[i] <= meanX);
    const avgHi = hiY.length ? hiY.reduce((s, v) => s + v, 0) / hiY.length : meanY;
    const avgLo = loY.length ? loY.reduce((s, v) => s + v, 0) / loY.length : meanY;
    const delta = Math.max(1, Math.round(Math.abs(avgHi - avgLo)));

    const positive = r > 0;
    out.push({
      icon: rel.icon,
      type: positive ? 'positive' : 'warning',
      text: (positive ? rel.pos : rel.neg).replace('{d}', String(delta)),
      r: Math.round(r * 100) / 100,
      samples: xs.length,
    });
  }

  return out.slice(0, 4);
}


// ─── Análise de Gargalo Pessoal ───────────────────────────────────────────────
// Descobre qual variável controlável tem a MAIOR associação com o recovery
// do próprio usuário. Baseado no achado de Rothschild et al. (2024): as
// variáveis-chave são individuais. Usa correlação de Pearson, exige variação
// mínima (variável "travada" não tem sinal) e tamanho de amostra mínimo.
// IMPORTANTE: comunica associação, não causalidade.

const BOTTLENECK_MIN_CHECKINS = 14;       // ~2 semanas
const BOTTLENECK_MIN_CORRELATION = 0.45;  // limiar contra falso positivo (validado por simulação)
const BOTTLENECK_MIN_VARIATION = 0.12;    // coef. de variação mínimo
const BOTTLENECK_MIN_DISTINCT = 3;        // mínimo de valores distintos (evita falso sinal de variável quase-binária)

function _pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null; // sem variação = sem sinal
  return num / (Math.sqrt(dx) * Math.sqrt(dy));
}

// Significância estatística de uma correlação: p-valor bicaudal exato via t de
// Student (t = r·√((n−2)/(1−r²))) usando a beta incompleta regularizada.
// Gate honesto: |r| alto em poucos dados pode ser ruído — exigir p baixo evita
// falso positivo. (Validado contra valores conhecidos.)
const CORRELATION_MAX_P = 0.05; // exige ~95% de confiança

function _lgamma(z) {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  z -= 1; let a = c[0]; const t = z + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}
function _betacf(a, b, x) {
  const FPMIN = 1e-300; const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d;
  for (let m = 1; m <= 100; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
    const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break;
  }
  return h;
}
function _betai(a, b, x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(_lgamma(a + b) - _lgamma(a) - _lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * _betacf(a, b, x) / a : 1 - bt * _betacf(b, a, 1 - x) / b;
}
/** p-valor bicaudal para a correlação de Pearson r com n pares. */
function _corrPValue(r, n) {
  if (n < 3) return 1;
  const df = n - 2;
  const rr = Math.min(Math.abs(r), 0.999999);
  const t2 = rr * rr * df / (1 - rr * rr);
  return _betai(df / 2, 0.5, df / (df + t2));
}

function _coefVariation(xs) {
  const n = xs.length;
  if (n < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  if (mean === 0) return 0;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return Math.sqrt(variance) / Math.abs(mean);
}

export function detectPersonalBottleneck(checkins) {
  checkins = _ensure(checkins);
  if (checkins.length < BOTTLENECK_MIN_CHECKINS) {
    return { ready: false, daysNeeded: BOTTLENECK_MIN_CHECKINS, daysHave: checkins.length };
  }

  // Variáveis candidatas: o que o usuário controla/registra.
  // direction: 'positive' = mais é melhor; 'negative' = mais é pior.
  const candidates = [
    { key: 'deep_sleep_pct', label: 'Sono profundo', unit: '%', direction: 'positive', icon: '🌙' },
    { key: 'sleep_hours', label: 'Horas de sono', unit: 'h', direction: 'positive', icon: '💤' },
    { key: 'sleep_score', label: 'Qualidade do sono', unit: 'pts', direction: 'positive', icon: '😴' },
    { key: 'rem_sleep_pct', label: 'Sono REM', unit: '%', direction: 'positive', icon: '🧠' },
    { key: 'sleep_awakenings', label: 'Despertares noturnos', unit: 'x', direction: 'negative', icon: '🌃' },
    { key: 'sleep_regularity_pct', label: 'Regularidade do sono', unit: '%', direction: 'positive', icon: '🕰️' },
    { key: 'stress', label: 'Stress', unit: '/5', direction: 'negative', icon: '😰' },
    { key: 'muscle_soreness', label: 'Dor muscular', unit: '/5', direction: 'negative', icon: '💪' },
    { key: 'hydration', label: 'Hidratação', unit: '/5', direction: 'positive', icon: '💧' },
  ];

  // Ordena do mais ANTIGO para o mais RECENTE, para parear "variável de hoje" com
  // "HRV de amanhã" (o dia seguinte na sequência temporal).
  const chrono = [...checkins].sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );

  const ranked = [];

  for (const c of candidates) {
    // Pares: variável do dia X  vs  HRV do dia X+1 (dia seguinte).
    // O HRV é um alvo fisiológico INDEPENDENTE — não contém stress/sono/etc,
    // evitando a circularidade que existiria ao correlacionar contra recovery_score
    // (que já é calculado a partir dessas mesmas variáveis subjetivas).
    const xs = [];
    const ys = [];
    for (let i = 0; i < chrono.length - 1; i++) {
      const x = chrono[i][c.key];
      const yRaw = chrono[i + 1].hrv; // HRV do dia seguinte
      if (
        x != null &&
        yRaw != null &&
        !Number.isNaN(Number(x)) &&
        !Number.isNaN(Number(yRaw))
      ) {
        xs.push(Number(x));
        ys.push(Number(yRaw));
      }
    }

    if (xs.length < BOTTLENECK_MIN_CHECKINS) continue;

    const variation = _coefVariation(xs);
    if (variation < BOTTLENECK_MIN_VARIATION) continue; // variável travada, sem sinal

    // Variável que só assume 2 valores (ex.: stress sempre 1 ou 2) gera
    // correlação instável e enganosa — exige diversidade real de valores.
    const distinctValues = new Set(xs).size;
    if (distinctValues < BOTTLENECK_MIN_DISTINCT) continue;

    // Anti "quase-binário disfarçado": ter 3 valores não basta se 2 deles
    // dominam quase tudo (ex.: stress = 2 em 19 dias, 1 em 3, 3 em 2).
    // Exige que os 2 valores mais comuns NÃO cubram mais de 85% dos dias.
    const _counts = {};
    for (const v of xs) _counts[v] = (_counts[v] || 0) + 1;
    const _top2 = Object.values(_counts).sort((a, b) => b - a).slice(0, 2).reduce((s, c) => s + c, 0);
    if (_top2 / xs.length > 0.85) continue;

    const r = _pearson(xs, ys);
    if (r == null) continue;

    if (Math.abs(r) < BOTTLENECK_MIN_CORRELATION) continue; // efeito fraco demais
    if (_corrPValue(r, xs.length) > CORRELATION_MAX_P) continue; // não significativo p/ esse n

    ranked.push({
      key: c.key,
      label: c.label,
      unit: c.unit,
      icon: c.icon,
      direction: c.direction,
      correlation: Math.round(r * 100) / 100,
      strength: Math.abs(r),
      samples: xs.length,
    });
  }

  if (ranked.length === 0) {
    return { ready: true, hasSignal: false };
  }

  ranked.sort((a, b) => b.strength - a.strength);

  const top = ranked[0];
  const strengthLabel =
    top.strength >= 0.6 ? 'forte' :
    top.strength >= 0.45 ? 'moderada' :
    'leve';

  return {
    ready: true,
    hasSignal: true,
    bottleneck: top,
    ranking: ranked,
    strengthLabel,
  };
}

// ─── Lagged Effect Analysis ───────────────────────────────────────────────────

export function detectLaggedEffects(checkins) {
  checkins = _ensure(checkins);
  checkins = [...checkins].sort((a, b) => (b.date > a.date ? 1 : -1));
    const effects = [];
  if (checkins.length < LAGGED_MIN_CHECKINS) return effects;

  // DESATIVADO (validado): "treino intenso -> queda de recovery ~48h depois" não se
  // sustenta nos dados (strain de baixa variância; r≈+0,17, ns) e disparava com n=2
  // — placebo. Cálculo preservado abaixo p/ reativação futura: remova o return.
  return effects;


  const intenseDays = checkins
    .map((c, i) => ({ c, i }))
    .filter(({ c, i }) => c.rpe >= RPE_HIGH_THRESHOLD && !c.rest_day && i - 2 >= 0);

  if (intenseDays.length >= 2) {
    const recoveries48 = intenseDays
      .map(({ i }) => checkins[i - 2])
      .filter(Boolean)
      .map((c) => c.recovery_score || 0);

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

  const analysisLike = {
    today,
    trainingLoad,
    sleepDebt,
    physioState: state,
  };

  const decision = buildWorkoutDecision(analysisLike, {});
  const sleepDebtHours = sleepDebt?.debt ?? 0;

  if (decision?.mode === 'train_high') {
    recs.push({
      id: 'train_high',
      icon: '🏋️',
      category: 'Treino',
      text: 'Hoje existe janela para um estímulo mais forte, desde que o aquecimento confirme boa resposta.',
    });
  } else if (decision?.mode === 'train_moderate') {
    recs.push({
      id: 'train_moderate',
      icon: '🚴',
      category: 'Treino',
      text: 'Treino moderado recomendado. Hoje o ganho está em consistência, não em exagero.',
    });
  } else if (decision?.mode === 'train_light') {
    recs.push({
      id: 'train_light',
      icon: '🌿',
      category: 'Treino',
      text: 'Hoje mantenha leve. Movimento ajuda, mas intensidade pesa mais do que rende.',
    });
  } else {
    recs.push({
      id: 'recover',
      icon: '🌙',
      category: 'Recuperação',
      text: 'Hoje priorize recuperação. Reduzir estresse e dormir bem traz mais retorno do que treinar forte.',
    });
  }

  if (sleepDebtHours > 3) {
    recs.push({
      id: 'sleep_debt',
      icon: '🌙',
      category: 'Sono',
      text: `Déficit de ${sleepDebtHours}h detectado. Hoje à noite, antecipe o horário de dormir.`,
    });
  }

  if ((today.hydration || 3) <= 2) {
    recs.push({
      id: 'hydration',
      icon: '💧',
      category: 'Hidratação',
      text: 'Sua hidratação está baixa. Reforce ingestão de água ao longo do dia.',
    });
  }

  if ((today.stress || 3) >= 4) {
    recs.push({
      id: 'stress',
      icon: '🧠',
      category: 'Stress',
      text: 'Stress elevado detectado. Hoje vale adicionar alguns minutos de respiração ou desaceleração.',
    });
  }

  if (trainingLoad?.risk === 'high') {
    recs.push({
      id: 'load_spike',
      icon: '⚠️',
      category: 'Carga',
      text: `Carga recente elevada (ACWR ${trainingLoad.ratio}). Hoje proteger rende mais do que insistir.`,
    });
  }

  try {
    const hasLoad = trainingLoad && trainingLoad.risk && trainingLoad.risk !== 'insufficient_data';
    const hasDebt = sleepDebt && (sleepDebt.debt || 0) > 0;
    const hasRatio = hasLoad && trainingLoad.ratio != null;

    const confidence =
      hasLoad && (hasDebt || hasRatio)
        ? 'Alta'
        : (hasLoad || hasDebt)
        ? 'Média'
        : 'Baixa';

    const provenance = [
      hasLoad ? 'training_load' : null,
      hasDebt ? 'sleep_debt' : null,
      today.hrv ? 'hrv' : null,
      today.recovery_score ? 'recovery_score' : null,
    ].filter(Boolean);

    return recs.slice(0, REC_MAX_COUNT).map((r) => ({ ...r, confidence, provenance }));
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
  const baselineInsights = getBaselineInsights(today, baseline);
  const correlations = detectCorrelations(checkins);
  const laggedEffects = detectLaggedEffects(checkins);
  const runningEconomy = calculateRunningEconomy(sessions);
  const performanceWindow = calculatePerformanceWindow(sessions, checkins);
  const cardiacDrift = detectCardiacDrift(sessions);
  const hrvAnomaly = detectHRVAnomaly(checkins, baseline);
  const healthSignals = assessHealthSignals(checkins, baseline);
  const baselineFreshness = assessBaselineFreshness(checkins);
  const personalBottleneck = detectPersonalBottleneck(checkins);
  const longTermTrends = detectLongTermTrends(checkins);

  const analysisBase = {
    today,
    baseline,
    trainingLoad,
    sleepDebt,
    physioState,
    whyScore,
    baselineInsights,
    correlations,
    laggedEffects,
    runningEconomy,
    performanceWindow,
    cardiacDrift,
    hrvAnomaly,
    healthSignals,
    baselineFreshness,
    personalBottleneck,
    longTermTrends,
  };

  const workoutPrescription = prescribeWorkout(analysisBase, { preferred_sports: ['Corrida'] });
  const decision = buildWorkoutDecision(analysisBase, { preferred_sports: ['Corrida'] });
  const narrative = buildRecoveryNarrative(today, baseline, physioState, trainingLoad, sleepDebt);
  const actionableRecs = getActionableRecs(today, physioState, sleepDebt, trainingLoad);

  return {
    ...analysisBase,
    narrative,
    actionableRecs,
    workoutPrescription,
    decision,
  };
}

// ─── Running Economy Engine ───────────────────────────────────────────────────
// economy = bpm / (km/h) — lower is better (heart works less per unit of speed)

export function calculateRunningEconomy(sessions) {
  const withValidDate = (sessions || []).filter((s) => {
    const dk = toDateKey(s.date);
    if (!dk) {
      console.warn('physio: calculateRunningEconomy — skipping session with invalid date', s.date);
      return false;
    }
    s._dateKey = dk;
    return true;
  });

  const runCandidates = withValidDate.filter((s) => s.sport && s.sport.toLowerCase().includes('corr'));

  let skippedCount = 0;
  const ratios = [];

  for (const s of runCandidates) {
    const hr = toNumber(s.heart_rate_avg);
    let speed = parseSpeedFromSession(s);

    if (speed == null && toNumber(s.avg_pace_min_per_km) != null && toNumber(s.avg_pace_min_per_km) > 0) {
      console.warn('physio: using legacy running economy fallback for session', s._dateKey);
      speed = Math.round((60 / s.avg_pace_min_per_km) * 100) / 100;
    }

    if (!hr || hr <= 0 || !speed || speed <= 0) {
      skippedCount++;
      continue;
    }

    const economy = hr / speed;
    if (!isFinite(economy)) {
      skippedCount++;
      continue;
    }

    ratios.push({
      date: s._dateKey,
      ratio: economy,
      fc: hr,
      pace: toNumber(s.avg_pace_min_per_km) ?? null,
    });
  }

  if (skippedCount > 0) {
    console.warn(`physio: calculateRunningEconomy — skipped ${skippedCount} sessions (missing hr or speed)`);
  }

  ratios.sort((a, b) => (a.date > b.date ? 1 : -1));
  if (ratios.length < RUNNING_ECONOMY_MIN_SESSIONS) return null;

  const mid = Math.floor(ratios.length / 2);
  const older = ratios.slice(0, mid);
  const recent = ratios.slice(mid);

  const avgOld = older.reduce((s, r) => s + r.ratio, 0) / older.length;
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

  periods.forEach((period) => {
    const periodSessions = sessions.filter((s) => s.time_of_day === period);
    if (periodSessions.length < PERF_WINDOW_MIN_PER_PERIOD) return;

    const nextDayRecoveries = periodSessions
      .map((s) => {
        const sessionDate = s.date;
        const nextDay = checkins.find((c) => {
          const d1 = new Date(sessionDate + 'T12:00:00');
          const d2 = new Date(c.date + 'T12:00:00');
          return Math.round((d2 - d1) / 86400000) === 1;
        });
        return nextDay?.recovery_score ?? null;
      })
      .filter((v) => v != null);

    if (nextDayRecoveries.length >= PERF_WINDOW_MIN_PER_PERIOD) {
      periodData[period] = {
        avgRecovery: Math.round(nextDayRecoveries.reduce((s, v) => s + v, 0) / nextDayRecoveries.length),
        count: nextDayRecoveries.length,
      };
    }
  });

  if (Object.keys(periodData).length < PERF_WINDOW_MIN_PERIODS) return null;

  const best = Object.entries(periodData).sort((a, b) => b[1].avgRecovery - a[1].avgRecovery)[0];

  const labels = {
    morning: 'manhã',
    afternoon: 'tarde',
    evening: 'noite',
    night: 'madrugada',
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
  const withValidDate = (sessions || []).filter((s) => {
    const dk = toDateKey(s.date);
    if (!dk) return false;
    s._dateKey = dk;
    return true;
  });

  const longRuns = withValidDate.filter((s) => {
    if (!s.sport || !s.sport.toLowerCase().includes('corr')) return false;
    const hr_avg = toNumber(s.heart_rate_avg);
    const hr_max = toNumber(s.heart_rate_max);
    const dur = toNumber(s.duration_minutes);
    return hr_avg != null && hr_avg > 0 && hr_max != null && hr_max > 0 && dur != null && dur >= CARDIAC_DRIFT_MIN_DURATION_MINUTES;
  });

  if (longRuns.length < CARDIAC_DRIFT_MIN_RUNS) return null;

  longRuns.sort((a, b) => (a._dateKey > b._dateKey ? 1 : -1));

  const driftEntries = longRuns
    .map((s) => {
      const hrStart = toNumber(s.heart_rate_avg);
      const hrMax = toNumber(s.heart_rate_max);
      const denom = Math.max(1, hrStart);
      const driftRel = (hrMax - hrStart) / denom;
      return { date: s._dateKey, drift: driftRel, duration: s.duration_minutes };
    })
    .filter((e) => isFinite(e.drift));

  if (driftEntries.length < CARDIAC_DRIFT_MIN_RUNS) return null;

  const recent = driftEntries.slice(-CARDIAC_DRIFT_RECENT_N);
  const validDrifts = recent.map((r) => r.drift).filter(isFinite);
  if (!validDrifts.length) return null;

  const recentAvgDrift = validDrifts.reduce((s, v) => s + v, 0) / validDrifts.length;
  if (!isFinite(recentAvgDrift) || recentAvgDrift <= CARDIAC_DRIFT_THRESHOLD) return null;

  const avgDriftPct = Math.round(recentAvgDrift * 100);

  return {
    avgDrift: avgDriftPct,
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
    .map((c) => c.hrv)
    .filter((v) => v != null && v > 0);

  if (recentHrv.length < HRV_ANOMALY_MIN_READINGS) return null;

  const mean = recentHrv.reduce((s, v) => s + v, 0) / recentHrv.length;
  const stdDev = Math.sqrt(recentHrv.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / recentHrv.length);

  if (!stdDev || stdDev === 0) return null;

  const zScore = (today.hrv - mean) / stdDev;
  const drop = Math.round(((mean - today.hrv) / mean) * 100);

  if (zScore > HRV_ANOMALY_ZSCORE_THRESHOLD) return null;

  const baseRhr = baseline?.rhr?.d14 || baseline?.rhr?.d7;
  const rhrElevated =
    today.resting_hr &&
    baseRhr &&
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

// ─── Health Monitor ───────────────────────────────────────────────────────────
// Fase 0 = HRV + RHR.
// Fase 1 acende skin_temp / SpO₂ / respiração (slots em flags[], status:'pending');
// o gate de 2+ e a persistência continuam idênticos quando chegarem.

/**
 * Evaluates the HRV flag for a checkin against a 14-day window.
 * Returns { zScore, mean, raised } or null if data is insufficient.
 */
function _evalHrvFlag(checkinHrv, window14) {
  if (checkinHrv == null) return null;
  const vals = window14.map((c) => c.hrv).filter((v) => v != null && v > 0);
  if (vals.length < HRV_ANOMALY_MIN_READINGS) return null;
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const stdDev = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
  if (!stdDev || stdDev === 0) return null;
  const z = (checkinHrv - mean) / stdDev;
  return { zScore: z, mean, raised: z <= HRV_ANOMALY_ZSCORE_THRESHOLD };
}

/**
 * Evaluates all live flags for a checkin and returns { flagCount, hrvResult, rhrRaised }.
 * window14: array of checkins used for HRV z-score computation.
 * baseRhr: moving-average RHR baseline.
 * Simplification: baseRhr is the same across today/yesterday evaluations —
 * the 1-day delta in the baseline is negligible and avoids a full re-computation.
 */
function _evalFlags(c, window14, baseRhr) {
  if (!c || !c.hrv) return { flagCount: 0, hrvResult: null, rhrRaised: false };
  const hrvResult = _evalHrvFlag(c.hrv, window14);
  const rhrRaised = !!(c.resting_hr && baseRhr && c.resting_hr > baseRhr * HRV_ANOMALY_RHR_ELEVATED_PCT);
  const flagCount = (hrvResult?.raised ? 1 : 0) + (rhrRaised ? 1 : 0);
  // TODO(anel Fase 1): add skin_temp, spo2, respiratory flags here; gate stays at HEALTH_FLAG_GATE
  return { flagCount, hrvResult, rhrRaised };
}

/**
 * assessHealthSignals(checkins, baseline)
 *
 * Promotes HRV+RHR anomaly detection from an ephemeral alert to a persistent
 * Health surface with multi-flag gate, consecutive-day persistence, and history.
 *
 * Does NOT modify Recovery, Sleep score, or Strain formulas.
 *
 * @param {Array}  checkins - sorted newest-first, already filtered by user
 * @param {object} baseline - from buildBaseline(checkins); passed in to avoid re-computation
 * @returns {object|null}
 */
export function assessHealthSignals(checkins, baseline) {
  checkins = _ensure(checkins);
  if (!checkins || checkins.length === 0) return null;

  const today = checkins[0];
  const baseHrv = baseline?.hrv?.d14 || baseline?.hrv?.d7;
  const baseRhr = baseline?.rhr?.d14 || baseline?.rhr?.d7;

  // Maturity: need HEALTH_MIN_BASELINE_NIGHTS past checkins with HRV data.
  // Counted from checkins[1..] so today doesn't inflate the count.
  const pastHrvCount = checkins.slice(1).filter((c) => c.hrv != null && c.hrv > 0).length;

  if (pastHrvCount < HEALTH_MIN_BASELINE_NIGHTS || !baseHrv) {
    return {
      state: 'calibrating',
      flagCount: 0,
      sleepHoursToday: today.sleep_hours ?? null,
      flags: _buildHealthFlagsList(today, null, null, baseHrv, baseRhr),
      history: [],
    };
  }

  // Evaluate today
  const window14Today = checkins.slice(0, 14);
  const todayEval = _evalFlags(today, window14Today, baseRhr);
  const desvioHoje = todayEval.flagCount >= HEALTH_FLAG_GATE;

  // Evaluate yesterday (checkins[1]) using its own rolling window.
  // Using baseRhr from today's baseline — 1-day delta is negligible.
  const yesterday = checkins[1] ?? null;
  const window14Yesterday = checkins.slice(1, 15);
  const yesterdayEval = yesterday ? _evalFlags(yesterday, window14Yesterday, baseRhr) : { flagCount: 0 };
  const desvioOntem = yesterdayEval.flagCount >= HEALTH_FLAG_GATE;

  const state = !desvioHoje ? 'normal' : desvioOntem ? 'sustained' : 'acute';

  // Build deviation history (past days only — up to ~45 days back)
  const HIST_LIMIT = Math.min(checkins.length, 46);

  // Pass 1: determine which past days had a deviation
  const hasDesvio = new Map();
  for (let i = 1; i < HIST_LIMIT; i++) {
    const c = checkins[i];
    const win = checkins.slice(i, i + 14);
    hasDesvio.set(c.date, _evalFlags(c, win, baseRhr).flagCount >= HEALTH_FLAG_GATE);
  }

  // Pass 2: classify each deviation day
  const history = [];
  for (let i = 1; i < HIST_LIMIT; i++) {
    const c = checkins[i];
    if (!hasDesvio.get(c.date)) continue;
    // "sustained" when the more-recent day (checkins[i-1]) also deviated
    const newerHasDesvio = i > 0 && hasDesvio.get(checkins[i - 1]?.date);
    history.push({ date: c.date, state: newerHasDesvio ? 'sustained' : 'acute' });
  }

  return {
    state,
    flagCount: todayEval.flagCount,
    sleepHoursToday: today.sleep_hours ?? null,
    flags: _buildHealthFlagsList(today, todayEval.hrvResult, todayEval.rhrRaised, baseHrv, baseRhr),
    history,
  };
}

/**
 * Builds the flags[] array for the output shape.
 * hrvResult: return value of _evalHrvFlag (may be null before maturity)
 * rhrRaised: boolean
 */
function _buildHealthFlagsList(today, hrvResult, rhrRaised, baseHrv, baseRhr) {
  const todayHrv = today?.hrv ?? null;
  const todayRhr = today?.resting_hr ?? null;

  const hrvDelta = todayHrv != null && baseHrv != null
    ? Math.round(((todayHrv - baseHrv) / baseHrv) * 100) : null;
  const rhrDelta = todayRhr != null && baseRhr != null
    ? Math.round(((todayRhr - baseRhr) / baseRhr) * 100) : null;

  const dirOf = (delta, lowerIsBetter) => {
    if (delta == null) return 'neutral';
    if (delta === 0) return 'neutral';
    return (delta > 0) === lowerIsBetter ? 'bad' : 'good';
  };

  return [
    {
      id: 'hrv',
      label: 'HRV',
      today: todayHrv,
      baseline: baseHrv != null ? Math.round(baseHrv) : null,
      deltaPct: hrvDelta,
      direction: dirOf(hrvDelta, false), // higher HRV is better
      raised: hrvResult?.raised ?? false,
      status: 'live',
    },
    {
      id: 'rhr',
      label: 'FC de repouso',
      today: todayRhr,
      baseline: baseRhr != null ? Math.round(baseRhr) : null,
      deltaPct: rhrDelta,
      direction: dirOf(rhrDelta, true), // lower RHR is better
      raised: rhrRaised ?? false,
      status: 'live',
    },
    // TODO(anel Fase 1): populate today/baseline/direction and flip to status:'live' when ring data arrives
    { id: 'skin_temp',   label: 'Temperatura de pele', today: null, baseline: null, deltaPct: null, direction: 'neutral', raised: false, status: 'pending' },
    { id: 'spo2',        label: 'SpO2',                today: null, baseline: null, deltaPct: null, direction: 'neutral', raised: false, status: 'pending' },
    { id: 'respiratory', label: 'Respiração',          today: null, baseline: null, deltaPct: null, direction: 'neutral', raised: false, status: 'pending' },
  ];
}

// Diferença em dias entre duas datas 'YYYY-MM-DD' (UTC midnight, evita drift de fuso).
function _dayDiff(aKey, bKey) {
  const a = Date.parse(aKey + 'T00:00:00Z');
  const b = Date.parse(bKey + 'T00:00:00Z');
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((a - b) / 86400000);
}

// Bucket de frescor: 0 = fresh, 1 = aging, 2 = stale.
function _freshnessBucket(days) {
  if (days == null) return 0;
  if (days <= BL_FRESH_MAX_DAYS) return 0;
  if (days >= BL_STALE_MIN_DAYS) return 2;
  return 1;
}

/**
 * assessBaselineFreshness(checkins, now = new Date())
 *
 * Sinaliza quando o baseline pessoal está defasado por lacuna de dias.
 * NÃO altera Recovery / Sono / Strain — é uma anotação de confiança.
 *
 * Eixo ORTOGONAL ao 'calibrating' do recovery: o score continua sendo calculado;
 * isto só qualifica a confiança dele.
 *
 * @param {Array}  checkins - ordenado do mais novo p/ o mais antigo, já filtrado por usuário
 * @param {Date}   now      - injetável p/ testes; default = agora
 * @returns {{
 *   status: 'fresh'|'aging'|'stale',
 *   daysSinceLastReading: number,       // hoje - data do check-in mais recente (≥0)
 *   gapBeforeLatest: number|null,       // data[0] - data[1] (null se < 2 check-ins)
 *   reason: 'reading_age'|'baseline_gap'|null  // o que puxou p/ não-fresh
 * } | null}   // null se < 1 check-in ou datas inválidas
 */
export function assessBaselineFreshness(checkins, now = new Date()) {
  checkins = _ensure(checkins);
  if (!checkins || checkins.length === 0) return null;

  const latestKey = toDateKey(checkins[0]?.date);
  if (!latestKey) return null;

  const nowKey = toDateKey(now);
  // idade da leitura: hoje - data do check-in mais recente (nunca negativa)
  const rawAge = nowKey ? _dayDiff(nowKey, latestKey) : 0;
  const daysSinceLastReading = rawAge == null ? 0 : Math.max(0, rawAge);

  // gap antes da última: data[0] - data[1] (só se houver 2+ check-ins com data válida)
  let gapBeforeLatest = null;
  const prevKey = checkins.length > 1 ? toDateKey(checkins[1]?.date) : null;
  if (prevKey) {
    const g = _dayDiff(latestKey, prevKey);
    if (g != null) gapBeforeLatest = Math.max(0, g);
  }

  const bAge = _freshnessBucket(daysSinceLastReading);
  const bGap = _freshnessBucket(gapBeforeLatest);
  const worst = Math.max(bAge, bGap);

  const status = worst === 0 ? 'fresh' : worst === 1 ? 'aging' : 'stale';
  let reason = null;
  if (worst > 0) reason = bAge >= bGap ? 'reading_age' : 'baseline_gap';

  return { status, daysSinceLastReading, gapBeforeLatest, reason };
}

/**
 * Detector de regime de sono. NAO altera o recovery — reporta se a noite esta
 * dentro do dominio de validade do score.
 * Silencio > sinal fabricado: sem awake_minutes, retorna state 'unknown' e
 * inDomain true (nao penaliza noite so por falta de dado).
 */
export function assessSleepRegime(checkin) {
  const h = Number(checkin?.sleep_hours);
  const aw = Number(checkin?.awake_minutes);
  if (!Number.isFinite(h) || h <= 0 || !Number.isFinite(aw) || aw < 0) {
    return { state: 'unknown', efficiency: null, awakeMinutes: null, inDomain: true };
  }
  const asleep = h * 60;
  const bed = asleep + aw;
  if (bed <= 0) {
    return { state: 'unknown', efficiency: null, awakeMinutes: null, inDomain: true };
  }
  const efficiency = asleep / bed;
  let state = 'consolidated';
  if (efficiency < C.SLEEP_EFF_SEVERE) state = 'severely_fragmented';
  else if (efficiency < C.SLEEP_EFF_CONSOLIDATED) state = 'fragmented';
  return {
    state,
    efficiency,
    awakeMinutes: aw,
    inDomain: efficiency >= C.SLEEP_EFF_CONSOLIDATED,
  };
}

/**
 * Arquitetura da noite para exibicao. NAO gera score nem entra em formula.
 * base 'bed' = tempo na cama (inclui acordado, soma 100). base 'sleep' = so o sono.
 * Silencio > sinal fabricado: sem dado, retorna null ou omite o segmento.
 */
export function buildSleepArchitecture(checkin, { base = 'bed' } = {}) {
  const h = Number(checkin?.sleep_hours);
  const deepPct = Number(checkin?.deep_sleep_pct);
  if (!Number.isFinite(h) || h <= 0 || !Number.isFinite(deepPct)) return null;

  const remRaw = Number(checkin?.rem_sleep_pct);
  const hasRem = Number.isFinite(remRaw) && remRaw > 0;
  const remPct = hasRem ? remRaw : 0;
  if (deepPct + remPct > 100) {
    return { valid: false, reason: 'stage_sum_over_100', segments: [] };
  }

  const tstMin = h * 60;
  const awRaw = Number(checkin?.awake_minutes);
  const awakeMin = Number.isFinite(awRaw) && awRaw >= 0 ? awRaw : null;
  const useBed = base === 'bed' && awakeMin != null;

  const deepMin  = tstMin * deepPct / 100;
  const remMin   = tstMin * remPct / 100;
  const lightMin = Math.max(0, tstMin - deepMin - remMin);

  const raw = [
    { id: 'deep',  label: 'Profundo', minutes: deepMin },
    ...(hasRem ? [{ id: 'rem', label: 'REM', minutes: remMin }] : []),
    { id: 'light', label: 'Leve', minutes: lightMin },
    ...(useBed ? [{ id: 'awake', label: 'Acordado', minutes: awakeMin }] : []),
  ];
  const total = raw.reduce((s, x) => s + x.minutes, 0);

  // maior resto: os pct SEMPRE somam exatamente 100
  const exact = raw.map((x) => (total > 0 ? (x.minutes / total) * 100 : 0));
  const floors = exact.map((v) => Math.floor(v));
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < order.length && left > 0; k++, left--) floors[order[k].i] += 1;

  const regime = assessSleepRegime(checkin);
  return {
    valid: true,
    base: useBed ? 'bed' : 'sleep',
    baseFellBack: base === 'bed' && !useBed,
    canSwitchBase: awakeMin != null,
    totalMinutes: total,
    tstMin,
    awakeMin,
    awakenings: Number.isFinite(Number(checkin?.sleep_awakenings)) ? Number(checkin.sleep_awakenings) : null,
    efficiency: regime?.efficiency ?? null,
    segments: raw.map((x, i) => ({ ...x, pct: floors[i] })),
  };
}

/**
 * Mediana pessoal de minutos por estagio nas ultimas N noites (exclui hoje).
 * Retorna null com menos de MIN noites — nunca inventa referencia.
 */
export function sleepStageNormals(recentCheckins = [], n = 14, min = 7) {
  const rows = (recentCheckins || [])
    .slice(0, n)
    .map((c) => buildSleepArchitecture(c, { base: 'bed' }))
    .filter((a) => a && a.valid);
  if (rows.length < min) return null;
  const med = (arr) => {
    const s = arr.filter((v) => v != null).sort((a, b) => a - b);
    if (!s.length) return null;
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const pick = (id) => med(rows.map((r) => r.segments.find((s) => s.id === id)?.minutes ?? null));
  return { nights: rows.length, deep: pick('deep'), rem: pick('rem'), light: pick('light'), awake: pick('awake') };
}

// ─── Async Analysis Wrapper ───────────────────────────────────────────────────

function _djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(36);
}

function _cacheKey(checkins, sessions) {
  try {
    const c = JSON.stringify(
      checkins.slice(0, 15).map((c) => ({
        d: c.date,
        r: c.recovery_score,
        h: c.hrv,
        sh: c.sleep_hours,
        sq: c.sleep_quality,
        snt: c.sleep_need_tonight,
      }))
    );

    const s = JSON.stringify(
      (sessions || []).slice(0, 10).map((s) => ({
        d: s.date,
        st: s.strain_score,
      }))
    );

    return 'physio_v1_' + _djb2(c + s);
  } catch {
    return null;
  }
}

const _memCache = new Map();
// _memCacheOrder mantém a ordem real de inserção para LRU correto.
const _memCacheOrder = [];

function _readCache(key, ttlMinutes) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > ttlMinutes * 60 * 1000) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    const entry = _memCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > ttlMinutes * 60 * 1000) {
      _memCache.delete(key);
      const idx = _memCacheOrder.indexOf(key);
      if (idx !== -1) _memCacheOrder.splice(idx, 1);
      return null;
    }
    return entry.data;
  }
}

function _writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // LRU real: remove o item mais antigo pelo índice 0 do array de ordem.
    if (_memCache.size >= 20) {
      const oldest = _memCacheOrder.shift();
      if (oldest) _memCache.delete(oldest);
    }
    // Se a chave já existe, remove da posição antiga no array de ordem antes de reinserir.
    const existingIdx = _memCacheOrder.indexOf(key);
    if (existingIdx !== -1) _memCacheOrder.splice(existingIdx, 1);
    _memCacheOrder.push(key);
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
 */
export async function runPhysiologicalAnalysisAsync(checkins, sessions = [], options = {}) {
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

  if (result && key) _writeCache(key, result);
  return result;
}

// ─── Sleep Consistency ────────────────────────────────────────────────────────

export function calculateSleepConsistency(checkins) {
  checkins = _ensure(checkins);

  const withTimes = checkins
    .slice(0, 14)
    .filter((c) => c.sleep_start_time)
    .map((c) => {
      const [h, m] = c.sleep_start_time.split(':').map(Number);
      let mins = h * 60 + m;
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
    discovery:
      stdDev < SLEEP_CONSISTENCY_GOOD_STDDEV
        ? {
            icon: '⏰',
            title: 'Horário de sono consistente',
            text: `Você dorme no mesmo horário com variação de apenas ${Math.round(stdDev)} minutos. Regularidade aumenta a qualidade do sono profundo.`,
            sentiment: 'positive',
            confidence: withTimes.length >= SLEEP_CONSISTENCY_HIGH_CONFIDENCE ? 'Alta' : 'Média',
            days: withTimes.length,
          }
        : stdDev > SLEEP_CONSISTENCY_BAD_STDDEV
        ? {
            icon: '🌙',
            title: 'Horário de sono irregular',
            text: `Seu horário de dormir varia ${Math.round(stdDev)} minutos em média. Regularidade no sono melhora o HRV matinal.`,
            sentiment: 'negative',
            confidence: withTimes.length >= SLEEP_CONSISTENCY_HIGH_CONFIDENCE ? 'Alta' : 'Média',
            days: withTimes.length,
          }
        : null,
  }; 
}
// ─── Tendências de Longo Prazo (Fronteira 3) ──────────────────────────────────
// Responde "estou melhorando ao longo das semanas?". Usa regressão linear sobre
// a série cronológica e SÓ declara tendência quando ela é estatisticamente
// limpa (|r| >= limiar). Caso contrário, diz "estável" — sem inventar direção
// a partir de ruído. Mesma filosofia da auditoria: só afirma o que os dados sustentam.

const TREND_MIN_DAYS = 14;
const TREND_MIN_R = 0.35; // abaixo disso, é oscilação, não tendência

function _linearTrend(values) {
  const ys = values.filter((v) => v != null && !Number.isNaN(Number(v))).map(Number);
  const n = ys.length;
  if (n < TREND_MIN_DAYS) return { ready: false, days: n };

  const xs = ys.map((_, i) => i);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den ? num / den : 0;

  // R² e r (sinal do slope) para medir quão limpa é a tendência
  const yhat = xs.map((x) => my + slope * (x - mx));
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (ys[i] - yhat[i]) ** 2;
    ssTot += (ys[i] - my) ** 2;
  }
  const r2 = ssTot ? 1 - ssRes / ssTot : 0;
  const r = Math.sqrt(Math.max(0, r2)) * (slope >= 0 ? 1 : -1);

  return {
    ready: true,
    days: n,
    slope,
    r: Math.round(r * 100) / 100,
    totalChange: Math.round(slope * (n - 1) * 10) / 10,
    hasTrend: Math.abs(r) >= TREND_MIN_R && _corrPValue(r, n) <= CORRELATION_MAX_P,
    direction: slope >= 0 ? 'up' : 'down',
  };
}

export function detectLongTermTrends(checkins) {
  checkins = _ensure(checkins);

  // cronológico crescente (antigo → novo)
  const chrono = [...checkins].sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );

  // Série RMSSDmean 7d: para cada posição i, média dos últimos RMSSD_MEAN_WINDOW dias
  const rmssdMean7d = chrono.map((_, i) => {
    const win = chrono
      .slice(Math.max(0, i - C.RMSSD_MEAN_WINDOW + 1), i + 1)
      .map((c) => c.hrv)
      .filter((v) => v != null && v > 0);
    return win.length >= C.RMSSD_MEAN_WINDOW ? win.reduce((a, b) => a + b, 0) / win.length : null;
  });

  // higherIsBetter define o sentimento da direção
  // IMPORTANTE: usamos apenas DADOS CRUS do Zepp, cuja definição nunca mudou.
  // O recovery_score foi recalibrado (mudança de fórmula) ao longo do histórico,
  // então sua "tendência" misturaria duas réguas diferentes — seria um artefato,
  // não uma mudança fisiológica real. Por isso ele fica de fora.
  const metrics = [
    // HRV FUNDIDO (2026-07-11): o veredito de tendência do HRV vem da série
    // suavizada de 7 dias (rmssdMean7d) — mais robusta ao ruído diário. A
    // linha crua e a suavizada diziam a mesma coisa duas vezes na UI.
    // A chave continua 'hrv' (é o mesmo sinal; só muda a série que o mede),
    // preservando o contrato com consumidores e testes.
    { key: 'hrv', smoothed: true, label: 'HRV', unit: 'ms', higherIsBetter: true, icon: '💓' },
    { key: 'resting_hr', label: 'FC de repouso', unit: 'bpm', higherIsBetter: false, icon: '❤️' },
    // 'Sono (score)' e não 'Qualidade do sono': cabe em 1 linha na tabela sem
    // truncar, e o '(score)' o distingue de 'Sono profundo' (que é % de fase).
    { key: 'sleep_score', label: 'Sono (score)', unit: 'pts', higherIsBetter: true, icon: '😴' },
    { key: 'deep_sleep_pct', label: 'Sono profundo', unit: '%', higherIsBetter: true, icon: '🌙' },
  ];
  const results = [];

  for (const m of metrics) {
    const series = m.smoothed
      ? rmssdMean7d
      : chrono.map((c) => c[m.key]);
    const t = _linearTrend(series);
    if (!t.ready) continue;

    let sentiment = 'neutral';
    if (t.hasTrend) {
      const improving = m.higherIsBetter ? t.direction === 'up' : t.direction === 'down';
      sentiment = improving ? 'positive' : 'negative';
    }

    // Última leitura válida da série — a UI mostra o valor vivo nas métricas
    // estáveis e o delta do período nas que têm tendência.
    const lastValid = [...series].reverse().find((v) => v != null && !isNaN(v));

    results.push({
      key: m.key,
      label: m.label,
      unit: m.unit,
      icon: m.icon,
      days: t.days,
      hasTrend: t.hasTrend,
      direction: t.direction,
      totalChange: t.totalChange,
      current: lastValid != null ? Math.round(lastValid * 10) / 10 : null,
      r: t.r,
      sentiment,
    });
  }

  const anyReady = results.length > 0;
  const trending = results.filter((x) => x.hasTrend);

  return {
    ready: anyReady,
    daysNeeded: TREND_MIN_DAYS,
    metrics: results,
    hasAnyTrend: trending.length > 0,
  };
}
// ─── Helpers estatísticos expostos (Swing 1 — expansão) ──────────────────────
// Reuso pela camada de UI (ex.: scatter da Trends) e blindagem por teste contra
// valores de referência (scipy). São a base de TODOS os gates anti-placebo.
export { _pearson as pearson, _corrPValue as corrPValue, _coefVariation as coefVariation };
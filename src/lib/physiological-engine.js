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

export function calculateSleepDebt(checkins, targetHours = 8) {
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
  const recovery = today.recovery_score || 50;
  const fatigueScore = today.fatigue_score || 50;
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
  const baseSleepHr = baseline?.sleepHr?.d14 || baseline?.sleepHr?.d7;

  if (today.hrv && baseHrv) {
    const d = pctDelta(today.hrv, baseHrv);
    if (d != null && d < WHY_HRV_NEGATIVE_PCT) {
      reasons.push({ impact: 'negative', text: `HRV reduzido (${d}% abaixo do seu baseline de ${Math.round(baseHrv)}ms)` });
    } else if (d != null && d > WHY_HRV_POSITIVE_PCT) {
      reasons.push({ impact: 'positive', text: `HRV elevado (${d}% acima do seu baseline)` });
    }
  }

  if (today.resting_hr && baseRhr) {
    const d = pctDelta(today.resting_hr, baseRhr);
    if (d != null && d > WHY_RHR_HIGH_PCT) {
      reasons.push({ impact: 'negative', text: `FC em repouso acima do normal (+${d}% vs. baseline de ${Math.round(baseRhr)} bpm)` });
    }
  }

  if (today.sleep_quality && baseSleep) {
    const d = pctDelta(today.sleep_quality, baseSleep);
    if (d != null && d < WHY_SLEEP_NEGATIVE_PCT) {
      reasons.push({ impact: 'negative', text: `Qualidade do sono abaixo do seu padrão (${d}%)` });
    } else if (d != null && d > WHY_SLEEP_POSITIVE_PCT) {
      reasons.push({ impact: 'positive', text: `Sono de boa qualidade (${d}% acima do normal)` });
    }
  }

  // Sono profundo vs sua média — o sinal de sono que mais costuma pesar
  if (today.deep_sleep_pct != null && today.deep_sleep_pct > 0 && baseDeepSleep) {
    const pct = Math.round(today.deep_sleep_pct);
    const avg = Math.round(baseDeepSleep);
    if (pct < avg - 4) {
      reasons.push({ impact: 'negative', text: `Sono profundo baixo: ${pct}% vs sua média de ${avg}%` });
    } else if (pct > avg + 4) {
      reasons.push({ impact: 'positive', text: `Sono profundo acima da sua média (${pct}% vs ${avg}%)` });
    }
  }

  // Sono fragmentado — despertares noturnos
  if (today.sleep_awakenings != null && today.sleep_awakenings >= 4) {
    reasons.push({
      impact: 'negative',
      text: `Sono fragmentado: você acordou ${today.sleep_awakenings}x essa noite`,
    });
  } else if (today.sleep_awakenings != null && today.sleep_awakenings <= 1) {
    reasons.push({
      impact: 'positive',
      text: `Sono contínuo: poucos despertares (${today.sleep_awakenings}x)`,
    });
  }

  // FC durante o sono elevada vs baseline — sinal precoce de stress/sobrecarga
  if (today.sleep_heart_rate != null && today.sleep_heart_rate > 0 && baseSleepHr) {
    const hr = Math.round(today.sleep_heart_rate);
    const avg = Math.round(baseSleepHr);
    if (hr > avg + 3) {
      reasons.push({
        impact: 'negative',
        text: `FC durante o sono elevada (${hr} vs sua média de ${avg} bpm)`,
      });
    }
  }

  if ((today.stress || 0) >= WHY_STRESS_HIGH) {
    reasons.push({ impact: 'negative', text: `Stress elevado hoje (${today.stress}/5) pesando na recuperação` });
  }
  if ((today.fatigue_score || 0) > WHY_FATIGUE_HIGH) {
    reasons.push({ impact: 'negative', text: `Fadiga acumulada alta (${Math.round(today.fatigue_score)}/100)` });
  }
  if ((today.muscle_soreness || 0) >= WHY_SORENESS_HIGH) {
    reasons.push({ impact: 'negative', text: `Dor muscular significativa (${today.muscle_soreness}/5)` });
  }
  if ((today.energy || 0) >= WHY_ENERGY_HIGH) {
    reasons.push({ impact: 'positive', text: `Energia subjetiva elevada (${today.energy}/5)` });
  }
  if ((today.mood || 0) >= WHY_MOOD_HIGH) {
    reasons.push({ impact: 'positive', text: `Mood e disposição positivos (${today.mood}/5)` });
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
  checkins = [...checkins].sort((a, b) => (b.date > a.date ? 1 : -1));
  const insights = [];
  if (checkins.length < CORRELATION_MIN_CHECKINS) return insights;

  // Sono RELATIVO ao seu padrão pessoal, não a um limiar genérico (7h30).
  // Compara seus dias de "mais sono" (terço superior) vs "menos sono" (terço
  // inferior) DOS SEUS PRÓPRIOS DADOS. Assim o insight dispara mesmo para quem
  // dorme numa faixa estreita — desde que haja variação real (filtros de segurança
  // herdados da lição do gargalo: mínimo de valores distintos + grupos suficientes).
  {
    const sleepValues = checkins
      .map((c) => c.sleep_hours)
      .filter((v) => v != null && v > 0);
    const distinctSleep = new Set(sleepValues.map((v) => Math.round(v * 2) / 2)).size;

    if (sleepValues.length >= CORRELATION_MIN_CHECKINS && distinctSleep >= 4) {
      const sorted = [...sleepValues].sort((a, b) => a - b);
      const p33 = sorted[Math.floor(sorted.length / 3)];
      const p66 = sorted[Math.floor((2 * sorted.length) / 3)];

      // Só faz sentido se os terços forem realmente distintos
      if (p66 - p33 >= 0.5) {
        const highDays = checkins.filter((c) => c.sleep_hours >= p66);
        const lowDays = checkins.filter((c) => c.sleep_hours > 0 && c.sleep_hours <= p33);

        if (highDays.length >= 3 && lowDays.length >= 3) {
          const avgHigh = highDays.reduce((s, c) => s + (c.recovery_score || 0), 0) / highDays.length;
          const avgLow = lowDays.reduce((s, c) => s + (c.recovery_score || 0), 0) / lowDays.length;
          const diff = avgHigh - avgLow;

          if (diff > SLEEP_RECOVERY_DIFF_MIN) {
            insights.push({
              icon: '🌙',
              type: 'positive',
              text: `Suas noites de mais sono (${p66.toFixed(1)}h+) trazem Recovery ~${Math.round(diff)} pontos maior que as de menos sono (até ${p33.toFixed(1)}h)`,
            });
          }
        }
      }
    }
  }

  const highRpeDays = checkins.filter((c, i) => c.rpe >= RPE_HIGH_THRESHOLD && i - 1 >= 0);
  if (highRpeDays.length >= 2) {
    const afterHighRpe = highRpeDays
      .map((_, i) => {
        const idx = checkins.indexOf(highRpeDays[i]);
        return checkins[idx - 1];
      })
      .filter(Boolean);

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

  const highStressDays = checkins.filter((c) => (c.stress || 0) >= STRESS_HIGH_CORR && c.hrv);
  const lowStressDays = checkins.filter((c) => (c.stress || 0) <= STRESS_LOW_CORR && c.hrv);

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

  const goodHydration = checkins.filter((c) => (c.hydration || 0) >= HYDRATION_GOOD_THRESHOLD);
  const poorHydration = checkins.filter((c) => c.hydration > 0 && c.hydration <= HYDRATION_POOR_THRESHOLD);

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

    const r = _pearson(xs, ys);
    if (r == null) continue;

    if (Math.abs(r) < BOTTLENECK_MIN_CORRELATION) continue; // efeito fraco demais

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
    personalBottleneck,
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
    hasTrend: Math.abs(r) >= TREND_MIN_R,
    direction: slope >= 0 ? 'up' : 'down',
  };
}

export function detectLongTermTrends(checkins) {
  checkins = _ensure(checkins);

  // cronológico crescente (antigo → novo)
  const chrono = [...checkins].sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );

  // higherIsBetter define o sentimento da direção
  const metrics = [
    { key: 'hrv', label: 'HRV', unit: 'ms', higherIsBetter: true, icon: '💓' },
    { key: 'resting_hr', label: 'FC de repouso', unit: 'bpm', higherIsBetter: false, icon: '❤️' },
    { key: 'recovery_score', label: 'Recovery', unit: 'pts', higherIsBetter: true, icon: '🔋' },
    { key: 'sleep_score', label: 'Qualidade do sono', unit: 'pts', higherIsBetter: true, icon: '😴' },
  ];

  const results = [];

  for (const m of metrics) {
    const series = chrono.map((c) => c[m.key]);
    const t = _linearTrend(series);
    if (!t.ready) continue;

    let sentiment = 'neutral';
    if (t.hasTrend) {
      const improving = m.higherIsBetter ? t.direction === 'up' : t.direction === 'down';
      sentiment = improving ? 'positive' : 'negative';
    }

    results.push({
      key: m.key,
      label: m.label,
      unit: m.unit,
      icon: m.icon,
      days: t.days,
      hasTrend: t.hasTrend,
      direction: t.direction,
      totalChange: t.totalChange,
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
// ─── Physiological Intelligence Engine ───────────────────────────────────────
// All analysis compares the user to THEMSELVES — no generic population averages.

import { ensureNormalized } from './physio-normalize.js';

function _ensure(checkins) {
  try { return ensureNormalized(checkins); }
  catch (e) { console.warn('physio normalize failed', e); return Array.isArray(checkins) ? checkins : []; }
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
  if (checkins.length < 14) {
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
        return rpe * 2;
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
    if (ratio > 1.5) risk = 'high';
    else if (ratio > 1.3) risk = 'moderate';

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
    if (delta > 10) { score += 2; signals.push({ type: 'positive', text: 'HRV acima do baseline' }); }
    else if (delta < -10) { score -= 2; signals.push({ type: 'negative', text: 'HRV abaixo do baseline' }); }
  }

  // RHR signal
  if (rhr && baseRhr) {
    const delta = pctDelta(rhr, baseRhr);
    if (delta > 8) { score -= 2; signals.push({ type: 'negative', text: 'FC de repouso elevada' }); }
    else if (delta < -5) { score += 1; signals.push({ type: 'positive', text: 'FC de repouso baixa' }); }
  }

  // Stress signal
  if (stress >= 4) { score -= 2; signals.push({ type: 'negative', text: 'Stress elevado' }); }
  else if (stress <= 2) { score += 1; signals.push({ type: 'positive', text: 'Stress controlado' }); }

  // Recovery signal
  if (recovery >= 80) score += 2;
  else if (recovery < 55) score -= 2;

  // Fatigue
  if (fatigueScore > 65) { score -= 2; signals.push({ type: 'negative', text: 'Fadiga acumulada alta' }); }

  // Sleep debt
  if (sleepDebt?.debt > 5) { score -= 2; signals.push({ type: 'negative', text: 'Déficit de sono acumulado' }); }

  // Training load spike
  if (trainingLoad?.risk === 'high') { score -= 2; signals.push({ type: 'negative', text: 'Spike de carga de treino' }); }
  else if (trainingLoad?.risk === 'moderate') { score -= 1; }

  // Determine state
  let state;
  if (score >= 4) state = 'Recovered';
  else if (score >= 2) state = 'Balanced';
  else if (score <= -4) state = 'Overreached';
  else if (score <= -2) {
    state = fatigueScore > 60 ? 'Fatigued' : 'High Stress';
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
    if (d != null && d < -8) reasons.push({ impact: 'negative', text: `HRV reduzido (${d}% abaixo do seu baseline de ${Math.round(baseHrv)}ms)` });
    else if (d != null && d > 8) reasons.push({ impact: 'positive', text: `HRV elevado (${d}% acima do seu baseline)` });
  }

  if (today.resting_hr && baseRhr) {
    const d = pctDelta(today.resting_hr, baseRhr);
    if (d != null && d > 8) reasons.push({ impact: 'negative', text: `FC em repouso acima do normal (+${d}% vs. baseline de ${Math.round(baseRhr)} bpm)` });
  }

  if (today.sleep_quality && baseSleep) {
    const d = pctDelta(today.sleep_quality, baseSleep);
    if (d != null && d < -10) reasons.push({ impact: 'negative', text: `Qualidade do sono abaixo do seu padrão (${d}%)` });
    else if (d != null && d > 10) reasons.push({ impact: 'positive', text: `Sono de boa qualidade (${d}% acima do normal)` });
  }

  if ((today.stress || 0) >= 4) reasons.push({ impact: 'negative', text: 'Nível de stress elevado impactando recuperação' });
  if ((today.fatigue_score || 0) > 65) reasons.push({ impact: 'negative', text: 'Fadiga muscular acumulada acima do limiar' });
  if ((today.muscle_soreness || 0) >= 4) reasons.push({ impact: 'negative', text: 'Soreness muscular significativo' });
  if ((today.energy || 0) >= 4) reasons.push({ impact: 'positive', text: 'Energia subjetiva elevada' });
  if ((today.mood || 0) >= 4) reasons.push({ impact: 'positive', text: 'Mood e disposição positivos' });

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
    if (hrvDelta > 8) hrv_part = ` Seu HRV está ${hrvDelta}% acima do seu baseline — sinal de boa adaptação ao treino.`;
    else if (hrvDelta < -8) hrv_part = ` Seu HRV está ${Math.abs(hrvDelta)}% abaixo do seu baseline — o sistema nervoso ainda está se recuperando.`;
    else hrv_part = ` Seu HRV está dentro do seu padrão habitual.`;
  }

  // Sleep part
  if (sleepDelta != null) {
    if (sleepDelta > 10) sleep_part = ' O sono desta noite foi mais longo que o usual.';
    else if (sleepDelta < -10) sleep_part = ' Você dormiu menos que o seu padrão — isso impacta a recuperação.';
    else sleep_part = ' O sono foi consistente com seu padrão.';
  }

  // Action
  if (recovery >= 80) action = 'É um bom dia para treino de alta intensidade.';
  else if (recovery >= 65) action = 'Intensidade moderada é recomendada hoje.';
  else if (recovery >= 50) action = 'Prefira atividades leves ou recuperação ativa.';
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
    if (delta == null || Math.abs(delta) < 5) continue;

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
  if (checkins.length < 7) return insights;

  // Sleep hours → Recovery correlation
  const sleepHigh = checkins.filter(c => (c.sleep_hours || 0) >= 7.5);
  const sleepLow = checkins.filter(c => c.sleep_hours > 0 && c.sleep_hours < 6.5);
  if (sleepHigh.length >= 3 && sleepLow.length >= 2) {
    const avgHigh = sleepHigh.reduce((s, c) => s + (c.recovery_score || 0), 0) / sleepHigh.length;
    const avgLow = sleepLow.reduce((s, c) => s + (c.recovery_score || 0), 0) / sleepLow.length;
    const diff = avgHigh - avgLow;
    if (diff > 8) {
      insights.push({
        icon: '🌙',
        type: 'positive',
        text: `Noites com +7h30 de sono elevam seu Recovery em média ${Math.round(diff)} pontos`,
      });
    }
  }

  // High RPE → Next day recovery (checkins are DESC, so "next day" = idx - 1)
  const highRpeDays = checkins.filter((c, i) => c.rpe >= 8 && i - 1 >= 0);
  if (highRpeDays.length >= 2) {
    const afterHighRpe = highRpeDays.map((_, i) => {
      const idx = checkins.indexOf(highRpeDays[i]);
      return checkins[idx - 1];
    }).filter(Boolean);
    if (afterHighRpe.length >= 2) {
      const avgAfter = afterHighRpe.reduce((s, c) => s + (c.recovery_score || 0), 0) / afterHighRpe.length;
      const avgAll = checkins.reduce((s, c) => s + (c.recovery_score || 0), 0) / checkins.length;
      if (avgAll - avgAfter > 8) {
        insights.push({
          icon: '⚡',
          type: 'warning',
          text: `Treinos com RPE ≥8 reduzem seu Recovery no dia seguinte em ~${Math.round(avgAll - avgAfter)} pts`,
        });
      }
    }
  }

  // High stress → Low HRV
  const highStressDays = checkins.filter(c => (c.stress || 0) >= 4 && c.hrv);
  const lowStressDays = checkins.filter(c => (c.stress || 0) <= 2 && c.hrv);
  if (highStressDays.length >= 2 && lowStressDays.length >= 2) {
    const avgHrvHigh = highStressDays.reduce((s, c) => s + c.hrv, 0) / highStressDays.length;
    const avgHrvLow = lowStressDays.reduce((s, c) => s + c.hrv, 0) / lowStressDays.length;
    if (avgHrvLow - avgHrvHigh > 5) {
      insights.push({
        icon: '🧠',
        type: 'warning',
        text: `Dias de stress alto reduzem seu HRV em média ${Math.round(avgHrvLow - avgHrvHigh)}ms`,
      });
    }
  }

  // Hydration → Recovery
  const goodHydration = checkins.filter(c => (c.hydration || 0) >= 4);
  const poorHydration = checkins.filter(c => c.hydration > 0 && c.hydration <= 2);
  if (goodHydration.length >= 2 && poorHydration.length >= 2) {
    const avgGood = goodHydration.reduce((s, c) => s + (c.recovery_score || 0), 0) / goodHydration.length;
    const avgPoor = poorHydration.reduce((s, c) => s + (c.recovery_score || 0), 0) / poorHydration.length;
    if (avgGood - avgPoor > 6) {
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
  if (checkins.length < 5) return effects;

  // Check 48h effect (checkins are DESC, so "48h after" = i - 2)
  const intenseDays = checkins.map((c, i) => ({ c, i })).filter(({ c, i }) => c.rpe >= 8 && !c.rest_day && i - 2 >= 0);

  if (intenseDays.length >= 2) {
    const recoveries48 = intenseDays
      .map(({ i }) => checkins[i - 2])
      .filter(Boolean)
      .map(c => c.recovery_score || 0);

    if (recoveries48.length >= 2) {
      const avg48 = recoveries48.reduce((s, v) => s + v, 0) / recoveries48.length;
      const avgAll = checkins.reduce((s, c) => s + (c.recovery_score || 0), 0) / checkins.length;
      if (avgAll - avg48 > 8) {
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
    if (baseAvgSleep - avgSleep > 0.5) {
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
  if (physiState === 'Recovered' && recovery >= 80) {
    recs.push({ id: 'train_high', icon: '🏋️', category: 'Treino', text: 'Dia ideal para alta intensidade — seu corpo está pronto para desafio.' });
  } else if (physiState === 'Balanced' || recovery >= 65) {
    recs.push({ id: 'train_moderate', icon: '🚴', category: 'Treino', text: 'Intensidade moderada recomendada. Monitore como se sente durante o esforço.' });
  } else if (physiState === 'Fatigued' || recovery < 55) {
    recs.push({ id: 'mobility', icon: '🧘', category: 'Mobilidade', text: 'Priorize mobilidade e alongamento. Evite cargas altas hoje.' });
  }

  if (physiState === 'Overreached') {
    recs.push({ id: 'rest', icon: '🛌', category: 'Recuperação', text: 'Descanso ativo necessário. Considere pelo menos 48h sem intensidade.' });
  }

  // Sleep debt
  if (sleepDebt?.debt > 3) {
    recs.push({ id: 'sleep_debt', icon: '🌙', category: 'Sono', text: `Déficit de ${sleepDebt.debt}h detectado esta semana. Antecipe o horário de dormir esta noite.` });
  }

  // Hydration
  if ((today.hydration || 3) <= 2) {
    recs.push({ id: 'hydration', icon: '💧', category: 'Hidratação', text: 'Seu padrão de hidratação está abaixo — mire em 35ml/kg de peso corporal hoje.' });
  }

  // Stress
  if ((today.stress || 3) >= 4) {
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

    return recs.slice(0, 4).map(r => ({ ...r, confidence, provenance }));
  } catch (e) {
    console.warn('getActionableRecs: failed to attach confidence', e);
    return recs.slice(0, 4);
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

  return {
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
}

// ─── Running Economy Engine ───────────────────────────────────────────────────

export function calculateRunningEconomy(sessions) {
  const runningSessions = sessions
    .filter(s =>
      (s.sport === 'Corrida' || s.sport?.toLowerCase().includes('corrida')) &&
      s.heart_rate_avg > 0 &&
      s.avg_pace_min_per_km > 0
    )
    .sort((a, b) => a.date > b.date ? 1 : -1);

  if (runningSessions.length < 4) return null;

  const ratios = runningSessions.map(s => ({
    date: s.date,
    ratio: s.heart_rate_avg / (60 / s.avg_pace_min_per_km),
    fc: s.heart_rate_avg,
    pace: s.avg_pace_min_per_km,
  }));

  const mid = Math.floor(ratios.length / 2);
  const older = ratios.slice(0, mid);
  const recent = ratios.slice(mid);

  const avgOld = older.reduce((s, r) => s + r.ratio, 0) / older.length;
  const avgRecent = recent.reduce((s, r) => s + r.ratio, 0) / recent.length;

  const improvement = Math.round(((avgOld - avgRecent) / avgOld) * 100);
  const isImproving = improvement > 0;

  if (Math.abs(improvement) < 2) return null;

  return {
    improvement,
    isImproving,
    sessionsAnalyzed: runningSessions.length,
    latestFC: ratios[ratios.length - 1].fc,
    latestPace: ratios[ratios.length - 1].pace,
    discovery: isImproving
      ? {
          icon: '🏃',
          title: 'Economia de corrida melhorou',
          text: `Você está ${improvement}% mais eficiente. Mesmo pace, menos esforço cardíaco nas últimas ${recent.length} corridas.`,
          sentiment: 'positive',
          confidence: runningSessions.length >= 8 ? 'Alta' : 'Média',
          days: runningSessions.length,
        }
      : {
          icon: '📉',
          title: 'Eficiência de corrida caindo',
          text: `Seu coração está trabalhando ${Math.abs(improvement)}% mais para o mesmo pace. Pode indicar fadiga acumulada ou necessidade de base aeróbica.`,
          sentiment: 'negative',
          confidence: runningSessions.length >= 8 ? 'Alta' : 'Média',
          days: runningSessions.length,
        },
  };
}

// ─── Performance Window Analysis ─────────────────────────────────────────────

export function calculatePerformanceWindow(sessions, checkins) {
  if (sessions.length < 6 || checkins.length < 6) return null;

  const periods = ['morning', 'afternoon', 'evening', 'night'];
  const periodData = {};

  periods.forEach(period => {
    const periodSessions = sessions.filter(s => s.time_of_day === period);
    if (periodSessions.length < 2) return;

    const nextDayRecoveries = periodSessions.map(s => {
      const sessionDate = s.date;
      const nextDay = checkins.find(c => {
        const d1 = new Date(sessionDate + 'T12:00:00');
        const d2 = new Date(c.date + 'T12:00:00');
        return Math.round((d2 - d1) / 86400000) === 1;
      });
      return nextDay?.recovery_score ?? null;
    }).filter(v => v != null);

    if (nextDayRecoveries.length >= 2) {
      periodData[period] = {
        avgRecovery: Math.round(
          nextDayRecoveries.reduce((s, v) => s + v, 0) / nextDayRecoveries.length
        ),
        count: nextDayRecoveries.length,
      };
    }
  });

  if (Object.keys(periodData).length < 2) return null;

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
      confidence: best[1].count >= 5 ? 'Alta' : 'Média',
      days: best[1].count,
    },
  };
}

// ─── Cardiac Drift Detector ───────────────────────────────────────────────────

export function detectCardiacDrift(sessions) {
  const longRuns = sessions.filter(s =>
    s.sport === 'Corrida' &&
    s.heart_rate_avg > 0 &&
    s.heart_rate_max > 0 &&
    s.duration_minutes >= 30
  );

  if (longRuns.length < 3) return null;

  const driftRatios = longRuns.map(s => ({
    date: s.date,
    drift: (s.heart_rate_max - s.heart_rate_avg) / s.heart_rate_avg,
    duration: s.duration_minutes,
  }));

  const recent = driftRatios.slice(-3);
  const recentAvgDrift = recent.reduce((s, r) => s + r.drift, 0) / recent.length;

  if (recentAvgDrift <= 0.15) return null;

  return {
    avgDrift: Math.round(recentAvgDrift * 100),
    discovery: {
      icon: '🌡️',
      title: 'Deriva cardíaca detectada nas corridas',
      text: `Sua FC sobe ${Math.round(recentAvgDrift * 100)}% acima da média no final dos treinos longos. Isso pode indicar desidratação ou estresse térmico. Hidrate-se melhor durante o treino.`,
      sentiment: 'negative',
      confidence: longRuns.length >= 5 ? 'Alta' : 'Média',
      days: longRuns.length,
    },
  };
}

// ─── HRV Anomaly Detector ─────────────────────────────────────────────────────

export function detectHRVAnomaly(checkins, baseline) {
  checkins = _ensure(checkins);
  if (checkins.length < 5) return null;

  const today = checkins[0];
  const yesterday = checkins[1];

  if (!today.hrv || !yesterday?.hrv) return null;

  const baseHrv = baseline?.hrv?.d14 || baseline?.hrv?.d7;
  if (!baseHrv) return null;

  const recentHrv = checkins
    .slice(0, 14)
    .map(c => c.hrv)
    .filter(v => v != null && v > 0);

  if (recentHrv.length < 5) return null;

  const mean = recentHrv.reduce((s, v) => s + v, 0) / recentHrv.length;
  const stdDev = Math.sqrt(
    recentHrv.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / recentHrv.length
  );

  if (!stdDev || stdDev === 0) return null;

  const zScore = (today.hrv - mean) / stdDev;
  const drop = Math.round(((mean - today.hrv) / mean) * 100);

  if (zScore > -1.5) return null;

  const baseRhr = baseline?.rhr?.d14 || baseline?.rhr?.d7;
  const rhrElevated = today.resting_hr && baseRhr &&
    today.resting_hr > baseRhr * 1.07;

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
    const c = JSON.stringify(checkins.slice(0, 15).map(c => ({ d: c.date, r: c.recovery_score, h: c.hrv })));
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

  if (withTimes.length < 5) return null;

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
    isConsistent: stdDev < 30,
    discovery: stdDev < 20 ? {
      icon: '⏰',
      title: 'Horário de sono consistente',
      text: `Você dorme no mesmo horário com variação de apenas ${Math.round(stdDev)} minutos. Regularidade aumenta a qualidade do sono profundo.`,
      sentiment: 'positive',
      confidence: withTimes.length >= 10 ? 'Alta' : 'Média',
      days: withTimes.length,
    } : stdDev > 60 ? {
      icon: '🌙',
      title: 'Horário de sono irregular',
      text: `Seu horário de dormir varia ${Math.round(stdDev)} minutos em média. Regularidade no sono melhora o HRV matinal.`,
      sentiment: 'negative',
      confidence: withTimes.length >= 10 ? 'Alta' : 'Média',
      days: withTimes.length,
    } : null,
  };
}
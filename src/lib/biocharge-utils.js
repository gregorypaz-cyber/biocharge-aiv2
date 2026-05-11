// ─── Recovery & Score Engine ───────────────────────────────────────────────

export function calculateRecoveryScore(checkin) {
  const morning = checkin.biocharge_morning || 0;
  const sleep = checkin.sleep_score || 0;
  const fatigue = checkin.fatigue || 0;
  const deepSleep = checkin.deep_sleep_pct || 0;
  const hrv = checkin.hrv ? Math.min(checkin.hrv / 100, 1) * 10 : 0;
  const mood = checkin.mood ? (checkin.mood / 5) * 5 : 0;
  const energy = checkin.energy ? (checkin.energy / 5) * 5 : 0;

  return Math.min(100, Math.round(
    (morning * 0.35) +
    (sleep * 0.25) +
    ((100 - fatigue) * 0.2) +
    (deepSleep * 0.08) +
    (hrv * 0.07) +
    (mood + energy)
  ));
}

export function calculateSleepScore(checkin) {
  const base = checkin.sleep_score || 0;
  const hours = checkin.sleep_hours || 0;
  const deep = checkin.deep_sleep_pct || 0;
  const hoursBonus = hours >= 7 ? 10 : hours >= 6 ? 0 : -10;
  return Math.min(100, Math.max(0, Math.round(base * 0.6 + deep * 0.4 + hoursBonus)));
}

export function calculateFatigueScore(checkin) {
  const base = checkin.fatigue || 0;
  const soreness = checkin.muscle_soreness ? (checkin.muscle_soreness / 5) * 20 : 0;
  const stress = checkin.stress ? (checkin.stress / 5) * 15 : 0;
  return Math.min(100, Math.round(base * 0.65 + soreness * 0.2 + stress * 0.15));
}

export function calculateStressScore(checkin) {
  const stress = checkin.stress ? (checkin.stress / 5) * 100 : 0;
  const mood = checkin.mood ? ((5 - checkin.mood) / 5) * 30 : 0;
  const energy = checkin.energy ? ((5 - checkin.energy) / 5) * 20 : 0;
  return Math.min(100, Math.round(stress * 0.5 + mood * 0.3 + energy * 0.2));
}

export function calculateReadinessScore(checkin) {
  const recovery = calculateRecoveryScore(checkin);
  const fatigue = calculateFatigueScore(checkin);
  const sleep = calculateSleepScore(checkin);
  const hrv = checkin.hrv ? Math.min(checkin.hrv / 80, 1) * 20 : 10;
  return Math.min(100, Math.round(recovery * 0.4 + (100 - fatigue) * 0.3 + sleep * 0.2 + hrv * 0.1));
}

export function getZone(recoveryScore) {
  if (recoveryScore >= 80) return 'green';
  if (recoveryScore >= 60) return 'yellow';
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
    green: 'Alta Recuperação',
    yellow: 'Recuperação Moderada',
    red: 'Baixa Recuperação',
  };
  return labels[zone] || 'Indefinido';
}

export function getRecommendation(zone, preWorkout) {
  if (zone === 'green' && preWorkout >= 60) return 'Treino Pesado';
  if (zone === 'green' && preWorkout >= 50) return 'Moderado';
  if (zone === 'yellow') return 'Moderado ou Leve';
  return 'Descanso';
}

export function getDeltaPre(morning, preWorkout) {
  if (morning == null || preWorkout == null) return null;
  return morning - preWorkout;
}

export function getDeltaPost(preWorkout, postWorkout) {
  if (preWorkout == null || postWorkout == null) return null;
  return preWorkout - postWorkout;
}

export function getAlert(recoveryScore, deltaPre, fatigue) {
  if (recoveryScore >= 80 && (deltaPre == null || deltaPre < 30)) return 'high_performance';
  if (recoveryScore < 60 || (deltaPre != null && deltaPre > 40) || fatigue > 40) return 'attention';
  return 'normal';
}

export function getTrainingLoad(recoveryScore, deltaPost) {
  if (recoveryScore >= 80 && (deltaPost == null || deltaPost < 20)) return 'Treino altamente eficiente';
  if (recoveryScore >= 70) return 'Boa carga / recuperação sustentável';
  if (deltaPost != null && deltaPost > 30) return 'Treino pesado / monitorar recuperação';
  return 'Alto desgaste / reduzir carga';
}

// ─── Main Compute Function ─────────────────────────────────────────────────

export function computeCheckinScores(checkin) {
  const recoveryScore = calculateRecoveryScore(checkin);
  const zone = getZone(recoveryScore);
  const deltaPre = getDeltaPre(checkin.biocharge_morning, checkin.biocharge_pre_workout);
  const deltaPost = getDeltaPost(checkin.biocharge_pre_workout, checkin.biocharge_post_workout);
  const alert = getAlert(recoveryScore, deltaPre, checkin.fatigue || 0);
  const recommendation = getRecommendation(zone, checkin.biocharge_pre_workout || 0);
  const trainingLoad = getTrainingLoad(recoveryScore, deltaPost);
  const sleepScore = calculateSleepScore(checkin);
  const fatigueScore = calculateFatigueScore(checkin);
  const stressScore = calculateStressScore(checkin);
  const readinessScore = calculateReadinessScore(checkin);

  return {
    ...checkin,
    recovery_score: recoveryScore,
    sleep_quality: sleepScore,
    fatigue_score: fatigueScore,
    stress_score: stressScore,
    readiness_score: readinessScore,
    zone,
    delta_pre: deltaPre,
    delta_post: deltaPost,
    alert,
    recommendation,
    training_load: trainingLoad,
  };
}

// ─── BioCharge Daily Score (0–100) ────────────────────────────────────────

export function calculateBioChargeScore(checkin, recentCheckins = []) {
  // Sono (30pts)
  const sleepHours = checkin.sleep_hours || 0;
  const sleepQuality = checkin.sleep_quality || checkin.mood || 3;
  const rawSleep = Math.max(0, 30 - Math.max(0, (8 - sleepHours) * 4));
  const sleepPts = rawSleep * (sleepQuality / 5);

  // Recuperação física (25pts)
  const energyLevel = checkin.energy_level || checkin.energy || 3;
  const muscleSoreness = checkin.muscle_soreness_level || checkin.muscle_soreness || 1;
  const energyPts = (energyLevel / 5) * 15;
  const sorenessPts = ((6 - muscleSoreness) / 5) * 10;

  // HRV relativo (25pts)
  let hrvPts = 12; // neutro sem dados
  const hrv = checkin.hrv_manual || checkin.hrv;
  if (hrv && recentCheckins.length >= 3) {
    const last14 = recentCheckins.slice(0, 14);
    const hrvValues = last14.map(c => c.hrv_manual || c.hrv).filter(Boolean);
    if (hrvValues.length >= 2) {
      const avgHrv = hrvValues.reduce((s, v) => s + v, 0) / hrvValues.length;
      if (hrv >= avgHrv) {
        hrvPts = 25;
      } else {
        const ratio = hrv / avgHrv;
        hrvPts = Math.max(5, Math.round(ratio * 25));
      }
    } else {
      hrvPts = 12;
    }
  } else if (hrv) {
    hrvPts = 12;
  }

  // Carga mental (20pts)
  const stressLevel = checkin.stress_level || checkin.stress || 2;
  const moodLevel = checkin.mood_level || checkin.mood || 3;
  const stressPts = ((6 - stressLevel) / 5) * 10;
  const moodPts = (moodLevel / 5) * 10;

  const total = Math.round(sleepPts + energyPts + sorenessPts + hrvPts + stressPts + moodPts);
  return Math.min(100, Math.max(0, total));
}

export function getBioChargeScoreInfo(score) {
  if (score >= 80) return { label: 'Alta Performance', emoji: '🟢', color: 'hsl(142,70%,50%)', description: 'Pronto para alta performance' };
  if (score >= 60) return { label: 'Moderado', emoji: '🟡', color: 'hsl(45,93%,58%)', description: 'Bom — treino moderado recomendado' };
  if (score >= 40) return { label: 'Regular', emoji: '🟠', color: 'hsl(25,93%,58%)', description: 'Regular — mantenha leve' };
  return { label: 'Recuperação', emoji: '🔴', color: 'hsl(0,72%,55%)', description: 'Recuperação — seu corpo pede descanso' };
}

export function getBioChargeDayPhrase(checkin, score) {
  const stress = checkin.stress_level || checkin.stress || 2;
  const soreness = checkin.muscle_soreness_level || checkin.muscle_soreness || 1;
  const energy = checkin.energy_level || checkin.energy || 3;

  if (score >= 80 && stress >= 4) return 'Fisiologia boa, mas stress elevado. Atenção mental hoje.';
  if (score >= 80) return 'Tudo verde! Dia ideal para dar o seu máximo.';
  if (score >= 60 && soreness >= 4) return 'Boa energia, mas músculos ainda recuperando. Modere a intensidade.';
  if (score >= 60) return 'Corpo bem. Um treino moderado hoje é ótima pedida.';
  if (score < 40 && soreness >= 4) return 'Corpo pedindo descanso. Dia de recuperação ativa.';
  if (score < 40 && energy <= 2) return 'Energia baixa detectada. Priorize sono e alimentação hoje.';
  return 'Mantenha o ritmo leve. Seu corpo está se recuperando.';
}

export function detectOvertainingAlerts(checkins) {
  const alerts = [];
  if (!checkins || checkins.length === 0) return alerts;

  const now = new Date();
  const lastCheckin = checkins[0];

  // Alerta: último checkin há mais de 48h
  if (lastCheckin?.date) {
    const lastDate = new Date(lastCheckin.date + 'T12:00:00');
    const hoursDiff = (now - lastDate) / (1000 * 60 * 60);
    if (hoursDiff > 48) {
      alerts.push({ id: 'no_checkin', type: 'blue', message: 'Último check-in foi há mais de 48h. Que tal registrar hoje?' });
    }
  }

  if (checkins.length < 2) return alerts;

  // HRV: últimos 3 dias >15% abaixo da média pessoal
  const last14 = checkins.slice(0, 14);
  const last3 = checkins.slice(0, 3);
  const allHrv = last14.map(c => c.hrv_manual || c.hrv).filter(Boolean);
  const last3Hrv = last3.map(c => c.hrv_manual || c.hrv).filter(Boolean);
  if (allHrv.length >= 5 && last3Hrv.length >= 2) {
    const avgAll = allHrv.reduce((s, v) => s + v, 0) / allHrv.length;
    const avgLast3 = last3Hrv.reduce((s, v) => s + v, 0) / last3Hrv.length;
    if (avgLast3 < avgAll * 0.85) {
      alerts.push({ id: 'hrv_drop', type: 'red', message: 'HRV dos últimos 3 dias está >15% abaixo da sua média. Sinal de estresse acumulado.' });
    }
  }

  // Dor muscular >= 4 por 2 dias + energia <= 2
  if (checkins.length >= 2) {
    const sorenessAlert = checkins.slice(0, 2).every(c => {
      const soreness = c.muscle_soreness_level || c.muscle_soreness || 0;
      const energy = c.energy_level || c.energy || 5;
      return soreness >= 4 && energy <= 2;
    });
    if (sorenessAlert) {
      alerts.push({ id: 'soreness_energy', type: 'red', message: 'Alta dor muscular + baixa energia por 2 dias seguidos. Overtraining em risco.' });
    }
  }

  // BioCharge Score < 40 por 3 dias consecutivos
  if (checkins.length >= 3) {
    const lowScoreDays = checkins.slice(0, 3).filter(c => (c._biocharge_score || 0) < 40);
    if (lowScoreDays.length >= 3) {
      alerts.push({ id: 'low_score', type: 'orange', message: 'BioCharge Score abaixo de 40 por 3 dias consecutivos. Priorize recuperação.' });
    }
  }

  return alerts;
}

// ─── Smart Insights Engine ─────────────────────────────────────────────────

export function getSmartMessage(checkin, recentCheckins) {
  const messages = [];

  // HRV drop pattern
  if (recentCheckins && recentCheckins.length >= 4) {
    const hrvValues = recentCheckins.slice(0, 4).map(c => c.hrv).filter(Boolean);
    if (hrvValues.length >= 3) {
      const trend = hrvValues[0] - hrvValues[hrvValues.length - 1];
      if (trend < -10) messages.push(`Seu HRV caiu ${Math.abs(Math.round(trend))}ms nos últimos dias — sinal de estresse acumulado 🔍`);
    }

    const intenseDays = recentCheckins.slice(0, 4).filter(c => c.rpe >= 7).length;
    if (intenseDays >= 3) messages.push(`${intenseDays} dias consecutivos de treino intenso detectados. Considere recuperação ativa.`);
  }

  // Sleep correlation
  if (recentCheckins && recentCheckins.length >= 7) {
    const goodSleepDays = recentCheckins.filter(c => (c.sleep_hours || 0) >= 7.5);
    if (goodSleepDays.length >= 3) {
      const avgRecoveryGoodSleep = goodSleepDays.reduce((s, c) => s + (c.recovery_score || 0), 0) / goodSleepDays.length;
      const avgRecoveryAll = recentCheckins.reduce((s, c) => s + (c.recovery_score || 0), 0) / recentCheckins.length;
      if (avgRecoveryGoodSleep > avgRecoveryAll + 5) {
        messages.push(`Dias com +7h30 de sono melhoram seu Recovery Score em ${Math.round(avgRecoveryGoodSleep - avgRecoveryAll)} pontos 🌙`);
      }
    }
  }

  // Zone-specific messages
  if (checkin.zone === 'green') messages.push('Hoje é um bom dia para treino intenso 🔥');
  if (checkin.zone === 'red') messages.push('Seu nível de fadiga sugere recuperação ativa hoje 💤');
  if (checkin.fatigue > 60) messages.push('Alta fadiga acumulada detectada ⚠️ Priorize hidratação e sono');

  // Body response
  if (recentCheckins && recentCheckins.length >= 3) {
    const avgRecovery = recentCheckins.slice(0, 3).reduce((s, c) => s + (c.recovery_score || 0), 0) / 3;
    if (avgRecovery >= 75) messages.push('Seu corpo está respondendo bem ao protocolo atual 💪');
  }

  if (messages.length === 0) messages.push('Continue mantendo a consistência nos check-ins');

  return messages.slice(0, 3);
}

// ─── Streak & Gamification ─────────────────────────────────────────────────

export function calculateStreak(checkins) {
  if (!checkins || checkins.length === 0) return 0;
  const sorted = [...checkins].sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  let current = new Date();
  current.setHours(0, 0, 0, 0);

  for (const c of sorted) {
    const d = new Date(c.date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((current - d) / (1000 * 60 * 60 * 24));
    if (diff <= 1) {
      streak++;
      current = d;
    } else break;
  }
  return streak;
}

export function getBadges(checkins, streak) {
  const badges = [];
  if (streak >= 3) badges.push({ id: 'streak3', label: '3 dias seguidos', icon: '🔥', color: 'orange' });
  if (streak >= 7) badges.push({ id: 'streak7', label: 'Semana completa', icon: '⚡', color: 'yellow' });
  if (streak >= 30) badges.push({ id: 'streak30', label: 'Mês consistente', icon: '🏆', color: 'gold' });

  const greenDays = checkins.filter(c => c.zone === 'green').length;
  if (greenDays >= 5) badges.push({ id: 'green5', label: '5 dias no verde', icon: '💚', color: 'green' });

  if (checkins.length >= 10) badges.push({ id: 'veteran', label: '10 check-ins', icon: '🎯', color: 'blue' });
  if (checkins.length >= 30) badges.push({ id: 'veteran30', label: '30 check-ins', icon: '🌟', color: 'purple' });

  return badges;
}

export function getPerformanceLevel(avgRecovery) {
  if (avgRecovery >= 85) return { label: 'Elite', color: 'hsl(142,70%,50%)', level: 5 };
  if (avgRecovery >= 75) return { label: 'Avançado', color: 'hsl(200,80%,55%)', level: 4 };
  if (avgRecovery >= 65) return { label: 'Intermediário', color: 'hsl(45,93%,58%)', level: 3 };
  if (avgRecovery >= 50) return { label: 'Iniciante', color: 'hsl(280,65%,60%)', level: 2 };
  return { label: 'Recuperando', color: 'hsl(0,72%,55%)', level: 1 };
}
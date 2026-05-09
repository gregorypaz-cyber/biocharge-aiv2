// BioCharge calculation utilities

export function calculateRecoveryScore(checkin) {
  const morning = checkin.biocharge_morning || 0;
  const sleep = checkin.sleep_score || 0;
  const fatigue = checkin.fatigue || 0;
  const deepSleep = checkin.deep_sleep_pct || 0;
  
  return Math.round(
    (morning * 0.4) + (sleep * 0.3) + ((100 - fatigue) * 0.2) + (deepSleep * 0.1)
  );
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
    yellow: 'Moderado',
    red: 'Baixa Recuperação',
  };
  return labels[zone] || 'Indefinido';
}

export function getPreWorkoutAdjustment(preWorkout) {
  if (preWorkout >= 60) return 'Manter';
  if (preWorkout >= 50) return 'Reduzir leve';
  if (preWorkout >= 40) return 'Reduzir';
  return 'Leve/Descanso';
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
  if (recoveryScore >= 80 && (deltaPre == null || deltaPre < 30)) {
    return 'high_performance';
  }
  if (recoveryScore < 60 || (deltaPre != null && deltaPre > 40) || fatigue > 40) {
    return 'attention';
  }
  return 'normal';
}

export function getTrainingLoad(recoveryScore, deltaPost) {
  if (recoveryScore >= 80 && (deltaPost == null || deltaPost < 20)) {
    return 'Treino altamente eficiente';
  }
  if (recoveryScore >= 70) {
    return 'Boa carga / recuperação sustentável';
  }
  if (deltaPost != null && deltaPost > 30) {
    return 'Treino pesado / monitorar recuperação';
  }
  return 'Alto desgaste / reduzir carga';
}

export function computeCheckinScores(checkin) {
  const recoveryScore = calculateRecoveryScore(checkin);
  const zone = getZone(recoveryScore);
  const deltaPre = getDeltaPre(checkin.biocharge_morning, checkin.biocharge_pre_workout);
  const deltaPost = getDeltaPost(checkin.biocharge_pre_workout, checkin.biocharge_post_workout);
  const alert = getAlert(recoveryScore, deltaPre, checkin.fatigue || 0);
  const recommendation = getRecommendation(zone, checkin.biocharge_pre_workout || 0);
  const trainingLoad = getTrainingLoad(recoveryScore, deltaPost);

  return {
    ...checkin,
    recovery_score: recoveryScore,
    zone,
    delta_pre: deltaPre,
    delta_post: deltaPost,
    alert,
    recommendation,
    training_load: trainingLoad,
  };
}

export function getSmartMessage(checkin, recentCheckins) {
  const messages = [];
  
  if (checkin.zone === 'green') {
    messages.push('Hoje é um bom dia para treino intenso 🔥');
  }
  if (checkin.zone === 'red') {
    messages.push('Considere recuperação ativa hoje');
  }
  if (checkin.fatigue > 60) {
    messages.push('Alta fadiga acumulada detectada ⚠️');
  }
  
  if (recentCheckins && recentCheckins.length >= 3) {
    const avgRecovery = recentCheckins.slice(0, 3).reduce((s, c) => s + (c.recovery_score || 0), 0) / 3;
    if (avgRecovery >= 75) {
      messages.push('Seu corpo está respondendo bem aos treinos');
    }
    
    const avgDeepSleep = recentCheckins.slice(0, 3).reduce((s, c) => s + (c.deep_sleep_pct || 0), 0) / 3;
    const olderAvg = recentCheckins.length >= 7
      ? recentCheckins.slice(3, 7).reduce((s, c) => s + (c.deep_sleep_pct || 0), 0) / Math.min(4, recentCheckins.length - 3)
      : null;
    if (olderAvg && avgDeepSleep < olderAvg - 5) {
      messages.push('Seu sono profundo caiu nos últimos 3 dias');
    }
  }
  
  if (messages.length === 0) {
    messages.push('Continue mantendo a consistência nos check-ins');
  }
  
  return messages;
}
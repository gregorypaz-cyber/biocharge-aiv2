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
    green: 'Prontidão alta',
    yellow: 'Prontidão moderada',
    red: 'Prontidão baixa',
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

// ─── Delayed Fatigue Alert ─────────────────────────────────────────────────

export function calcDelayedFatigueAlert(checkin, recentCheckins, recentSessions) {
  if (!recentCheckins || recentCheckins.length < 2) return null;
  const recoveryToday = calculateRecoveryScore(checkin);
  const sorted = [...recentCheckins].sort((a, b) => b.date > a.date ? 1 : -1);
  // Find checkin from 2 days ago
  const twoDaysAgo = sorted.find((c, i) => i >= 1);
  if (!twoDaysAgo) return null;
  const recoveryTwoDaysAgo = twoDaysAgo.recovery_score || calculateRecoveryScore(twoDaysAgo);
  if (recoveryToday >= recoveryTwoDaysAgo - 15) return null;

  const soreness = checkin.muscle_soreness || checkin.muscle_soreness_level || 0;
  if (soreness < 3) return null;

  // Check last session was 1-2 days ago (not today)
  if (!recentSessions || recentSessions.length === 0) return null;
  const todayDate = checkin.date;
  const sessionsNotToday = (recentSessions || []).filter(s => s.date !== todayDate);
  if (sessionsNotToday.length === 0) return null;
  const lastSession = sessionsNotToday.sort((a, b) => b.date > a.date ? 1 : -1)[0];
  if (!lastSession) return null;

  const daysDiff = Math.round(
    (new Date(todayDate + 'T12:00:00') - new Date(lastSession.date + 'T12:00:00')) / (1000 * 60 * 60 * 24)
  );
  if (daysDiff < 1 || daysDiff > 2) return null;

  return `Fadiga retardada detectada — seu corpo ainda está processando o treino de ${daysDiff} ${daysDiff === 1 ? 'dia' : 'dias'} atrás.`;
}

// ─── Sleep Need & Next Day Forecast ────────────────────────────────────────

export function calcSleepNeedTonight(recoveryScore, strainAccumulated, recentCheckins) {
  let base = 7.5;
  if (recoveryScore < 60) base += 1.0;
  if ((strainAccumulated || 0) > 12) base += 0.5;
  // sleep_deficit_7d: sum of deficit below 7.5h over last 7 days
  if (recentCheckins && recentCheckins.length >= 3) {
    const sleepDeficit = recentCheckins.slice(0, 7).reduce((sum, c) => {
      const h = c.sleep_hours || 0;
      return sum + Math.max(0, 7.5 - h);
    }, 0);
    if (sleepDeficit > 3) base += 0.5;
  }
  // Round to nearest 0.5
  return Math.min(10, Math.round(base * 2) / 2);
}

export function calcNextDayForecast(recoveryScore, sleepNeedTonight) {
  if (recoveryScore >= 75 && sleepNeedTonight <= 7.5) {
    return 'Com esse sono esta noite, seu recovery amanhã deve ser bom. Considere treino de qualidade.';
  }
  if (recoveryScore < 60 || sleepNeedTonight > 8) {
    return 'Priorizando sono esta noite, seu corpo deve se recuperar melhor para amanhã.';
  }
  return `Recovery amanhã depende da qualidade do sono desta noite. Meta: ${sleepNeedTonight}h.`;
}

export async function generateTrainingReasonAI(checkin, scores, recentCheckins, acwr) {
  const { base44 } = await import('@/api/base44Client');

  const hrvValues = (recentCheckins || []).slice(0, 7).map(c => c.hrv).filter(Boolean);
  const hrvAvg = hrvValues.length > 0 ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length) : null;
  const hrvDeltaPct = (checkin.hrv && hrvAvg) ? Math.round(((checkin.hrv - hrvAvg) / hrvAvg) * 100) : null;

  const sleepDebt = (recentCheckins || []).slice(0, 7).reduce((sum, c) => {
    return sum + Math.max(0, 7.5 - (c.sleep_hours || 0));
  }, 0);

  const prompt = `Você é um coach de performance. Gere UMA frase de razão (máx 2 linhas) explicando por que o atleta deve treinar desta forma hoje. Conecte DIRETAMENTE os dados à decisão. Em português brasileiro. Sem título, sem bullet. Tom direto e pessoal.

Dados do dia:
- Recovery: ${scores?.recovery_score ?? checkin.biocharge_morning ?? '—'}
- HRV delta vs semana: ${hrvDeltaPct != null ? `${hrvDeltaPct >= 0 ? '+' : ''}${hrvDeltaPct}%` : '—'}
- ACWR: ${acwr != null ? acwr.toFixed(2) : '—'}
- Dívida de sono (7 dias): ${sleepDebt.toFixed(1)}h
- Estado fisiológico: ${checkin.current_body_state ?? scores?.current_body_state ?? '—'}
- Dor muscular: ${checkin.muscle_soreness ?? '—'}/5

Exemplos de estilo (NÃO copie, crie uma frase original para os dados acima):
- "Seu HRV está acima do normal e sua carga está baixa — bom momento para manter ritmo sem forçar."
- "Sua dívida de sono está pressionando sua recuperação. Treino leve hoje protege sua próxima janela de carga."
- "Três dias de carga alta. Seu sistema precisa absorver antes de adicionar mais."
- "Você está no verde. Este é o dia para treinar com intenção."

Frase de razão:`;

  const result = await base44.integrations.Core.InvokeLLM({ prompt });
  if (typeof result !== 'string') return null;
  return result.trim().replace(/^["']|["']$/g, '');
}

export async function generateContextualBulletsAI(checkin, scores, recentCheckins, recentSessions, acwr) {
  const { base44 } = await import('@/api/base44Client');

  // Build context
  const hrvValues = (recentCheckins || []).slice(0, 7).map(c => c.hrv).filter(Boolean);
  const hrvAvg = hrvValues.length > 0 ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length) : null;
  const hrvDeltaPct = (checkin.hrv && hrvAvg) ? Math.round(((checkin.hrv - hrvAvg) / hrvAvg) * 100) : null;

  const sleepDebt = (recentCheckins || []).slice(0, 7).reduce((sum, c) => {
    return sum + Math.max(0, 7.5 - (c.sleep_hours || 0));
  }, 0);

  const lastSession = (recentSessions || [])
    .filter(s => s.date !== checkin.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;

  const prompt = `Você é um coach de performance esportiva. Com base nos dados abaixo, gere EXATAMENTE 2 bullets contextuais para o dia de treino do atleta. Cada bullet deve ser uma frase direta, específica com os números dos dados, com máximo de 2 linhas. Em português brasileiro. Sem título. Sem asterisco. Sem numeração. Apenas os 2 bullets, um por linha.

Regras:
- Use APENAS dados que existem abaixo (não invente valores)
- Cite o número real do dado quando for relevante
- Cada bullet começa com um emoji relevante
- Máximo 2 bullets, mínimo 1

Dados do dia:
- Recovery: ${scores?.recovery_score ?? checkin.biocharge_morning ?? '—'}
- HRV delta vs semana: ${hrvDeltaPct != null ? `${hrvDeltaPct >= 0 ? '+' : ''}${hrvDeltaPct}%` : 'sem dados'}
- ACWR: ${acwr != null ? acwr.toFixed(2) : 'sem dados'}
- Dívida de sono (7 dias): ${sleepDebt.toFixed(1)}h
- Dor muscular: ${checkin.muscle_soreness ?? checkin.muscle_soreness_level ?? '—'}/5
- Stress: ${checkin.stress ?? checkin.stress_level ?? '—'}/5
- Estado fisiológico: ${checkin.current_body_state ?? scores?.current_body_state ?? '—'}
- Último treino: ${lastSession ? `${lastSession.sport} (${lastSession.intensity}) em ${lastSession.date}` : 'sem dados'}

Exemplos de estilo (NÃO copie, use os dados reais acima):
- "💤 Com ${sleepDebt.toFixed(1)}h de dívida de sono, sua percepção de esforço vai parecer maior. Confie no RPE, não na sensação."
- "⚡ Você está com mais capacidade que o normal. Não se limite — mas mantenha o foco na técnica."
- "🦵 Pernas podem estar sensíveis do treino anterior. Priorize parte superior ou corrida leve."
- "🧠 Stress elevado aumenta o custo fisiológico. RPE 6 hoje pode custar como 7."
- "🎯 ACWR no limite. Pare 10 min antes de se sentir esgotado."

Bullets:`;

  const result = await base44.integrations.Core.InvokeLLM({ prompt });
  if (typeof result !== 'string') return null;

  // Parse lines into array, max 2
  const lines = result.trim().split('\n').map(l => l.trim()).filter(l => l.length > 10);
  return lines.slice(0, 2);
}

export async function generateHeadlineTodayAI(checkin, scores, recentCheckins) {
  const { base44 } = await import('@/api/base44Client');

  // Count consecutive low deep sleep nights
  const sortedRecent = [...(recentCheckins || [])].sort((a, b) => b.date.localeCompare(a.date));
  let lowDeepSleepNights = 0;
  for (const c of [checkin, ...sortedRecent]) {
    if (c.deep_sleep_pct != null && c.deep_sleep_pct < 18) lowDeepSleepNights++;
    else break;
  }

  const hrvValues = (recentCheckins || []).slice(0, 7).map(c => c.hrv).filter(Boolean);
  const hrvAvg = hrvValues.length > 0 ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length) : null;
  const hrvStatus = checkin.hrv && hrvAvg
    ? (checkin.hrv > hrvAvg + 5 ? 'alto (acima da média)' : checkin.hrv < hrvAvg - 5 ? 'baixo (abaixo da média)' : 'normal')
    : null;

  const prompt = `Você é um coach de alta performance. Gere um headline direto para o dashboard de hoje do atleta. Máximo 12 palavras. Tom direto, motivador quando aplicável. Em português brasileiro. Sem aspas. Sem ponto final.

Dados:
- Prontidão: ${scores?.readiness_score ?? checkin.biocharge_morning ?? '—'}
- Zone: ${scores?.zone ?? checkin.zone ?? '—'}
- HRV: ${checkin.hrv ?? '—'} ms${hrvStatus ? ` (${hrvStatus})` : ''}
- Sono profundo: ${checkin.deep_sleep_pct ?? '—'}%${lowDeepSleepNights >= 2 ? ` (${lowDeepSleepNights} noites consecutivas abaixo de 18%)` : ''}
- Horas de sono: ${checkin.sleep_hours ?? '—'}h
- Fadiga: ${checkin.fatigue ?? '—'}
- Estado fisiológico: ${checkin.current_body_state ?? scores?.current_body_state ?? '—'}
- Alerta fadiga retardada: ${scores?.delayed_fatigue_alert ?? 'nenhum'}
- Dia de descanso: ${checkin.rest_day ? 'sim' : 'não'}

Exemplos de estilo (NÃO copie, crie um headline original para os dados acima):
- "Sono fraco por 6 noites. Treine leve, recupere esta noite."
- "Dia verde. Seu corpo está pronto — aproveite."
- "Seu corpo pediu pausa. Hoje é dia de recuperar."
- "Descanso ativo hoje. Amanhã você vai sentir a diferença."

Headline:`;

  const result = await base44.integrations.Core.InvokeLLM({ prompt });
  if (typeof result !== 'string') return null;
  // Enforce max 12 words
  const words = result.trim().replace(/^["']|["']$/g, '').split(/\s+/);
  return words.slice(0, 15).join(' '); // slight buffer for PT-BR
}

export async function generateNextDayForecastAI(checkin, scores, recentCheckins) {
  const { base44 } = await import('@/api/base44Client');

  // Build HRV context
  const hrvValues = (recentCheckins || []).slice(0, 7).map(c => c.hrv).filter(Boolean);
  const hrvAvg = hrvValues.length > 0 ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length) : null;
  const hrvDelta = (checkin.hrv && hrvAvg) ? checkin.hrv - hrvAvg : null;

  // Deep sleep consecutive low nights
  const deepSleepLow = (recentCheckins || []).slice(0, 3).filter(c => (c.deep_sleep_pct || 0) < 15).length;

  const prompt = `Você é um coach de performance esportiva. Com base nos dados abaixo, escreva uma previsão para o dia seguinte em 2–3 frases curtas, diretas, em português brasileiro. Seja específico com os números quando relevante. Tom: direto, sem rodeios, sem jargão médico.

Dados do check-in de hoje:
- BioCharge manhã: ${checkin.biocharge_morning ?? '—'}
- HRV: ${checkin.hrv ?? '—'} ms${hrvDelta != null ? ` (${hrvDelta >= 0 ? '+' : ''}${hrvDelta}ms vs média da semana)` : ''}
- Horas de sono: ${checkin.sleep_hours ?? '—'}h
- Sono profundo: ${checkin.deep_sleep_pct ?? '—'}%${deepSleepLow >= 3 ? ' (3ª noite baixa seguida)' : ''}
- Fadiga: ${checkin.fatigue ?? '—'}
- Dor muscular: ${checkin.muscle_soreness ?? '—'}/5
- Estresse: ${checkin.stress ?? '—'}/5
- Energia: ${checkin.energy ?? '—'}/5
- Estado fisiológico: ${checkin.current_body_state ?? scores?.current_body_state ?? '—'}
- Strain acumulado ontem: ${checkin.daily_strain_accumulated ?? '—'}
- Recovery score calculado: ${scores?.recovery_score ?? '—'}
- Sono necessário esta noite: ${scores?.sleep_need_tonight ?? '—'}h

Responda apenas com a previsão, sem título, sem bullet points.`;

  const result = await base44.integrations.Core.InvokeLLM({ prompt });
  return typeof result === 'string' ? result.trim() : null;
}

// ─── Main Compute Function ─────────────────────────────────────────────────

export function computeCheckinScores(checkin, recentCheckins, recentSessions) {
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

  const strainAccumulated = checkin.daily_strain_accumulated || 0;
  const sleepNeedTonight = calcSleepNeedTonight(recoveryScore, strainAccumulated, recentCheckins);
  const nextDayForecast = calcNextDayForecast(recoveryScore, sleepNeedTonight);
  const delayedFatigueAlert = calcDelayedFatigueAlert(checkin, recentCheckins, recentSessions);

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
    sleep_need_tonight: checkin.sleep_need_tonight ?? sleepNeedTonight,
    next_day_forecast: checkin.next_day_forecast || nextDayForecast,
    delayed_fatigue_alert: checkin.delayed_fatigue_alert ?? delayedFatigueAlert,
  };
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
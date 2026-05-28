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

function resolveHrvValue(checkin) {
  if (checkin?.hrv_manual != null && checkin.hrv_manual > 0) {
    return Number(checkin.hrv_manual);
  }

  if (checkin?.hrv != null && checkin.hrv > 0) {
    return Number(checkin.hrv);
  }

  return null;
}

  const candidates = aliases[fieldName] || [fieldName];

  for (const candidate of candidates) {
    if (checkin?.[candidate] !== null && checkin?.[candidate] !== undefined) {
      return checkin[candidate];
    }
  }

  return null;
}

function normalizeMoodOrEnergy(v) {
  if (v == null) return null;
  return clamp((Number(v) / 5) * 100);
}

function normalizeDeepSleep(deepSleepPct) {
  if (deepSleepPct == null) return null;

  const v = Number(deepSleepPct);

  if (v < 10) return 25;
  if (v < 15) return 42;
  if (v < 18) return 55;
  if (v < 22) return 68;
  if (v < 26) return 80;
  if (v < 30) return 88;

  // acima disso, não seguimos premiando muito
  return 92;
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


function getRecentHrvBaseline(recentCheckins = []) {
  const values = (recentCheckins || [])
    .slice(0, 14)
    .map((c) => c.hrv)
    .filter((v) => v != null && v > 0);

  if (values.length < 5) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function getRecentRhrBaseline(recentCheckins = []) {
  const values = (recentCheckins || [])
    .slice(0, 14)
    .map((c) => resolveCheckinField(c, 'resting_hr'))
    .filter((v) => v != null && v > 0);

  if (values.length < 5) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function normalizeHrv(hrv, recentCheckins = []) {
  if (hrv == null || hrv <= 0) return null;

  const baseline = getRecentHrvBaseline(recentCheckins);

  // sem baseline: leitura conservadora
  if (!baseline) {
    const raw = Number(hrv);
    if (raw < 25) return 32;
    if (raw < 35) return 42;
    if (raw < 45) return 52;
    if (raw < 55) return 60;
    if (raw < 65) return 68;
    if (raw < 80) return 76;
    return 82;
  }

  const deltaPct = ((Number(hrv) - baseline) / baseline) * 100;

  if (deltaPct <= -20) return 18;
  if (deltaPct <= -10) return 30;
  if (deltaPct <= -5) return 42;
  if (deltaPct < 5) return 58;
  if (deltaPct < 10) return 70;
  if (deltaPct < 20) return 82;
  return 90;
}

function normalizeRhr(rhr, recentCheckins = []) {
  if (rhr == null || rhr <= 0) return null;

  const baseline = getRecentRhrBaseline(recentCheckins);

  // sem baseline: leitura conservadora
  if (!baseline) {
    const raw = Number(rhr);
    if (raw <= 50) return 76;
    if (raw <= 56) return 68;
    if (raw <= 62) return 60;
    if (raw <= 68) return 50;
    if (raw <= 74) return 40;
    return 30;
  }

  const deltaPct = ((Number(rhr) - baseline) / baseline) * 100;

  // RHR menor que o baseline = melhor
  if (deltaPct <= -8) return 88;
  if (deltaPct <= -4) return 76;
  if (deltaPct < 4) return 58;
  if (deltaPct < 8) return 40;
  return 22;
}

function getSleepHoursScore(hours) {
  const h = Number(hours ?? 0);
  if (!h || h <= 0) return null;

  if (h < 5.5) return 20;
  if (h < 6.0) return 35;
  if (h < 6.5) return 48;
  if (h < 7.0) return 60;
  if (h < 7.5) return 72;
  if (h < 8.0) return 82;
  if (h < 8.5) return 88;
  return 92;
}

function getPreviewConfidence(checkin, recentCheckins = []) {
  const hasHrv = !!(checkin?.hrv && checkin.hrv > 0);
  const hasRhr = !!(resolveCheckinField(checkin, 'resting_hr') && resolveCheckinField(checkin, 'resting_hr') > 0);
const hasSleepHours = !!(checkin?.sleep_hours && checkin.sleep_hours > 0);
  const hasSleepScore = !!(checkin?.sleep_score != null);
  const hasDeepSleep = !!(checkin?.deep_sleep_pct != null);
  const hasRemSleep = !!(checkin?.rem_sleep_pct != null);

  const hrvBaseline = getRecentHrvBaseline(recentCheckins);
  const rhrBaseline = getRecentRhrBaseline(recentCheckins);

const physiologicalCount =
    (hasHrv ? 1 : 0) +
    (hasRhr ? 1 : 0) +
    (hasSleepHours ? 1 : 0) +
    (hasSleepScore ? 1 : 0) +
    (hasDeepSleep ? 1 : 0) +
    (hasRemSleep ? 1 : 0);

  if (physiologicalCount >= 4 && (hrvBaseline || rhrBaseline || (hasHrv && hasRhr))) {
    return 'high';
  }

  if (physiologicalCount >= 3) {
    return 'medium';
  }

  return 'low';
}

function getPreviewConfidenceReason(checkin, recentCheckins = []) {
  const confidence = getPreviewConfidence(checkin, recentCheckins);
  const hasHrv = !!(checkin?.hrv && checkin.hrv > 0);
  const hasRhr = !!(resolveCheckinField(checkin, 'resting_hr') && resolveCheckinField(checkin, 'resting_hr') > 0);

  if (confidence === 'high') {
    return 'HRV, FC de repouso e sono dão boa sustentação para esta leitura.';
  }

  if (confidence === 'medium') {
    return hasHrv || hasRhr
      ? 'A leitura já tem alguma base fisiológica, mas ainda não está completa.'
      : 'Boa parte da leitura ainda depende do que você informou manualmente.';
  }

  return 'Faltam HRV e/ou FC de repouso. Esta leitura está mais apoiada em percepção e sono informado.';
}

function applyConfidenceCap(score, confidence, hasStrongPhysiology) {
  const raw = clamp(score);

  if (confidence === 'high') return raw;

  if (confidence === 'medium') {
    return Math.min(raw, hasStrongPhysiology ? 90 : 88);
  }

  return Math.min(raw, hasStrongPhysiology ? 86 : 82);
}

// ─── Core scores ───────────────────────────────────────────────────────────

export function calculateRecoveryScore(checkin, recentCheckins = []) {
  const morning = clamp(checkin.biocharge_morning ?? 0);
  const sleepScore = clamp(checkin.sleep_score ?? 0);
  const fatigueInverse = 100 - clamp(checkin.fatigue ?? 0);

const deepSleepScore = normalizeDeepSleep(checkin.deep_sleep_pct);
  const remSleepScore = normalizeRemSleep(checkin.rem_sleep_pct);
  const hrvScore = normalizeHrv(checkin.hrv, recentCheckins);
  const rhrScore = normalizeRhr(resolveCheckinField(checkin, 'resting_hr'), recentCheckins);
  const sleepHoursScore = getSleepHoursScore(checkin.sleep_hours);

  const mood = normalizeMoodOrEnergy(resolveCheckinField(checkin, 'mood'));
  const energy = normalizeMoodOrEnergy(resolveCheckinField(checkin, 'energy'));

  // WHOOP-like na intenção: biometria manda, subjetividade ajusta levemente
const weighted = [
    { value: hrvScore, weight: 0.26 },
    { value: rhrScore, weight: 0.18 },
    { value: sleepScore, weight: 0.18 },
    { value: sleepHoursScore, weight: 0.12 },
    { value: deepSleepScore, weight: 0.06 },
    { value: remSleepScore, weight: 0.04 },
    { value: morning, weight: 0.08 },
    { value: fatigueInverse, weight: 0.06 },
    { value: mood, weight: 0.01 },
    { value: energy, weight: 0.01 },
  ];

  let weightSum = 0;
  let total = 0;

  for (const item of weighted) {
    if (item.value != null) {
      total += item.value * item.weight;
      weightSum += item.weight;
    }
  }

  if (weightSum <= 0) return 0;

  // renormaliza pelo peso disponível
  const raw = total / weightSum;
  return clamp(Math.round(raw));
}

export function calculateSleepScore(checkin) {
  const base = clamp(checkin.sleep_score ?? 0);
  const deep = normalizeDeepSleep(checkin.deep_sleep_pct);
  const rem = normalizeRemSleep(checkin.rem_sleep_pct);
  const hours = getSleepHoursScore(checkin.sleep_hours);

  const weighted = [
    { value: base, weight: 0.55 },
    { value: hours, weight: 0.20 },
    { value: deep, weight: 0.15 },
    { value: rem, weight: 0.10 },
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

export function calculateSleepPerformance(checkin) {
  const sleepHours = Number(checkin?.sleep_hours ?? 0);
  const deepSleepPct = Number(checkin?.deep_sleep_pct ?? 0);
  const remSleepPct = Number(checkin?.rem_sleep_pct ?? 0);
  const hrvValue = resolveHrvValue(checkin) ?? 0;

  // Duração: 5h = 0 | 8h = 100
  const durationScore = Math.min(100, Math.max(0, ((sleepHours - 5) / 3) * 100));

  // Profundo: 5% = 0 | 25% = 100
  const deepScore = Math.min(100, Math.max(0, ((deepSleepPct - 5) / 20) * 100));

  // REM: 5% = 0 | 25% = 100
  const remScore = Math.min(100, Math.max(0, ((remSleepPct - 5) / 20) * 100));

  // HRV: 20ms = 0 | 80ms = 100
  const hrvScore = Math.min(100, Math.max(0, ((hrvValue - 20) / 60) * 100));

  const sleepPerformance = Math.round(
    durationScore * 0.40 +
    deepScore * 0.30 +
    remScore * 0.20 +
    hrvScore * 0.10
  );

  return clamp(sleepPerformance);
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
  const recovery = calculateRecoveryScore(checkin, recentCheckins);
  const fatigue = calculateFatigueScore(checkin);
  const sleep = calculateSleepScore(checkin);
  const hrv = normalizeHrv(checkin.hrv, recentCheckins);
  const rhr = normalizeRhr(resolveCheckinField(checkin, 'resting_hr'), recentCheckins);

  const weighted = [
    { value: recovery, weight: 0.58 },
    { value: 100 - fatigue, weight: 0.18 },
    { value: sleep, weight: 0.12 },
    { value: hrv, weight: 0.07 },
    { value: rhr, weight: 0.05 },
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

  // Mais conservador que WHOOP oficial porque aqui os dados são majoritariamente manuais.
  if (score >= 75) return 'green';
  if (score >= 55) return 'yellow';
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

function getDailyMasterSignal(checkinLike) {
  const recovery = clamp(checkinLike?.recovery_score ?? 0);
  const readiness = clamp(checkinLike?.readiness_score ?? recovery);
  const fatigue = clamp(checkinLike?.fatigue_score ?? checkinLike?.fatigue ?? 0);
  const sleep = clamp(checkinLike?.sleep_quality ?? checkinLike?.sleep_score ?? 0);
  const deepSleep = Number(checkinLike?.deep_sleep_pct ?? 0);
  const soreness = Number(resolveCheckinField(checkinLike, 'muscle_soreness') ?? 0);
  const restDay = !!checkinLike?.rest_day;
  const confidence = checkinLike?.preview_confidence ?? 'low';

  const hasHrv = !!(checkinLike?.hrv && checkinLike.hrv > 0);
  const rhrValue = resolveCheckinField(checkinLike, 'resting_hr');
  const hasRhr = !!(rhrValue && rhrValue > 0);
  const strongPhysiology = hasHrv || hasRhr;

  if (restDay) return 'recover';

  if (
    recovery < 50 ||
    readiness < 50 ||
    fatigue >= 72 ||
    soreness >= 4 ||
    (deepSleep > 0 && deepSleep < 12)
  ) {
    return 'recover';
  }

  // Para parecer mais WHOOP-like, "treino forte" exige apoio fisiológico real
  if (
    recovery >= 82 &&
    readiness >= 80 &&
    fatigue <= 22 &&
    sleep >= 72 &&
    soreness <= 1 &&
    strongPhysiology &&
    confidence !== 'low'
  ) {
    return 'train_high';
  }

  if (recovery >= 65 && readiness >= 62) {
    return 'train_moderate';
  }

  if (recovery >= 50) {
    return 'train_light';
  }

  return 'recover';
}

function buildHeadline(masterSignal, checkinLike) {
  const sleepDebtHint = checkinLike?.sleep_need_tonight;
  if (masterSignal === 'train_high') {
    return 'Boa janela para intensidade hoje';
  }
  if (masterSignal === 'train_moderate') {
    return 'Moderado é a melhor dose hoje';
  }
  if (masterSignal === 'train_light') {
    return 'Hoje vale manter leve';
  }

  if (sleepDebtHint && sleepDebtHint >= 8) {
    return 'Hoje recuperar vale mais do que insistir';
  }

  return 'Seu corpo pede recuperação hoje';
}

function buildRecommendation(masterSignal, checkinLike) {
  const deepSleep = Number(checkinLike?.deep_sleep_pct ?? 0);
  const soreness = Number(resolveCheckinField(checkinLike, 'muscle_soreness') ?? 0);

  if (masterSignal === 'train_high') {
    return 'Seu corpo acordou com boa margem. Se o aquecimento confirmar, hoje é um bom dia para um estímulo mais forte.';
  }

  if (masterSignal === 'train_moderate') {
    if (deepSleep > 0 && deepSleep < 18) {
      return 'Seu corpo está funcional, mas o sono reduz a margem de intensidade. Moderado é a melhor dose hoje.';
    }
    return 'Hoje o ganho está em consistência, não em exagero. Um treino moderado tende a render mais do que forçar.';
  }

  if (masterSignal === 'train_light') {
    if (soreness >= 3) {
      return 'Há espaço para movimento, mas a dor muscular sugere manter a sessão curta e leve.';
    }
    return 'Hoje vale usar movimento leve como manutenção, sem exigir demais do sistema.';
  }

  return 'Hoje faz mais sentido priorizar descanso ou recuperação ativa do que buscar intensidade.';
}

function buildTrainingLoadLabel(masterSignal) {
  if (masterSignal === 'train_high') return 'Boa carga / recuperação sustentável';
  if (masterSignal === 'train_moderate') return 'Carga moderada / controlada';
  if (masterSignal === 'train_light') return 'Carga leve / manutenção';
  return 'Descanso / recuperação ativa';
}

export function normalizeDailySignals(checkinLike) {
  const masterSignal = getDailyMasterSignal(checkinLike);

  const zone =
    masterSignal === 'train_high' ? 'green' :
    masterSignal === 'train_moderate' ? 'yellow' :
    masterSignal === 'train_light' ? 'yellow' :
    'red';

  return {
    ...checkinLike,
    decision_mode: masterSignal,
    zone,
    headline_today: buildHeadline(masterSignal, checkinLike),
    recommendation: buildRecommendation(masterSignal, checkinLike),
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
  let base = 7.5;

  if ((recoveryScore ?? 0) < 60) base += 1.0;
  if ((strainAccumulated || 0) > 12) base += 0.5;

  if (recentCheckins && recentCheckins.length >= 3) {
    const sleepDeficit = recentCheckins.slice(0, 7).reduce((sum, c) => {
      const h = c.sleep_hours || 0;
      return sum + Math.max(0, 7.5 - h);
    }, 0);

    if (sleepDeficit > 3) base += 0.5;
  }

  return Math.min(10, Math.round(base * 2) / 2);
}

export function calcNextDayForecast(recoveryScore, sleepNeedTonight) {
  const recovery = clamp(recoveryScore ?? 0);

  if (recovery >= 75 && sleepNeedTonight <= 7.5) {
    return `Se você dormir bem hoje, a tendência para amanhã é manter uma boa recuperação. Meta de sono: ${sleepNeedTonight}h.`;
  }

  if (recovery < 60 || sleepNeedTonight > 8) {
    return `Hoje à noite, o sono será decisivo. Se você chegar perto de ${sleepNeedTonight}h, a chance de recuperar melhor amanhã aumenta.`;
  }

  return `Amanhã vai depender bastante da qualidade do sono desta noite. Meta prática: ${sleepNeedTonight}h.`;
}

// ─── AI helpers ────────────────────────────────────────────────────────────

export async function generateTrainingReasonAI(checkin, scores, recentCheckins, acwr) {
  const { base44 } = await import('@/api/base44Client');

  const hrvValues = (recentCheckins || []).slice(0, 7).map((c) => c.hrv).filter(Boolean);
  const hrvAvg =
    hrvValues.length > 0
      ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length)
      : null;

  const hrvDeltaPct =
    checkin.hrv && hrvAvg
      ? Math.round(((checkin.hrv - hrvAvg) / hrvAvg) * 100)
      : null;

  const sleepDebt = (recentCheckins || []).slice(0, 7).reduce((sum, c) => {
    return sum + Math.max(0, 7.5 - (c.sleep_hours || 0));
  }, 0);

  const prompt = `Você é um coach de performance. Gere UMA frase curta (máx 2 linhas) explicando por que a recomendação de treino de hoje faz sentido. Em português brasileiro. Tom direto e pessoal. Não use título, bullet ou aspas. Evite contradições entre recuperação e treino.

Dados do dia:
- Recovery: ${scores?.recovery_score ?? checkin.biocharge_morning ?? '—'}
- Readiness: ${scores?.readiness_score ?? '—'}
- HRV delta vs semana: ${hrvDeltaPct != null ? `${hrvDeltaPct >= 0 ? '+' : ''}${hrvDeltaPct}%` : '—'}
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

  const hrvValues = (recentCheckins || []).slice(0, 7).map((c) => c.hrv).filter(Boolean);
  const hrvAvg =
    hrvValues.length > 0
      ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length)
      : null;

  const hrvDeltaPct =
    checkin.hrv && hrvAvg
      ? Math.round(((checkin.hrv - hrvAvg) / hrvAvg) * 100)
      : null;

  const sleepDebt = (recentCheckins || []).slice(0, 7).reduce((sum, c) => {
    return sum + Math.max(0, 7.5 - (c.sleep_hours || 0));
  }, 0);

  const lastSession =
    (recentSessions || [])
      .filter((s) => s.date !== checkin.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;

  const prompt = `Você é um coach de performance. Gere EXATAMENTE 2 bullets curtos para o dia de hoje. Em português brasileiro. Cada bullet deve:
- começar com emoji
- ser direto
- usar os dados reais quando relevante
- evitar repetições e contradições
- ajudar o atleta a executar melhor o dia

Dados:
- Recovery: ${scores?.recovery_score ?? checkin.biocharge_morning ?? '—'}
- Readiness: ${scores?.readiness_score ?? '—'}
- HRV delta vs semana: ${hrvDeltaPct != null ? `${hrvDeltaPct >= 0 ? '+' : ''}${hrvDeltaPct}%` : 'sem dados'}
- ACWR: ${acwr != null ? acwr.toFixed(2) : 'sem dados'}
- Dívida de sono (7 dias): ${sleepDebt.toFixed(1)}h
- Dor muscular: ${resolveCheckinField(checkin, 'muscle_soreness') ?? '—'}/5
- Stress: ${resolveCheckinField(checkin, 'stress') ?? '—'}/5
- Estado fisiológico: ${checkin.current_body_state ?? scores?.current_body_state ?? '—'}
- Último treino: ${lastSession ? `${lastSession.sport} (${lastSession.intensity}) em ${lastSession.date}` : 'sem dados'}

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

  const hrvValues = (recentCheckins || []).slice(0, 7).map((c) => c.hrv).filter(Boolean);
  const hrvAvg =
    hrvValues.length > 0
      ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length)
      : null;

  const hrvStatus =
    checkin.hrv && hrvAvg
      ? checkin.hrv > hrvAvg + 5
        ? 'alto'
        : checkin.hrv < hrvAvg - 5
        ? 'baixo'
        : 'normal'
      : null;

  const prompt = `Você é um coach de alta performance. Gere um headline curto para a tela de hoje. Máximo 12 palavras. Em português brasileiro. Sem aspas. Sem ponto final. O headline deve refletir a decisão principal do dia, sem exagerar.

Dados:
- Prontidão: ${scores?.readiness_score ?? checkin.biocharge_morning ?? '—'}
- Recovery: ${scores?.recovery_score ?? '—'}
- Zone: ${scores?.zone ?? checkin.zone ?? '—'}
- HRV: ${checkin.hrv ?? '—'} ms${hrvStatus ? ` (${hrvStatus})` : ''}
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

  const hrvValues = (recentCheckins || []).slice(0, 7).map((c) => c.hrv).filter(Boolean);
  const hrvAvg =
    hrvValues.length > 0
      ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length)
      : null;

  const hrvDelta =
    checkin.hrv && hrvAvg
      ? checkin.hrv - hrvAvg
      : null;

  const deepSleepLow = (recentCheckins || []).slice(0, 3).filter((c) => (c.deep_sleep_pct || 0) < 15).length;

  const prompt = `Você é um coach de performance esportiva. Escreva uma projeção curta para amanhã em 2–3 frases. Em português brasileiro. Seja cauteloso: trate como tendência, não como garantia. Deixe claro que depende do sono desta noite.

Dados do check-in de hoje:
- BioCharge manhã: ${checkin.biocharge_morning ?? '—'}
- HRV: ${checkin.hrv ?? '—'} ms${hrvDelta != null ? ` (${hrvDelta >= 0 ? '+' : ''}${hrvDelta}ms vs média da semana)` : ''}
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

export function computeCheckinScores(checkin, recentCheckins, recentSessions) {
  const canonicalCheckin = {
    ...checkin,
    energy: resolveCheckinField(checkin, 'energy'),
    stress: resolveCheckinField(checkin, 'stress'),
    muscle_soreness: resolveCheckinField(checkin, 'muscle_soreness'),
    mood: resolveCheckinField(checkin, 'mood'),
    resting_hr: resolveCheckinField(checkin, 'resting_hr'),
    hydration: resolveCheckinField(checkin, 'hydration'),
  };

  const recoveryScore = calculateRecoveryScore(canonicalCheckin);
  const sleepScore = calculateSleepScore(canonicalCheckin);
  const fatigueScore = calculateFatigueScore(canonicalCheckin);
  const stressScore = calculateStressScore(canonicalCheckin);
  const readinessScore = calculateReadinessScore(canonicalCheckin);

  const deltaPre = getDeltaPre(canonicalCheckin.biocharge_morning, canonicalCheckin.biocharge_pre_workout);
  const deltaPost = getDeltaPost(canonicalCheckin.biocharge_pre_workout, canonicalCheckin.biocharge_post_workout);

  const alert = getAlert(recoveryScore, deltaPre, canonicalCheckin.fatigue || 0);
  const baseRecommendation = getRecommendation(getZone(recoveryScore), canonicalCheckin.biocharge_pre_workout || 0);
  const trainingLoad = getTrainingLoad(recoveryScore, deltaPost);

  const strainAccumulated = canonicalCheckin.daily_strain_accumulated ?? 0;
  const sleepNeedTonight = calcSleepNeedTonight(recoveryScore, strainAccumulated, recentCheckins);
  const nextDayForecast = calcNextDayForecast(recoveryScore, sleepNeedTonight);
  const delayedFatigueAlert = calcDelayedFatigueAlert(canonicalCheckin, recentCheckins, recentSessions);

  const normalized = normalizeDailySignals({
    ...canonicalCheckin,
    recovery_score: recoveryScore,
    sleep_quality: sleepScore,
    fatigue_score: fatigueScore,
    stress_score: stressScore,
    readiness_score: readinessScore,
    delta_pre: deltaPre,
    delta_post: deltaPost,
    alert,
    recommendation: canonicalCheckin.recommendation || baseRecommendation,
    training_load: canonicalCheckin.training_load || trainingLoad,
    sleep_need_tonight: canonicalCheckin.sleep_need_tonight ?? sleepNeedTonight,
    next_day_forecast: canonicalCheckin.next_day_forecast ?? nextDayForecast,
    delayed_fatigue_alert: canonicalCheckin.delayed_fatigue_alert ?? delayedFatigueAlert,
  });

  return normalized;
}

// ─── Smart insights ────────────────────────────────────────────────────────

export function getSmartMessage(checkin, recentCheckins) {
  const messages = [];

  if (recentCheckins && recentCheckins.length >= 4) {
    const hrvValues = recentCheckins.slice(0, 4).map((c) => c.hrv).filter(Boolean);
    if (hrvValues.length >= 3) {
      const trend = hrvValues[0] - hrvValues[hrvValues.length - 1];
      if (trend < -10) {
        messages.push(`Seu HRV caiu ${Math.abs(Math.round(trend))}ms nos últimos dias — sinal de estresse acumulado.`);
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
    } else {
      break;
    }
  }

  return streak;
}

export function getBadges(checkins, streak) {
  const badges = [];

  if (streak >= 3) badges.push({ id: 'streak3', label: '3 dias seguidos', icon: '🔥', color: 'orange' });
  if (streak >= 7) badges.push({ id: 'streak7', label: 'Semana completa', icon: '⚡', color: 'yellow' });
  if (streak >= 30) badges.push({ id: 'streak30', label: 'Mês consistente', icon: '🏆', color: 'gold' });

  const greenDays = checkins.filter((c) => c.zone === 'green').length;
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
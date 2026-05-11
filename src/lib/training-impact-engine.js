/**
 * Training Impact Engine
 * Calculates strain scores, body states, remaining capacity and recovery demand
 * All heavy AI calls go through InvokeLLM
 */
import { base44 } from '@/api/base44Client';

// Visual intensity factors mapped to FC zones (WHOOP methodology)
const INTENSITY_FACTORS_VISUAL = {
  very_light: 0.50,
  light:      0.65,
  moderate:   0.75,
  hard:       0.87,
  very_hard:  0.95,
};

// Sport cardiovascular demand factors (WHOOP scale 0-21)
const SPORT_FACTORS = {
  corrida: 1.0,
  ciclismo: 0.9,
  natação: 0.95,
  futsal: 0.9,
  futebol: 0.85,
  basquete: 0.9,
  musculação: 0.7,
  crossfit: 1.05,
  hiit: 1.1,
  'jiu-jitsu': 0.85,
  boxe: 1.0,
  yoga: 0.5,
  pilates: 0.6,
  caminhada: 0.4,
  default: 0.8,
};

const DEFAULT_MAX_HR = 185;

/**
 * Calculate strain score on 0-21 scale (WHOOP methodology)
 */
export function calculateStrainScore(session, maxHr) {
  const fcMedia = session.heart_rate_avg ? Number(session.heart_rate_avg) : 0;
  const fcMaxima = session.heart_rate_max ? Number(session.heart_rate_max) : 0;
  const personalMaxHr = maxHr || DEFAULT_MAX_HR;
  const duration = session.duration_minutes || 30;
  const effort = session.perceived_effort || 6;

  // Determine intensity_final
  let intensidadeFinal;
  if (fcMedia > 0 && fcMaxima > 0) {
    intensidadeFinal = fcMedia / fcMaxima;
  } else if (fcMedia > 0) {
    intensidadeFinal = fcMedia / personalMaxHr;
  } else {
    intensidadeFinal = INTENSITY_FACTORS_VISUAL[session.intensity] || 0.75;
  }

  const sportKey = Object.keys(SPORT_FACTORS).find(k =>
    session.sport?.toLowerCase().includes(k)
  );
  const sportFactor = SPORT_FACTORS[sportKey] || SPORT_FACTORS.default;

  const raw = intensidadeFinal * (duration / 60) * sportFactor * 21;
  return Math.min(21, Math.round(raw * 10) / 10);
}

/**
 * Determine body state from morning recovery and accumulated strain
 */
// Convert 0-21 strain to 0-100 scale for body state comparisons
function strainTo100(strain) {
  return Math.round((strain / 21) * 100);
}

export function calculateBodyState(morningRecovery, accumulatedStrain) {
  const strain100 = strainTo100(accumulatedStrain || 0);
  const net = morningRecovery - strain100;

  if (!accumulatedStrain) {
    if (morningRecovery >= 80) return 'Recovered';
    if (morningRecovery >= 65) return 'Balanced';
    if (morningRecovery >= 50) return 'Loaded';
    return 'Fatigued';
  }

  if (net >= 40) return 'Activated';
  if (net >= 20) return 'Balanced';
  if (net >= 0) return 'Loaded';
  if (net >= -20) return 'Sympathetic_Load';
  if (net >= -40) return 'Fatigued';
  return 'Overreached';
}

/**
 * Determine remaining capacity
 * Uses ratio of strain used vs recovery score
 */
export function calculateRemainingCapacity(morningRecovery, accumulatedStrain) {
  if (!morningRecovery || morningRecovery <= 0) return 'Minimal';
  const strain100 = strainTo100(accumulatedStrain || 0);
  const capacidadeUsada = (strain100 / morningRecovery) * 100;
  if (capacidadeUsada < 30) return 'High';
  if (capacidadeUsada < 60) return 'Moderate';
  if (capacidadeUsada < 85) return 'Low';
  return 'Minimal';
}

/**
 * Calculate recovery demand for tonight (strain on 0-21 scale)
 */
export function calculateRecoveryDemand(accumulatedStrain, morningRecovery) {
  const strain100 = strainTo100(accumulatedStrain || 0);
  const fatigueBonus = morningRecovery < 60 ? (60 - morningRecovery) * 0.3 : 0;
  return Math.min(100, Math.round(strain100 + fatigueBonus));
}

/**
 * Calculate recommended sleep hours (strain on 0-21 scale)
 */
export function calculateSleepNeed(accumulatedStrain, morningRecovery) {
  let base = 7.5;
  if (morningRecovery < 60) base += 1.0;
  if ((accumulatedStrain || 0) > 12) base += 0.5;
  return Math.min(10, Math.round(base * 2) / 2);
}

/**
 * Generate AI impact message after a training session
 */
export async function generateTrainingImpactMessage(session, checkin, allSessionsToday) {
  const strainScore = session.strain_score || calculateStrainScore(session);
  const totalStrain = allSessionsToday.reduce((s, t) => s + (t.strain_score || 0), 0);
  const bodyState = calculateBodyState(checkin.morning_recovery_score || checkin.recovery_score, totalStrain);
  const capacity = calculateRemainingCapacity(checkin.morning_recovery_score || checkin.recovery_score, totalStrain);

  const intensityLabels = {
    very_light: 'muito leve', light: 'leve', moderate: 'moderada',
    hard: 'intensa', very_hard: 'muito intensa'
  };

  const prompt = `Você é um fisiologista esportivo analisando o impacto de um treino.

Usuário completou: ${session.sport} por ${session.duration_minutes} minutos com intensidade ${intensityLabels[session.intensity] || session.intensity}.
Strain deste treino: ${strainScore} pontos.
Strain acumulado no dia: ${totalStrain} pontos.
Recovery matinal: ${checkin.morning_recovery_score || checkin.recovery_score}/100.
Estado corporal atual: ${bodyState}.
Capacidade restante: ${capacity}.

Gere uma mensagem de impacto CURTA (2-3 frases) em português, direta ao ponto, focando em:
1. O que este treino gerou fisiologicamente
2. Estado atual do corpo
3. Uma recomendação prática para as próximas horas

Seja direto e informativo, sem ser alarmista. Use linguagem acessível mas precisa.`;

  const result = await base44.integrations.Core.InvokeLLM({ prompt });
  return result;
}

/**
 * Analyze delayed fatigue patterns from history
 */
export async function analyzeDelayedFatigue(checkins, sessions, todayCheckin) {
  if (!checkins || checkins.length < 7) return null;

  // Find patterns: intense sessions followed by low recovery next day
  const patterns = [];
  const sortedCheckins = [...checkins].sort((a, b) =>
    new Date(b.date + 'T12:00:00') - new Date(a.date + 'T12:00:00')
  );

  for (let i = 0; i < sortedCheckins.length - 1; i++) {
    const nextDay = sortedCheckins[i];
    const prevDay = sortedCheckins[i + 1];
    if (!nextDay.date || !prevDay.date) continue;

    const prevSessions = sessions.filter(s => s.date === prevDay.date && s.intensity === 'hard' || s.intensity === 'very_hard');
    if (prevSessions.length > 0 && nextDay.recovery_score < 65) {
      patterns.push({
        sport: prevSessions[0].sport,
        timeOfDay: prevSessions[0].time_of_day,
        recoveryDrop: prevDay.recovery_score - nextDay.recovery_score
      });
    }
  }

  if (patterns.length < 2) return null;

  // Find most frequent pattern
  const sportCounts = {};
  patterns.forEach(p => {
    sportCounts[p.sport] = (sportCounts[p.sport] || 0) + 1;
  });
  const topSport = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0];

  if (!topSport || topSport[1] < 2) return null;

  const avgDrop = Math.round(
    patterns.filter(p => p.sport === topSport[0]).reduce((s, p) => s + p.recoveryDrop, 0) /
    patterns.filter(p => p.sport === topSport[0]).length
  );

  return `Padrão detectado: ${topSport[0]} tende a reduzir seu recovery em ~${avgDrop} pontos no dia seguinte. Monitore a recuperação após sessões intensas.`;
}

/**
 * Generate next-day forecast
 */
export async function generateNextDayForecast(checkin, sessions) {
  const totalStrain = sessions.reduce((s, t) => s + (t.strain_score || 0), 0);
  const bodyState = calculateBodyState(checkin.morning_recovery_score || checkin.recovery_score, totalStrain);

  const prompt = `Fisiologista esportivo gerando previsão para amanhã.

Recovery matinal de hoje: ${checkin.morning_recovery_score || checkin.recovery_score}/100
Strain acumulado hoje: ${totalStrain}
Estado corporal ao fim do dia: ${bodyState}
Horas de sono recomendadas: ${calculateSleepNeed(totalStrain, checkin.morning_recovery_score || checkin.recovery_score)}h
HRV: ${checkin.hrv || 'não informado'}
Fadiga: ${checkin.fatigue || 'não informada'}

Gere uma previsão CURTA (1-2 frases) para amanhã: qual o estado esperado de recovery, se deve treinar e com qual intensidade.`;

  return await base44.integrations.Core.InvokeLLM({ prompt });
}
/**
 * Training Impact Engine
 * Calculates strain scores, body states, remaining capacity and recovery demand
 * All heavy AI calls go through InvokeLLM
 */
import { base44 } from '@/api/base44Client';

// Intensity multipliers for strain calculation
const INTENSITY_FACTORS = {
  very_light: 0.3,
  light: 0.5,
  moderate: 0.7,
  hard: 0.9,
  very_hard: 1.0,
};

// Sport cardiovascular demand factors
const SPORT_FACTORS = {
  corrida: 1.2,
  ciclismo: 1.1,
  natação: 1.15,
  futsal: 1.1,
  futebol: 1.1,
  basquete: 1.05,
  musculação: 0.85,
  crossfit: 1.1,
  'jiu-jitsu': 1.0,
  boxe: 1.1,
  yoga: 0.5,
  pilates: 0.6,
  caminhada: 0.6,
  hiit: 1.2,
  default: 0.9,
};

/**
 * Calculate strain score locally (fast, no AI needed)
 */
export function calculateStrainScore(session) {
  const intensity = INTENSITY_FACTORS[session.intensity] || 0.7;
  const sportKey = Object.keys(SPORT_FACTORS).find(k =>
    session.sport?.toLowerCase().includes(k)
  );
  const sportFactor = SPORT_FACTORS[sportKey] || SPORT_FACTORS.default;
  const duration = session.duration_minutes || 30;

  // Base formula: normalized to 0-100
  const raw = (duration / 60) * intensity * sportFactor * 100 * 0.4;
  return Math.min(100, Math.round(raw));
}

/**
 * Determine body state from morning recovery and accumulated strain
 */
export function calculateBodyState(morningRecovery, accumulatedStrain) {
  const net = morningRecovery - accumulatedStrain;

  if (accumulatedStrain === 0 || accumulatedStrain == null) {
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
 */
export function calculateRemainingCapacity(morningRecovery, accumulatedStrain) {
  const net = morningRecovery - accumulatedStrain;
  if (net >= 40) return 'High';
  if (net >= 20) return 'Moderate';
  if (net >= 0) return 'Low';
  return 'Minimal';
}

/**
 * Calculate recovery demand for tonight
 */
export function calculateRecoveryDemand(accumulatedStrain, morningRecovery) {
  // Base demand is the strain — but if morning was already low, demand is higher
  const baseDemand = accumulatedStrain || 0;
  const fatigueBonus = morningRecovery < 60 ? (60 - morningRecovery) * 0.3 : 0;
  return Math.min(100, Math.round(baseDemand + fatigueBonus));
}

/**
 * Calculate recommended sleep hours
 */
export function calculateSleepNeed(accumulatedStrain, morningRecovery) {
  const base = 7.5;
  const strainAdd = (accumulatedStrain || 0) > 60 ? 0.5 : (accumulatedStrain || 0) > 40 ? 0.25 : 0;
  const fatigueAdd = morningRecovery < 60 ? 0.5 : 0;
  return Math.min(10, Math.round((base + strainAdd + fatigueAdd) * 2) / 2);
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
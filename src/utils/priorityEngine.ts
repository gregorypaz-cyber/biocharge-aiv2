/**
 * Priority Engine — BioCharge AI
 *
 * Objetivo desta versão:
 * - reduzir contradições na Home
 * - garantir que RECOVERY_DAY e OVERLOAD não exibam treino "normal"
 * - manter no topo apenas 3 blocos principais:
 *   1) execution
 *   2) workout (ou proteção)
 *   3) sleep_forecast
 */

export type DayPhase = 'PLANNING' | 'OPTIMAL_LOAD' | 'OVERLOAD' | 'RECOVERY_DAY';

export type CardType =
  | 'execution'
  | 'workout'
  | 'morning_recovery'
  | 'narrative'
  | 'why_score'
  | 'current_state'
  | 'sleep_forecast'
  | 'hrv_anomaly'
  | 'recovery_demand'
  | 'post_workout_cta'
  | 'training_sessions';

export type CardAction = 'show' | 'mutate' | 'exclude';

export interface CardDescriptor {
  id: CardType;
  action: CardAction;
  priority: number;
  mutation?: {
    title: string;
    body: string;
    icon: string;
    variant: 'protection' | 'info' | 'warning';
  };
}

export interface PriorityResult {
  primary: CardDescriptor[];
  secondary: CardDescriptor[];
}

export type WorkoutIntensity = 'low' | 'moderate' | 'high' | 'unknown';

export interface PriorityEngineInput {
  phase: DayPhase;
  workoutIntensity: WorkoutIntensity;
  scheduledSport?: string;
  hasWorkoutSessions: boolean;
  hasAnalysis: boolean;
  hasHrvAnomaly: boolean;
  hasNarrative: boolean;
  hasRecoveryDemandAlert: boolean;
}

function rulesForPhase(phase: DayPhase, input: PriorityEngineInput): CardDescriptor[] {
  const {
    scheduledSport,
    hasWorkoutSessions,
    hasAnalysis,
    hasHrvAnomaly,
    hasRecoveryDemandAlert,
  } = input;

  const sportLabel = scheduledSport || 'treino';

  switch (phase) {
    case 'PLANNING':
      return [
        { id: 'execution',         action: 'show', priority: 1 },
        { id: 'workout',           action: 'show', priority: 2 },
        { id: 'sleep_forecast',    action: 'show', priority: 3 },

        { id: 'training_sessions', action: 'show', priority: 4 },
        { id: 'morning_recovery',  action: 'show', priority: 5 },
        { id: 'current_state',     action: 'show', priority: 6 },
        { id: 'why_score',         action: hasAnalysis ? 'show' : 'exclude', priority: 7 },
        { id: 'hrv_anomaly',       action: hasHrvAnomaly ? 'show' : 'exclude', priority: 8 },
        { id: 'recovery_demand',   action: hasRecoveryDemandAlert ? 'show' : 'exclude', priority: 9 },
        { id: 'post_workout_cta',  action: hasWorkoutSessions ? 'show' : 'exclude', priority: 10 },
        { id: 'narrative',         action: 'exclude', priority: 11 },
      ];

    case 'OPTIMAL_LOAD':
      return [
        { id: 'execution',         action: 'show', priority: 1 },
        { id: 'workout',           action: 'show', priority: 2 },
        { id: 'sleep_forecast',    action: 'show', priority: 3 },

        { id: 'post_workout_cta',  action: hasWorkoutSessions ? 'show' : 'exclude', priority: 4 },
        { id: 'training_sessions', action: 'show', priority: 5 },
        { id: 'morning_recovery',  action: 'show', priority: 6 },
        { id: 'current_state',     action: 'show', priority: 7 },
        { id: 'why_score',         action: hasAnalysis ? 'show' : 'exclude', priority: 8 },
        { id: 'hrv_anomaly',       action: hasHrvAnomaly ? 'show' : 'exclude', priority: 9 },
        { id: 'recovery_demand',   action: 'exclude', priority: 10 },
        { id: 'narrative',         action: 'exclude', priority: 11 },
      ];

    case 'OVERLOAD':
      return [
        { id: 'execution',         action: 'show', priority: 1 },
        {
          id: 'workout',
          action: 'mutate',
          priority: 2,
          mutation: {
            title: 'Proteção do dia',
            body: `O ${sportLabel} foi rebaixado hoje. Sua carga já chegou no limite útil — recuperar agora gera mais resultado do que insistir em mais treino.`,
            icon: '🛡️',
            variant: 'protection',
          },
        },
        { id: 'sleep_forecast',    action: 'show', priority: 3 },

        { id: 'hrv_anomaly',       action: hasHrvAnomaly ? 'show' : 'exclude', priority: 4 },
        { id: 'training_sessions', action: 'show', priority: 5 },
        { id: 'post_workout_cta',  action: hasWorkoutSessions ? 'show' : 'exclude', priority: 6 },
        { id: 'morning_recovery',  action: 'show', priority: 7 },
        { id: 'current_state',     action: 'show', priority: 8 },
        { id: 'why_score',         action: hasAnalysis ? 'show' : 'exclude', priority: 9 },
        { id: 'recovery_demand',   action: 'exclude', priority: 10 },
        { id: 'narrative',         action: 'exclude', priority: 11 },
      ];

    case 'RECOVERY_DAY':
      return [
        { id: 'execution',         action: 'show', priority: 1 },
        {
          id: 'workout',
          action: 'mutate',
          priority: 2,
          mutation: {
            title: 'Dia de recuperação',
            body: `O ${sportLabel} ficou em segundo plano hoje. O foco agora é baixar o estresse do sistema, recuperar energia e preservar adaptação para os próximos 1–2 dias.`,
            icon: '🌙',
            variant: 'protection',
          },
        },
        { id: 'sleep_forecast',    action: 'show', priority: 3 },

        { id: 'hrv_anomaly',       action: hasHrvAnomaly ? 'show' : 'exclude', priority: 4 },
        { id: 'training_sessions', action: 'show', priority: 5 },
        { id: 'post_workout_cta',  action: hasWorkoutSessions ? 'show' : 'exclude', priority: 6 },
        { id: 'morning_recovery',  action: 'show', priority: 7 },
        { id: 'current_state',     action: 'show', priority: 8 },
        { id: 'why_score',         action: hasAnalysis ? 'show' : 'exclude', priority: 9 },
        { id: 'recovery_demand',   action: 'exclude', priority: 10 },
        { id: 'narrative',         action: 'exclude', priority: 11 },
      ];

    default:
      return [];
  }
}

const MAX_PRIMARY = 3;

export function buildCardLayout(input: PriorityEngineInput): PriorityResult {
  const allCards = rulesForPhase(input.phase, input)
    .filter((c) => c.action !== 'exclude')
    .sort((a, b) => a.priority - b.priority);

  const primary = allCards.slice(0, MAX_PRIMARY);
  const secondary = allCards.slice(MAX_PRIMARY);

  return { primary, secondary };
}

export function resolveWorkoutIntensity(analysis: any, prescription: any): WorkoutIntensity {
  if (prescription?.recommendedKey) {
    const opt = prescription.options?.find((o: any) => o.key === prescription.recommendedKey);
    if (opt?.intensity?.range) {
      const max = opt.intensity.range[1];
      if (max >= 8) return 'high';
      if (max >= 6) return 'moderate';
      return 'low';
    }
  }

  const state = analysis?.physioState?.state;
  if (!state) return 'unknown';

  if (['Recovered', 'Activated'].includes(state)) return 'high';
  if (['Balanced', 'Loaded'].includes(state)) return 'moderate';
  if (['Fatigued', 'Overreached', 'Sympathetic_Load'].includes(state)) return 'low';

  return 'unknown';
}
/**
 * Priority Engine — BioCharge AI
 *
 * Gerencia QUAIS cards aparecem na Home, em que ordem, e com qual conteúdo,
 * baseado no DayPhase atual. Suporta três operações sobre cards:
 *
 *  - SHOW    → exibe o card normalmente
 *  - MUTATE  → substitui o card por uma versão alternativa (ex: Proteção)
 *  - EXCLUDE → remove o card da view principal (pode ir para Secundários)
 */

export type DayPhase = 'PLANNING' | 'OPTIMAL_LOAD' | 'OVERLOAD' | 'RECOVERY_DAY';

export type CardType =
  | 'execution'       // Prontidão + CTA
  | 'workout'         // WorkoutSuggestionCard
  | 'morning_recovery'// MorningRecoveryCard
  | 'narrative'       // NarrativeCard
  | 'why_score'       // WhyScoreCard
  | 'current_state'   // CurrentStateCard
  | 'sleep_forecast'  // SleepForecastCard
  | 'hrv_anomaly'     // HRV alert
  | 'recovery_demand' // Recovery demand alert
  | 'post_workout_cta'// CTA pós-treino
  | 'training_sessions'; // Lista de sessões

export type CardAction = 'show' | 'mutate' | 'exclude';

export interface CardDescriptor {
  id: CardType;
  action: CardAction;
  priority: number; // 1 = mais importante (primário), >3 = secundário
  /** Se action === 'mutate', este objeto substitui o conteúdo do card */
  mutation?: {
    title: string;
    body: string;
    icon: string; // emoji
    variant: 'protection' | 'info' | 'warning';
  };
}

export interface PriorityResult {
  /** Cards primários — exibidos diretamente (máx 3) */
  primary: CardDescriptor[];
  /** Cards secundários — agrupados no componente expansível */
  secondary: CardDescriptor[];
}

/** Intensidade do treino agendado/sugerido (extraída do analysis ou presc) */
export type WorkoutIntensity = 'low' | 'moderate' | 'high' | 'unknown';

export interface PriorityEngineInput {
  phase: DayPhase;
  workoutIntensity: WorkoutIntensity;
  /** Nome do esporte agendado para a mensagem de mutação */
  scheduledSport?: string;
  hasWorkoutSessions: boolean;
  hasAnalysis: boolean;
  hasHrvAnomaly: boolean;
  hasNarrative: boolean;
  hasRecoveryDemandAlert: boolean;
}

// ─── Rule definitions por DayPhase ──────────────────────────────────────────

function rulesForPhase(phase: DayPhase, input: PriorityEngineInput): CardDescriptor[] {
  const {
    workoutIntensity,
    scheduledSport,
    hasWorkoutSessions,
    hasAnalysis,
    hasHrvAnomaly,
    hasNarrative,
    hasRecoveryDemandAlert,
  } = input;

  const sportLabel = scheduledSport || 'treino';

  switch (phase) {
    // ── PLANNING: exibe tudo normalmente, workout em destaque ──────────────
    case 'PLANNING':
      return [
        { id: 'execution',          action: 'show', priority: 1 },
        { id: 'workout',            action: 'show', priority: 2 },
        { id: 'morning_recovery',   action: 'show', priority: 3 },
        { id: 'training_sessions',  action: 'show', priority: 4 },
        { id: 'narrative',          action: 'exclude', priority: 5 },
        { id: 'why_score',          action: hasAnalysis  ? 'show' : 'exclude', priority: 6 },
        { id: 'current_state',      action: 'show', priority: 7 },
        { id: 'hrv_anomaly',        action: hasHrvAnomaly ? 'show' : 'exclude', priority: 8 },
        { id: 'recovery_demand',    action: hasRecoveryDemandAlert ? 'show' : 'exclude', priority: 9 },
        { id: 'post_workout_cta',   action: hasWorkoutSessions ? 'show' : 'exclude', priority: 10 },
        { id: 'sleep_forecast',     action: 'show', priority: 11 },
      ];

    // ── OPTIMAL_LOAD: workout ainda visível mas rebaixado; sono sobe ───────
    case 'OPTIMAL_LOAD':
      return [
        { id: 'execution',          action: 'show', priority: 1 },
        { id: 'morning_recovery',   action: 'show', priority: 2 },
        { id: 'sleep_forecast',     action: 'show', priority: 3 },
        { id: 'post_workout_cta',   action: hasWorkoutSessions ? 'show' : 'exclude', priority: 4 },
        { id: 'workout',            action: 'show', priority: 5 },
        { id: 'training_sessions',  action: 'show', priority: 6 },
        { id: 'narrative',          action: 'exclude', priority: 7 },
        { id: 'current_state',      action: 'show', priority: 8 },
        { id: 'why_score',          action: hasAnalysis  ? 'show' : 'exclude', priority: 9 },
        { id: 'hrv_anomaly',        action: hasHrvAnomaly ? 'show' : 'exclude', priority: 10 },
        { id: 'recovery_demand',    action: 'exclude', priority: 11 },
      ];

    // ── OVERLOAD: workout mod/alta EXCLUÍDO ou MUTADO; recuperação sobe ───
    case 'OVERLOAD': {
      const isHighIntensity = workoutIntensity === 'moderate' || workoutIntensity === 'high';
      const workoutAction: CardAction = isHighIntensity ? 'mutate' : 'show';

      return [
        { id: 'execution',          action: 'show', priority: 1 },
        { id: 'morning_recovery',   action: 'show', priority: 2 },
        // Workout MUTADO para Insight de Proteção se intensidade mod/alta
        {
          id: 'workout',
          action: workoutAction,
          priority: 3,
          ...(workoutAction === 'mutate' && {
            mutation: {
              title: 'Insight de Proteção',
              body: `O ${sportLabel} foi pausado hoje para proteger seu HRV. Treinamento intenso agora aprofundaria a fadiga — o ganho vem do descanso.`,
              icon: '🛡️',
              variant: 'protection' as const,
            },
          }),
        },
        { id: 'hrv_anomaly',        action: hasHrvAnomaly ? 'show' : 'exclude', priority: 4 },
        { id: 'sleep_forecast',     action: 'show', priority: 5 },
        { id: 'post_workout_cta',   action: hasWorkoutSessions ? 'show' : 'exclude', priority: 6 },
        { id: 'training_sessions',  action: 'show', priority: 7 },
        // Tudo abaixo vai para Secundários
        { id: 'narrative',          action: 'exclude', priority: 8 },
        { id: 'current_state',      action: 'show', priority: 9 },
        { id: 'why_score',          action: hasAnalysis  ? 'show' : 'exclude', priority: 10 },
        { id: 'recovery_demand',    action: 'exclude', priority: 11 },
      ];
    }

    // ── RECOVERY_DAY: workout EXCLUÍDO completamente se alta; sono lidera ─
    case 'RECOVERY_DAY': {
      const isHighIntensity = workoutIntensity === 'high';
      const workoutAction: CardAction = isHighIntensity
        ? 'mutate'
        : workoutIntensity === 'moderate'
        ? 'mutate'
        : 'show';

      return [
        { id: 'execution',          action: 'show', priority: 1 },
        { id: 'sleep_forecast',     action: 'show', priority: 2 },
        { id: 'morning_recovery',   action: 'show', priority: 3 },
        {
          id: 'workout',
          action: workoutAction,
          priority: 4,
          ...(workoutAction === 'mutate' && {
            mutation: {
              title: 'Dia de Proteção',
              body: `O ${sportLabel} foi pausado. Seu corpo está em modo de recuperação — forçar intensidade hoje compromete a adaptação dos próximos 48h.`,
              icon: '🌙',
              variant: 'protection' as const,
            },
          }),
        },
        { id: 'hrv_anomaly',        action: hasHrvAnomaly ? 'show' : 'exclude', priority: 5 },
        { id: 'training_sessions',  action: 'show', priority: 6 },
        { id: 'post_workout_cta',   action: hasWorkoutSessions ? 'show' : 'exclude', priority: 7 },
        // Tudo abaixo rebaixado
        { id: 'narrative',          action: 'exclude', priority: 8 },
        { id: 'current_state',      action: 'show', priority: 9 },
        { id: 'why_score',          action: hasAnalysis  ? 'show' : 'exclude', priority: 10 },
        { id: 'recovery_demand',    action: 'exclude', priority: 11 },
      ];
    }

    default:
      return [];
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

const MAX_PRIMARY = 3;

export function buildCardLayout(input: PriorityEngineInput): PriorityResult {
  const allCards = rulesForPhase(input.phase, input)
    .filter(c => c.action !== 'exclude')
    .sort((a, b) => a.priority - b.priority);

  const primary   = allCards.slice(0, MAX_PRIMARY);
  const secondary = allCards.slice(MAX_PRIMARY);

  return { primary, secondary };
}

/** Convola uma prescrição/análise em WorkoutIntensity legível pela engine */
export function resolveWorkoutIntensity(analysis: any, prescription: any): WorkoutIntensity {
  // Tenta extrair da prescrição primeiro
  if (prescription?.recommendedKey) {
    const opt = prescription.options?.find((o: any) => o.key === prescription.recommendedKey);
    if (opt?.intensity?.range) {
      const maxRPE = opt.intensity.range[1];
      if (maxRPE >= 8) return 'high';
      if (maxRPE >= 6) return 'moderate';
      return 'low';
    }
  }

  // Fallback: estado fisiológico da análise
  const state = analysis?.physioState?.state;
  if (!state) return 'unknown';
  if (['Recovered', 'Activated'].includes(state)) return 'high';
  if (['Balanced', 'Loaded'].includes(state)) return 'moderate';
  if (['Fatigued', 'Overreached', 'Sympathetic_Load'].includes(state)) return 'low';

  return 'unknown';
}
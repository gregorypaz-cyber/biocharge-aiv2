import React, { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useUserCheckins, useUserTrainingSessions } from '@/hooks/useUserData';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Plus, Zap, Dumbbell, Info } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { getTodayLocal } from '@/lib/date-utils';
import { computeCheckinScores } from '@/lib/biocharge-utils';
import { calculateBodyState, calculateRemainingCapacity, calculateRecoveryDemand, calculateSleepNeed } from '@/lib/training-impact-engine';
import { runPhysiologicalAnalysisAsync } from '@/lib/physiological-engine';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useDayContext } from '@/lib/dayContext';

import MorningRecoveryCard from '@/components/today/MorningRecoveryCard';
import TrainingSessionsList from '@/components/today/TrainingSessionsList';
import CurrentStateCard from '@/components/today/CurrentStateCard';
import SleepForecastCard from '@/components/today/SleepForecastCard';
import WorkoutSuggestionCard from '@/components/today/WorkoutSuggestionCard';
import NarrativeCard from '@/components/intelligence/NarrativeCard';
import WhyScoreCard from '@/components/intelligence/WhyScoreCard';

export default function Today() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const today = getTodayLocal();

  const { data: checkins = [], isLoading: loadingCheckins } = useUserCheckins(30);
  const { data: allSessions = [], isLoading: loadingSessions } = useUserTrainingSessions(100);

  const todayCheckins = checkins.filter(c => c.date === today);
  const rawCheckin = todayCheckins[0];
  const computed = useMemo(() => checkins.map((c, i) => computeCheckinScores(c, checkins.slice(i + 1), [])), [checkins]);
  const todaySessions = allSessions.filter(s => s.date === today);
  // Scores frescos da engine sobrepõem o DB para readiness/fatigue
  const engineScores = rawCheckin
    ? computeCheckinScores(rawCheckin, checkins.slice(1), todaySessions)
    : null;

  const checkin = rawCheckin ? {
    ...engineScores,
    ...rawCheckin,
    readiness_score: engineScores.readiness_score,
    fatigue_score: engineScores.fatigue_score,
    stress_score: engineScores.stress_score,
    sleep_quality: engineScores.sleep_quality,
  } : null;

  const { intent, setDayIntent } = useDayContext();

  const totalStrain = todaySessions.reduce((s, t) => s + (t.strain_score || 0), 0);
  const morningRecovery = checkin?.morning_recovery_score || checkin?.recovery_score || 0;

  // Derive live state if not saved yet
  const liveBodyState = checkin ? calculateBodyState(morningRecovery, totalStrain) : null;
  const liveCapacity = checkin ? calculateRemainingCapacity(morningRecovery, totalStrain) : null;
  const liveRecoveryDemand = checkin ? calculateRecoveryDemand(totalStrain, morningRecovery) : null;
  const liveSleepNeed = checkin ? calculateSleepNeed(totalStrain, morningRecovery) : null;

  // Merge live state into checkin
  const enrichedCheckin = checkin ? {
    ...checkin,
    current_body_state: checkin.current_body_state || liveBodyState,
    remaining_capacity: checkin.remaining_capacity || liveCapacity,
    recovery_demand: checkin.recovery_demand ?? liveRecoveryDemand,
    sleep_need_tonight: checkin.sleep_need_tonight ?? liveSleepNeed,
  } : null;

  const isLoading = loadingCheckins || loadingSessions;

  // Análise fisiológica async
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const computedKey = computed.length + ':' + (computed[0]?.date || '');
  const sessionsKey = allSessions.length + ':' + (allSessions[0]?.date || '');

  useEffect(() => {
    if (computed.length === 0) { setAnalysis(null); return; }
    let cancelled = false;
    setAnalysisLoading(true);
    setAnalysisError(null);
    runPhysiologicalAnalysisAsync(computed, allSessions, { useWorker: true, cacheTTLMinutes: 15 })
      .then(result => { if (!cancelled) setAnalysis(result); })
      .catch(err => {
        if (!cancelled) {
          console.warn('Today: analysis failed', err);
          setAnalysisError(err?.message || 'analysis_failed');
          setAnalysis(null);
        }
      })
      .finally(() => { if (!cancelled) setAnalysisLoading(false); });
    return () => { cancelled = true; };
  }, [computedKey, sessionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const recoveryDelta = analysis?.baselineInsights?.find(i => i.label === 'Recovery')?.delta ?? null;
  const isSilentMode = ['Overreached', 'Fatigued'].includes(analysis?.physioState?.state);

  // openAddSignal: incrementar para abrir modal no TrainingSessionsList
  const [openAddSignal, setOpenAddSignal] = useState(0);

  // Número grande exibido: "Prontidão" (readiness), com fallback
  const displayedScore = checkin?.readiness_score ?? checkin?.recovery_score ?? checkin?.morning_recovery_score ?? 0;
  // Para decisões de treino/targets, priorizar recovery_score quando disponível (alinha com prescribeWorkout)
  const prescriptionScore = checkin?.recovery_score ?? displayedScore;
  // Alinhado com a prescrição: Alta >=80, Moderada >=65, Baixa <65
  const readinessFaixa = prescriptionScore >= 80 ? 'Alta' : prescriptionScore >= 65 ? 'Moderada' : 'Baixa';

  // Strain acumulado com cap 21
  const cappedStrain = Math.min(21, totalStrain);

  const strainTarget =
    prescriptionScore >= 80 ? 16 :
    prescriptionScore >= 65 ? 13 :
    prescriptionScore >= 50 ? 10 :
    7;

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (!enrichedCheckin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-[70vh] text-center px-6"
      >
        <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
          <Zap className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-black mb-2">Sem check-in hoje</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Faça seu check-in para calcular sua prontidão e acompanhar o dia.
        </p>
        <Link
          to="/checkin"
          className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-2xl font-semibold hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" /> Fazer check-in
        </Link>
      </motion.div>
    );
  }

  return (
    <div className={cn("space-y-4 max-w-2xl mx-auto transition-all duration-500", isSilentMode && "opacity-90")}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">Hoje</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Organize seu treino e recuperação</p>
        {checkin?.created_at ? (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <span>Check-in registrado às</span>
            <span className="font-medium text-foreground/60">
              {new Date(checkin.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </p>
        ) : checkin?.date ? (
          <p className="text-[10px] text-muted-foreground mt-0.5">Check-in de hoje registrado</p>
        ) : null}
        {isSilentMode && (
          <p className="text-xs text-amber-400/80 flex items-center gap-1.5 mt-1">
            <span aria-label="Atenção">⚠️</span>
            Modo recuperação — priorize descanso hoje
          </p>
        )}
      </div>

      <div className="flex gap-2 mt-2 mb-3">
        <button
          type="button"
          onClick={() => setDayIntent(intent === 'recovery' ? 'training' : 'recovery')}
          className="px-3 py-1 rounded-xl bg-secondary text-sm font-semibold"
        >
          {intent === 'recovery' ? 'Voltar para treino' : 'Mudar para recuperação'}
        </button>
        <span className="text-xs text-muted-foreground ml-auto">
          {intent === 'training' ? 'Modo treino' : intent === 'recovery' ? 'Modo recuperação' : 'Indeciso'}
        </span>
      </div>

      {/* Section 0 — Execução do dia (above the fold) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border bg-card p-5 space-y-4"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prontidão da manhã</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              prescriptionScore >= 80 ? 'bg-emerald-500/15 text-emerald-400' :
              prescriptionScore >= 65 ? 'bg-yellow-500/15 text-yellow-400' :
              'bg-red-500/15 text-red-400'
            }`}>{readinessFaixa}</span>
          </div>
          <p className="text-3xl font-mono font-black flex items-center gap-2">
            <span>{displayedScore}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button aria-label="Sobre Prontidão" className="text-muted-foreground">
                  <Info className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Decisão do treino hoje: combina recuperação + sono + fadiga.
              </TooltipContent>
            </Tooltip>
            {checkin?.recovery_score != null && (
              <span className="text-sm font-medium text-muted-foreground ml-3 flex items-center gap-1">
                (Recuperação {checkin.recovery_score}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button aria-label="Sobre Recuperação" className="text-muted-foreground">
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Estado do corpo ao acordar (sono + sinais fisiológicos).
                  </TooltipContent>
                </Tooltip>
                )
              </span>
            )}
          </p>
          <div className="w-full rounded-full h-1.5 bg-secondary mt-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${displayedScore}%`,
                backgroundColor: prescriptionScore >= 80 ? 'hsl(142,70%,50%)' :
                                 prescriptionScore >= 65 ? 'hsl(45,93%,58%)' :
                                 'hsl(0,72%,55%)'
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-secondary p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Strain acumulado</p>
            <p className={`text-xl font-mono font-bold ${
              cappedStrain >= 18 ? 'text-red-400' :
              cappedStrain >= 14 ? 'text-orange-400' :
              cappedStrain >= 10 ? 'text-yellow-400' :
              'text-emerald-400'
            }`}>⚡ {cappedStrain}</p>
          </div>
          <div className="rounded-2xl bg-secondary p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Capacidade restante</p>
            <p className="text-xl font-bold">
              {enrichedCheckin.remaining_capacity
                ? { High: 'Alta', Moderate: 'Moderada', Low: 'Baixa', Minimal: 'Mínima' }[enrichedCheckin.remaining_capacity] ?? enrichedCheckin.remaining_capacity
                : '—'}
            </p>
          </div>
          <div className="rounded-2xl bg-secondary p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">ACWR</p>
            {analysis?.trainingLoad?.risk === 'insufficient_data' || analysis?.trainingLoad?.ratio == null ? (
              <p className="text-xl font-mono font-bold text-muted-foreground">—</p>
            ) : (
              <>
                <p className={`text-xl font-mono font-bold ${
                  analysis.trainingLoad.ratio > 1.5 ? 'text-red-400' :
                  analysis.trainingLoad.ratio > 1.3 ? 'text-yellow-400' :
                  'text-emerald-400'
                }`}>{analysis.trainingLoad.ratio.toFixed(2)}</p>
                <p className={`text-[10px] mt-0.5 ${
                  analysis.trainingLoad.ratio > 1.5 ? 'text-red-400' :
                  analysis.trainingLoad.ratio > 1.3 ? 'text-yellow-400' :
                  'text-emerald-400'
                }`}>
                  {analysis.trainingLoad.ratio > 1.5 ? 'Alto risco' :
                   analysis.trainingLoad.ratio > 1.3 ? 'Moderado' : 'Seguro'}
                </p>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => setOpenAddSignal(v => v + 1)}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
        >
          <Dumbbell className="w-4 h-4" /> Adicionar treino
        </button>
      </motion.div>

      {/* Section 0.5 — Treino Sugerido + Morning Recovery (order by intent) */}
      {intent === 'recovery' ? (
        <>
          <MorningRecoveryCard checkin={enrichedCheckin} delta={recoveryDelta} />
          <SleepForecastCard checkin={enrichedCheckin} />
          <WorkoutSuggestionCard
            checkin={enrichedCheckin}
            actionableRecs={analysis?.actionableRecs || []}
            strainTarget={strainTarget}
            currentStrain={cappedStrain}
            analysis={analysis}
            userPrefs={user?.preferences || {}}
          />
        </>
      ) : (
        <>
          <WorkoutSuggestionCard
            checkin={enrichedCheckin}
            actionableRecs={analysis?.actionableRecs || []}
            strainTarget={strainTarget}
            currentStrain={cappedStrain}
            analysis={analysis}
            userPrefs={user?.preferences || {}}
          />
          <MorningRecoveryCard checkin={enrichedCheckin} delta={recoveryDelta} />
        </>
      )}

      {/* HRV Anomaly Alert */}
      {analysis?.hrvAnomaly && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border p-4 flex gap-3 ${
            analysis.hrvAnomaly.alert.type === 'critical'
              ? 'border-red-500/40 bg-red-500/8'
              : 'border-yellow-500/40 bg-yellow-500/8'
          }`}
        >
          <span className="text-xl shrink-0">{analysis.hrvAnomaly.alert.icon}</span>
          <div>
            <p className={`text-sm font-semibold ${
              analysis.hrvAnomaly.alert.type === 'critical' ? 'text-red-400' : 'text-yellow-400'
            }`}>{analysis.hrvAnomaly.alert.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{analysis.hrvAnomaly.alert.text}</p>
          </div>
        </motion.div>
      )}

      {/* Physiological Narrative */}
      {analysis?.narrative && <NarrativeCard narrative={analysis.narrative} />}

      {/* Why Score */}
      {analysis?.whyScore && analysis.whyScore.length > 0 && (
        <WhyScoreCard whyScore={analysis.whyScore} recoveryScore={displayedScore} />
      )}

      {/* Section 2 — Training Sessions */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <TrainingSessionsList
          checkin={enrichedCheckin}
          sessions={todaySessions}
          openAddSignal={openAddSignal}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.checkins(user?.email) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trainingSessions(user?.email) });
          }}
        />
      </div>

      {/* Section 3 — Current State (dynamic) */}
      <CurrentStateCard checkin={enrichedCheckin} totalStrain={totalStrain} />

      {/* Section 4 — Recovery Demand alert */}
      {(enrichedCheckin.recovery_demand || 0) > morningRecovery && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-red-500/30 bg-red-500/8 p-4 flex gap-3"
        >
          <span className="text-xl">🚨</span>
          <div>
            <p className="text-sm font-semibold text-red-400">Carga acima da recuperação disponível</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Demanda: {enrichedCheckin.recovery_demand} vs Prontidão: {displayedScore}. Priorize descanso e sono para evitar fadiga acumulada.
            </p>
          </div>
        </motion.div>
      )}

      {/* Section 4.5 — CTA pós-treino */}
      {todaySessions.length > 0 && (
        <Link
          to="/checkin?mode=post"
          className="flex items-center justify-between p-4 rounded-2xl border border-primary/25 bg-primary/5 hover:bg-primary/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🏁</span>
            <div>
              <p className="text-sm font-semibold">Registrar pós-treino</p>
              <p className="text-xs text-muted-foreground">~30s · melhora seus insights do dia</p>
            </div>
          </div>
          <span className="text-primary text-sm font-bold">→</span>
        </Link>
      )}

      {/* Section 5 — Sleep Forecast (only in training/undecided mode) */}
      {intent !== 'recovery' && <SleepForecastCard checkin={enrichedCheckin} />}
    </div>
  );
}
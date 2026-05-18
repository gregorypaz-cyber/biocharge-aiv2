import React, { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useUserCheckins, useUserTrainingSessions } from '@/hooks/useUserData';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Plus, Zap, Dumbbell, Info, Moon, Heart, X } from 'lucide-react';
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
import NarrativeInline from '@/components/today/NarrativeInline';
import WhyScoreCard from '@/components/intelligence/WhyScoreCard';
import SecondaryMetrics from '@/components/today/SecondaryMetrics';
import ProtectionInsightCard from '@/components/today/ProtectionInsightCard';
import QuickIntentEdit from '@/components/today/QuickIntentEdit';
import SleepDebtCard from '@/components/today/SleepDebtCard';
import { buildCardLayout, resolveWorkoutIntensity } from '@/utils/priorityEngine';

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

  // Construção determinística do checkin:
  // - Usar o registro salvo (rawCheckin) como base (origem persistida)
  // - Aplicar somente os campos calculados aprovados pela engine quando existirem
  const checkin = rawCheckin ? (() => {
    const base = { ...rawCheckin };
    const engine = engineScores || {};
    const approvedEngineFields = [
      'readiness_score',
      'fatigue_score',
      'stress_score',
      'sleep_quality',
      'recovery_score',
      'morning_recovery_score'
    ];
    for (const k of approvedEngineFields) {
      if (typeof engine[k] !== 'undefined' && engine[k] !== null) {
        base[k] = engine[k];
      }
    }
    return base;
  })() : null;

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

  // ── Tendência 7 dias ─────────────────────────────────────────────────────
  const last7Checkins = checkins.filter(c => c.date !== today).slice(0, 7);
  const biochargeTrend = useMemo(() => {
    const values = last7Checkins.map(c => c.biocharge_morning).filter(v => v != null);
    if (values.length < 2 || rawCheckin?.biocharge_morning == null) return null;
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const diff = Math.round(rawCheckin.biocharge_morning - avg);
    if (diff > 5)  return { text: `↑ +${diff} pts acima da sua média da semana`, color: 'text-emerald-400' };
    if (diff < -5) return { text: `↓ ${diff} pts abaixo da sua média da semana`, color: 'text-red-400' };
    return { text: '→ Dentro da sua média da semana', color: 'text-muted-foreground' };
  }, [last7Checkins, rawCheckin?.biocharge_morning]); // eslint-disable-line

  const hrvTrend = useMemo(() => {
    if (!rawCheckin?.hrv) return null;
    const values = last7Checkins.map(c => c.hrv).filter(v => v != null);
    if (values.length < 2) return null;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const diff = rawCheckin.hrv - avg;
    if (diff > 5)  return { text: 'HRV acima do normal — boa recuperação', color: 'text-emerald-400' };
    if (diff < -5) return { text: 'HRV abaixo do normal — atenção', color: 'text-yellow-400' };
    return null;
  }, [last7Checkins, rawCheckin?.hrv]); // eslint-disable-line
  const isSilentMode = ['Overreached', 'Fatigued'].includes(analysis?.physioState?.state);

  // ── Alerta de sono profundo ──────────────────────────────────────────────
  const [deepSleepAlertDismissed, setDeepSleepAlertDismissed] = useState(false);
  const deepSleepAlert = useMemo(() => {
    if (!rawCheckin?.deep_sleep_pct) return null;
    // Incluir hoje + histórico recente, ordenados mais recente primeiro
    const sorted = [...checkins].sort((a, b) => b.date.localeCompare(a.date));
    let consecutiveNights = 0;
    for (const c of sorted) {
      if (c.deep_sleep_pct != null && c.deep_sleep_pct < 18) {
        consecutiveNights++;
      } else {
        break;
      }
    }
    if (consecutiveNights < 2) return null;
    const pct = rawCheckin.deep_sleep_pct;
    return `⚠ Sono profundo em ${pct}% — abaixo do ideal (20%+) por ${consecutiveNights} noites seguidas. Tente dormir mais cedo esta noite.`;
  }, [checkins, rawCheckin?.deep_sleep_pct]); // eslint-disable-line

  // openAddSignal: incrementar para abrir modal no TrainingSessionsList
  const [openAddSignal, setOpenAddSignal] = useState(0);

  // Número grande exibido: "Prontidão" (readiness), com fallback
  const displayedScore = checkin?.readiness_score ?? checkin?.recovery_score ?? checkin?.morning_recovery_score ?? 0;
  // Para decisões de treino/targets, priorizar recovery_score quando disponível (alinha com prescribeWorkout)
  const prescriptionScore = checkin?.recovery_score ?? displayedScore;
  // Alinhado com a prescrição: Alta >=80, Moderada >=65, Baixa <65
  const readinessFaixa = prescriptionScore >= 80 ? 'Alta' : prescriptionScore >= 65 ? 'Moderada' : 'Baixa';

  const strainTarget =
    prescriptionScore >= 80 ? 16 :
    prescriptionScore >= 65 ? 13 :
    prescriptionScore >= 50 ? 10 :
    7;

  const cappedStrain = Math.min(21, totalStrain);

  // ── DayPhase-aware context ───────────────────────────────────────────────
  const dayMetrics = enrichedCheckin ? {
    currentStrain: cappedStrain,
    strainTarget,
    readiness:     prescriptionScore,
    hrv:           enrichedCheckin.hrv ?? enrichedCheckin.hrv_manual ?? null,
    hasSessions:   todaySessions.length > 0,
  } : null;

  const { intent, locked, setDayIntent, dayPhase, DayPhase: Phase } = useDayContext(dayMetrics);

  // ── Body state translation map ───────────────────────────────────────────
  const BODY_STATE_PT = {
    Recovered:       'Recuperado',
    Activated:       'Ativado',
    Balanced:        'Equilibrado',
    Loaded:          'Carregado',
    Sympathetic_Load:'Carga simpática',
    Fatigued:        'Fatigado',
    Overreached:     'Sobrecarga',
  };

  const BODY_STATE_HINT = {
    Recovered:       'Bom momento para estímulo alto.',
    Activated:       'Corpo responsivo — aproveite o treino.',
    Balanced:        'Ritmo sustentável hoje.',
    Loaded:          'Monitore a intensidade; não empilhe carga.',
    Sympathetic_Load:'Sistema nervoso sobrecarregado — prefira leveza.',
    Fatigued:        'Evite alta intensidade; priorize recuperação.',
    Overreached:     'Descanso obrigatório — mais carga agrava o quadro.',
  };

  const CAPACITY_PT = {
    High:    'Alta',
    Moderate:'Moderada',
    Low:     'Baixa',
    Minimal: 'Mínima',
  };

  // ── Design-token map per phase ───────────────────────────────────────────
  const PHASE_CONFIG = {
    PLANNING: {
      headerTitle:    'Hoje',
      headerSub:      'Organize seu treino e recuperação',
      ctaLabel:       'Adicionar treino',
      ctaIcon:        Dumbbell,
      ctaClass:       'bg-primary text-primary-foreground hover:bg-primary/90',
      showCta:        true,
      accentBorder:   'border-border',
      accentBg:       'bg-card',
      bannerClass:    null,
      bannerText:     null,
    },
    OPTIMAL_LOAD: {
      headerTitle:    'Missão cumprida',
      headerSub:      'Carga adequada para hoje. Agora é descansar e absorver o estímulo.',
      ctaLabel:       'Adicionar treino',
      ctaIcon:        Dumbbell,
      ctaClass:       'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      showCta:        true,
      accentBorder:   'border-border',
      accentBg:       'bg-card',
      bannerClass:    null,
      bannerText:     null,
    },
    OVERLOAD: {
      headerTitle:    'Carga atingida',
      headerSub:      'Foco em descansar o sistema nervoso. Mais estímulo agora atrasa a recuperação.',
      ctaLabel:       'Iniciar recuperação',
      ctaIcon:        Heart,
      ctaClass:       'bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border',
      showCta:        false,
      accentBorder:   'border-blue-500/20',
      accentBg:       'bg-card',
      bannerClass:    'border-orange-500/30 bg-orange-500/5 text-orange-400',
      bannerText:     '⚡ Carga acima do alvo — adicionar mais treino hoje aumenta risco de overtraining.',
    },
    RECOVERY_DAY: {
      headerTitle:    'Dia de recuperação',
      headerSub:      'Seu corpo pede descanso. Deixe a adaptação acontecer.',
      ctaLabel:       'Iniciar recuperação',
      ctaIcon:        Moon,
      ctaClass:       'bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border',
      showCta:        false,
      accentBorder:   'border-blue-500/15',
      accentBg:       'bg-card',
      bannerClass:    'border-blue-500/25 bg-blue-500/5 text-blue-300',
      bannerText:     '🌙 Recuperação ativa — hidrate-se, durma bem e evite estresse adicional.',
    },
  };

  // Se locked=true (usuário declarou dia de descanso), força RECOVERY_DAY independente do engine
  const phase     = (locked && intent === 'recovery')
    ? 'RECOVERY_DAY'
    : Phase ? (dayPhase ?? 'PLANNING') : (intent === 'recovery' ? 'RECOVERY_DAY' : 'PLANNING');
  const phaseCfg  = PHASE_CONFIG[phase] ?? PHASE_CONFIG.PLANNING;
  const CtaIcon   = phaseCfg.ctaIcon;

  // Paleta fria quando em modo recuperação/sobrecarga
  const isRestMode = phase === 'OVERLOAD' || phase === 'RECOVERY_DAY';

  // ── Priority Engine ────────────────────────────────────────────────────────
  const workoutIntensity = useMemo(
    () => resolveWorkoutIntensity(analysis, null),
    [analysis]
  );
  const scheduledSport = todaySessions[0]?.sport ?? enrichedCheckin?.current_body_state ?? undefined;

  const { primary: primaryCards, secondary: secondaryCards } = useMemo(() => {
    if (!enrichedCheckin) return { primary: [], secondary: [] };
    return buildCardLayout({
      phase,
      workoutIntensity,
      scheduledSport,
      hasWorkoutSessions: todaySessions.length > 0,
      hasAnalysis: !!analysis,
      hasHrvAnomaly: !!analysis?.hrvAnomaly,
      hasNarrative: !!analysis?.narrative,
      hasRecoveryDemandAlert: (enrichedCheckin?.recovery_demand || 0) > morningRecovery,
    });
  }, [phase, workoutIntensity, scheduledSport, todaySessions.length, analysis, enrichedCheckin, morningRecovery]); // eslint-disable-line

  /** Renderiza um card pelo seu id, usando o descriptor para mutações */
  function renderCard(desc) {
    if (!desc || desc.action === 'exclude') return null;

    const workoutProps = {
      checkin: enrichedCheckin,
      actionableRecs: analysis?.actionableRecs || [],
      strainTarget,
      currentStrain: cappedStrain,
      analysis,
      userPrefs: user?.preferences || {},
    };

    switch (desc.id) {
      case 'execution':
        return <ExecutionCard key="execution" />;
      case 'workout':
        return desc.action === 'mutate'
          ? <ProtectionInsightCard key="workout-mutated" mutation={desc.mutation} />
          : <WorkoutSuggestionCard key="workout" {...workoutProps} />;
      case 'morning_recovery':
        return <MorningRecoveryCard key="morning_recovery" checkin={enrichedCheckin} delta={recoveryDelta} />;
      case 'sleep_forecast':
        return <SleepForecastCard key="sleep_forecast" checkin={enrichedCheckin} />;
      case 'training_sessions':
        return (
          <div key="training_sessions" className={cn('rounded-2xl border bg-card p-4', phaseCfg.accentBorder)}>
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
        );
      case 'narrative':
        return analysis?.narrative ? <NarrativeCard key="narrative" narrative={analysis.narrative} /> : null;
      case 'why_score':
        return (analysis?.whyScore?.length > 0)
          ? <WhyScoreCard key="why_score" whyScore={analysis.whyScore} recoveryScore={displayedScore} />
          : null;
      case 'current_state':
        return <CurrentStateCard key="current_state" checkin={enrichedCheckin} totalStrain={totalStrain} />;
      case 'hrv_anomaly':
        return analysis?.hrvAnomaly ? (
          <motion.div
            key="hrv_anomaly"
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
        ) : null;
      case 'recovery_demand':
        return (enrichedCheckin.recovery_demand || 0) > morningRecovery ? (
          <motion.div
            key="recovery_demand"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-red-500/30 bg-red-500/8 p-4 flex gap-3"
          >
            <span className="text-xl">🚨</span>
            <div>
              <p className="text-sm font-semibold text-red-400">Carga acima da recuperação disponível</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Demanda: {enrichedCheckin.recovery_demand} vs Prontidão: {displayedScore}. Priorize descanso e sono.
              </p>
            </div>
          </motion.div>
        ) : null;
      case 'post_workout_cta':
        return todaySessions.length > 0 ? (
          <Link
            key="post_workout_cta"
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
        ) : null;
      default:
        return null;
    }
  }

  // ── ExecutionCard (inline sub-component — usa closure do escopo acima) ───
  function ExecutionCard() {
    return (
      <motion.div
        key={phase + '-card'}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('rounded-3xl border p-5 space-y-4', phaseCfg.accentBorder, phaseCfg.accentBg)}
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
                <div style={{ marginTop: 6 }}>
                  <small className="text-[10px] text-muted-foreground">
                    Pontuação do Zepp é uma estimativa do wearable; o app ajusta essa informação com seu histórico para calcular a Prontidão.
                  </small>
                </div>
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
                    <div style={{ marginTop: 6 }}>
                      <small className="text-[10px] text-muted-foreground">
                        Sono combina duração, qualidade e consistência — usamos histórico para ajustar recomendações.
                      </small>
                    </div>
                  </TooltipContent>
                </Tooltip>
                )
              </span>
            )}
          </p>
          {/* Trend lines */}
          {(biochargeTrend || hrvTrend) && (
            <div className="space-y-0.5 mt-1">
              {biochargeTrend && (
                <p className={`text-[11px] font-medium ${biochargeTrend.color}`}>{biochargeTrend.text}</p>
              )}
              {hrvTrend && (
                <p className={`text-[11px] font-medium ${hrvTrend.color}`}>{hrvTrend.text}</p>
              )}
            </div>
          )}

          <div className="w-full rounded-full h-1.5 bg-secondary mt-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${displayedScore}%`,
                backgroundColor: isRestMode
                  ? 'hsl(215,30%,45%)'
                  : prescriptionScore >= 80 ? 'hsl(142,70%,50%)'
                  : prescriptionScore >= 65 ? 'hsl(45,93%,58%)'
                  : 'hsl(0,72%,55%)'
              }}
            />
          </div>

          {/* Body state narrative — only when current_body_state is set */}
          {enrichedCheckin.current_body_state && BODY_STATE_PT[enrichedCheckin.current_body_state] && (
            <div className="mt-3 px-3 py-2.5 rounded-xl bg-secondary/60 border border-border/40 text-xs leading-snug space-y-0.5">
              <span className="text-foreground/90">
                <span className="font-semibold">Estado atual:</span> {BODY_STATE_PT[enrichedCheckin.current_body_state]}
                {enrichedCheckin.remaining_capacity && CAPACITY_PT[enrichedCheckin.remaining_capacity] && (
                  <> · <span className="font-semibold">Capacidade restante:</span> {CAPACITY_PT[enrichedCheckin.remaining_capacity]}</>
                )}
              </span>
              <p className="text-muted-foreground">{BODY_STATE_HINT[enrichedCheckin.current_body_state]}</p>
            </div>
          )}
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
        {phaseCfg.showCta ? (
          <button
            onClick={() => setOpenAddSignal(v => v + 1)}
            className={cn('w-full flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold text-sm transition-all', phaseCfg.ctaClass)}
          >
            <CtaIcon className="w-4 h-4" /> {phaseCfg.ctaLabel}
          </button>
        ) : (
          <button
            onClick={() => setOpenAddSignal(v => v + 1)}
            className={cn('w-full flex items-center justify-center gap-2 h-10 rounded-2xl font-medium text-xs transition-all opacity-60', phaseCfg.ctaClass)}
          >
            <CtaIcon className="w-3.5 h-3.5" /> {phaseCfg.ctaLabel}
          </button>
        )}
      </motion.div>
    );
  }

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
    <div className={cn(
      "space-y-4 max-w-2xl mx-auto transition-all duration-500",
      isSilentMode && "opacity-90",
      isRestMode && "saturate-[0.7]"
    )}>

      {/* ── Header (DayPhase-aware microcopy) ─────────────────────────────── */}
      <div>
        {enrichedCheckin?.headline_today ? (
          <>
            <h1 className="text-xl font-black tracking-tight leading-snug">{enrichedCheckin.headline_today}</h1>
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-2">
              <span className="font-mono font-semibold text-foreground/50">{displayedScore} pts</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{phaseCfg.headerSub}</span>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black tracking-tight">{phaseCfg.headerTitle}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{phaseCfg.headerSub}</p>
          </>
        )}
        {checkin?.created_at ? (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <span>Check-in às</span>
            <span className="font-medium text-foreground/60">
              {new Date(checkin.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </p>
        ) : checkin?.date ? (
          <p className="text-[10px] text-muted-foreground mt-0.5">Check-in de hoje registrado</p>
        ) : null}
      </div>

      {/* ── Phase banner (OVERLOAD / RECOVERY_DAY only) ───────────────────── */}
      {phaseCfg.bannerText && (
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('rounded-2xl border px-4 py-3 text-xs font-medium', phaseCfg.bannerClass)}
        >
          {phaseCfg.bannerText}
        </motion.div>
      )}

      {/* ── QuickIntentEdit ───────────────────────────────────────────────── */}
      <QuickIntentEdit />

      {/* ── Deep sleep alert ─────────────────────────────────────────────── */}
      {deepSleepAlert && !deepSleepAlertDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-blue-500/25 bg-blue-500/8 px-4 py-3 flex items-start gap-3"
        >
          <Moon className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-200 flex-1 leading-relaxed">{deepSleepAlert}</p>
          <button
            onClick={() => setDeepSleepAlertDismissed(true)}
            className="text-blue-400/60 hover:text-blue-300 transition-colors shrink-0"
            aria-label="Fechar alerta"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* ── Primary cards (máx 3) — renderizados pela Priority Engine ───── */}
      {primaryCards.map(desc => renderCard(desc))}

      {/* ── Narrativa compacta — logo após o card de prontidão ───────────── */}
      {analysis?.narrative && <NarrativeInline narrative={analysis.narrative} />}

      {/* ── Dívida de sono — zona de insights ────────────────────────────── */}
      <SleepDebtCard checkins={checkins} todayCheckin={enrichedCheckin} />

      {/* ── Secondary cards — agrupados no expansível ─────────────────────── */}
      <SecondaryMetrics count={secondaryCards.filter(d => d.action !== 'exclude').length}>
        {secondaryCards.map(desc => renderCard(desc))}
      </SecondaryMetrics>
    </div>
  );
}
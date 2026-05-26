/**
 * Today.jsx — BioCharge AI
 * Redesigned: Action-First, Radical Simplification
 * Answers: 1) Como estou? 2) O que fazer? 3) Por quê? (colapsível)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useUserCheckins, useUserTrainingSessions } from '@/hooks/useUserData';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Plus, Zap, Dumbbell, Moon, Heart, ChevronDown, ChevronUp,
  X, ArrowRight, Flame, Activity, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { getTodayLocal } from '@/lib/date-utils';
import { computeCheckinScores } from '@/lib/biocharge-utils';
import {
  calculateBodyState, calculateRemainingCapacity,
  calculateRecoveryDemand, calculateSleepNeed
} from '@/lib/training-impact-engine';
import { runPhysiologicalAnalysisAsync } from '@/lib/physiological-engine';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useDayContext } from '@/lib/dayContext';
import { buildCardLayout, resolveWorkoutIntensity } from '@/utils/priorityEngine';
import AddTrainingModal from '@/components/training/AddTrainingModal';
import TrainingSessionsList from '@/components/today/TrainingSessionsList';
import WorkoutSuggestionCard from '@/components/today/WorkoutSuggestionCard';
import { useStreak } from '@/hooks/useStreak';


// ─── Sub-components ───────────────────────────────────────────────────────────

/** SVG arc gauge — 270° span, like a classic sport watch */
function ScoreArc({ score = 0, size = 180 }) {
  const cx = size / 2, cy = size / 2;
  const r = size * 0.40;
  const sw = size * 0.065;
  const circ = 2 * Math.PI * r;
  const arcSpan = 0.75; // 270°
  const arcLen = circ * arcSpan;
  const fillLen = Math.max(0, Math.min(1, score / 100)) * arcLen;
  const color =
    score >= 80 ? '#34d399' :
    score >= 65 ? '#fbbf24' :
                  '#f87171';
  const glowColor =
    score >= 80 ? 'rgba(52,211,153,0.35)' :
    score >= 65 ? 'rgba(251,191,36,0.35)' :
                  'rgba(248,113,113,0.35)';

  // rotate(135°) → arc starts at ~7-o'clock, ends at ~5-o'clock
  const rot = `rotate(135, ${cx}, ${cy})`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: 'visible', filter: `drop-shadow(0 0 12px ${glowColor})` }}
    >
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="hsl(220,18%,11%)"
        strokeWidth={sw}
        strokeDasharray={`${arcLen} ${circ - arcLen}`}
        strokeLinecap="round"
        transform={rot}
      />
      {/* Progress */}
      {score > 1 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeDasharray={`${fillLen} ${circ - fillLen}`}
          strokeLinecap="round"
          transform={rot}
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)' }}
        />
      )}
    </svg>
  );
}

/** Single bottleneck insight — the #1 limiting factor today */
function getBottleneck(checkin, analysis, checkins = []) {
  if (!checkin) return null;
  const candidates = [];

  const sleepHrs = checkin.sleep_hours ?? null;
  if (sleepHrs !== null && sleepHrs < 7) {
    const deficit = (7.5 - sleepHrs).toFixed(1);
    candidates.push({
      score: (7.5 - sleepHrs) * 25,
      icon: '🌙',
      label: `Sono insuficiente`,
      value: `${sleepHrs}h (−${deficit}h do ideal)`,
      color: 'text-blue-400',
      bg: 'bg-blue-500/8 border-blue-500/20',
    });
  }

  const hrvDelta = analysis?.baselineInsights?.find(i => i.label === 'HRV')?.delta ?? null;
  if (hrvDelta !== null && hrvDelta < -10) {
    candidates.push({
      score: Math.abs(hrvDelta),
      icon: '💗',
      label: 'HRV abaixo do seu normal',
      value: `${Math.round(hrvDelta)}% vs semana`,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/8 border-yellow-500/20',
    });
  }

  const fatigue = checkin.fatigue_score ?? checkin.fatigue ?? 0;
  if (fatigue > 58) {
    candidates.push({
      score: fatigue,
      icon: '🔋',
      label: 'Fadiga acumulada',
      value: `${Math.round(fatigue)}/100`,
      color: 'text-orange-400',
      bg: 'bg-orange-500/8 border-orange-500/20',
    });
  }

  const sleepScore = checkin.sleep_score ?? null;
  if (sleepScore !== null && sleepScore < 65) {
    candidates.push({
      score: 100 - sleepScore,
      icon: '😴',
      label: 'Qualidade do sono baixa',
      value: `${Math.round(sleepScore)}/100`,
      color: 'text-blue-300',
      bg: 'bg-blue-500/8 border-blue-500/20',
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

/** Get training action config based on readiness + phase */
function getActionConfig(phase, workoutIntensity, recommendation, isRestDay) {
  if (isRestDay || phase === 'RECOVERY_DAY') {
    return {
      emoji: '🌙',
      badge: 'Recuperação',
      badgeClass: 'bg-blue-500/15 text-blue-400',
      title: 'Dia de descanso',
      subtitle: recommendation || 'Hidrate, alongue, descanse. A adaptação acontece no repouso.',
      ctaLabel: 'Protocolo de recuperação',
      ctaClass: 'bg-secondary border border-border/60 text-muted-foreground hover:bg-secondary/80',
      ctaIcon: Moon,
      showAddBtn: false,
      variant: 'rest',
    };
  }
  if (phase === 'OVERLOAD') {
    return {
      emoji: '⚠️',
      badge: 'Atenção',
      badgeClass: 'bg-orange-500/15 text-orange-400',
      title: 'Carga máxima atingida',
      subtitle: 'Adicionar mais volume hoje aumenta risco de overtraining.',
      ctaLabel: 'Adicionar treino (cuidado)',
      ctaClass: 'bg-secondary border border-orange-500/30 text-orange-400 hover:bg-orange-500/10',
      ctaIcon: AlertTriangle,
      showAddBtn: true,
      variant: 'warning',
    };
  }
  if (phase === 'OPTIMAL_LOAD') {
    return {
      emoji: '✅',
      badge: 'Missão cumprida',
      badgeClass: 'bg-emerald-500/15 text-emerald-400',
      title: 'Carga do dia completa',
      subtitle: 'Ótimo trabalho. Agora deixe o corpo absorver o estímulo.',
      ctaLabel: 'Adicionar outro treino',
      ctaClass: 'bg-secondary border border-border/40 text-muted-foreground hover:bg-secondary/80',
      ctaIcon: Dumbbell,
      showAddBtn: true,
      variant: 'done',
    };
  }
  // PLANNING
  const map = {
    high: {
      emoji: '🔥',
      badge: 'Alta prontidão',
      badgeClass: 'bg-emerald-500/15 text-emerald-400',
      title: 'Treino forte recomendado',
      subtitle: recommendation || 'Janela de performance aberta — aproveite o estímulo.',
      ctaLabel: 'Registrar treino',
      ctaClass: 'bg-emerald-500 text-black font-bold hover:bg-emerald-400',
      ctaIcon: Flame,
      showAddBtn: true,
      variant: 'high',
    },
    moderate: {
      emoji: '⚡',
      badge: 'Prontidão moderada',
      badgeClass: 'bg-yellow-500/15 text-yellow-400',
      title: 'Treino moderado',
      subtitle: recommendation || 'Ritmo sustentável. Foque na qualidade de execução.',
      ctaLabel: 'Registrar treino',
      ctaClass: 'bg-primary text-primary-foreground hover:bg-primary/90',
      ctaIcon: Dumbbell,
      showAddBtn: true,
      variant: 'moderate',
    },
    low: {
      emoji: '🚶',
      badge: 'Prontidão baixa',
      badgeClass: 'bg-red-500/15 text-red-400',
      title: 'Treino leve',
      subtitle: recommendation || 'Estimule sem sobrecarregar. Menos é mais hoje.',
      ctaLabel: 'Registrar treino',
      ctaClass: 'bg-secondary border border-border/60 text-foreground hover:bg-secondary/80',
      ctaIcon: Activity,
      showAddBtn: true,
      variant: 'low',
    },
  };
  return map[workoutIntensity] ?? map.moderate;
}


// ─── Main Component ───────────────────────────────────────────────────────────

export default function Today() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const today = getTodayLocal();

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: checkins = [], isLoading: loadingCheckins } = useUserCheckins(30);
  const { data: allSessions = [], isLoading: loadingSessions } = useUserTrainingSessions(100);

  const todayCheckins = checkins.filter(c => c.date === today);
  const rawCheckin = todayCheckins[0];
  const computed = useMemo(
    () => checkins.map((c, i) => computeCheckinScores(c, checkins.slice(i + 1), [])),
    [checkins]
  );
  const todaySessions = allSessions.filter(s => s.date === today);

  const weekSessions = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const mondayStr = monday.toISOString().slice(0, 10);
    return allSessions.filter(s => s.date >= mondayStr);
  }, [allSessions]);

  // ── Engine scores ──────────────────────────────────────────────────────────
  const engineScores = rawCheckin
    ? computeCheckinScores(rawCheckin, checkins.slice(1), todaySessions)
    : null;

  const checkin = rawCheckin ? (() => {
    const base = { ...rawCheckin };
    const engine = engineScores || {};
    for (const k of ['readiness_score','fatigue_score','stress_score','sleep_quality','recovery_score','morning_recovery_score']) {
      if (engine[k] != null) base[k] = engine[k];
    }
    return base;
  })() : null;

  const totalStrain = todaySessions.reduce((s, t) => s + (t.strain_score || 0), 0);
  const morningRecovery = checkin?.morning_recovery_score || checkin?.recovery_score || 0;

  const liveBodyState    = checkin ? calculateBodyState(morningRecovery, totalStrain) : null;
  const liveCapacity     = checkin ? calculateRemainingCapacity(morningRecovery, totalStrain) : null;
  const liveRecoveryDemand = checkin ? calculateRecoveryDemand(totalStrain, morningRecovery) : null;
  const liveSleepNeed    = checkin ? calculateSleepNeed(totalStrain, morningRecovery) : null;

  const enrichedCheckin = checkin ? {
    ...checkin,
    current_body_state:  checkin.current_body_state  || liveBodyState,
    remaining_capacity:  checkin.remaining_capacity  || liveCapacity,
    recovery_demand:     checkin.recovery_demand     ?? liveRecoveryDemand,
    sleep_need_tonight:  checkin.sleep_need_tonight  ?? liveSleepNeed,
  } : null;

  const isLoading = loadingCheckins || loadingSessions;

  // ── Async analysis ─────────────────────────────────────────────────────────
  const [analysis, setAnalysis] = useState(null);
  const computedKey  = computed.length + ':' + (computed[0]?.date || '');
  const sessionsKey  = allSessions.length + ':' + (allSessions[0]?.date || '');

  useEffect(() => {
    if (computed.length === 0) { setAnalysis(null); return; }
    let cancelled = false;
    runPhysiologicalAnalysisAsync(computed, allSessions, { useWorker: true, cacheTTLMinutes: 15 })
      .then(r => { if (!cancelled) setAnalysis(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [computedKey, sessionsKey]); // eslint-disable-line

  // ── Derived values ─────────────────────────────────────────────────────────
  const last7 = checkins.filter(c => c.date !== today).slice(0, 7);

  const biochargeTrend = useMemo(() => {
    const vals = last7.map(c => c.biocharge_morning).filter(v => v != null);
    if (vals.length < 2 || rawCheckin?.biocharge_morning == null) return null;
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const diff = Math.round(rawCheckin.biocharge_morning - avg);
    if (diff > 5)  return { text: `↑ +${diff} pts acima da média`, color: 'text-emerald-400' };
    if (diff < -5) return { text: `↓ ${diff} pts abaixo da média`, color: 'text-red-400' };
    return { text: '→ Dentro da sua média', color: 'text-muted-foreground/70' };
  }, [last7, rawCheckin?.biocharge_morning]); // eslint-disable-line

  const cappedStrain = Math.min(21, totalStrain);
  const displayedScore = checkin?.readiness_score ?? checkin?.recovery_score ?? checkin?.morning_recovery_score ?? 0;
  const prescriptionScore = checkin?.recovery_score ?? displayedScore;

  const strainTarget =
    prescriptionScore >= 80 ? 16 :
    prescriptionScore >= 65 ? 13 :
    prescriptionScore >= 50 ? 10 : 7;

  const dayMetrics = enrichedCheckin ? {
    currentStrain: cappedStrain, strainTarget,
    readiness: prescriptionScore,
    hrv: enrichedCheckin.hrv ?? null,
    hasSessions: todaySessions.length > 0,
  } : null;

  const { intent, locked, setDayIntent, dayPhase, DayPhase: Phase } = useDayContext(dayMetrics);
  const { streak, hasCheckedInToday } = useStreak(checkins);

  const phase = (locked && intent === 'recovery')
    ? 'RECOVERY_DAY'
    : Phase ? (dayPhase ?? 'PLANNING') : (intent === 'recovery' ? 'RECOVERY_DAY' : 'PLANNING');

  const isRestDay = checkin?.rest_day || phase === 'RECOVERY_DAY';

  const workoutIntensity = useMemo(() => resolveWorkoutIntensity(analysis, null), [analysis]);
  const scheduledSport = todaySessions[0]?.sport ?? undefined;

  const { primary: primaryCards } = useMemo(() => {
    if (!enrichedCheckin) return { primary: [], secondary: [] };
    return buildCardLayout({
      phase, workoutIntensity, scheduledSport,
      hasWorkoutSessions: todaySessions.length > 0,
      hasAnalysis: !!analysis,
      hasHrvAnomaly: !!analysis?.hrvAnomaly,
      hasNarrative: !!analysis?.narrative,
      hasRecoveryDemandAlert: (enrichedCheckin?.recovery_demand || 0) > morningRecovery,
    });
  }, [phase, workoutIntensity, scheduledSport, todaySessions.length, analysis, enrichedCheckin, morningRecovery]); // eslint-disable-line

  // Deep sleep alert
  const [deepSleepAlertDismissed, setDeepSleepAlertDismissed] = useState(false);
  const deepSleepAlert = useMemo(() => {
    if (!rawCheckin?.deep_sleep_pct) return null;
    const sorted = [...checkins].sort((a, b) => b.date.localeCompare(a.date));
    let n = 0;
    for (const c of sorted) {
      if (c.deep_sleep_pct != null && c.deep_sleep_pct < 18) n++;
      else break;
    }
    if (n < 2) return null;
    const pct = rawCheckin.deep_sleep_pct;
    if (n >= 4) return `${n} noites de sono raso seguidas (${pct}% profundo). Seu HRV está sentindo.`;
    return `Noite ${n} de sono fragmentado (${pct}% profundo) — fique atento.`;
  }, [checkins, rawCheckin?.deep_sleep_pct]); // eslint-disable-line

  const [showAddModal, setShowAddModal] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Computed helpers for render
  const scoreColor =
    displayedScore >= 80 ? 'text-emerald-400' :
    displayedScore >= 65 ? 'text-yellow-400' :
                           'text-red-400';

  const scoreLabel =
    displayedScore >= 80 ? 'Alta' :
    displayedScore >= 65 ? 'Moderada' : 'Baixa';

  const scoreLabelClass =
    displayedScore >= 80 ? 'bg-emerald-500/15 text-emerald-400' :
    displayedScore >= 65 ? 'bg-yellow-500/15 text-yellow-400' :
                           'bg-red-500/15 text-red-400';

  const BODY_STATE_PT = {
    Recovered: 'Recuperado', Activated: 'Ativado', Balanced: 'Equilibrado',
    Loaded: 'Carregado', Sympathetic_Load: 'Carga simpática',
    Fatigued: 'Fatigado', Overreached: 'Sobrecarga',
  };
  const BODY_STATE_HINT = {
    Recovered: 'Bom momento para estímulo alto.',
    Activated: 'Corpo responsivo — aproveite.',
    Balanced: 'Ritmo sustentável hoje.',
    Loaded: 'Monitore a intensidade.',
    Sympathetic_Load: 'Prefira leveza hoje.',
    Fatigued: 'Evite alta intensidade.',
    Overreached: 'Descanso obrigatório.',
  };

  const bottleneck = useMemo(
    () => getBottleneck(checkin, analysis, checkins),
    [checkin, analysis, checkins.length] // eslint-disable-line
  );

  const actionCfg = useMemo(
    () => getActionConfig(
      phase,
      workoutIntensity,
      checkin?.recommendation,
      isRestDay
    ),
    [phase, workoutIntensity, checkin?.recommendation, isRestDay]
  );

  const weeklyMsg = useMemo(() => {
    if (!enrichedCheckin) return null;
    const n = weekSessions.length;
    if (n === 0) return `Primeiro treino da semana — bom momento para começar.`;
    if (n >= 4) return `Meta semanal atingida. Hoje pode ser leve ou descanso.`;
    return `${n} de 3 treinos esta semana — você está no ritmo.`;
  }, [weekSessions.length, enrichedCheckin]); // eslint-disable-line

  const sleepNeed = enrichedCheckin?.sleep_need_tonight ?? liveSleepNeed;
  const acwr = analysis?.trainingLoad?.ratio ?? null;
  const acwrRisk = analysis?.trainingLoad?.risk ?? null;

  const CtaIcon = actionCfg.ctaIcon;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4 max-w-xl mx-auto pt-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-20 rounded-xl" />
          <Skeleton className="h-6 w-12 rounded-xl" />
        </div>
        <Skeleton className="h-56 w-full rounded-3xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    );
  }

  // ── No checkin ─────────────────────────────────────────────────────────────
  if (!enrichedCheckin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-[72vh] text-center px-6"
      >
        <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
          <Zap className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-black mb-2">Sem check-in hoje</h2>
        <p className="text-sm text-muted-foreground mb-7 max-w-xs">
          Faça o check-in para calcular sua prontidão e receber seu plano do dia.
        </p>
        <Link
          to="/checkin"
          className="flex items-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold text-sm hover:bg-primary/90 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" /> Fazer check-in
        </Link>
      </motion.div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3 max-w-xl mx-auto pb-8">

      {/* ── 1. TOP BAR ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-lg font-black tracking-tight">Hoje</h1>
          {checkin?.created_at && (
            <p className="text-[10px] text-muted-foreground">
              Check-in às {new Date(checkin.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Streak badge */}
          {hasCheckedInToday && streak >= 3 && (
            <Link
              to="/insights"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/15 transition-colors"
            >
              <span className="text-sm leading-none">🔥</span>
              <span className="text-xs font-bold text-orange-400">{streak}</span>
            </Link>
          )}
          {/* Check-in edit link */}
          <Link
            to="/checkin"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-xl hover:bg-secondary"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* ── 2. HERO CARD — Como estou? ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [.4,0,.2,1] }}
        className="relative rounded-3xl border border-border/50 bg-card overflow-hidden"
      >
        {/* Subtle top glow based on score */}
        <div
          className="absolute top-0 left-0 right-0 h-px opacity-60"
          style={{
            background: displayedScore >= 80
              ? 'linear-gradient(90deg, transparent, #34d399, transparent)'
              : displayedScore >= 65
              ? 'linear-gradient(90deg, transparent, #fbbf24, transparent)'
              : 'linear-gradient(90deg, transparent, #f87171, transparent)'
          }}
        />

        <div className="flex items-center px-5 pt-5 pb-4 gap-4">
          {/* Gauge */}
          <div className="relative shrink-0" style={{ width: 112, height: 112 }}>
            <ScoreArc score={displayedScore} size={112} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-3xl font-black font-mono leading-none', scoreColor)}>
                {displayedScore}
              </span>
              <span className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mt-0.5">
                prontidão
              </span>
            </div>
          </div>

          {/* Score context */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Headline or status */}
            {checkin?.headline_today ? (
              <p className="text-sm font-semibold leading-snug line-clamp-2">
                {checkin.headline_today}
              </p>
            ) : (
              <div>
                <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', scoreLabelClass)}>
                  {scoreLabel}
                </span>
              </div>
            )}

            {/* Trend */}
            {biochargeTrend && (
              <p className={cn('text-[11px] font-medium', biochargeTrend.color)}>
                {biochargeTrend.text}
              </p>
            )}

            {/* Body state — minimal */}
            {enrichedCheckin.current_body_state && BODY_STATE_PT[enrichedCheckin.current_body_state] && (
              <p className="text-[11px] text-muted-foreground leading-snug">
                <span className="font-medium text-foreground/70">Estado: </span>
                {BODY_STATE_PT[enrichedCheckin.current_body_state]} ·{' '}
                {BODY_STATE_HINT[enrichedCheckin.current_body_state]}
              </p>
            )}
          </div>
        </div>

        {/* ── Bottleneck pill ── */}
        {bottleneck && (
          <div className={cn(
            'mx-4 mb-4 px-3.5 py-2.5 rounded-xl border flex items-center gap-2.5',
            bottleneck.bg
          )}>
            <span className="text-base shrink-0">{bottleneck.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-foreground/80">
                Gargalo hoje:{' '}
              </span>
              <span className={cn('text-[11px]', bottleneck.color)}>
                {bottleneck.label} · {bottleneck.value}
              </span>
            </div>
          </div>
        )}

        {/* ── Sleep alert strip ── */}
        {deepSleepAlert && !deepSleepAlertDismissed && (
          <div className="mx-4 mb-4 px-3.5 py-2.5 rounded-xl border border-blue-500/20 bg-blue-500/8 flex items-start gap-2.5">
            <Moon className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-200 flex-1 leading-relaxed">{deepSleepAlert}</p>
            <button
              onClick={() => setDeepSleepAlertDismissed(true)}
              className="text-blue-400/50 hover:text-blue-300 transition-colors shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </motion.div>

      {/* ── 3. ACTION CARD — O que fazer? ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45, ease: [.4,0,.2,1] }}
        className="rounded-3xl border border-border/50 bg-card p-5 space-y-4"
      >
        {/* Action header */}
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none mt-0.5">{actionCfg.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black tracking-tight">{actionCfg.title}</h2>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', actionCfg.badgeClass)}>
                {actionCfg.badge}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
              {actionCfg.subtitle}
            </p>
          </div>
        </div>

        {/* Weekly context micro-line */}
        {weeklyMsg && (
          <p className="text-[11px] text-muted-foreground/80 -mt-1 pl-9">
            {weeklyMsg}
          </p>
        )}

        {/* CTA button */}
        {actionCfg.showAddBtn && (
          <button
            onClick={() => setShowAddModal(true)}
            className={cn(
              'w-full flex items-center justify-center gap-2 h-12 rounded-2xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99]',
              actionCfg.ctaClass
            )}
          >
            <CtaIcon className="w-4 h-4" />
            {actionCfg.ctaLabel}
          </button>
        )}
      </motion.div>

      {/* ── 4. WORKOUT SUGGESTION (if planning phase and no sessions yet) ────── */}
      {phase === 'PLANNING' && todaySessions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <WorkoutSuggestionCard
            checkin={enrichedCheckin}
            actionableRecs={analysis?.actionableRecs || []}
            strainTarget={strainTarget}
            currentStrain={cappedStrain}
            analysis={analysis}
            userPrefs={user?.preferences || {}}
            todaySessions={todaySessions}
            allSessions={allSessions}
          />
        </motion.div>
      )}

      {/* ── 5. TODAY'S SESSIONS (if any) ────────────────────────────────────── */}
      {todaySessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border/50 bg-card p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Treinos de hoje
            </p>
            <span className="text-[10px] text-muted-foreground">
              Strain: <span className={cn(
                'font-mono font-bold',
                cappedStrain >= 18 ? 'text-red-400' :
                cappedStrain >= 14 ? 'text-orange-400' :
                cappedStrain >= 10 ? 'text-yellow-400' : 'text-emerald-400'
              )}>⚡{cappedStrain}</span> / {strainTarget}
            </span>
          </div>
          <TrainingSessionsList
            checkin={enrichedCheckin}
            sessions={todaySessions}
            onUpdate={() => {
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.checkins(user?.email) });
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trainingSessions(user?.email) });
            }}
          />

          {/* Post-workout CTA */}
          <Link
            to="/checkin?mode=post"
            className="mt-3 flex items-center justify-between p-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">🏁</span>
              <div>
                <p className="text-xs font-semibold">Registrar pós-treino</p>
                <p className="text-[10px] text-muted-foreground">~30s · melhora seus insights</p>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-primary" />
          </Link>
        </motion.div>
      )}

      {/* ── 6. HRV ANOMALY ALERT ────────────────────────────────────────────── */}
      {analysis?.hrvAnomaly && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className={cn(
            'rounded-2xl border p-4 flex gap-3 items-start',
            analysis.hrvAnomaly.alert.type === 'critical'
              ? 'border-red-500/40 bg-red-500/8'
              : 'border-yellow-500/40 bg-yellow-500/8'
          )}
        >
          <span className="text-xl shrink-0">{analysis.hrvAnomaly.alert.icon}</span>
          <div>
            <p className={cn('text-sm font-semibold',
              analysis.hrvAnomaly.alert.type === 'critical' ? 'text-red-400' : 'text-yellow-400'
            )}>{analysis.hrvAnomaly.alert.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{analysis.hrvAnomaly.alert.text}</p>
          </div>
        </motion.div>
      )}

      {/* ── 7. DETAILS COLLAPSIBLE ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
        className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden"
      >
        <button
          onClick={() => setDetailsOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold hover:bg-secondary/40 transition-colors"
        >
          <span className="flex items-center gap-2 text-muted-foreground">
            <Activity className="w-3.5 h-3.5" />
            Detalhes & métricas
          </span>
          <motion.div animate={{ rotate: detailsOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </button>

        <AnimatePresence>
          {detailsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [.4,0,.2,1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-4 pb-5 space-y-4 border-t border-border/30 pt-4">

                {/* Metrics grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Strain */}
                  <div className="rounded-xl bg-secondary/60 p-3">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Strain</p>
                    <p className={cn('text-xl font-mono font-bold',
                      cappedStrain >= 18 ? 'text-red-400' :
                      cappedStrain >= 14 ? 'text-orange-400' :
                      cappedStrain >= 10 ? 'text-yellow-400' : 'text-emerald-400'
                    )}>⚡{cappedStrain}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">meta: {strainTarget}</p>
                  </div>

                  {/* ACWR */}
                  <div className="rounded-xl bg-secondary/60 p-3">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">ACWR</p>
                    {acwr == null || acwrRisk === 'insufficient_data' ? (
                      <p className="text-xl font-mono font-bold text-muted-foreground">—</p>
                    ) : (
                      <>
                        <p className={cn('text-xl font-mono font-bold',
                          acwr > 1.5 ? 'text-red-400' :
                          acwr > 1.3 ? 'text-yellow-400' : 'text-emerald-400'
                        )}>{acwr.toFixed(2)}</p>
                        <p className={cn('text-[9px] mt-0.5',
                          acwr > 1.5 ? 'text-red-400' :
                          acwr > 1.3 ? 'text-yellow-400' : 'text-emerald-400'
                        )}>{acwr > 1.5 ? 'Alto risco' : acwr > 1.3 ? 'Moderado' : 'Seguro'}</p>
                      </>
                    )}
                  </div>

                  {/* Sleep need */}
                  <div className="rounded-xl bg-secondary/60 p-3">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Sono meta</p>
                    <p className="text-xl font-mono font-bold text-blue-400">
                      {sleepNeed != null ? `${sleepNeed}h` : '—'}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">esta noite</p>
                  </div>
                </div>

                {/* Recovery & capacity row */}
                {enrichedCheckin.current_body_state && (
                  <div className="px-3 py-2.5 rounded-xl bg-secondary/40 border border-border/30 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Estado corporal</span>
                      <span className="font-semibold text-foreground/80">
                        {BODY_STATE_PT[enrichedCheckin.current_body_state] ?? enrichedCheckin.current_body_state}
                      </span>
                    </div>
                    {enrichedCheckin.remaining_capacity && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Capacidade restante</span>
                        <span className="font-semibold text-foreground/80">
                          {{ High: 'Alta', Moderate: 'Moderada', Low: 'Baixa', Minimal: 'Mínima' }[enrichedCheckin.remaining_capacity] ?? enrichedCheckin.remaining_capacity}
                        </span>
                      </div>
                    )}
                    {checkin?.sleep_hours != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Sono de ontem</span>
                        <span className="font-semibold text-foreground/80">{checkin.sleep_hours}h</span>
                      </div>
                    )}
                    {checkin?.hrv != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">HRV</span>
                        <span className="font-semibold text-foreground/80">{checkin.hrv} ms</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Sleep forecast */}
                {enrichedCheckin.next_day_forecast && (
                  <div className="px-3 py-2.5 rounded-xl border border-blue-500/15 bg-blue-500/5 flex gap-2.5">
                    <Moon className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-200 leading-relaxed">
                      {enrichedCheckin.next_day_forecast}
                    </p>
                  </div>
                )}

                {/* Narrative */}
                {analysis?.narrative && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Contexto fisiológico
                    </p>
                    <p className="text-xs text-muted-foreground/80 leading-relaxed">
                      {typeof analysis.narrative === 'string'
                        ? analysis.narrative
                        : analysis.narrative?.summary ?? ''}
                    </p>
                  </div>
                )}

                {/* Recovery demand alert */}
                {(enrichedCheckin.recovery_demand || 0) > morningRecovery && (
                  <div className="px-3 py-2.5 rounded-xl border border-red-500/25 bg-red-500/8 flex gap-2.5 items-start">
                    <span className="text-base shrink-0">🚨</span>
                    <div>
                      <p className="text-xs font-semibold text-red-400">Carga acima da recuperação</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Demanda: {enrichedCheckin.recovery_demand} vs Prontidão: {displayedScore}. Priorize descanso.
                      </p>
                    </div>
                  </div>
                )}

                {/* Link to insights */}
                <Link
                  to="/insights"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <span>Ver análise completa no Inteligência IA</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── 8. ADD TRAINING MODAL ───────────────────────────────────────────── */}
      {showAddModal && (
        <AddTrainingModal
          checkin={enrichedCheckin}
          existingSessions={todaySessions}
          onClose={() => setShowAddModal(false)}
          onAdded={() => setShowAddModal(false)}
        />
      )}

    </div>
  );
}

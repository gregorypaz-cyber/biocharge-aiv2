import React, { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useUserCheckins, useUserTrainingSessions } from '@/hooks/useUserData';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Plus, Zap, Dumbbell, Info, Moon, Heart, X } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { getTodayLocal } from '@/lib/date-utils';
import { computeCheckinScores } from '@/lib/biocharge-utils';
import {
  calculateBodyState,
  calculateRemainingCapacity,
  calculateRecoveryDemand,
  calculateSleepNeed,
} from '@/lib/training-impact-engine';
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
import SecondaryMetrics from '@/components/today/SecondaryMetrics';
import ProtectionInsightCard from '@/components/today/ProtectionInsightCard';
import QuickIntentEdit from '@/components/today/QuickIntentEdit';
import AddTrainingModal from '@/components/training/AddTrainingModal';
import { useStreak } from '@/hooks/useStreak';
import { buildCardLayout } from '@/utils/priorityEngine';

function getSleepDebtHours(analysis) {
  return analysis?.sleepDebt?.debt ?? analysis?.sleepDebtHours ?? 0;
}

function getHeroDynamicContext({ checkin, analysis, dailyVerdict, todaySessions, isRestMode }) {
  const delayedFatigue = checkin?.delayed_fatigue_alert || null;
  const forecast = checkin?.next_day_forecast || null;
  const sleepNeed = checkin?.sleep_need_tonight ?? null;
  const ratio = analysis?.trainingLoad?.ratio ?? null;

  if (delayedFatigue) {
    return {
      tone: 'warning',
      heroLine: 'Hoje pede mais controle porque o custo pode aparecer amanhã.',
      title: 'Sinal para amanhã',
      text: delayedFatigue,
    };
  }

  if (forecast) {
    return {
      tone: 'info',
      heroLine: 'O que você fizer hoje influencia diretamente a leitura de amanhã.',
      title: 'Prévia de amanhã',
      text: forecast,
    };
  }

  if (todaySessions.length > 0 && ratio != null && ratio > 1.25) {
    return {
      tone: 'warning',
      heroLine: 'A carga de hoje já merece respeito para proteger a recuperação seguinte.',
      title: 'Atenção para amanhã',
      text: 'Sua carga de hoje já foi relevante. Amanhã pode exigir mais controle do que parece agora.',
    };
  }

  if (isRestMode && sleepNeed != null) {
    return {
      tone: 'positive',
      heroLine: 'Recuperar bem hoje pode abrir uma margem melhor amanhã.',
      title: 'Janela de recuperação',
      text: `Se você proteger o sono hoje, há boa chance de melhorar a leitura de amanhã. Meta sugerida: ${sleepNeed}h.`,
    };
  }

  if (dailyVerdict?.mode === 'train_high') {
    return {
      tone: 'positive',
      heroLine: 'Se você dosar bem hoje, a tendência é sustentar uma boa linha amanhã.',
      title: 'Proteja a resposta',
      text: 'A oportunidade de hoje é boa, mas ela rende mais se vier com execução controlada e sono forte à noite.',
    };
  }

  return null;
}

function getHeroDynamicToneClass(tone) {
  if (tone === 'warning') {
    return 'bg-yellow-500/8 border-yellow-500/20 text-yellow-100';
  }

  if (tone === 'positive') {
    return 'bg-emerald-500/8 border-emerald-500/20 text-emerald-100';
  }

  if (tone === 'info') {
    return 'bg-primary/5 border-primary/10 text-foreground';
  }

  return 'bg-secondary/60 border-border/40 text-foreground';
}

function getTomorrowHook({ checkin, analysis, todaySessions, isRestMode }) {
  const delayedFatigue = checkin?.delayed_fatigue_alert || null;
  const forecast = checkin?.next_day_forecast || null;
  const sleepNeed = checkin?.sleep_need_tonight ?? null;
  const ratio = analysis?.trainingLoad?.ratio ?? null;

  if (delayedFatigue) {
    return {
      tone: 'warning',
      title: 'Sinal para amanhã',
      text: delayedFatigue,
      footer: 'Vale voltar amanhã cedo para confirmar como seu corpo respondeu.',
    };
  }

  if (forecast) {
    return {
      tone: 'info',
      title: 'Prévia de amanhã',
      text: forecast,
      footer: 'Abra o app amanhã cedo para verificar se a leitura se confirmou.',
    };
  }

  if (todaySessions.length > 0 && ratio != null && ratio > 1.25) {
    return {
      tone: 'warning',
      title: 'Atenção para amanhã',
      text: 'Sua carga de hoje já foi relevante. O dia seguinte pode pedir mais controle do que parece agora.',
      footer: 'Volte amanhã para ver se sua margem realmente abriu ou fechou.',
    };
  }

  if (isRestMode && sleepNeed != null) {
    return {
      tone: 'positive',
      title: 'Recuperação em construção',
      text: `Se você proteger o sono hoje, há boa chance de melhorar a leitura de amanhã. Meta de sono sugerida: ${sleepNeed}h.`,
      footer: 'Amanhã cedo você confirma se seu corpo respondeu como esperado.',
    };
  }

  return {
    tone: 'neutral',
    title: 'O dia não termina aqui',
    text: 'A leitura de amanhã depende do que você fizer hoje: carga, sono e estresse ainda podem mudar bastante sua margem.',
    footer: 'Volte amanhã cedo para ver a resposta real do seu corpo.',
  };
}

function TomorrowHookCard({ hook }) {
  if (!hook) return null;

  const toneClass =
    hook.tone === 'warning'
      ? 'border-yellow-500/25 bg-yellow-500/8'
      : hook.tone === 'positive'
      ? 'border-emerald-500/25 bg-emerald-500/8'
      : hook.tone === 'info'
      ? 'border-primary/20 bg-primary/5'
      : 'border-border/40 bg-card';

  const titleClass =
    hook.tone === 'warning'
      ? 'text-yellow-300'
      : hook.tone === 'positive'
      ? 'text-emerald-300'
      : hook.tone === 'info'
      ? 'text-primary'
      : 'text-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-2xl border px-4 py-3 space-y-2', toneClass)}
    >
      <div>
        <p className={cn('text-[10px] font-bold uppercase tracking-widest', titleClass)}>
          {hook.title}
        </p>
        <p className="text-sm leading-relaxed mt-1">{hook.text}</p>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {hook.footer}
      </p>
    </motion.div>
  );
}


function getDailyVerdict({
  checkin,
  analysis,
  phase,
  intent,
  locked,
  displayedScore,
  prescriptionScore,
  deepSleepPct,
  totalStrain,
  todaySessions,
}) {
  
 const canUseStoredDecision =
  checkin?.decision_mode &&
  todaySessions.length === 0 &&
  phase === 'PLANNING' &&
  !(intent === 'recovery' && locked);

if (canUseStoredDecision) {
  return {
    mode: checkin.decision_mode,
    workoutIntensity:
      checkin.decision_mode === 'train_high' ? 'high' :
      checkin.decision_mode === 'train_moderate' ? 'moderate' :
      checkin.decision_mode === 'train_light' ? 'low' :
      'low',
    headline: checkin.headline_today || 'Direção do dia definida',
    subheadline: 'Baseado no seu check-in mais recente.',
    rationale: 'Engine principal',
    caution: null,
  };
}

  const sleepDebt = getSleepDebtHours(analysis);
  const acwr = analysis?.trainingLoad?.ratio ?? null;
  const physioState = analysis?.physioState?.state ?? checkin?.current_body_state ?? null;
  const recoveryDemand = checkin?.recovery_demand ?? 0;
  const morningRecovery = checkin?.morning_recovery_score ?? checkin?.recovery_score ?? 0;

  const forcedRecovery =
    (intent === 'recovery' && locked) ||
    phase === 'RECOVERY_DAY' ||
    phase === 'OVERLOAD' ||
    physioState === 'Overreached' ||
    physioState === 'Fatigued' ||
    recoveryDemand > morningRecovery;

  if (forcedRecovery) {
    return {
      mode: 'recover',
      workoutIntensity: 'low',
      headline: 'Hoje o foco é recuperar',
      subheadline: 'Seu corpo se beneficia mais de descanso ou atividade leve do que de mais carga.',
      rationale: 'Recuperação > treino hoje',
      caution: 'Evite intensidade alta e preserve o sistema para os próximos 1–2 dias.',
    };
  }

  const deepSleepLow = deepSleepPct != null && deepSleepPct < 18;
  const sleepIsLimiting = sleepDebt >= 4 || deepSleepLow;
  const lowLoad = acwr != null && acwr <= 0.8;
  const highLoad = acwr != null && acwr >= 1.3;

  const hasPhysio =
    ((checkin?.hrv_manual && checkin.hrv_manual > 0) ||
      (checkin?.hrv && checkin.hrv > 0)) ||
    (checkin?.resting_hr && checkin.resting_hr > 0);

if (prescriptionScore >= 82 && !sleepIsLimiting && !highLoad && hasPhysio) {

    return {
      mode: 'train_high',
      workoutIntensity: 'high',
      headline: 'Hoje é uma boa janela para intensidade',
      subheadline: 'Seu corpo acordou bem e tem margem para um estímulo mais forte com controle.',
      rationale: 'Prontidão alta',
      caution: lowLoad ? 'Há margem de carga, mas ainda vale respeitar sua percepção no aquecimento.' : 'Aqueça progressivamente e confirme a resposta do corpo.',
    };
  }

  if (displayedScore >= 65) {
    if (sleepIsLimiting || highLoad) {
      return {
        mode: 'train_moderate',
        workoutIntensity: 'moderate',
        headline: 'Treino moderado com cautela',
        subheadline: 'Seu corpo está funcional, mas o sono ou a carga recente reduzem sua margem de intensidade.',
        rationale: 'Moderado é a melhor dose hoje',
        caution: 'Mantenha o treino sob controle e evite transformar o moderado em forte.',
      };
    }

    return {
      mode: 'train_moderate',
      workoutIntensity: 'moderate',
      headline: 'Treino moderado recomendado',
      subheadline: 'Seu sistema está estável para manter ritmo e consistência hoje.',
      rationale: 'Melhor dose para hoje',
      caution: 'Se o aquecimento não encaixar, reduza um nível.',
    };
  }

  if (displayedScore >= 50) {
    return {
      mode: 'train_light',
      workoutIntensity: 'low',
      headline: 'Hoje vale manter leve',
      subheadline: 'Há espaço para movimento, mas não para insistir em intensidade.',
      rationale: 'Leve para preservar amanhã',
      caution: 'Use o treino como manutenção, não como teste.',
    };
  }

  return {
    mode: 'recover',
    workoutIntensity: 'low',
    headline: 'Recuperação é a melhor decisão',
    subheadline: 'Seu corpo não mostra boa margem para carga útil hoje.',
    rationale: 'Baixa prontidão',
    caution: 'Sono, hidratação e redução de estresse geram mais retorno do que forçar treino.',
  };
}

export default function Today() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const today = getTodayLocal();

  const { data: checkins = [], isLoading: loadingCheckins } = useUserCheckins(30);
  const { data: allSessions = [], isLoading: loadingSessions } = useUserTrainingSessions(100);

  const sortedCheckins = useMemo(() => {
    return [...checkins].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [checkins]);

  const sortedSessions = useMemo(() => {
    return [...allSessions].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [allSessions]);

  const todayCheckins = sortedCheckins.filter((c) => c.date === today);
  const rawCheckin = todayCheckins[0] || null;

  const computed = useMemo(() => {
    return sortedCheckins.map((c, i) => computeCheckinScores(c, sortedCheckins.slice(i + 1), []));
  }, [sortedCheckins]);

  const todaySessions = sortedSessions.filter((s) => s.date === today);

  const weekSessions = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);

    const yyyy = monday.getFullYear();
    const mm = String(monday.getMonth() + 1).padStart(2, '0');
    const dd = String(monday.getDate()).padStart(2, '0');
    const mondayStr = `${yyyy}-${mm}-${dd}`;

    return sortedSessions.filter((s) => s.date >= mondayStr);
  }, [sortedSessions]);

  const engineScores = rawCheckin
    ? computeCheckinScores(rawCheckin, sortedCheckins.slice(1), todaySessions)
    : null;

  const checkin = rawCheckin
    ? (() => {
        const base = { ...rawCheckin };
        const engine = engineScores || {};
        const approvedEngineFields = [
  'readiness_score',
  'fatigue_score',
  'stress_score',
  'sleep_quality',
  'sleep_performance_pct',
  'recovery_score',
  'morning_recovery_score',
  'zone',
  'alert',
  'recommendation',
  'training_load',
  'sleep_need_tonight',
  'next_day_forecast',
  'delayed_fatigue_alert',
  'headline_today',
  'decision_mode',
  'hrv_7d_avg',
  'hrv_trend',
  'baevsky_si',
  'autonomic_state',
];

        for (const k of approvedEngineFields) {
          if (typeof engine[k] !== 'undefined' && engine[k] !== null) {
            base[k] = engine[k];
          }
        }

        return base;
      })()
    : null;

  const totalStrain = todaySessions.reduce((sum, session) => sum + (session.strain_score ?? 0), 0);
  const morningRecovery = checkin?.morning_recovery_score ?? checkin?.recovery_score ?? 0;

  const liveBodyState = checkin ? calculateBodyState(morningRecovery, totalStrain) : null;
  const liveCapacity = checkin ? calculateRemainingCapacity(morningRecovery, totalStrain) : null;
  const liveRecoveryDemand = checkin ? calculateRecoveryDemand(totalStrain, morningRecovery) : null;
  const liveSleepNeed = checkin ? calculateSleepNeed(totalStrain, morningRecovery) : null;

  const enrichedCheckin = checkin
    ? {
        ...checkin,
        current_body_state: checkin.current_body_state || liveBodyState,
        remaining_capacity: checkin.remaining_capacity || liveCapacity,
        recovery_demand: checkin.recovery_demand ?? liveRecoveryDemand,
        sleep_need_tonight: checkin.sleep_need_tonight ?? liveSleepNeed,
      }
    : null;

  const isLoading = loadingCheckins || loadingSessions;

  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const computedKey = `${computed.length}:${computed[0]?.date || ''}:${computed[0]?.recovery_score || ''}`;
  const sessionsKey = `${sortedSessions.length}:${sortedSessions[0]?.date || ''}:${sortedSessions[0]?.strain_score || ''}`;

  useEffect(() => {
    // Sem check-ins suficientes para análise histórica robusta
    if (computed.length < 2) {
      setAnalysis(null);
      setAnalysisLoading(false);
      setAnalysisError(null);
      return;
    }

    let cancelled = false;
    setAnalysisLoading(true);
    setAnalysisError(null);

    runPhysiologicalAnalysisAsync(computed, sortedSessions, {
      useWorker: true,
      cacheTTLMinutes: 15,
    })
      .then((result) => {
        if (!cancelled) {
          if (result && typeof result === 'object') {
            setAnalysis(result);
          } else {
            setAnalysis(null);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('Today: analysis failed', err);
          setAnalysisError(err?.message || 'analysis_failed');
          setAnalysis(null);
        }
      })
      .finally(() => {
        if (!cancelled) setAnalysisLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [computedKey, sessionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const recoveryDelta = Array.isArray(analysis?.baselineInsights)
    ? analysis.baselineInsights.find((i) => i.label === 'Recovery')?.delta ?? null
    : null;

  const last7Checkins = sortedCheckins.filter((c) => c.date !== today).slice(0, 7);

  const biochargeTrend = useMemo(() => {
    const values = last7Checkins.map((c) => c.biocharge_morning).filter((v) => v != null);
    if (values.length < 2 || rawCheckin?.biocharge_morning == null) return null;

    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const diff = Math.round(rawCheckin.biocharge_morning - avg);

    if (diff > 5) return { text: `↑ +${diff} pts acima da sua média da semana`, color: 'text-emerald-400' };
    if (diff < -5) return { text: `↓ ${diff} pts abaixo da sua média da semana`, color: 'text-red-400' };
    return { text: '→ Dentro da sua média da semana', color: 'text-muted-foreground' };
  }, [last7Checkins, rawCheckin?.biocharge_morning]); // eslint-disable-line

const hrvTrend = useMemo(() => {
    const currentHrv = rawCheckin?.hrv_manual ?? rawCheckin?.hrv ?? null;
    const avg7d = enrichedCheckin?.hrv_7d_avg ?? null;
    const trend = enrichedCheckin?.hrv_trend ?? null;

    if (currentHrv == null || avg7d == null || !trend) return null;

    const pctDiff = Math.round(((currentHrv - avg7d) / avg7d) * 100);

    if (trend === 'above_avg') {
      return {
        text: `RMSSD ${Math.abs(pctDiff)}% acima da sua média (7d)`,
        color: 'text-emerald-400',
      };
    }

    if (trend === 'below_avg') {
      return {
        text: `RMSSD ${Math.abs(pctDiff)}% abaixo da sua média (7d)`,
        color: 'text-red-400',
      };
    }

    return {
      text: 'RMSSD em linha com sua média (7d)',
      color: 'text-yellow-400',
    };
  }, [rawCheckin?.hrv, rawCheckin?.hrv_manual, enrichedCheckin?.hrv_7d_avg, enrichedCheckin?.hrv_trend]);

  const isSilentMode = ['Overreached', 'Fatigued'].includes(analysis?.physioState?.state);

  const [deepSleepAlertDismissed, setDeepSleepAlertDismissed] = useState(false);
  const deepSleepAlert = useMemo(() => {
    if (!rawCheckin?.deep_sleep_pct) return null;

    const sorted = [...sortedCheckins].sort((a, b) => b.date.localeCompare(a.date));
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
    const recentPcts = sorted
      .slice(0, consecutiveNights)
      .map((c) => c.deep_sleep_pct)
      .filter((v) => v != null);

    const isImproving = recentPcts.length >= 2 && recentPcts[0] > recentPcts[1];

    let framing;
    if (isImproving) {
      framing = `Sono melhorando. Continue assim.`;
    } else if (consecutiveNights >= 7) {
      framing = `Uma semana de sono fragmentado.`;
    } else if (consecutiveNights >= 4) {
      framing = `Dia ${consecutiveNights} de uma sequência ruim de sono.`;
    } else {
      framing = `Noite ${consecutiveNights} de sono fragmentado.`;
    }

    return `${framing} Hoje isso pede mais controle da intensidade. (sono profundo: ${pct}%)`;
  }, [sortedCheckins, rawCheckin?.deep_sleep_pct]); // eslint-disable-line

  const capacityContradictionNote = useMemo(() => {
    if (!rawCheckin) return null;

    // Não sugerir treino quando o dia é de recuperação/descanso —
    // a nota contradiria a decisão principal da tela.
    const isRecoveryDay =
      !!rawCheckin.rest_day || enrichedCheckin?.decision_mode === 'recover';
    if (isRecoveryDay) return null;

    const bio = rawCheckin.biocharge_morning ?? 0;
    const cap = enrichedCheckin?.remaining_capacity;
    const sleep = rawCheckin.sleep_score ?? rawCheckin.sleep_quality ?? 100;

    if (bio < 70 && ['High', 'Alta'].includes(cap) && sleep < 75) {
      return 'Sua capacidade muscular parece melhor do que o sono sugere. Se treinar, mantenha o foco em controle e não em intensidade máxima.';
    }

    return null;
  }, [
    rawCheckin?.rest_day,
    rawCheckin?.biocharge_morning,
    enrichedCheckin?.remaining_capacity,
    enrichedCheckin?.decision_mode,
    rawCheckin?.sleep_score,
    rawCheckin?.sleep_quality,
  ]); // eslint-disable-line

  const [showAddModal, setShowAddModal] = useState(false);

  const scrollToWorkoutPrescription = () => {
    const el = document.getElementById('today-workout-prescription');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const displayedScore =
    checkin?.readiness_score ?? checkin?.recovery_score ?? checkin?.morning_recovery_score ?? 0;

  const prescriptionScore = checkin?.recovery_score ?? displayedScore;
  const readinessFaixa =
  displayedScore >= 82 ? 'Alta' :
  displayedScore >= 65 ? 'Moderada' :
  'Baixa';

  const strainTarget =
    prescriptionScore >= 80 ? 16 :
    prescriptionScore >= 65 ? 13 :
    prescriptionScore >= 50 ? 10 :
    7;

  const cappedStrain = Math.min(21, totalStrain);

  const dayMetrics = enrichedCheckin
    ? {
        currentStrain: cappedStrain,
        strainTarget,
        readiness: prescriptionScore,
        hrv: enrichedCheckin.hrv_manual ?? enrichedCheckin.hrv ?? null,
        hasSessions: todaySessions.length > 0,
      }
    : null;

  const { intent, locked, dayPhase, DayPhase: Phase } = useDayContext(dayMetrics);
  const { streak, hasCheckedInToday } = useStreak(sortedCheckins);

  const BODY_STATE_PT = {
    Recovered: 'Recuperado',
    Activated: 'Ativado',
    Balanced: 'Equilibrado',
    Loaded: 'Carregado',
    Sympathetic_Load: 'Carga simpática',
    Fatigued: 'Fatigado',
    Overreached: 'Sobrecarga',
  };

  const BODY_STATE_HINT = {
    Recovered: 'Bom momento para estímulo alto, desde que o resto do contexto acompanhe.',
    Activated: 'Corpo responsivo — confirme no aquecimento.',
    Balanced: 'Ritmo sustentável hoje.',
    Loaded: 'Monitore a intensidade e evite empilhar carga.',
    Sympathetic_Load: 'Sistema nervoso sobrecarregado — prefira leveza.',
    Fatigued: 'Evite alta intensidade; priorize recuperação.',
    Overreached: 'Descanso obrigatório — mais carga agrava o quadro.',
  };

const BODY_STATE_META = {
  Recovered: {
    emoji: '🟢',
    tone: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    short: 'Sistema pronto para render',
  },
  Activated: {
    emoji: '⚡',
    tone: 'bg-sky-500/10 border-sky-500/20 text-sky-300',
    short: 'Boa responsividade hoje',
  },
  Balanced: {
    emoji: '⚖️',
    tone: 'bg-primary/10 border-primary/10 text-foreground',
    short: 'Estado estável e sustentável',
  },
  Loaded: {
    emoji: '🟠',
    tone: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
    short: 'Carga presente, margem menor',
  },
  Sympathetic_Load: {
    emoji: '🌩️',
    tone: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
    short: 'Sistema sob carga nervosa',
  },
  Fatigued: {
    emoji: '🔴',
    tone: 'bg-red-500/10 border-red-500/20 text-red-300',
    short: 'Fadiga acima do ideal',
  },
  Overreached: {
    emoji: '🚨',
    tone: 'bg-red-500/10 border-red-500/20 text-red-300',
    short: 'Sobrecarga clara',
  },
};

const AUTONOMIC_PT = {
    parasympathetic: 'Parassimpático',
    balanced: 'Equilibrado',
    sympathetic: 'Simpático',
  };

  const AUTONOMIC_META = {
    parasympathetic: {
      emoji: '🟢',
      tone: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
      short: 'Sistema em recuperação',
      detail: 'Parassimpático dominante — boa recuperação',
    },
    balanced: {
      emoji: '🟡',
      tone: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
      short: 'Sistema estável',
      detail: 'Equilíbrio autonômico',
    },
    sympathetic: {
      emoji: '🔴',
      tone: 'bg-red-500/10 border-red-500/20 text-red-300',
      short: 'Stress fisiológico elevado',
      detail: 'Simpático dominante — carga / stress alto',
    },
  };

  const CAPACITY_PT = {
    High: 'Alta',
    Moderate: 'Moderada',
    Low: 'Baixa',
    Minimal: 'Mínima',
  };

  const PHASE_CONFIG = {
    PLANNING: {
      headerTitle: 'Hoje',
      headerSub: 'Decisão do dia',
      ctaLabel: 'Adicionar treino',
      ctaIcon: Dumbbell,
      ctaClass: 'bg-primary text-primary-foreground hover:bg-primary/90',
      showCta: true,
      accentBorder: 'border-border',
      accentBg: 'bg-card',
      bannerClass: null,
      bannerText: null,
    },
    OPTIMAL_LOAD: {
      headerTitle: 'Hoje',
      headerSub: 'Carga útil atingida',
      ctaLabel: 'Adicionar treino',
      ctaIcon: Dumbbell,
      ctaClass: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      showCta: true,
      accentBorder: 'border-border',
      accentBg: 'bg-card',
      bannerClass: null,
      bannerText: null,
    },
    OVERLOAD: {
      headerTitle: 'Hoje',
      headerSub: 'Recuperação acima de execução',
      ctaLabel: 'Recuperação em foco',
      ctaIcon: Heart,
      ctaClass: 'bg-secondary text-muted-foreground border border-border',
      showCta: false,
      accentBorder: 'border-blue-500/20',
      accentBg: 'bg-card',
      bannerClass: 'border-orange-500/30 bg-orange-500/5 text-orange-400',
      bannerText: '⚡ Sua carga já chegou num ponto em que mais treino tende a render menos recuperação amanhã.',
    },
    RECOVERY_DAY: {
      headerTitle: 'Hoje',
      headerSub: 'Dia de recuperação',
      ctaLabel: 'Recuperação em foco',
      ctaIcon: Moon,
      ctaClass: 'bg-secondary text-muted-foreground border border-border',
      showCta: false,
      accentBorder: 'border-blue-500/15',
      accentBg: 'bg-card',
      bannerClass: 'border-blue-500/25 bg-blue-500/5 text-blue-300',
      bannerText: '🌙 Hoje o melhor retorno vem de reduzir estresse, recuperar energia e dormir bem.',
    },
  };

  const phase = (locked && intent === 'recovery')
    ? 'RECOVERY_DAY'
    : Phase ? (dayPhase ?? 'PLANNING') : (intent === 'recovery' ? 'RECOVERY_DAY' : 'PLANNING');

  const phaseCfg = PHASE_CONFIG[phase] ?? PHASE_CONFIG.PLANNING;
  const CtaIcon = phaseCfg.ctaIcon;

  const isRestMode = phase === 'OVERLOAD' || phase === 'RECOVERY_DAY';

  const dailyVerdict = useMemo(() => {
    return getDailyVerdict({
      checkin: enrichedCheckin,
      analysis,
      phase,
      intent,
      locked,
      displayedScore,
      prescriptionScore,
      deepSleepPct: rawCheckin?.deep_sleep_pct ?? null,
      totalStrain,
      todaySessions,
    });
  }, [
    enrichedCheckin,
    analysis,
    phase,
    intent,
    locked,
    displayedScore,
    prescriptionScore,
    rawCheckin?.deep_sleep_pct,
    totalStrain,
    todaySessions,
  ]);

const heroDynamicContext = useMemo(() => {
    return getHeroDynamicContext({
      checkin: enrichedCheckin,
      analysis,
      dailyVerdict,
      todaySessions,
      isRestMode,
    });
  }, [enrichedCheckin, analysis, dailyVerdict, todaySessions, isRestMode]);


const scheduledSport = todaySessions[0]?.sport ?? undefined;

const tomorrowHook = useMemo(() => {
    return getTomorrowHook({
      checkin: enrichedCheckin,
      analysis,
      todaySessions,
      isRestMode,
    });
  }, [enrichedCheckin, analysis, todaySessions, isRestMode]);

  const shouldHideTomorrowHook = useMemo(() => {
    if (!heroDynamicContext) return false;

    return (
      heroDynamicContext.title === 'Sinal para amanhã' ||
      heroDynamicContext.title === 'Prévia de amanhã' ||
      heroDynamicContext.title === 'Atenção para amanhã' ||
      heroDynamicContext.title === 'Janela de recuperação'
    );
  }, [heroDynamicContext]);

  const { primary: primaryCards, secondary: secondaryCards } = useMemo(() => {
    if (!enrichedCheckin) return { primary: [], secondary: [] };

    return buildCardLayout({
      phase,
      workoutIntensity: dailyVerdict?.workoutIntensity ?? 'unknown',
      scheduledSport,
      hasWorkoutSessions: todaySessions.length > 0,
      hasAnalysis: !!analysis,
      hasHrvAnomaly: !!analysis?.hrvAnomaly,
      hasNarrative: !!analysis?.narrative,
      hasRecoveryDemandAlert: (enrichedCheckin?.recovery_demand || 0) > morningRecovery,
    });
  }, [
    enrichedCheckin,
    phase,
    dailyVerdict?.workoutIntensity,
    scheduledSport,
    todaySessions.length,
    analysis,
    morningRecovery,
  ]);

  const orderedPrimaryCards = useMemo(() => {
    if (!primaryCards?.length) return [];

    const priority = {
      execution: 0,
      workout: 1,
    };

    return [...primaryCards].sort((a, b) => {
      const pa = priority[a.id] ?? 99;
      const pb = priority[b.id] ?? 99;
      return pa - pb;
    });
  }, [primaryCards]);

  const weeklyContextMsg = useMemo(() => {
    if (!enrichedCheckin) return null;

    const sessionsCount = weekSessions.length;
    const fatigue = enrichedCheckin.fatigue_score ?? enrichedCheckin.fatigue ?? 0;
    const readiness = prescriptionScore;

    const recentCheckins = sortedCheckins.filter((c) => c.date !== today).slice(0, 5);
    let trend = '';

    if (recentCheckins.length >= 3) {
      const scores = recentCheckins
        .slice(0, 3)
        .map((c) => c.recovery_score ?? c.readiness_score ?? 0);

      if (scores[0] > scores[2] + 3) trend = ' · tendência positiva';
      else if (scores[0] < scores[2] - 3) trend = ' · atenção à recuperação';
    }

    if (fatigue > 60 || sessionsCount >= 4) {
      return `Carga alta na semana — hoje vale dose controlada.${trend}`;
    }

    if (readiness >= 85 && sessionsCount <= 1) {
      return `Boa prontidão com volume baixo — há margem para progredir.${trend}`;
    }

    if (sessionsCount === 0) {
      return `Primeiro treino da semana — bom momento para começar com controle.${trend}`;
    }

    if (sessionsCount >= 3) {
      return `Volume semanal já está bem encaminhado.${trend}`;
    }

    return `${sessionsCount} ${sessionsCount === 1 ? 'treino' : 'treinos'} registrados esta semana.${trend}`;
  }, [weekSessions, enrichedCheckin, sortedCheckins, prescriptionScore, today]);

function renderCard(desc) {
    if (!desc || desc.action === 'exclude') return null;

    const workoutProps = {
      checkin: enrichedCheckin,
      actionableRecs: Array.isArray(analysis?.actionableRecs) ? analysis.actionableRecs : [],
      strainTarget,
      currentStrain: cappedStrain,
      analysis,
      userPrefs: user?.preferences || {},
      todaySessions,
      allSessions: sortedSessions,
      dailyVerdict,
    };

    switch (desc.id) {
      case 'execution':
        return <ExecutionCard key="execution" />;

      case 'workout': {
        const workoutEl =
          desc.action === 'mutate' ? (
            <ProtectionInsightCard key="workout-mutated" mutation={desc.mutation} />
          ) : (
            <WorkoutSuggestionCard key="workout" {...workoutProps} />
          );

        return (
          <section
            key="workout-wrapper"
            id="today-workout-prescription"
            className="space-y-3"
          >
            <div className="px-1 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Prescrição do dia
              </p>
              <h3 className="text-base font-black tracking-tight">
                Opções A, B e C para executar hoje
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Seu estado do corpo define a margem. Agora escolha a dose que melhor encaixa no contexto de hoje.
              </p>
            </div>

            {(() => {
              // Conecta o insight à AÇÃO: traduz gargalo/tendência numa orientação
              // concreta para hoje. Prioridade: tendência piorando > gargalo > nada.
              // Se não há sinal acionável, não renderiza (não polui a decisão).
              const bottleneck = analysis?.personalBottleneck;
              const trends = analysis?.longTermTrends;

              const ACTIONS = {
                deep_sleep_pct: 'priorize dormir cedo, em quarto fresco e escuro — é onde você ganha mais',
                sleep_hours: 'garanta sua janela de sono completa hoje — é seu maior retorno',
                sleep_awakenings: 'evite cafeína à tarde e telas antes de dormir para reduzir despertares',
                sleep_regularity_pct: 'tente dormir e acordar no mesmo horário — sua regularidade é o que mais pesa',
                rem_sleep_pct: 'evite álcool à noite, que corta o sono REM',
                sleep_score: 'cuide do sono hoje — é o fator que mais move sua recuperação',
              };

              let line = null;
              let tone = 'neutral';

              // 1. Tendência piorando (mais urgente)
              const worsening = trends?.hasAnyTrend
                ? trends.metrics.find((m) => m.hasTrend && m.sentiment === 'negative')
                : null;

              if (worsening) {
                line = `Seu ${worsening.label} vem caindo nas últimas semanas. Hoje, jogar a favor da recuperação ajuda a virar essa tendência.`;
                tone = 'warning';
              } else if (bottleneck?.hasSignal && bottleneck.bottleneck) {
                const b = bottleneck.bottleneck;
                const action = ACTIONS[b.key] || `cuide de ${b.label.toLowerCase()} hoje`;
                line = `Seu maior fator é ${b.label.toLowerCase()}: ${action}.`;
                tone = 'focus';
              }

              if (!line) return null;

              return (
                <div
                  className={cn(
                    'px-3 py-2.5 rounded-xl border text-[12px] leading-snug',
                    tone === 'warning'
                      ? 'bg-amber-500/5 border-amber-500/20'
                      : 'bg-primary/5 border-primary/20'
                  )}
                >
                  <span className="font-semibold">
                    {tone === 'warning' ? '⚠️ Atenção: ' : '🎯 Onde focar hoje: '}
                  </span>
                  {line}
                </div>
              );
            })()}

            {workoutEl}

            {weeklyContextMsg && (
              <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
                {weeklyContextMsg}
              </p>
            )}
          </section>
        );
      }

      case 'morning_recovery':
        return (
          <MorningRecoveryCard
            key="morning_recovery"
            checkin={enrichedCheckin}
            delta={recoveryDelta}
          />
        );

      case 'sleep_forecast':
        return <SleepForecastCard key="sleep_forecast" checkin={enrichedCheckin} />;

      case 'training_sessions':
        return (
          <div
            key="training_sessions"
            className={cn('rounded-2xl border bg-card p-4', phaseCfg.accentBorder)}
          >
            <TrainingSessionsList
              checkin={enrichedCheckin}
              sessions={todaySessions}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.checkins(user?.email) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trainingSessions(user?.email) });
              }}
            />
          </div>
        );

      case 'narrative':
        return analysis?.narrative ? (
          <NarrativeCard key="narrative" narrative={analysis.narrative} />
        ) : null;

      case 'why_score':
        return analysis?.whyScore?.length > 0 ? (
          <WhyScoreCard
            key="why_score"
            whyScore={analysis.whyScore}
            recoveryScore={displayedScore}
          />
        ) : null;

      case 'current_state':
        return (
          <CurrentStateCard
            key="current_state"
            checkin={enrichedCheckin}
            totalStrain={totalStrain}
          />
        );

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
              <p
                className={`text-sm font-semibold ${
                  analysis.hrvAnomaly.alert.type === 'critical'
                    ? 'text-red-400'
                    : 'text-yellow-400'
                }`}
              >
                {analysis.hrvAnomaly.alert.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {analysis.hrvAnomaly.alert.text}
              </p>
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
              <p className="text-sm font-semibold text-red-400">
                Carga acima da recuperação disponível
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Demanda {enrichedCheckin.recovery_demand} vs recuperação da manhã {displayedScore}. Hoje vale proteger.
              </p>
            </div>
          </motion.div>
        ) : null;

      case 'post_workout_cta': {
  if (todaySessions.length === 0) return null;

  const hasPostWorkout =
    enrichedCheckin?.biocharge_post_workout > 0 ||
    enrichedCheckin?.delta_post != null ||
    String(enrichedCheckin?.notes || '').includes('[PÓS-TREINO]');

  
if (hasPostWorkout) {
  return null;
}


  return (
    <Link
      key="post_workout_cta"
      to="/checkin?mode=post"
      className="flex items-center justify-between p-4 rounded-2xl border border-primary/25 bg-primary/5 hover:bg-primary/10 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">🏁</span>

        <div>
          <p className="text-sm font-semibold">
            Registrar pós-treino
          </p>

          <p className="text-xs text-muted-foreground">
            ~30s · RPE, energia e dor muscular para melhorar amanhã
          </p>
        </div>
      </div>

      <span className="text-primary text-sm font-bold">→</span>
    </Link>
  );
}

      default:
        return null;
    }
  }
 
function ExecutionCard() {
  return (
    <motion.div
      key={phase + '-card'}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-3xl border p-5 space-y-4', phaseCfg.accentBorder, phaseCfg.accentBg)}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
               Decisão de hoje
            </span>
            <h2 className="text-xl font-black mt-1 leading-tight">
              {dailyVerdict.headline}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {heroDynamicContext?.heroLine || dailyVerdict.subheadline}
            </p>
          </div>

          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              displayedScore >= 82
  ? 'bg-emerald-500/15 text-emerald-400'
  : displayedScore >= 65
  ? 'bg-yellow-500/15 text-yellow-400'
  : 'bg-red-500/15 text-red-400'
            }`}
          >
            {readinessFaixa}
          </span>
        </div>

        {/* HERÓI VISUAL — anel de score centralizado */}
        <div className="flex flex-col items-center pt-2 pb-1">
          {(() => {
            const scoreColor = isRestMode
              ? 'hsl(215,30%,55%)'
              : displayedScore >= 82
              ? 'hsl(142,70%,50%)'
              : displayedScore >= 65
              ? 'hsl(45,93%,58%)'
              : 'hsl(0,72%,55%)';
            const R = 78;
            const C = 2 * Math.PI * R;
            const pct = Math.max(0, Math.min(100, displayedScore));
            const offset = C - (pct / 100) * C;
            return (
              <div className="relative" style={{ width: 188, height: 188 }}>
                <svg width="188" height="188" viewBox="0 0 188 188" className="-rotate-90">
                  {/* trilho */}
                  <circle
                    cx="94" cy="94" r={R}
                    fill="none"
                    stroke="hsl(215,25%,18%)"
                    strokeWidth="10"
                  />
                  {/* progresso */}
                  <motion.circle
                    cx="94" cy="94" r={R}
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    initial={{ strokeDashoffset: C }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.1, ease: 'easeOut' }}
                    style={{ filter: `drop-shadow(0 0 6px ${scoreColor}55)` }}
                  />
                </svg>
                {/* número central */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-6xl font-black font-mono leading-none tracking-tight"
                    style={{ color: scoreColor }}
                  >
                    {displayedScore}
                  </motion.span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mt-1.5">
                    Score do dia
                  </span>
                </div>
              </div>
            );
          })()}

          {/* satélites: faixa + recovery base */}
          <div className="flex items-center gap-2 mt-3">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                displayedScore >= 82
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : displayedScore >= 65
                  ? 'bg-yellow-500/15 text-yellow-400'
                  : 'bg-red-500/15 text-red-400'
              }`}
            >
              {readinessFaixa}
            </span>
            <span className="text-xs text-muted-foreground">
              Recovery base{' '}
              <span className="font-mono font-bold text-foreground">
                {checkin?.morning_recovery_score ?? checkin?.recovery_score ?? '—'}
              </span>
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button aria-label="Sobre Prontidão" className="text-muted-foreground">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Prontidão é a leitura que orienta a decisão de treino de hoje.
                <div style={{ marginTop: 6 }}>
                  <small className="text-[10px] text-muted-foreground">
                    Combina recovery, sono, fadiga e sinais fisiológicos para definir sua margem do dia.
                  </small>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {(biochargeTrend || hrvTrend || enrichedCheckin?.sleep_performance_pct != null) && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {biochargeTrend && (
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full bg-secondary/60 ${biochargeTrend.color}`}>
                {biochargeTrend.text}
              </span>
            )}

            {hrvTrend && (
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full bg-secondary/60 ${hrvTrend.color}`}>
                {hrvTrend.text}
              </span>
            )}

            {enrichedCheckin?.sleep_performance_pct != null && (
              <span
                className={cn(
                  'text-[11px] font-semibold px-2.5 py-1 rounded-full bg-secondary/60',
                  enrichedCheckin.sleep_performance_pct >= 85
                    ? 'text-emerald-400'
                    : enrichedCheckin.sleep_performance_pct >= 70
                    ? 'text-yellow-400'
                    : 'text-red-400'
                )}
              >
                Sono {enrichedCheckin.sleep_performance_pct}%
              </span>
            )}
          </div>
        )}

        {heroDynamicContext ? (
          <div
            className={cn(
              'px-3 py-2.5 rounded-xl border text-xs leading-snug',
              getHeroDynamicToneClass(heroDynamicContext.tone)
            )}
          >
            <span className="font-semibold">
              {heroDynamicContext.title}:
            </span>{' '}
            {heroDynamicContext.text}
          </div>
        ) : (
          !todaySessions.length && !isRestMode && (
            <div className="px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/10 text-xs leading-snug">
              <span className="font-semibold text-primary">Linha do dia:</span>{' '}
              sua recuperação define a margem do dia. O plano logo abaixo transforma isso na melhor dose para hoje.
            </div>
          )
        )}

        {!heroDynamicContext &&
          phase !== 'RECOVERY_DAY' &&
          phase !== 'OVERLOAD' &&
          dailyVerdict.caution && (
            <div className="px-3 py-2.5 rounded-xl bg-secondary/60 border border-border/40 text-xs leading-snug">
              <span className="font-semibold">O que pede controle hoje:</span> {dailyVerdict.caution}
            </div>
          )}

        {/* Lembrete do gargalo pessoal nos dias de recuperação mais baixa */}
        {displayedScore < 65 &&
          analysis?.personalBottleneck?.hasSignal &&
          analysis.personalBottleneck.bottleneck && (() => {
            const b = analysis.personalBottleneck.bottleneck;
            const isPositive = b.direction === 'positive';
            return (
              <div className="px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs leading-snug">
                <span className="font-semibold text-primary">
                  {b.icon} Seu maior fator hoje:
                </span>{' '}
                nos seus dados, <span className="font-medium">{b.label.toLowerCase()}</span> é
                o que mais acompanha a variação da sua recuperação.{' '}
                {isPositive
                  ? `Quando está mais alto, seu corpo tende a responder melhor no dia seguinte.`
                  : `Quando está mais alto, sua recuperação no dia seguinte tende a cair.`}
              </div>
            );
          })()}

{enrichedCheckin.current_body_state &&
          BODY_STATE_PT[enrichedCheckin.current_body_state] && (() => {
            const stateKey = enrichedCheckin.current_body_state;
            const meta = BODY_STATE_META[stateKey] || BODY_STATE_META.Balanced;

            return (
              <div className={cn('rounded-xl border px-3 py-3 space-y-2', meta.tone)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                      Estado do corpo
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm leading-none">{meta.emoji}</span>
                      <p className="text-sm font-semibold">
                        {BODY_STATE_PT[stateKey]}
                      </p>
                    </div>
                    <p className="text-[11px] mt-1 opacity-90">
                      {meta.short}
                    </p>
                  </div>

                  {enrichedCheckin.remaining_capacity &&
                    CAPACITY_PT[enrichedCheckin.remaining_capacity] && (
                      <div className="text-right shrink-0">
                        <p className="text-[10px] uppercase tracking-wider opacity-70">
                          Capacidade
                        </p>
                        <p className="text-sm font-bold">
                          {CAPACITY_PT[enrichedCheckin.remaining_capacity]}
                        </p>
                      </div>
                    )}
                </div>

                <p className="text-[11px] leading-relaxed opacity-80">
                  {BODY_STATE_HINT[stateKey]}
                </p>
              </div>
            );
          })()}

{enrichedCheckin.autonomic_state &&
          enrichedCheckin.baevsky_si != null &&
          AUTONOMIC_PT[enrichedCheckin.autonomic_state] &&
          (() => {
            const autoKey = enrichedCheckin.autonomic_state;
            const autoMeta = AUTONOMIC_META[autoKey] || AUTONOMIC_META.balanced;

            return (
              <div className={cn('rounded-xl border px-3 py-3 space-y-2', autoMeta.tone)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                      Estado autonômico
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm leading-none">{autoMeta.emoji}</span>
                      <p className="text-sm font-semibold">
                        {AUTONOMIC_PT[autoKey]}
                      </p>
                    </div>
                    <p className="text-[11px] mt-1 opacity-90">
                      {autoMeta.short}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase tracking-wider opacity-70">
                      Baevsky
                    </p>
                    <p className="text-sm font-bold">
                      {enrichedCheckin.baevsky_si}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] leading-relaxed opacity-80">
                  {autoMeta.detail}
                </p>
              </div>
            );
          })()}


        {capacityContradictionNote && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {capacityContradictionNote}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-secondary p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            Strain acumulado
          </p>
          <p
            className={`text-xl font-mono font-bold ${
              cappedStrain >= 18
                ? 'text-red-400'
                : cappedStrain >= 14
                ? 'text-orange-400'
                : cappedStrain >= 10
                ? 'text-yellow-400'
                : 'text-emerald-400'
            }`}
          >
            ⚡ {cappedStrain}
          </p>
        </div>

        <div className="rounded-2xl bg-secondary p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            Capacidade restante
          </p>
          <p className="text-xl font-bold">
            {enrichedCheckin.remaining_capacity
              ? ({
                  High: 'Alta',
                  Moderate: 'Moderada',
                  Low: 'Baixa',
                  Minimal: 'Mínima',
                }[enrichedCheckin.remaining_capacity] ?? enrichedCheckin.remaining_capacity)
              : '—'}
          </p>
        </div>

        <div className="rounded-2xl bg-secondary p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            ACWR
          </p>
          {analysis?.trainingLoad?.risk === 'insufficient_data' ||
          analysis?.trainingLoad?.ratio == null ? (
            <p className="text-xl font-mono font-bold text-muted-foreground">—</p>
          ) : (
            <>
              <p
                className={`text-xl font-mono font-bold ${
                  analysis.trainingLoad.ratio > 1.5
                    ? 'text-red-400'
                    : analysis.trainingLoad.ratio > 1.3
                    ? 'text-yellow-400'
                    : 'text-emerald-400'
                }`}
              >
                {analysis.trainingLoad.ratio.toFixed(2)}
              </p>
              <p
                className={`text-[10px] mt-0.5 ${
                  analysis.trainingLoad.lowConfidence
                    ? 'text-muted-foreground'
                    : analysis.trainingLoad.ratio > 1.5
                    ? 'text-red-400'
                    : analysis.trainingLoad.ratio > 1.3
                    ? 'text-yellow-400'
                    : 'text-emerald-400'
                }`}
              >
                {analysis.trainingLoad.lowConfidence
                  ? 'Base em formação'
                  : analysis.trainingLoad.ratio > 1.5
                  ? 'Muito alto'
                  : analysis.trainingLoad.ratio > 1.3
                  ? 'Atenção'
                  : 'Seguro'}
              </p>
              {analysis.trainingLoad.lowConfidence && (
                <p className="text-[9px] text-muted-foreground/70 mt-0.5 leading-tight">
                  Precisa de ~3 semanas de histórico para estabilizar.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {phaseCfg.showCta ? (
        <button
          onClick={() => {
            if (!todaySessions.length && !isRestMode) {
              scrollToWorkoutPrescription();
              return;
            }
            setShowAddModal(true);
          }}
          className={cn(
            'w-full flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold text-sm transition-all',
            phaseCfg.ctaClass
          )}
        >
          <CtaIcon className="w-4 h-4" />
          {!todaySessions.length && !isRestMode ? 'Ver prescrição do dia' : phaseCfg.ctaLabel}
        </button>
      ) : (
        <button
          disabled
          className={cn(
            'w-full flex items-center justify-center gap-2 h-10 rounded-2xl font-medium text-xs transition-all opacity-60 cursor-not-allowed',
            phaseCfg.ctaClass
          )}
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
          Faça seu check-in para calcular sua prontidão e decidir melhor o treino do dia.
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
    <div
      className={cn(
        'space-y-6 max-w-2xl mx-auto transition-all duration-500',
        isSilentMode && 'opacity-90',
        isRestMode && 'saturate-[0.7]'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black tracking-tight">Hoje</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{phaseCfg.headerSub}</p>

          {checkin?.created_at ? (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
              <span>Check-in às</span>
              <span className="font-medium text-foreground/60">
                {new Date(checkin.created_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </p>
          ) : checkin?.date ? (
            <p className="text-[10px] text-muted-foreground mt-1">Check-in de hoje registrado</p>
          ) : null}
        </div>

        {hasCheckedInToday && streak >= 3 && (
          <Link
            to="/insights"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/15 transition-colors shrink-0"
            title={`${streak} dias seguidos`}
          >
            <span className="text-sm leading-none">🔥</span>
            <span className="text-xs font-bold text-orange-400">{streak}</span>
          </Link>
        )}
      </div>

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

      <QuickIntentEdit />

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

      {orderedPrimaryCards.map((desc) => renderCard(desc))}

      {!shouldHideTomorrowHook && <TomorrowHookCard hook={tomorrowHook} />}

      {(analysis?.whyScore?.length > 0 || analysis?.narrative) && (
        <Link
          to="/insights"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
        >
          Quer entender o que está guiando seu recovery?
          <span className="text-primary font-medium">→ Ver padrões em Insights</span>
        </Link>
      )}

      <SecondaryMetrics count={secondaryCards.filter((d) => d.action !== 'exclude').length}>
        {secondaryCards.map((desc) => renderCard(desc))}
      </SecondaryMetrics>

      {analysisError && (
        <p className="text-[11px] text-yellow-400/80 px-1">
          Alguns insights avançados não foram carregados agora. Você ainda pode usar a recomendação principal do dia.
        </p>
      )}

      {showAddModal && (
        <AddTrainingModal
          checkin={enrichedCheckin}
          existingSessions={todaySessions}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.checkins(user?.email) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trainingSessions(user?.email) });
          }}
        />
      )}
    </div>
  );
}
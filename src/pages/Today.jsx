import React, { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useUserCheckins, useUserTrainingSessions } from '@/hooks/useUserData';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Plus, Zap, Dumbbell, Info, Moon, Heart, X, ChevronDown, TrendingUp, Settings, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { getTodayLocal } from '@/lib/date-utils';
import { computeCheckinScores, getDayScore } from '@/lib/biocharge-utils';
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
import WorkoutLoggedState from '@/components/today/WorkoutLoggedState';
import NarrativeCard from '@/components/intelligence/NarrativeCard';
import LongevityOnboardingCard from '@/components/intelligence/LongevityOnboardingCard';
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

    // (Removidos) 3 ganchos de "amanhã" que eram placebo:
  //  • fadiga retardada → atribuição causal a treino de 2 dias atrás (refutada);
  //  • "prévia de amanhã" → texto templated/horóscopo (meta de sono está no SleepForecastCard);
  //  • carga>1.25 → relação carga→recovery que não se sustenta (r≈+0,17, ns).
  // O hero mantém só leituras honestas (janela de recuperação / estímulo).



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


function MiniRing({ value, displayValue, max = 100, color, label, caption, captionColor, size = 104, trend = [] }) {
  const stroke = 8;
  const R = (size - stroke) / 2 - 2;
  const c = size / 2;
  const C = 2 * Math.PI * R;
  const hasValue = value != null && !Number.isNaN(value);
  const pct = max > 0 && hasValue ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const offset = C - (pct / 100) * C;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={c} cy={c} r={R} fill="none" stroke="hsl(215,25%,18%)" strokeWidth={stroke} />
          {hasValue && (
            <motion.circle
              cx={c} cy={c} r={R} fill="none" stroke={color} strokeWidth={stroke}
              strokeLinecap="round" strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ filter: `drop-shadow(0 0 5px ${color}55)` }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-3xl font-black font-mono leading-none tracking-tight"
            style={{ color: hasValue ? color : 'hsl(215,15%,55%)' }}
          >
            {hasValue ? (displayValue != null ? displayValue : value) : '—'}
          </span>
        </div>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-foreground mt-2">{label}</p>
      {caption && (
        <p className={cn('text-[10px] mt-0.5 text-center leading-tight', captionColor || 'text-muted-foreground')}>
          {caption}
        </p>
      )}
      {Array.isArray(trend) && trend.filter((v) => v != null).length >= 2 && (() => {
        const vals = trend.filter((v) => v != null);
        const mn = Math.min(...vals);
        const range = Math.max(...vals) - mn || 1;
        const pts = vals
          .map((v, i) => `${((i / (vals.length - 1)) * 100).toFixed(1)},${(22 - ((v - mn) / range) * 20).toFixed(1)}`)
          .join(' ');
        return (
          <svg width="62" height="24" viewBox="0 0 100 24" preserveAspectRatio="none" className="mt-1.5" aria-hidden="true">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          </svg>
        );
      })()}
    </div>
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

  // train_high usa o personalHigh adaptativo (mesmo gate da decisão e do strain),
  // não o 74 fixo — resíduo de antes da recalibração relativa-a-você.
  const personalHighGate = checkin?.recovery_high_threshold ?? 74;

if (prescriptionScore >= personalHighGate && !sleepIsLimiting && !highLoad && hasPhysio) {

    return {
        mode: 'train_high',
        workoutIntensity: 'high',
        headline: 'Hoje é uma boa janela para intensidade',
        subheadline: 'Seu corpo acordou bem e tem margem para um estímulo mais forte com controle.',
        rationale: 'Recovery alto',
        caution: lowLoad ? 'Há margem de carga, mas ainda vale respeitar sua percepção no aquecimento.' : 'Aqueça progressivamente e confirme a resposta do corpo.',
      };
  }

  if (displayedScore >= 55) {
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

  if (displayedScore >= 42) {
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
    rationale: 'Recovery baixo',
    caution: 'Sono, hidratação e redução de estresse geram mais retorno do que forçar treino.',
  };
}

export default function Today() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const today = getTodayLocal();

  const { data: checkins = [], isLoading: loadingCheckins } = useUserCheckins(90);
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
  // recovery_score / morning_recovery_score / zone NÃO entram aqui de propósito:
  // o score é a FONTE ÚNICA gravada no check-in. A Today lê o salvo (via getDayScore),
  // igual ao Histórico/Timeline — nunca recalcula pra exibir. Só os campos DERIVADOS
  // (decision_mode, thresholds, hrv_trend, etc.) seguem sendo calculados ao vivo.
  'alert',
  'recommendation',
  'training_load',
  'sleep_need_tonight',
  'next_day_forecast',
  'delayed_fatigue_alert',
  'headline_today',
  'decision_mode',
  'recovery_high_threshold',
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
  const liveSleepNeed = checkin ? calculateSleepNeed(totalStrain, morningRecovery, sortedCheckins.filter((c) => c.date !== today)) : null;

  const enrichedCheckin = checkin
    ? {
        ...checkin,
        current_body_state: checkin.current_body_state || liveBodyState,
        remaining_capacity: checkin.remaining_capacity || liveCapacity,
        recovery_demand: checkin.recovery_demand ?? liveRecoveryDemand,
        sleep_need_tonight: liveSleepNeed ?? checkin.sleep_need_tonight,
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

  const ringTrends = useMemo(() => {
    const chrono = [...last7Checkins].reverse(); // mais antigo → mais recente
    const strainByDate = {};
    for (const s of sortedSessions) {
      if (s?.date) strainByDate[s.date] = (strainByDate[s.date] || 0) + (s.strain_score ?? 0);
    }
    return {
      recovery: chrono.map((c) => c.recovery_score ?? c.biocharge_morning ?? c.readiness_score).filter((v) => v != null),
      sono: chrono.map((c) => c.sleep_quality ?? c.sleep_score).filter((v) => v != null),
      strain: chrono.map((c) => Math.min(21, strainByDate[c.date] || 0)),
    };
  }, [last7Checkins, sortedSessions]); // eslint-disable-line

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

    // Limiar alinhado à nova banda: 13% é o piso saudável (idealLow). 13-22% =
    // saudável, NÃO alerta. Só sequências abaixo de 13% sinalizam profundo baixo.
    for (const c of sorted) {
      if (c.deep_sleep_pct != null && c.deep_sleep_pct < 13) {
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
      framing = `Profundo melhorando, mas ainda abaixo do seu saudável.`;
    } else if (consecutiveNights >= 7) {
      framing = `Uma semana com profundo baixo.`;
    } else if (consecutiveNights >= 4) {
      framing = `Dia ${consecutiveNights} de profundo abaixo do saudável.`;
    } else {
      framing = `Noite ${consecutiveNights} de profundo baixo.`;
    }

    // Ação no lever CERTO (higiene de sono), não na intensidade — a dose de
    // treino é decidida só pela engine principal, p/ não dar duas ordens na tela.
    return `${framing} Priorize dormir cedo, em quarto fresco e escuro — é onde o profundo se recupera. (sono profundo: ${pct}%)`;
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
    const sleep = rawCheckin.sleep_quality ?? rawCheckin.sleep_score ?? 100;

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

    // Cold-start: o recovery é null enquanto o baseline de HRV é jovem (<4 noites).
  // NUNCA mostramos "0" nesse caso — seria um número falso (anti-placebo).
  const rawDayScore = getDayScore(checkin);
  const isCalibrating = !!checkin && rawDayScore == null;
  const displayedScore = rawDayScore ?? 0; // só p/ comparações de lógica; a UI usa isCalibrating
  // Noites de HRV já registradas antes de hoje (o baseline matura em 4 — BL_SEED_NIGHTS).
  const priorHrvNights = (sortedCheckins || []).filter(
    (c) => c.date !== today && Number(c?.hrv_manual ?? c?.hrv) > 0
  ).length;
  const calibratingNightsLeft = Math.max(0, 4 - priorHrvNights);

  // Tier de confiança do baseline (honestidade): nos dias 4–13 o Recovery já existe,
  // mas o baseline matura até 14 noites (BL_TRUST_NIGHTS). Surfacar isso evita que um
  // score com baseline provisório pareça tão firme quanto um já consolidado.
  // calibrando (sem score) → o título já avisa; construindo (<14) → âmbar; sólido (≥14) → verde.
  const baselineTier = isCalibrating
    ? 'calibrando'
    : (priorHrvNights >= 14 ? 'solido' : 'construindo');


  const prescriptionScore = checkin?.recovery_score ?? displayedScore;
  const personalHigh = enrichedCheckin?.recovery_high_threshold ?? 74;
  // Faixa = ESTADO de recovery, alinhada às zonas do anel (verde ≥70 / amarelo ≥42).
  // A DOSE de treino (train_high / strain Alto) usa personalHigh — é outro eixo.
  const readinessFaixa =
  displayedScore >= 70 ? 'Alta' :
  displayedScore >= 42 ? 'Moderada' :
  'Baixa';

  // Alvo de strain ALINHADO à decisão do dia (decision_mode), pra o anel não
  // contradizer o título (ex.: "manter leve" não mostrar alvo de treino moderado).
  // Sem decisão salva, cai para os tiers por prontidão.
  const verdictMode = enrichedCheckin?.decision_mode || null;
  const strainTarget =
    verdictMode === 'train_high' ? 15 :
    verdictMode === 'train_moderate' ? 12 :
    verdictMode === 'train_light' ? 9 :
    verdictMode === 'recover' ? 6 :
    (prescriptionScore >= personalHigh ? 16 :
     prescriptionScore >= 55 ? 13 :
     prescriptionScore >= 42 ? 10 :
     7);

  const cappedStrain = Math.min(21, totalStrain);

  // Zonas WHOOP de strain (escala 0-21, absoluta).
  const STRAIN_ZONES = [
    { key: 'leve', label: 'Leve', min: 0 },
    { key: 'moderado', label: 'Moderado', min: 10 },
    { key: 'alto', label: 'Alto', min: 14 },
    { key: 'esgotamento', label: 'Esgotamento', min: 18 },
  ];
  const strainZoneOf = (s) => {
    let z = STRAIN_ZONES[0];
    for (const cand of STRAIN_ZONES) if (s >= cand.min) z = cand;
    return z;
  };
  const zoneIdx = (key) => STRAIN_ZONES.findIndex((z) => z.key === key);

  // Zona-ALVO do dia, definida pela decisão (decision_mode). recover = sem carga.
  const targetZoneKey =
    verdictMode === 'train_high' ? 'alto' :
    verdictMode === 'train_moderate' ? 'moderado' :
    verdictMode === 'train_light' ? 'leve' :
    verdictMode === 'recover' ? 'recuperacao' :
    (prescriptionScore >= personalHigh ? 'alto' :
     prescriptionScore >= 55 ? 'moderado' :
     prescriptionScore >= 42 ? 'leve' : 'recuperacao');
  const targetZoneLabel =
    targetZoneKey === 'alto' ? 'Alto' :
    targetZoneKey === 'moderado' ? 'Moderado' :
    targetZoneKey === 'leve' ? 'Leve' : 'Recuperação';

  // Strain acumulado relativo à ZONA-ALVO (estilo WHOOP). Esgotamento (18+) é
  // sempre alerta, independente da meta. A mesma carga lê diferente conforme o
  // dia: 14 num dia "Alto" = na zona; 14 num dia de recuperação = acima.
  const strainVsTarget = (() => {
    const curZone = strainZoneOf(cappedStrain);
    // Alvo SEMPRE com o número (não só o nome da zona), pra "moderado" virar "moderado · 12".
    const targetLabelNum = `${targetZoneLabel} · ${strainTarget}`;
    if (cappedStrain <= 0) {
      return { color: 'text-muted-foreground', ring: 'hsl(215,20%,45%)', short: `meta: ${targetLabelNum}` };
    }
    if (curZone.key === 'esgotamento') {
      return { color: 'text-red-400', ring: 'hsl(0,84%,60%)', short: 'Esgotamento — recupere' };
    }
    if (targetZoneKey === 'recuperacao') {
      return curZone.key === 'leve'
        ? { color: 'text-sky-400', ring: 'hsl(199,89%,60%)', short: 'Leve · dia de recuperação' }
        : { color: 'text-orange-400', ring: 'hsl(25,95%,58%)', short: `${curZone.label} · era recuperação` };
    }
    const diff = zoneIdx(curZone.key) - zoneIdx(targetZoneKey);
    if (diff < 0) return { color: 'text-sky-400', ring: 'hsl(199,89%,60%)', short: `${curZone.label} → ${strainTarget}` };
    if (diff === 0) return { color: 'text-emerald-400', ring: 'hsl(142,70%,50%)', short: `Na zona · meta ${strainTarget}` };
    return { color: 'text-orange-400', ring: 'hsl(25,95%,58%)', short: `${curZone.label} → ${strainTarget}` };
  })();

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
    tone: 'bg-secondary/50 border-border text-foreground',
    short: 'Estado estável e sustentável',
  },
  Loaded: {
    emoji: '🟠',
    tone: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
    short: 'Margem menor — recuperação parcial',
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
    parasympathetic: 'Modo recuperação',
    balanced: 'Equilibrado',
    sympathetic: 'Modo alerta',
  };

  const AUTONOMIC_META = {
    parasympathetic: {
      emoji: '🟢',
      tone: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
      short: 'Sistema nervoso relaxado e em recuperação.',
      action: 'Boa janela para treinar com qualidade, se a recuperação acompanhar.',
      detail: 'Predomínio parassimpático (recuperação). Índice Baevsky mais baixo = corpo mais relaxado.',
    },
    balanced: {
      emoji: '🟡',
      tone: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
      short: 'Ativação e recuperação em equilíbrio.',
      action: 'Sem sinal de estresse autonômico — siga a leitura de recuperação do dia.',
      detail: 'Equilíbrio entre ativação (simpático) e recuperação (parassimpático) do sistema nervoso.',
    },
    sympathetic: {
      emoji: '🔴',
      tone: 'bg-red-500/10 border-red-500/20 text-red-300',
      short: 'Sistema nervoso mais ativado (alerta) que o ideal.',
      action: 'Pesa a favor de manter leve hoje e priorizar sono, respiração e relaxamento — evitar intensidade alta.',
      detail: 'Predomínio simpático (alerta) — carga acumulada, estresse ou sono insuficiente. Índice Baevsky mais alto = mais ativação.',
    },
  };

  const baevskyContext = (si, key) => {
    if (si == null) return '';
    if (key === 'sympathetic') return si < 70 ? 'logo acima do limiar de alerta (60)' : si < 85 ? 'alerta moderado' : 'alerta alto';
    if (key === 'parasympathetic') return si < 15 ? 'bem relaxado' : 'relaxado';
    return 'na faixa de equilíbrio';
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

  // Desacoplado: herói entra em descanso só se VOCÊ escolheu (botão/toggle).
  // Fase automática (carga/prontidão) vira só sugestão (banner), sem sequestrar a decisão.
  const userRest = intent === 'recovery';
  const phase = userRest ? 'RECOVERY_DAY' : 'PLANNING';
  const advisoryPhase = (!userRest && Phase) ? (dayPhase ?? 'PLANNING') : 'PLANNING';

  const phaseCfg = PHASE_CONFIG[phase] ?? PHASE_CONFIG.PLANNING;
  const advisoryCfg = PHASE_CONFIG[advisoryPhase] ?? PHASE_CONFIG.PLANNING;
  const bannerCfg = userRest ? phaseCfg : advisoryCfg;
  const CtaIcon = phaseCfg.ctaIcon;

  const isRestMode = userRest;

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

    const layout = buildCardLayout({
      phase,
      workoutIntensity: dailyVerdict?.workoutIntensity ?? 'unknown',
      scheduledSport,
      hasWorkoutSessions: todaySessions.length > 0,
      hasAnalysis: !!analysis,
      hasHrvAnomaly: !!analysis?.hrvAnomaly,
      hasNarrative: !!analysis?.narrative,
      hasRecoveryDemandAlert: (enrichedCheckin?.recovery_demand || 0) > morningRecovery,
    });

    // 'current_state' (CurrentStateCard "Estado do corpo agora") foi consolidado
    // no card "Leitura de hoje" do herói — não renderizar separado.
    const strip = (arr) => (arr || []).filter((d) => d?.id !== 'current_state');
    layout.primary = strip(layout.primary);
    layout.secondary = strip(layout.secondary);

    // Durante a calibração (sem recovery confiável) não exibimos cards que
    // PRESCREVEM a partir do score (treino, narrativa, "porquê", estado, demanda).
    // Mantemos só os honestos: sinais crus da manhã, meta de sono, sessões,
    // anomalia de HRV (tem gate próprio) e o CTA de pós-treino.
    if (isCalibrating) {
      const ALLOW = new Set([
        'execution',        // o card-herói (anéis + Calibrando) — NUNCA remover
        'morning_recovery', 'sleep_forecast', 'training_sessions',
        'hrv_anomaly', 'post_workout_cta',
      ]);
      const keep = (arr) => (arr || []).filter((d) => ALLOW.has(d?.id));
      return { primary: keep(layout.primary), secondary: keep(layout.secondary) };
    }

    return layout;
  }, [
    enrichedCheckin,
    phase,
    dailyVerdict?.workoutIntensity,
    scheduledSport,
    todaySessions.length,
    analysis,
    morningRecovery,
    isCalibrating,
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
        // ZONA "Treino -> resposta do corpo" (decisao A da Etapa 3)
        // 1) Treino lancado hoje  -> pos-treino (WorkoutLoggedState)
        // 2) Senao, treino ontem  -> Impacto de ontem (resuminho + deltas no corpo)
        // 3) Senao                -> nada
        if (todaySessions.length > 0) {
          return (
            <section key="workout-wrapper" className="space-y-2">
              <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                Treino → resposta do corpo
              </p>
              <WorkoutLoggedState
                sessions={todaySessions}
                checkin={enrichedCheckin}
                analysis={analysis}
              />
            </section>
          );
        }

        const impactoOntem = (() => {
          const yDate = (() => {
            const d = new Date(today + 'T00:00:00');
            d.setDate(d.getDate() - 1);
            return d.toISOString().slice(0, 10);
          })();
          const yWorkout = sortedSessions
            .filter((x) => x.date === yDate)
            .sort((a, b) => (b.strain_score ?? 0) - (a.strain_score ?? 0))[0];
          if (!yWorkout) return null;

          const todayC = sortedCheckins[0];
          const yC = sortedCheckins[1];
          if (!todayC || !yC) return null;

          const parts = [];
          if (todayC.recovery_score != null && yC.recovery_score != null) {
            const d = Math.round(todayC.recovery_score - yC.recovery_score);
            parts.push({ k: 'Recovery', v: `${d >= 0 ? '+' : ''}${d}`, good: d >= 0 });
          }
          const tHrv = todayC.hrv ?? todayC.hrv_manual ?? null;
          const yHrv = yC.hrv ?? yC.hrv_manual ?? null;
          if (tHrv != null && yHrv != null && yHrv > 0) {
            const d = Math.round(((tHrv - yHrv) / yHrv) * 100);
            parts.push({ k: 'HRV', v: `${d >= 0 ? '+' : ''}${d}%`, good: d >= 0 });
          }
          if (todayC.sleep_hours != null && yC.sleep_hours != null) {
            const d = Math.round((todayC.sleep_hours - yC.sleep_hours) * 10) / 10;
            parts.push({ k: 'Sono', v: `${d >= 0 ? '+' : ''}${d}h`, good: d >= 0 });
          }
          if (!parts.length) return null;

          const resume = [
            yWorkout.sport,
            yWorkout.strain_score != null ? `⚡${yWorkout.strain_score}` : null,
            yWorkout.heart_rate_avg ? `FC ${Math.round(yWorkout.heart_rate_avg)}` : null,
            yWorkout.training_effect_aerobic ? `Efeito ${yWorkout.training_effect_aerobic}` : null,
          ]
            .filter(Boolean)
            .join(' · ');

          return (
            <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-bold leading-tight">Impacto de ontem</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {resume}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {parts.map((p) => (
                  <div
                    key={p.k}
                    className="rounded-xl bg-secondary/50 border border-border/40 px-2 py-2 text-center"
                  >
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {p.k}
                    </p>
                    <p
                      className={cn(
                        'text-base font-black font-mono leading-none mt-1',
                        p.good ? 'text-emerald-400' : 'text-yellow-400'
                      )}
                    >
                      {p.v}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                Como seu corpo respondeu hoje ao treino de ontem (vs. o dia anterior).
              </p>
            </div>
          );
        })();

        if (!impactoOntem) return null;

        return (
          <section key="workout-wrapper" className="space-y-2">
            <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-primary">
              Treino → resposta do corpo
            </p>
            {impactoOntem}
          </section>
        );
      }

      case 'morning_recovery':
        return (
          <MorningRecoveryCard
            key="morning_recovery"
            checkin={enrichedCheckin}
            delta={recoveryDelta}
            recentCheckins={sortedCheckins.filter((c) => c.date !== today)}
          />
        );

      case 'sleep_forecast':
        return <SleepForecastCard key="sleep_forecast" checkin={enrichedCheckin} sleepDebt={analysis?.sleepDebt?.debt ?? 0} />;

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
 
// Explicação recolhível — mostra um botão "entender" que expande o texto ao toque.
// Mesmo padrão visual das outras seções recolhíveis do app (SecondaryMetrics).
function CollapsibleHint({ children, label = 'Entender' }) {
  const [open, setOpen] = useState(false);
  if (!children) return null;
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider opacity-60 hover:opacity-90 transition-opacity"
      >
        {label}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3 h-3" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="text-[11px] leading-relaxed opacity-80 pt-1.5">{children}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExecutionCard() {
  const [showProntidaoHint, setShowProntidaoHint] = useState(false);

  const recoveryColor =
    displayedScore >= 70
    ? 'hsl(142,70%,50%)'
    : displayedScore >= 42
    ? 'hsl(45,93%,58%)'
    : 'hsl(0,72%,55%)';
  const recoveryCaptionColor =
    displayedScore >= 70 ? 'text-emerald-400'
    : displayedScore >= 42 ? 'text-yellow-400'
    : 'text-red-400';

  const sleepVal = enrichedCheckin?.sleep_quality ?? enrichedCheckin?.sleep_score ?? null;
  const sleepColor =
    sleepVal == null ? 'hsl(215,30%,55%)'
    : sleepVal >= 80 ? 'hsl(205,90%,62%)'
    : sleepVal >= 65 ? 'hsl(210,85%,55%)'
    : 'hsl(222,60%,52%)';
  const sleepWord =
    sleepVal == null ? 'Sem dado'
    : sleepVal >= 80 ? 'Ótimo'
    : sleepVal >= 65 ? 'Bom'
    : sleepVal >= 50 ? 'Regular'
    : 'Baixo';
  const sleepCaptionColor =
    sleepVal == null ? 'text-muted-foreground'
    : sleepVal >= 80 ? 'text-sky-400'
    : sleepVal >= 65 ? 'text-blue-400'
    : 'text-blue-500';

  const strainColor = strainVsTarget.ring;
  const strainCaption = isRestMode ? 'foco recuperar' : strainVsTarget.short;

  return (
    <motion.div
      key={phase + '-card'}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-3xl border p-5 space-y-4', phaseCfg.accentBorder, phaseCfg.accentBg)}
    >
      <div className="space-y-4">
        {/* Decisão de hoje */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
               Decisão de hoje
            </span>
                        <h2 className="text-xl font-black mt-1 leading-tight">
              {isCalibrating ? 'Calibrando seu baseline' : dailyVerdict.headline}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isCalibrating
                ? (calibratingNightsLeft > 0
                    ? `Faltam ${calibratingNightsLeft} ${calibratingNightsLeft === 1 ? 'noite' : 'noites'} de HRV para o Recovery ficar confiável. Continue registrando — não vou inventar um número antes disso.`
                    : 'Quase lá — mais uma leitura e o Recovery abre.')
                : (heroDynamicContext?.heroLine || dailyVerdict.subheadline)}
            </p>

            {!isCalibrating && (
              <span
                className={`mt-2 inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  baselineTier === 'solido'
                    ? 'bg-emerald-500/10 text-emerald-400/90'
                    : 'bg-amber-500/10 text-amber-400/90'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    baselineTier === 'solido' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                {baselineTier === 'solido'
                  ? 'Baseline sólido'
                  : `Baseline construindo · ${priorHrvNights}/14 noites`}
              </span>
            )}

          </div>

                      <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isCalibrating
                ? 'bg-muted text-muted-foreground'
                : displayedScore >= 70
                ? 'bg-emerald-500/15 text-emerald-400'
                : displayedScore >= 42
                ? 'bg-yellow-500/15 text-yellow-400'
                : 'bg-red-500/15 text-red-400'
            }`}
          >
            {isCalibrating ? 'Calibrando' : readinessFaixa}
          </span>

        </div>

        {/* TRIO DE ANÉIS — Recovery / Sono / Strain */}
        <div className="grid grid-cols-3 gap-2 pt-1">
                      <MiniRing
            value={isCalibrating ? null : displayedScore}
            max={100}
            color={recoveryColor}
            label="Recovery"
            caption={isCalibrating ? 'Calibrando' : readinessFaixa}
            captionColor={isCalibrating ? 'text-muted-foreground' : recoveryCaptionColor}
            trend={isCalibrating ? [] : ringTrends.recovery}
          />

          <MiniRing
            value={sleepVal}
            max={100}
            color={sleepColor}
            label="Sono"
            caption={sleepWord}
            captionColor={sleepCaptionColor}
            trend={ringTrends.sono}
          />
          <MiniRing
            value={cappedStrain}
            displayValue={cappedStrain}
            max={21}
            color={strainColor}
            label="Strain"
            caption={strainCaption}
            captionColor={cappedStrain <= 0 ? 'text-muted-foreground' : strainVsTarget.color}
            trend={ringTrends.strain}
          />
        </div>

        {/* Entender os anéis (toque — funciona no iPhone) */}
        <div className="flex justify-center -mt-1">
          <button
            type="button"
            aria-expanded={showProntidaoHint}
            onClick={() => setShowProntidaoHint((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <Info className="w-3 h-3" />
            Entender os anéis
            <motion.span animate={{ rotate: showProntidaoHint ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-3 h-3" />
            </motion.span>
          </button>
        </div>
        <AnimatePresence initial={false}>
          {showProntidaoHint && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl bg-secondary/50 border border-border/40 px-3 py-2.5 space-y-1.5">
                <p className="text-[11px] leading-relaxed">
                  <span className="font-semibold text-foreground">Recovery</span>{' '}
                  <span className="text-muted-foreground">— seu score do dia, calculado pelos sinais fisiológicos da manhã: HRV, frequência cardíaca de repouso e sono. É o número que orienta a decisão de treino.</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  <span className="font-semibold text-foreground">Sono</span>{' '}
                  <span className="text-muted-foreground">— qualidade da sua noite (duração, regularidade, continuidade, profundo e REM).</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  <span className="font-semibold text-foreground">Strain</span>{' '}
                  <span className="text-muted-foreground">— esforço acumulado hoje (0–21). É separado do recovery e comparado à meta sugerida para o dia.</span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
              {isCalibrating
                ? 'ainda calibrando seu baseline. Quando o Recovery abrir, esta linha vira a leitura do seu dia.'
                : displayedScore >= 70
                ? 'recuperação alta — há margem pra puxar um pouco mais hoje, se a vontade pedir.'
                : displayedScore >= 42
                ? 'recuperação moderada — segure a intensidade no controle; não transforme moderado em máximo.'
                : 'recuperação baixa — o ganho de hoje está em recuperar, não em forçar.'}
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

        {/* LEITURA DE HOJE — estado do corpo + modo autonômico + orçamento + alavanca, num card só */}
        {!isCalibrating && enrichedCheckin.current_body_state && (() => {
          const bodyKey = enrichedCheckin.current_body_state;
          const autoKey = enrichedCheckin.autonomic_state || 'balanced';
          const si = enrichedCheckin.baevsky_si;
          const cap = enrichedCheckin.remaining_capacity;

          // Frase fundida estado + modo (cobre bom E ruim, nunca só elogio).
          const bodyClause = {
            Recovered: 'Corpo recuperado', Activated: 'Corpo ativado',
            Balanced: 'Corpo equilibrado', Loaded: 'Corpo carregado',
            Sympathetic_Load: 'Corpo sob carga simpática', Fatigued: 'Corpo fatigado',
            Overreached: 'Corpo em sobrecarga',
          }[bodyKey] || 'Corpo estável';
          const autoClause = {
            parasympathetic: 'sistema nervoso em recuperação',
            balanced: 'sistema nervoso calmo',
            sympathetic: 'sistema nervoso em alerta',
          }[autoKey] || 'sistema nervoso estável';
          const tail =
            displayedScore >= 70 ? 'dá pra puxar hoje.' :
            displayedScore >= 42 ? 'dá pra treinar com controle.' :
            'hoje é segurar.';
          const toneClass =
            displayedScore >= 70 ? 'text-emerald-400' :
            displayedScore >= 42 ? 'text-yellow-400' : 'text-orange-400';

          // Escala ABSOLUTA de strain (0–21), alinhada ao anel.
          // A meta do dia entra como MARCADOR, não como a largura total da barra.
          const STRAIN_MAX = 21;
          const currentStrainPct = Math.max(
            0,
            Math.min(100, (cappedStrain / STRAIN_MAX) * 100)
          );
          const targetStrainPct = Math.max(
            0,
            Math.min(100, (strainTarget / STRAIN_MAX) * 100)
          );
          const overTarget = cappedStrain > strainTarget;

          // Alavanca pra amanhã: gargalo validado (raro) OU sono vs SEU normal (descritivo, sem causa).
          const fmtH = (h) => { const H = Math.floor(h); const M = Math.round((h - H) * 60); return M ? `${H}h${String(M).padStart(2, '0')}` : `${H}h`; };
          const bn = analysis?.personalBottleneck;
          const sleepBase = (() => {
            const xs = (sortedCheckins || [])
              .filter((c) => c.date !== today && Number(c?.sleep_hours) > 0)
              .map((c) => Number(c.sleep_hours)).slice(0, 14);
            return xs.length >= 3 ? xs.reduce((a, v) => a + v, 0) / xs.length : null;
          })();
          const lastSleep = Number(enrichedCheckin.sleep_hours) > 0 ? Number(enrichedCheckin.sleep_hours) : null;
          const dMin = (lastSleep != null && sleepBase != null) ? Math.round((lastSleep - sleepBase) * 60) : null;

          let lever;
          if (bn?.hasSignal && bn.bottleneck) {
            const b = bn.bottleneck;
            const isSleepH = b.key === 'sleep_hours' && lastSleep != null && sleepBase != null;
            lever = isSleepH ? (
              <>
                <b className="text-amber-300">Validado:</b> seu <b>{b.label.toLowerCase()}</b> acompanha seu HRV do dia seguinte. Ontem {fmtH(lastSleep)}, {dMin < 0 ? `${Math.abs(dMin)}min abaixo` : 'no'} do seu normal (~{fmtH(sleepBase)}). Amanhã, mire seu normal.
              </>
            ) : (
              <>
                <b className="text-amber-300">Validado:</b> noites com mais <b>{b.label.toLowerCase()}</b> vêm com HRV {b.direction === 'positive' ? 'melhor' : 'pior'} no dia seguinte. {b.direction === 'positive' ? 'Quanto mais, melhor seu amanhã.' : 'Quanto menos, melhor seu amanhã.'}
              </>
            );
          } else if (lastSleep != null && sleepBase != null && dMin < -20) {
            lever = <>Sem gargalo provado hoje. O desvio do dia foi o sono: <b>{fmtH(lastSleep)}</b>, {Math.abs(dMin)}min abaixo do seu normal (~{fmtH(sleepBase)}). Vale mirar seu normal amanhã.</>;
          } else if (lastSleep != null && sleepBase != null) {
            lever = <>Sem gargalo provado, e seus controláveis estão no seu normal. Nada pra ajustar — siga assim.</>;
          } else {
            lever = <>Sem gargalo provado hoje. Seus sinais estão dentro do seu normal.</>;
          }

          return (
            <div className="rounded-xl border border-border/40 bg-secondary/40 px-3 py-3 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Leitura de hoje</p>

              <p className="text-sm leading-snug">
                <span className={toneClass}>{bodyClause}</span>, {autoClause} — {tail}
              </p>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Quanto dá pra puxar
                  </span>
                  {cap && CAPACITY_PT[cap] ? (
                    <span className="text-[11px] text-muted-foreground">
                      sobra <b>{CAPACITY_PT[cap].toLowerCase()}</b>
                    </span>
                  ) : null}
                </div>

                {/* barra absoluta 0–21; a meta entra como MARCADOR rotulado, não como largura */}
                <div className="relative pt-3.5 mb-1">
                  <span
                    className="absolute top-0 -translate-x-1/2 text-[9px] font-bold tracking-wider text-white/80 whitespace-nowrap"
                    style={{ left: `${targetStrainPct}%` }}
                  >
                    META {strainTarget}
                  </span>
                  <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-[width]',
                        overTarget ? 'bg-orange-400' : 'bg-emerald-400'
                      )}
                      style={{ width: `${currentStrainPct}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-[2px] -translate-x-1/2 bg-white/75"
                      style={{ left: `${targetStrainPct}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted-foreground/70">0</span>
                  <span className="text-[10px] text-muted-foreground/70">21</span>
                </div>

                <p className="text-[12px] text-muted-foreground leading-snug">
                  Você está em <b>{cappedStrain}</b>. Bom puxar até <b>~{strainTarget}</b> ({(targetZoneLabel || '').toLowerCase()}); acima começa a cavar a recuperação de amanhã.
                </p>
              </div>


              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90 mb-0.5">↗ Alavanca pra amanhã</p>
                <p className="text-[12px] text-amber-100/90 leading-snug">{lever}</p>
              </div>

              {si != null && (
                <CollapsibleHint>
                  Baevsky {si}/100 · {AUTONOMIC_PT[autoKey] || 'modo estável'}{cap && CAPACITY_PT[cap] ? ` · capacidade ${CAPACITY_PT[cap].toLowerCase()}` : ''}
                </CollapsibleHint>
              )}
            </div>
          );
        })()}

        {capacityContradictionNote && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {capacityContradictionNote}
          </p>
        )}
      </div>

      {phaseCfg.showCta ? (
        <button
          onClick={() => setShowAddModal(true)}
          className={cn(
            'w-full flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold text-sm transition-all',
            phaseCfg.ctaClass
          )}
        >
          <CtaIcon className="w-4 h-4" />
          {phaseCfg.ctaLabel}
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

const prefs = user?.preferences || {};
const missingSettings = [];
if (!prefs.birth_year) missingSettings.push('ano de nascimento');
if (!prefs.sex) missingSettings.push('sexo');
if (!prefs.height_cm) missingSettings.push('altura');
const settingsBanner = missingSettings.length > 0 ? (
  <Link
    to="/settings"
    className="block rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 hover:bg-amber-500/15 transition-all"
  >
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
        <Settings className="w-4 h-4 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-200">Complete suas configurações</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
          Falta informar {missingSettings.join(', ')}. Necessário para idade de condicionamento, VO₂max e leituras honestas — toque para ajustar.
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-amber-400/70 shrink-0 mt-1" />
    </div>
  </Link>
) : null;

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
      <div className="space-y-4 max-w-2xl mx-auto pt-2">
        {settingsBanner}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-[60vh] text-center px-6"
      >
        <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
          <Zap className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-black mb-2">Sem check-in hoje</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Faça seu check-in para calcular seu recovery e decidir melhor o treino do dia.
        </p>
        <Link
          to="/checkin"
          className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-2xl font-semibold hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" /> Fazer check-in
        </Link>
      </motion.div>
      </div>
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
      {settingsBanner}
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

      {bannerCfg.bannerText && (
        <motion.div
          key={advisoryPhase + (userRest ? '-rest' : '-adv')}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('rounded-2xl border px-4 py-3 text-xs font-medium', bannerCfg.bannerClass)}
        >
          {bannerCfg.bannerText}
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

      <LongevityOnboardingCard />
      
      {orderedPrimaryCards.map((desc) => renderCard(desc))}

           {/* (Removido) TomorrowHookCard: previsão templated + fadiga-retardada causal +
          gancho "volte amanhã". A meta de sono real fica no SleepForecastCard. */}


      {(analysis?.whyScore?.length > 0 || analysis?.narrative) && (
        <Link
          to="/insights"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
        >
          Quer entender o que está guiando seu recovery?
          <span className="text-primary font-medium">→ Ver padrões</span>
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

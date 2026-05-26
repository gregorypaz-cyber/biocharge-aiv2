import { useState, useMemo, useEffect, useRef } from 'react';
import { useDayContext } from '@/lib/dayContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Check, Calendar, TrendingUp } from 'lucide-react';
import { useMotionSafe } from '@/hooks/use-motion-safe';
import WorkoutLoggedState from './WorkoutLoggedState';
import RecoveryProtocolCard from './RecoveryProtocolCard';
import { prescribeWorkout } from '../../lib/workout-prescription.js';
import {
  getUserIdOrDeviceId,
  upsertDailySelection,
  upsertDailyCompletion,
  upsertDailyCommitment,
  getFeedbackByDate,
  getRecentFeedback,
} from '../../services/workoutFeedbackService.js';
import WorkoutCompletionToast, { buildProspectiveMessage } from './WorkoutCompletionToast.jsx';
import AcwrAlert from './AcwrAlert.jsx';
import YesterdayContextBanner from './YesterdayContextBanner.jsx';
import { applyYesterdayLookback } from '../../lib/yesterday-lookback.js';

const INTENSITY_MAP = {
  Recovered: {
    label: 'Alta Intensidade',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
    emoji: '🏋️',
    detail: 'Seu corpo está pronto para desafio alto.',
    tips: ['Bom momento para estímulo forte', 'Garanta hidratação e nutrição adequadas', 'Respeite a técnica'],
  },
  Balanced: {
    label: 'Intensidade Moderada',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.25)',
    emoji: '🚴',
    detail: 'Seu sistema está estável para um treino moderado.',
    tips: ['RPE entre 6–7 é um bom alvo', 'Evite empilhar fadiga sem necessidade', 'Monitore como se sente no aquecimento'],
  },
  Fatigued: {
    label: 'Leve ou Recuperação Ativa',
    color: '#eab308',
    bg: 'rgba(234,179,8,0.08)',
    border: 'rgba(234,179,8,0.25)',
    emoji: '🧘',
    detail: 'Há sinais de fadiga. Reduza a ambição do treino hoje.',
    tips: ['Evite cargas altas', 'Mobilidade e caminhada leve fazem mais sentido', 'Priorize o sono hoje à noite'],
  },
  Activated: {
    label: 'Alta Intensidade',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
    emoji: '🏋️',
    detail: 'Você respondeu bem à carga recente.',
    tips: ['Bom momento para intensidade alta', 'Aquecimento bem feito', 'Nutrição e hidratação em dia'],
  },
  Loaded: {
    label: 'Carga Moderada',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
    emoji: '⚖️',
    detail: 'Há carga acumulada. Melhor sustentar do que forçar.',
    tips: ['Moderado no máximo', 'Observe fadiga no aquecimento', 'Sono importa ainda mais hoje'],
  },
  Sympathetic_Load: {
    label: 'Sistema Nervoso Ativado',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.25)',
    emoji: '⚡',
    detail: 'Seu sistema está sobrecarregado. Preserve.',
    tips: ['Atividade leve apenas', 'Respiração profunda ajuda', 'Evite estressores extras'],
  },
  'High Stress': {
    label: 'Leve — foque em recuperar',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.25)',
    emoji: '🌿',
    detail: 'Stress elevado. Menos é mais hoje.',
    tips: ['Baixo impacto apenas', 'Respiração diafragmática pré-treino', 'Meditação pode ajudar'],
  },
  Overreached: {
    label: 'Descanso ativo',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
    emoji: '🛌',
    detail: 'Há sobrecarga fisiológica. Recuperação é a melhor decisão.',
    tips: ['Evite intensidade alta', 'Movimento leve, se quiser se mover', 'Sono, alimentação e hidratação em foco'],
  },
  default: {
    label: 'Moderado',
    color: '#eab308',
    bg: 'rgba(234,179,8,0.08)',
    border: 'rgba(234,179,8,0.25)',
    emoji: '🚶',
    detail: 'Comece leve e ajuste conforme o aquecimento.',
    tips: ['Monitore como se sente', 'Use o aquecimento como teste', 'Hidrate-se bem'],
  },
};

const STRAIN_ZONE = (v) =>
  v <= 9 ? '🟢 Leve' : v <= 13 ? '🟡 Moderado' : v <= 17 ? '🟠 Alto' : '🔴 Máximo';

const CONF_STYLE = {
  Alta:  { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  Média: { bg: 'bg-yellow-500/15',  text: 'text-yellow-400'  },
  Baixa: { bg: 'bg-zinc-500/15',    text: 'text-zinc-400'    },
};

const MODALITY_EMOJI = {
  Corrida: '🏃',
  Força: '🏋️',
  Mobilidade: '🧘',
  Recuperação: '🛌',
  Misto: '🔄',
};

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const SLOT_LABELS = { now: 'Agora', morning: 'Manhã', afternoon: 'Tarde', evening: 'Noite' };
function humanizeSlot(slot) {
  return SLOT_LABELS[slot] || slot;
}

const SLOT_COPY = {
  high: 'Janela boa. Execute com controle.',
  medium: 'Consistência hoje. Progresso amanhã.',
  low: 'Melhor preservar hoje para render mais depois.',
};

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getSleepDebtHours(analysis) {
  return analysis?.sleepDebt?.debt ?? analysis?.sleepDebtHours ?? 0;
}

function YesterdayImpact({ analysis }) {
  const checkins = analysis?.checkins || [];
  const today = checkins[0];
  const yesterday = checkins[1];
  if (!today || !yesterday) return null;

  const parts = [];
  if (today.recovery_score != null && yesterday.recovery_score != null) {
    const d = Math.round(today.recovery_score - yesterday.recovery_score);
    parts.push(`Recovery ${d >= 0 ? '+' : ''}${d}`);
  }
  if (today.hrv != null && yesterday.hrv != null && yesterday.hrv > 0) {
    const d = Math.round(((today.hrv - yesterday.hrv) / yesterday.hrv) * 100);
    parts.push(`HRV ${d >= 0 ? '+' : ''}${d}%`);
  }
  if (today.sleep_hours != null && yesterday.sleep_hours != null) {
    const d = Math.round((today.sleep_hours - yesterday.sleep_hours) * 10) / 10;
    parts.push(`Sono ${d >= 0 ? '+' : ''}${d}h`);
  }
  if (!parts.length) return null;

  return (
    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-primary/6 border border-primary/15">
      <TrendingUp className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
      <p className="text-xs text-foreground/80">
        <span className="font-semibold text-primary">Impacto de ontem:</span>{' '}
        {parts.join(' · ')}
      </p>
    </div>
  );
}

function CompletionForm({ optKey, onSave, onCancel, saving }) {
  const [rpe, setRpe] = useState(6);
  const [notes, setNotes] = useState('');

  return (
    <div className="rounded-xl bg-secondary/50 border border-border/40 p-3 space-y-3">
      <p className="text-xs font-semibold">Como foi o treino {optKey}?</p>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">RPE percebido</span>
          <span className="text-xs font-bold text-primary">{rpe}/10</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={rpe}
          onChange={(e) => setRpe(Number(e.target.value))}
          className="w-full accent-primary h-1.5"
          aria-label="RPE percebido"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
          <span>Fácil</span>
          <span>Máximo</span>
        </div>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value.slice(0, 140))}
        placeholder="Notas opcionais... (máx 140)"
        rows={2}
        className="w-full text-xs bg-background/50 border border-border/40 rounded-lg p-2 resize-none text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
        aria-label="Notas do treino"
      />

      <div className="flex gap-2">
        <button
          disabled={saving}
          onClick={() => onSave(rpe, notes)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 transition-all"
        >
          <Check className="w-3 h-3" /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs text-muted-foreground hover:text-foreground transition-all"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function DailyInsightBlock({ presc, analysis, onMarkDone, recommendedKey }) {
  if (!presc || !analysis) return null;

  try {
    const recovery = analysis.today?.recovery_score ?? analysis.today?.readiness_score ?? null;
    const hrvDelta = analysis.baselineInsights?.find((i) => i.label === 'HRV')?.delta ?? null;
    const sleepDebt = getSleepDebtHours(analysis);
    const ratio = analysis.trainingLoad?.ratio ?? null;
    const risk = analysis.trainingLoad?.risk ?? null;
    const state = analysis.physioState?.state ?? null;

    const hasLoad = risk && risk !== 'insufficient_data';
    const hasHRV = hrvDelta != null;
    const hasSleep = sleepDebt != null && sleepDebt > 0;
    const conf = hasLoad && (hasHRV || hasSleep) ? 'Alta' : hasLoad || hasSleep ? 'Média' : 'Baixa';
    const confStyle = CONF_STYLE[conf] || CONF_STYLE.Baixa;

    const isLowRecovery = recovery != null && recovery < 55;
    const headline = recommendedKey && !isLowRecovery
      ? `Hoje o plano principal é ${recommendedKey}.`
      : 'Hoje o foco é preservar para recuperar melhor.';

    const bullets = [];
    if (recovery != null) bullets.push(`Recovery: ${recovery} pts`);
    if (hrvDelta != null) bullets.push(`HRV delta: ${hrvDelta >= 0 ? '+' : ''}${hrvDelta}%`);
    if (sleepDebt != null && sleepDebt > 0) bullets.push(`Dívida de sono: ${sleepDebt}h`);
    if (ratio != null && ratio > 0) bullets.push(`ACWR: ${ratio.toFixed(2)}`);
    if (!bullets.length) return null;

    const microAction = (() => {
      if (state === 'Overreached' || risk === 'high') return '1 min: respire fundo e reduza o estresse antes de decidir treinar.';
      if (state === 'Fatigued' || isLowRecovery) return '1 min: hidrate-se agora e reavalie a intensidade no aquecimento.';
      if (recovery != null && recovery >= 80) return '1 min: faça um aquecimento progressivo e confirme se o corpo responde bem.';
      return '1 min: defina a intenção do treino antes de começar.';
    })();

    const counterfactual = (() => {
      if (ratio != null && ratio > 1.3) return 'Se você reduzir a dose hoje, a chance de recuperar melhor nas próximas 24–48h aumenta.';
      if (recovery != null && recovery >= 80) return 'Se você treinar bem e dormir o suficiente, a tendência de manter boa prontidão amanhã melhora.';
      return null;
    })();

    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">
            Insight do dia
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${confStyle.bg} ${confStyle.text}`}>
            {conf}
          </span>
        </div>

        <p className="text-sm font-bold leading-snug">{headline}</p>

        <ul className="space-y-0.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-1 h-1 rounded-full bg-primary/50 shrink-0" />
              {b}
            </li>
          ))}
        </ul>

        {counterfactual && (
          <p className="text-[11px] text-foreground/60 italic border-l-2 border-primary/30 pl-2">
            {counterfactual}
          </p>
        )}

        <p className="text-[11px] text-foreground/70">⚡ {microAction}</p>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/20">
          <p className="text-[10px] text-muted-foreground/70">
            Depois do treino, marque o RPE para melhorar o modelo de amanhã.
          </p>
          <button
            onClick={onMarkDone}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold whitespace-nowrap hover:bg-primary/90 transition-all"
          >
            <Check className="w-3 h-3" /> Marcar feito
          </button>
        </div>
      </div>
    );
  } catch (e) {
    console.warn('DailyInsightBlock render error', e);
    return null;
  }
}

function resolveRecommendedKey(checkin) {
  const state = checkin?.current_body_state;
  const recoveryDemand = checkin?.recovery_demand ?? 0;

  if (state === 'Fatigued' || state === 'Overreached' || recoveryDemand >= 70) return 'C';

  const score = checkin?.biocharge_morning ?? checkin?.recovery_score ?? checkin?.readiness_score ?? 0;
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  return 'C';
}

function applyAcwrModifier(baseRec, acwr, hrvDeltaPositive) {
  if (acwr == null) return { ...baseRec, acwrContext: null };

  const LEVELS = [
    { text: 'Recuperação ou movimento leve', color: '#ef4444' },
    { text: 'Treino leve — preserve para amanhã', color: '#eab308' },
    { text: 'Treino moderado — melhor dose de hoje', color: '#38bdf8' },
    { text: 'Treino forte — janela favorável', color: '#22c55e' },
  ];

  function baseIndex(text) {
    if (/descanso|recuperação/i.test(text)) return 0;
    if (/leve/i.test(text)) return 1;
    if (/moderado/i.test(text)) return 2;
    if (/forte|janela/i.test(text)) return 3;
    return 2;
  }

  let idx = baseIndex(baseRec.text);
  let acwrContext = null;

  if (acwr > 1.5) {
    return {
      text: 'Recuperação ou movimento leve',
      color: '#ef4444',
      acwrContext: {
        text: `ACWR ${acwr.toFixed(2)} — muito acima do ideal. Hoje faz mais sentido proteger do que insistir em carga.`,
        color: '#ef4444',
      },
    };
  } else if (acwr >= 1.3) {
    idx = Math.max(0, idx - 1);
    acwrContext = {
      text: `ACWR ${acwr.toFixed(2)} — acima do ideal. Rebaixe a intensidade hoje.`,
      color: '#f59e0b',
    };
  } else if (acwr <= 0.8 && hrvDeltaPositive) {
    idx = Math.min(LEVELS.length - 1, idx + 1);
    acwrContext = {
      text: `ACWR ${acwr.toFixed(2)} — abaixo da zona ideal. Seu corpo pode absorver um pouco mais de carga.`,
      color: '#22c55e',
    };
  } else if (acwr <= 0.8) {
    acwrContext = {
      text: `ACWR ${acwr.toFixed(2)} — abaixo da zona ideal. Há margem para progredir com controle.`,
      color: '#22c55e',
    };
  }

  const level = LEVELS[idx];
  return { text: level.text, color: level.color, acwrContext };
}

function resolveReadinessRecommendation(checkin, analysis) {
  const state = checkin?.current_body_state;
  let baseRec;

  if (state === 'Fatigued' || state === 'Overreached') {
    baseRec = { text: 'Recuperação ou movimento leve', color: '#ef4444' };
  } else {
    const score = checkin?.biocharge_morning ?? checkin?.readiness_score ?? checkin?.recovery_score ?? 0;
    const soreness = checkin?.muscle_soreness ?? checkin?.muscle_soreness_level ?? 99;
    const fatigue = checkin?.fatigue ?? checkin?.fatigue_score ?? 99;

    if (score >= 85 && soreness <= 1 && fatigue <= 20) {
      baseRec = { text: 'Treino forte — janela favorável', color: '#22c55e' };
    } else if (score >= 70) {
      baseRec = { text: 'Treino moderado — melhor dose de hoje', color: '#38bdf8' };
    } else if (score >= 60) {
      baseRec = { text: 'Treino leve — preserve para amanhã', color: '#eab308' };
    } else {
      baseRec = { text: 'Recuperação ou movimento leve', color: '#ef4444' };
    }
  }

  const acwr = analysis?.trainingLoad?.ratio ?? null;
  const hrvDelta = analysis?.baselineInsights?.find((i) => i.label === 'HRV')?.delta ?? null;
  const hrvDeltaPositive = hrvDelta != null && hrvDelta > 0;

  return applyAcwrModifier(baseRec, acwr, hrvDeltaPositive);
}

function predictOptionImpact(option, analysis, intent) {
  if (!analysis) return null;

  const ratio = analysis.trainingLoad?.ratio ?? 1;

  if (intent === 'recovery') return 'up';
  if (ratio > 1.4) return 'down';
  if (option?.duration_min > 40) return 'down';
  if (option?.duration_min < 25) return 'up';
  return 'stable';
}

function predictTomorrow({ analysis, intent }) {
  if (!analysis) return null;

  const ratio = analysis.trainingLoad?.ratio ?? 1;
  const sleepDebt = getSleepDebtHours(analysis);
  const state = analysis.physioState?.state;

  if (intent === 'recovery') {
    return {
      trend: 'up',
      message: 'Se você realmente recuperar hoje, a chance de melhorar amanhã aumenta.',
    };
  }

  if (ratio > 1.4) {
    return {
      trend: 'down',
      message: 'Se você insistir em carga alta hoje, a recuperação de amanhã tende a cair.',
    };
  }

  if (ratio < 0.9 && sleepDebt < 2) {
    return {
      trend: 'up',
      message: 'Se mantiver a dose controlada e dormir bem hoje, a recuperação de amanhã tende a melhorar.',
    };
  }

  if (state === 'Fatigued') {
    return {
      trend: 'down',
      message: 'Os sinais atuais sugerem recuperação mais lenta se você exagerar hoje.',
    };
  }

  return {
    trend: 'stable',
    message: 'Se mantiver a dose planejada hoje, a tendência é de manutenção do estado atual amanhã.',
  };
}

function getHeaderFromVerdict(dailyVerdict, fallbackCfg) {
  if (!dailyVerdict) {
    return {
      title: fallbackCfg.label,
      emoji: fallbackCfg.emoji,
      subtitle: fallbackCfg.detail,
      color: fallbackCfg.color,
    };
  }

  switch (dailyVerdict.mode) {
    case 'train_high':
      return {
        title: 'Treino forte',
        emoji: '🔥',
        subtitle: dailyVerdict.subheadline,
        color: '#22c55e',
      };
    case 'train_moderate':
      return {
        title: 'Treino moderado',
        emoji: '⚡',
        subtitle: dailyVerdict.subheadline,
        color: '#38bdf8',
      };
    case 'train_light':
      return {
        title: 'Treino leve',
        emoji: '🌿',
        subtitle: dailyVerdict.subheadline,
        color: '#eab308',
      };
    case 'recover':
    default:
      return {
        title: 'Recuperação',
        emoji: '🌙',
        subtitle: dailyVerdict.subheadline,
        color: '#60a5fa',
      };
  }
}

function PrescriptionBlock({
  presc,
  analysis,
  intent,
  onScheduleOption,
  onCompleteOption,
  onSchedule,
  checkin,
  strainTarget,
  currentStrain,
  lookbackRecommendKey,
}) {
  const baseRecommendedKey = presc?.recommendedKey ?? resolveRecommendedKey(checkin);
  const recommendedKey = lookbackRecommendKey ?? baseRecommendedKey;

  const [selected, setSelected] = useState(recommendedKey);
  const [savingSelect, setSavingSelect] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [savingComplete, setSavingComplete] = useState(false);
  const [savedToday, setSavedToday] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [yesterdayFeedback, setYesterdayFeedback] = useState(null);
  const [adaptHints, setAdaptHints] = useState([]);
  const [showOtherOptions, setShowOtherOptions] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState(null);
  const debounceRef = useRef(null);

  const [showCommitmentPicker, setShowCommitmentPicker] = useState(false);
  const [commitmentSlot, setCommitmentSlot] = useState(null);
  const [commitmentStatus, setCommitmentStatus] = useState(null);
  const [commitmentMsg, setCommitmentMsg] = useState(null);
  const [commitmentSaving, setCommitmentSaving] = useState(false);

  useEffect(() => {
    setSelected(recommendedKey);
  }, [recommendedKey]);

  const opt = presc.options.find((o) => o.key === selected) || presc.options[0];
  const conf = presc.summary?.confidence || 'Média';
  const confStyle = CONF_STYLE[conf] || CONF_STYLE.Baixa;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = await getUserIdOrDeviceId();
      const [yFb, recent] = await Promise.all([
        getFeedbackByDate(userId, yesterdayKey()),
        getRecentFeedback(userId, 14),
      ]);
      if (cancelled) return;

      setYesterdayFeedback(yFb);

      const hints = [];
      if (recent.length >= 3) {
        const cCount = recent.filter((r) => r.selected_option === 'C').length;
        if (cCount / recent.length > 0.5) {
          hints.push('Seu histórico recente favorece sessões curtas ou conservadoras.');
        }

        const completed = recent.filter((r) => r.completed && r.perceived_rpe != null);
        if (completed.length >= 3) {
          const avgRpe = completed.reduce((s, r) => s + r.perceived_rpe, 0) / completed.length;
          if (avgRpe > 8) {
            hints.push('RPE médio recente acima de 8 — vale reduzir 1 nível se o corpo não responder bem no aquecimento.');
          }
        }
      }

      setAdaptHints(hints);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistSelection = async (key, option) => {
    if (debounceRef.current) return;
    setSavingSelect(true);
    setDbError(false);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
    }, 800);

    const userId = await getUserIdOrDeviceId();
    const evidence = analysis
      ? {
          recovery: analysis.today?.recovery_score ?? null,
          sleepDebtHours: getSleepDebtHours(analysis),
          trainingRatio: analysis.trainingLoad?.ratio ?? null,
          trainingRisk: analysis.trainingLoad?.risk ?? null,
          fatigue: analysis.today?.fatigue_score ?? null,
          hrvDeltaPct: analysis.baselineInsights?.find((i) => i.label === 'HRV')?.delta ?? null,
        }
      : null;

    const result = await upsertDailySelection(userId, todayKey(), {
      selected_option: key,
      planned_duration_min: option.duration_min ?? null,
      planned_intensity_type: option.intensity?.type ?? null,
      planned_intensity_min: option.intensity?.range?.[0] ?? null,
      planned_intensity_max: option.intensity?.range?.[1] ?? null,
      evidence_snapshot: evidence,
    });

    if (!result) setDbError(true);
    setSavingSelect(false);
    setShowCommitmentPicker(true);
    setCommitmentMsg(null);
  };

  const handleSelectOption = (key) => {
    setSelected(key);
    const selectedOpt = presc.options.find((o) => o.key === key);
    if (selectedOpt) persistSelection(key, selectedOpt);
  };

  const handleCommitSlot = async (slot) => {
    if (!['now', 'morning', 'afternoon', 'evening'].includes(slot)) return;
    setCommitmentSaving(true);

    try {
      const userId = await getUserIdOrDeviceId();
      await upsertDailyCommitment(userId, todayKey(), {
        commitment_slot: slot,
        commitment_status: 'committed',
        committed_at: new Date().toISOString(),
      });
      setCommitmentSlot(slot);
      setCommitmentStatus('committed');
      setCommitmentMsg(`Compromisso marcado: ${humanizeSlot(slot)}. Agora execute.`);
    } catch (err) {
      console.warn('WorkoutSuggestionCard: handleCommitSlot error', err);
      setCommitmentMsg('Não foi possível salvar agora — continue mesmo assim.');
    }

    setCommitmentSaving(false);
    setShowCommitmentPicker(false);
  };

  const handleCancelCommitment = async () => {
    try {
      const userId = await getUserIdOrDeviceId();
      await upsertDailyCommitment(userId, todayKey(), {
        commitment_slot: commitmentSlot,
        commitment_status: 'cancelled',
      });
    } catch (err) {
      console.warn('WorkoutSuggestionCard: handleCancelCommitment error', err);
    }

    setCommitmentStatus('cancelled');
    setCommitmentMsg('Cancelado. Replaneje quando estiver pronto.');
  };

  const handleSaveCompletion = async (rpe, notes) => {
    setSavingComplete(true);
    setDbError(false);

    const userId = await getUserIdOrDeviceId();
    const result = await upsertDailyCompletion(userId, todayKey(), {
      completed: true,
      perceived_rpe: rpe,
      notes: notes || null,
    });

    if (!result) {
      setDbError(true);
    } else {
      setSavedToday(true);
      if (commitmentSlot) setCommitmentStatus('completed');
      setCommitmentMsg('Executado. Bom trabalho. Volte amanhã para ver o impacto.');

      const msg = buildProspectiveMessage({
        analysis,
        checkin,
        recentFeedback: yesterdayFeedback ? [yesterdayFeedback] : [],
        strainTarget,
        currentStrain,
      });
      setCelebrationMsg(msg);
    }

    setSavingComplete(false);
    setShowCompletion(false);
    if (onCompleteOption) onCompleteOption(opt);
  };

  const handleSchedule = () => {
    if (onScheduleOption) onScheduleOption(opt);
    else if (onSchedule) onSchedule(presc);
  };

  return (
    <div className="space-y-4">
      <DailyInsightBlock
        presc={presc}
        analysis={analysis}
        recommendedKey={recommendedKey}
        onMarkDone={() => setShowCompletion(true)}
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Plano de treino de hoje
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${confStyle.bg} ${confStyle.text}`}>
          {conf}
        </span>
      </div>

      {yesterdayFeedback?.completed && <YesterdayImpact analysis={analysis} />}

      {adaptHints.map((hint, i) => (
        <p key={i} className="text-[10px] text-yellow-400/80 italic px-1">
          💡 {hint}
        </p>
      ))}

      <AnimatePresence>
        {showCommitmentPicker && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}

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

function DailyInsightBlock({ presc, analysis, recommendedKey }) {
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

    const headline =
      recommendedKey && !isLowRecovery
        ? `Opção ${recommendedKey} é a melhor dose para hoje.`
        : 'Hoje o foco é preservar e recuperar melhor.';

    const positives = [];
    const cautions = [];

    if (recovery != null) {
      if (recovery >= 70) positives.push(`Recovery ${recovery}`);
      else cautions.push(`Recovery ${recovery}`);
    }

    if (hrvDelta != null) {
      if (hrvDelta >= 0) positives.push(`HRV ${hrvDelta >= 0 ? '+' : ''}${hrvDelta}%`);
      else cautions.push(`HRV ${hrvDelta}%`);
    }

    if (ratio != null && ratio > 0) {
      if (ratio <= 1.25) positives.push(`ACWR ${ratio.toFixed(2)} seguro`);
      else cautions.push(`ACWR ${ratio.toFixed(2)} elevado`);
    }

    if (sleepDebt != null && sleepDebt > 0) {
      cautions.push(`Dívida de sono ${sleepDebt}h`);
    }

    if (state === 'Fatigued') cautions.push('Sinais de fadiga');
    if (state === 'Overreached') cautions.push('Sobrecarga fisiológica');
    if (state === 'Recovered') positives.push('Boa recuperação disponível');

    if (!positives.length && !cautions.length) return null;

    const microAction = (() => {
      if (state === 'Overreached' || risk === 'high') {
        return 'Antes de treinar: reduza a ambição e proteja a recuperação.';
      }

      if (state === 'Fatigued' || isLowRecovery) {
        return 'Antes de treinar: hidrate-se e reavalie a intensidade no aquecimento.';
      }

      if (recovery != null && recovery >= 80) {
        return 'Antes de treinar: aqueça progressivamente e confirme se o corpo responde bem.';
      }

      return 'Antes de treinar: defina a intenção do treino e não transforme controle em exagero.';
    })();

    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">
            Decisão do treino
          </span>

          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${confStyle.bg} ${confStyle.text}`}>
            {conf}
          </span>
        </div>

        <p className="text-sm font-bold leading-snug">
          {headline}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {positives.length > 0 && (
            <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/15 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                A favor
              </p>

              <ul className="space-y-0.5">
                {positives.slice(0, 3).map((item, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground">
                    ↑ {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cautions.length > 0 && (
            <div className="rounded-lg bg-yellow-500/8 border border-yellow-500/15 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-400 mb-1">
                Pede controle
              </p>

              <ul className="space-y-0.5">
                {cautions.slice(0, 3).map((item, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground">
                    ↓ {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <p className="text-[11px] text-foreground/75 border-t border-border/20 pt-2">
          ⚡ {microAction}
        </p>
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

  const score =
    checkin?.readiness_score ??
    checkin?.recovery_score ??
    checkin?.morning_recovery_score ??
    checkin?.biocharge_morning ??
    0;
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  return 'C';
}

const OPTION_RANK = {
  A: 3,
  B: 2,
  C: 1,
};

function hasPrescriptionOption(presc, key) {
  return Boolean(presc?.options?.some((option) => option.key === key));
}

function getOptionRank(key) {
  return OPTION_RANK[key] ?? 0;
}

function pickExistingOptionKey(presc, preferredKeys, fallbackKey) {
  for (const key of preferredKeys) {
    if (hasPrescriptionOption(presc, key)) return key;
  }

  if (fallbackKey && hasPrescriptionOption(presc, fallbackKey)) {
    return fallbackKey;
  }

  return presc?.options?.[0]?.key ?? 'A';
}

function resolveRecommendedKeyFromVerdict(dailyVerdict, presc, checkin) {
  const fallbackKey = presc?.recommendedKey ?? resolveRecommendedKey(checkin);

  if (!dailyVerdict?.mode) {
    return pickExistingOptionKey(presc, [fallbackKey], fallbackKey);
  }

  switch (dailyVerdict.mode) {
    case 'train_high':
      return pickExistingOptionKey(presc, ['A', 'B', 'C'], fallbackKey);

    case 'train_moderate':
      return pickExistingOptionKey(presc, ['B', 'C', 'A'], fallbackKey);

    case 'train_light':
      return pickExistingOptionKey(presc, ['C', 'B', 'A'], fallbackKey);

    case 'recover':
      return pickExistingOptionKey(presc, ['C', 'B', 'A'], fallbackKey);

    default:
      return pickExistingOptionKey(presc, [fallbackKey], fallbackKey);
  }
}

function mergeConservativeLookbackKey(baseKey, lookbackKey, presc) {
  if (!lookbackKey || !hasPrescriptionOption(presc, lookbackKey)) {
    return baseKey;
  }

  const baseRank = getOptionRank(baseKey);
  const lookbackRank = getOptionRank(lookbackKey);

  /**
   * Só permite o lookback rebaixar ou manter a dose.
   * Nunca permite o lookback deixar o plano mais agressivo que a decisão do dia.
   */
  if (baseRank > 0 && lookbackRank > 0 && lookbackRank <= baseRank) {
    return lookbackKey;
  }

  return baseKey;
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
    const score =
      checkin?.readiness_score ??
      checkin?.recovery_score ??
      checkin?.morning_recovery_score ??
      checkin?.biocharge_morning ??
      0;

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
      message: 'Com a carga recente elevada, uma dose alta hoje pode pesar na recuperação de amanhã.',
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
  lookbackRecommendKey, dailyVerdict,
}) {
  const baseRecommendedKey = resolveRecommendedKeyFromVerdict(
  dailyVerdict,
  presc,
  checkin
);

const recommendedKey = mergeConservativeLookbackKey(
  baseRecommendedKey,
  lookbackRecommendKey,
  presc
);

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
      setCommitmentMsg(`Compromisso marcado: ${humanizeSlot(slot)}. Agora é só executar.`);
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

      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Plano recomendado de hoje
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
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 space-y-3"
          >
            <p className="text-xs font-bold">Compromisso rápido: quando você vai executar?</p>
            <p className="text-[10px] text-muted-foreground -mt-1">
              {(() => {
                const r = analysis?.today?.recovery_score ?? analysis?.today?.readiness_score ?? 50;
                return r >= 70 ? SLOT_COPY.high : r >= 50 ? SLOT_COPY.medium : SLOT_COPY.low;
              })()}
            </p>

            <div className="grid grid-cols-4 gap-1.5">
              {[['now', 'Agora'], ['morning', 'Manhã'], ['afternoon', 'Tarde'], ['evening', 'Noite']].map(([slot, label]) => (
                <button
                  key={slot}
                  disabled={commitmentSaving}
                  onClick={() => handleCommitSlot(slot)}
                  className="px-2 py-2 rounded-lg bg-secondary border border-border text-[11px] font-semibold hover:bg-primary/10 hover:border-primary/40 disabled:opacity-50 transition-all"
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              disabled={commitmentSaving}
              onClick={() => setShowCommitmentPicker(false)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Pular
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!showCommitmentPicker && commitmentStatus === 'committed' && commitmentSlot && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-secondary/60 border border-border/40">
          <span className="text-[11px] text-foreground/80">
            🎯 Compromisso: Opção {selected} · {humanizeSlot(commitmentSlot)}
          </span>
          <button
            onClick={handleCancelCommitment}
            className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {commitmentStatus === 'completed' && (
        <p className="text-xs font-semibold text-emerald-400">
          Executado ✅ Consistência +1
        </p>
      )}

      {commitmentMsg && commitmentStatus !== 'completed' && commitmentStatus !== 'committed' && (
        <p className="text-[10px] text-muted-foreground/80 italic">{commitmentMsg}</p>
      )}

      {(() => {
  const factors = [];

  if ((analysis?.trainingLoad?.ratio ?? 0) > 1.3) {
    factors.push('carga recente elevada');
  }

  if (getSleepDebtHours(analysis) > 2) {
    factors.push('déficit de sono acumulado');
  }

  if (analysis?.physioState?.state === 'Fatigued') {
    factors.push('sinais de fadiga');
  }

  if (analysis?.physioState?.state === 'Recovered') {
    factors.push('boa recuperação disponível');
  }

  return factors.length > 0 ? (
    <div className="rounded-xl bg-secondary/30 border border-border/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
        Fatores considerados
      </p>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {factors.join(' · ')}
      </p>
    </div>
  ) : null;
})()}

      <div className="space-y-2" role="radiogroup" aria-label="Opções de treino">
        {(() => {
          const recOpt = presc.options.find((o) => o.key === recommendedKey) || presc.options[0];
          const otherOpts = presc.options.filter((o) => o.key !== recOpt.key);

          const renderOption = (o, isRecommended) => {
            const isActive = o.key === selected;
            const impact = isRecommended ? null : predictOptionImpact(o, analysis, intent);

            return (
              <button
                key={o.key}
                role="radio"
                aria-checked={isActive}
                aria-label={`Opção ${o.key}: ${o.title}`}
                disabled={savingSelect}
                onClick={() => handleSelectOption(o.key)}
                className={`w-full rounded-xl p-3 text-left transition-all border disabled:opacity-60 ${
                  isRecommended
                    ? isActive
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-primary/40 bg-primary/5 hover:bg-primary/10'
                    : isActive
                    ? 'border-primary/50 bg-primary/8'
                    : 'border-border/50 bg-secondary/50 hover:bg-secondary'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-muted-foreground">{o.key}</span>
                    <span className="text-xs">{MODALITY_EMOJI[o.modality] || '🏃'}</span>
                    {isRecommended && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary uppercase tracking-wide">
                        melhor hoje
                      </span>
                    )}
                  </div>
                  {o.duration_min && (
                    <span className="text-[10px] text-muted-foreground shrink-0">{o.duration_min}min</span>
                  )}
                </div>

                <p className={`text-xs font-semibold leading-tight ${isActive || isRecommended ? 'text-primary' : 'text-foreground/80'}`}>
                  {o.title}
                </p>

                {impact && (
                  <div className={`text-xs mt-1 ${
                    impact === 'up' ? 'text-emerald-400' :
                    impact === 'down' ? 'text-yellow-400' :
                    'text-muted-foreground'
                  }`}>
                    {impact === 'up' && '⬆️ tende a proteger a recuperação'}
                    {impact === 'down' && '⚠️ pode pesar mais na recuperação'}
                    {impact === 'stable' && '➡️ tende a manter o estado atual'}
                  </div>
                )}
              </button>
            );
          };

          return (
            <>
              {renderOption(recOpt, true)}

              <button
                onClick={() => setShowOtherOptions((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1"
              >
                <span>{showOtherOptions ? '▾' : '▸'}</span>
                ajustar dose ({otherOpts.length})
              </button>

              <AnimatePresence>
                {showOtherOptions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden space-y-2"
                  >
                    {otherOpts.map((o) => renderOption(o, false))}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          );
        })()}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="rounded-xl bg-secondary/40 border border-border/40 p-3.5 space-y-2"
          aria-live="polite"
          aria-label={`Detalhes da opção ${selected}`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{opt.title}</p>
            {opt.intensity && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                {opt.intensity.type === 'strain' ? 'Strain' : 'RPE'} {opt.intensity.range[0]}–{opt.intensity.range[1]}
              </span>
            )}
          </div>

          {(opt.structure?.warmup || opt.structure?.main || opt.structure?.cooldown) && (
            <div className="space-y-1 text-xs text-muted-foreground">
              {opt.structure.warmup && (
                <p>🔥 <span className="font-medium text-foreground/70">Aquecimento:</span> {opt.structure.warmup}</p>
              )}
              {opt.structure.main && (
                <p>💪 <span className="font-medium text-foreground/70">Principal:</span> {opt.structure.main}</p>
              )}
              {opt.structure.cooldown && (
                <p>🧊 <span className="font-medium text-foreground/70">Volta à calma:</span> {opt.structure.cooldown}</p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground italic">{opt.rationale}</p>

          {opt.riskNote && (
            <p className="text-xs text-amber-400/90 flex items-center gap-1">
              <span>⚠️</span> {opt.riskNote}
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showCompletion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CompletionForm
              optKey={selected}
              saving={savingComplete}
              onSave={handleSaveCompletion}
              onCancel={() => setShowCompletion(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <WorkoutCompletionToast
        message={celebrationMsg}
        onClose={() => setCelebrationMsg(null)}
      />

      <div className="flex flex-wrap gap-2 items-center">
        {(onScheduleOption || onSchedule) && (
          <button
            onClick={handleSchedule}
            aria-label={`Agendar opção ${opt.key}: ${opt.title}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all"
          >
            <Calendar className="w-3.5 h-3.5" /> Agendar
          </button>
        )}

        {!savedToday && !showCompletion && (
          <button
            onClick={() => setShowCompletion(true)}
            aria-label={`Marcar opção ${opt.key} como feito`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary border border-border text-xs font-semibold hover:bg-secondary/80 transition-all"
          >
            <Check className="w-3.5 h-3.5" /> Registrar treino feito
          </button>
        )}

        {savedToday && (
          <span className="text-xs text-emerald-400 font-semibold">Salvo ✅</span>
        )}
      </div>

      {dbError && (
        <p className="text-[10px] text-amber-400/80">
          Não foi possível salvar agora. Tente novamente.
        </p>
      )}

      <p className="text-[10px] text-muted-foreground/60 leading-relaxed border-t border-border/20 pt-2">
        Use a prescrição como guia de treino. Se algo parecer fora do normal durante a execução, reduza a intensidade ou encerre a sessão.
      </p>
    </div>
  );
}

export default function WorkoutSuggestionCard({
  checkin,
  actionableRecs = [],
  strainTarget,
  currentStrain = 0,
  analysis,
  workoutPrescription,
  userPrefs,
  todaySessions = [],
  allSessions = [],
  onScheduleOption,
  onCompleteOption,
  onSchedule,
  dailyVerdict = null,
}) {
  const { intent } = useDayContext();

  const bodyState = checkin?.current_body_state || 'default';
  const cfg = INTENSITY_MAP[bodyState] || INTENSITY_MAP.default;
  const unifiedHeader = getHeaderFromVerdict(dailyVerdict, cfg);
  const { initial, transition: reducedTransition } = useMotionSafe();

  const [historyHint, setHistoryHint] = useState(null);
  const [yesterdayFeedback, setYesterdayFeedback] = useState(null);

  const prediction = predictTomorrow({ analysis, intent });

  useEffect(() => {
    async function loadYesterday() {
      try {
        const userId = await getUserIdOrDeviceId();
        const data = await getFeedbackByDate(userId, yesterdayKey());
        setYesterdayFeedback(data);
      } catch (e) {
        console.warn(e);
      }
    }
    loadYesterday();
  }, []);

  useEffect(() => {
    async function loadHistory() {
      try {
        const userId = await getUserIdOrDeviceId();
        const recent = await getRecentFeedback(userId, 7);
        if (!recent || recent.length < 3) return;

        const completed = recent.filter((r) => r.completed && r.perceived_rpe != null);
        if (completed.length < 3) return;

        const avgRpe = completed.reduce((sum, r) => sum + r.perceived_rpe, 0) / completed.length;
        if (avgRpe > 8) setHistoryHint('Seu histórico recente mostra esforço alto com frequência.');
        else if (avgRpe < 5) setHistoryHint('Seu histórico recente está mais leve do que o usual.');
      } catch (e) {
        console.warn('history load failed', e);
      }
    }
    loadHistory();
  }, []);

  const presc = useMemo(() => {
    if (workoutPrescription !== undefined) return workoutPrescription;
    if (analysis) return prescribeWorkout(analysis, userPrefs || {});
    return null;
  }, [analysis, workoutPrescription, userPrefs]);

  const lookback = useMemo(() => {
    if (!allSessions || allSessions.length === 0) return null;
    return applyYesterdayLookback(allSessions, todayKey(), checkin);
  }, [allSessions, checkin]);

  const trainingRecs = actionableRecs.filter((r) =>
    ['Treino', 'Mobilidade', 'Recuperação'].includes(r.category)
  );

  if (checkin?.rest_day || intent === 'recovery') {
    return <RecoveryProtocolCard checkin={checkin} analysis={analysis} />;
  }

  if (todaySessions.length > 0) {
    return (
      <WorkoutLoggedState
        sessions={todaySessions}
        checkin={checkin}
        analysis={analysis}
      />
    );
  }

  return (
    <motion.div
      initial={initial ?? { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedTransition ?? { delay: 0.1 }}
      className="rounded-2xl border p-5 space-y-4"
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      <AcwrAlert
        allSessions={allSessions}
        todaySessions={todaySessions}
        analysisRatio={analysis?.trainingLoad?.ratio ?? null}
      />

      <YesterdayContextBanner lookback={lookback} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4" style={{ color: unifiedHeader.color }} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Plano recomendado
          </span>
        </div>

        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: `${unifiedHeader.color}20`, color: unifiedHeader.color }}
        >
          <span>{unifiedHeader.emoji}</span>
          {unifiedHeader.title}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground/90">
          Execute esta dose hoje
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {unifiedHeader.subtitle || cfg.detail}
        </p>
      </div>

      {yesterdayFeedback?.completed && (
        <div className="text-xs text-muted-foreground">
          Ontem você treinou (RPE {yesterdayFeedback.perceived_rpe})
        </div>
      )}

      {historyHint && (
        <div className="text-xs text-muted-foreground">
          {historyHint}
        </div>
      )}

      {prediction && (
        <div className={`text-xs flex items-center gap-2 ${
          prediction.trend === 'up'
            ? 'text-emerald-400'
            : prediction.trend === 'down'
            ? 'text-yellow-400'
            : 'text-muted-foreground'
        }`}>
          <span>
            {prediction.trend === 'up' && '⬆️'}
            {prediction.trend === 'down' && '⚠️'}
            {prediction.trend === 'stable' && '➡️'}
          </span>
          <span>{prediction.message}</span>
        </div>
      )}

{checkin?.biocharge_morning >= 80 && checkin?.zone === 'yellow' && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Seu BioCharge acordou alto, mas sono, fadiga ou carga recente ainda reduzem a margem prática de hoje.
        </p>
      )}

      {checkin?.energy === 5 && dailyVerdict?.mode === 'train_moderate' && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Sua energia subjetiva está alta, mas os sinais fisiológicos ainda pedem controle na dose de hoje.
        </p>
      )}

      <div className="h-px bg-border/40" />

      {(() => {
  const rec = resolveReadinessRecommendation(checkin, analysis);

  return (
    <div className="rounded-xl bg-secondary/35 border border-border/35 px-3 py-2.5 space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        Contexto da dose
      </p>

      <p className="text-xs font-semibold leading-relaxed" style={{ color: rec.color }}>
        {rec.text}
      </p>

      {rec.acwrContext && (
        <p className="text-[11px] leading-snug" style={{ color: rec.acwrContext.color }}>
          {rec.acwrContext.text}
        </p>
      )}
    </div>
  );
})()}


      {strainTarget != null && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Strain alvo hoje
            </p>
            <p className="text-lg font-mono font-bold" style={{ color: unifiedHeader.color }}>
              até {strainTarget}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {STRAIN_ZONE(strainTarget)}
            </p>
          </div>

          {currentStrain > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Acumulado
              </p>
              <p className={`text-lg font-mono font-bold ${currentStrain >= strainTarget ? 'text-red-400' : 'text-emerald-400'}`}>
                {currentStrain}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {STRAIN_ZONE(currentStrain)}
              </p>
            </div>
          )}
        </div>
      )}

      {(() => {
        const raw = checkin?.contextual_bullets;
        const bullets = raw ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null;

        if (bullets?.length) {
          return (
            <ul className="space-y-2">
              {bullets.slice(0, 2).map((tip, i) => (
                <li key={i} className="text-sm text-foreground/80 leading-snug">
                  {tip}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <ul className="space-y-1.5">
            {cfg.tips.slice(0, 2).map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: unifiedHeader.color }} />
                {tip}
              </li>
            ))}
          </ul>
        );
      })()}

      {trainingRecs.length > 0 && (
        <div className="pt-2 border-t border-border/30 space-y-2">
          {trainingRecs.slice(0, 2).map((rec, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-base leading-none mt-0.5">{rec.icon}</span>
              <p className="text-xs text-foreground/75 leading-snug">{rec.text}</p>
            </div>
          ))}
        </div>
      )}

      {presc && (
        <div className="pt-3 border-t border-border/30">
          <PrescriptionBlock
            presc={presc}
            analysis={analysis}
            intent={intent}
            checkin={checkin}
            strainTarget={strainTarget}
            currentStrain={currentStrain}
            lookbackRecommendKey={lookback?.recommendKey ?? null}
            onScheduleOption={onScheduleOption}
            onCompleteOption={onCompleteOption}
            onSchedule={onSchedule}
          />
        </div>
      )}
    </motion.div>
  );
}
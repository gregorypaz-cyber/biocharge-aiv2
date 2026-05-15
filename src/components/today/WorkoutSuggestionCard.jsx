import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Check, Calendar, TrendingUp } from 'lucide-react';
import { useMotionSafe } from '@/hooks/use-motion-safe';
import { prescribeWorkout } from '../../lib/workout-prescription.js';
import {
  getUserIdOrDeviceId,
  upsertDailySelection,
  upsertDailyCompletion,
  getFeedbackByDate,
  getRecentFeedback,
} from '../../services/workoutFeedbackService.js';

// ─── Legacy body-state config (unchanged) ────────────────────────────────────
const INTENSITY_MAP = {
  Recovered: {
    label: 'Alta Intensidade', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)',
    emoji: '🏋️', detail: 'Seu corpo está pronto para desafio máximo. Aproveite para treinos de força, intervalado ou competição.',
    tips: ['Volume alto ou intensidade máxima', 'Bom momento para bater recordes pessoais', 'Garanta nutrição e hidratação adequadas'],
  },
  Balanced: {
    label: 'Intensidade Moderada', color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.25)',
    emoji: '🚴', detail: 'Equilíbrio fisiológico estável. Treino moderado com monitoramento da frequência cardíaca.',
    tips: ['RPE entre 6-7 é ideal hoje', 'Evite volume excessivo', 'Hidratação contínua durante o treino'],
  },
  Fatigued: {
    label: 'Leve ou Recuperação Ativa', color: '#eab308', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.25)',
    emoji: '🧘', detail: 'Fadiga acumulada detectada. Priorize mobilidade, caminhada leve ou yoga.',
    tips: ['Evite cargas altas ou corridas intensas', 'Alongamento e mobilidade articular', 'Priorize sono de qualidade esta noite'],
  },
  Activated: {
    label: 'Alta Intensidade', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)',
    emoji: '🏋️', detail: 'Você está ativado e respondeu bem ao treino. Ótimo momento para alta intensidade.',
    tips: ['Volume alto ou intensidade máxima', 'Seu corpo está adaptado ao estímulo atual', 'Mantenha hidratação e nutrição em dia'],
  },
  Loaded: {
    label: 'Carga Moderada', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)',
    emoji: '⚖️', detail: 'Carga de treino acumulada. Seu corpo está trabalhando — monitore como se sente.',
    tips: ['Intensidade moderada no máximo', 'Observe sinais de fadiga durante o treino', 'Priorize sono esta noite'],
  },
  Sympathetic_Load: {
    label: 'Sistema Nervoso Ativado', color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)',
    emoji: '⚡', detail: 'Carga simpática elevada. Seu sistema nervoso está sobrecarregado.',
    tips: ['Atividade leve apenas', 'Respiração profunda e meditação ajudam', 'Evite estressores adicionais hoje'],
  },
  'High Stress': {
    label: 'Leve — foque em recuperar', color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)',
    emoji: '🌿', detail: 'Stress elevado detectado. Atividades de baixo impacto ajudam sem sobrecarregar o sistema nervoso.',
    tips: ['Caminhada, natação leve ou yoga', 'Respiração diafragmática pré-treino', '10min de meditação potencializa o HRV'],
  },
  Overreached: {
    label: 'Descanso ativo', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)',
    emoji: '🛌', detail: 'Sobrecarga fisiológica. Seu corpo precisa de recuperação real para avançar.',
    tips: ['Nenhum treino de alta intensidade hoje', 'Caminhada curta (<30min) se quiser se mover', 'Sono, alimentação e hidratação em foco'],
  },
  default: {
    label: 'Moderado', color: '#eab308', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.25)',
    emoji: '🚶', detail: 'Avalie como você está se sentindo e ajuste a intensidade conforme o aquecimento.',
    tips: ['Comece leve e avalie no aquecimento', 'Monitore a frequência cardíaca', 'Hidrate-se bem'],
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
  Corrida: '🏃', Força: '🏋️', Mobilidade: '🧘', Recuperação: '🛌', Misto: '🔄',
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ─── Yesterday Impact Banner ──────────────────────────────────────────────────
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

// ─── Completion Form ──────────────────────────────────────────────────────────
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
          type="range" min={1} max={10} value={rpe}
          onChange={e => setRpe(Number(e.target.value))}
          className="w-full accent-primary h-1.5"
          aria-label="RPE percebido"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
          <span>Fácil</span><span>Máximo</span>
        </div>
      </div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value.slice(0, 140))}
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

// ─── Daily Insight Block ──────────────────────────────────────────────────────
function DailyInsightBlock({ presc, analysis, onMarkDone }) {
  if (!presc || !analysis) return null;

  try {
    const recovery = analysis.today?.recovery_score ?? analysis.today?.readiness_score ?? null;
    const hrvDelta = (() => {
      const ins = analysis.baselineInsights?.find(i => i.label === 'HRV');
      return ins?.delta ?? null;
    })();
    const sleepDebt = analysis.sleepDebt?.debt ?? null;
    const ratio = analysis.trainingLoad?.ratio ?? null;
    const risk = analysis.trainingLoad?.risk ?? null;
    const state = analysis.physioState?.state ?? null;
    const recommendedKey = presc.recommendedKey ?? null;

    // Confidence badge recalculated locally
    const hasLoad = risk && risk !== 'insufficient_data';
    const hasHRV = hrvDelta != null;
    const hasSleep = sleepDebt != null;
    const conf = hasLoad && (hasHRV || hasSleep) ? 'Alta' : hasLoad || hasSleep ? 'Média' : 'Baixa';
    const confStyle = CONF_STYLE[conf] || CONF_STYLE.Baixa;

    // Headline
    const isLowRecovery = recovery != null && recovery < 55;
    const headline = recommendedKey && !isLowRecovery
      ? `Hoje o plano é ${recommendedKey}. Execute e some pontos.`
      : 'Hoje é disciplina: recuar para atacar amanhã.';

    // Evidence bullets (only available data)
    const bullets = [];
    if (recovery != null) bullets.push(`Recovery: ${recovery} pts`);
    if (hrvDelta != null) bullets.push(`HRV delta: ${hrvDelta >= 0 ? '+' : ''}${hrvDelta}%`);
    if (sleepDebt != null && sleepDebt > 0) bullets.push(`Dívida sono: ${sleepDebt}h`);
    if (ratio != null && ratio > 0) bullets.push(`ACWR: ${ratio.toFixed(2)}`);

    if (!bullets.length) return null;

    // Micro-ação
    const microAction = (() => {
      if (state === 'Overreached' || risk === 'high') return '1 min: deite, respire fundo 4-4-4-4, libere tensão.';
      if (state === 'Fatigued' || isLowRecovery) return '1 min: hidrate-se agora — 500ml antes do treino.';
      if (recovery != null && recovery >= 80) return '1 min: ative o core com 10 dead bugs para preparar o sistema.';
      return '1 min: faça 5 respirações profundas e defina a intenção do treino.';
    })();

    // Contrafactual
    const counterfactual = (() => {
      if (ratio != null && ratio > 1.3) return 'Se escolher C hoje, tende a proteger o recovery (+3~6 pts em 48h).';
      if (recovery != null && recovery >= 80) return 'Se fizer A e dormir +30min, tende a manter a janela verde amanhã.';
      return null;
    })();

    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Insight do Dia</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${confStyle.bg} ${confStyle.text}`}>{conf}</span>
        </div>

        {/* Headline */}
        <p className="text-sm font-bold leading-snug">{headline}</p>

        {/* Evidence bullets */}
        <ul className="space-y-0.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-1 h-1 rounded-full bg-primary/50 shrink-0" />
              {b}
            </li>
          ))}
        </ul>

        {/* Counterfactual */}
        {counterfactual && (
          <p className="text-[11px] text-foreground/60 italic border-l-2 border-primary/30 pl-2">{counterfactual}</p>
        )}

        {/* Micro-ação */}
        <p className="text-[11px] text-foreground/70">⚡ {microAction}</p>

        {/* Trigger + CTA */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/20">
          <p className="text-[10px] text-muted-foreground/70">Marque o RPE depois. Amanhã você vê o impacto.</p>
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

// ─── Prescription Block ───────────────────────────────────────────────────────
function PrescriptionBlock({
  presc, analysis,
  onScheduleOption, onCompleteOption, onSchedule,
}) {
  const [selected, setSelected] = useState('A');
  const [savingSelect, setSavingSelect] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [savingComplete, setSavingComplete] = useState(false);
  const [savedToday, setSavedToday] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [yesterdayFeedback, setYesterdayFeedback] = useState(null);
  const [adaptHints, setAdaptHints] = useState([]);
  const debounceRef = useRef(null);

  const opt = presc.options.find(o => o.key === selected) || presc.options[0];
  const conf = presc.summary.confidence;
  const confStyle = CONF_STYLE[conf] || CONF_STYLE.Baixa;

  // Load yesterday feedback + recent for adaptation hints
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

      // Lightweight adaptation hints
      const hints = [];
      if (recent.length >= 3) {
        const cCount = recent.filter(r => r.selected_option === 'C').length;
        if (cCount / recent.length > 0.5) {
          hints.push('Você costuma preferir treinos curtos — opção C pode ser a melhor escolha.');
        }
        const completed = recent.filter(r => r.completed && r.perceived_rpe != null);
        if (completed.length >= 3) {
          const avgRpe = completed.reduce((s, r) => s + r.perceived_rpe, 0) / completed.length;
          if (avgRpe > 8) {
            hints.push('RPE médio acima de 8 — considere reduzir a intensidade 1 nível.');
          }
        }
      }
      setAdaptHints(hints);
    })();
    return () => { cancelled = true; };
  }, []);

  const persistSelection = async (key, option) => {
    if (debounceRef.current) return;
    setSavingSelect(true);
    setDbError(false);
    debounceRef.current = setTimeout(() => { debounceRef.current = null; }, 800);
    const userId = await getUserIdOrDeviceId();
    const evidence = analysis ? {
      recovery: analysis.today?.recovery_score ?? null,
      sleepDebtHours: analysis.sleepDebt?.debt ?? null,
      trainingRatio: analysis.trainingLoad?.ratio ?? null,
      trainingRisk: analysis.trainingLoad?.risk ?? null,
      fatigue: analysis.today?.fatigue_score ?? null,
      hrvDeltaPct: null,
    } : null;
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
  };

  const handleSelectOption = (key) => {
    setSelected(key);
    const opt = presc.options.find(o => o.key === key);
    if (opt) persistSelection(key, opt);
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
    if (!result) setDbError(true);
    else setSavedToday(true);
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
      {/* Daily Insight Block */}
      <DailyInsightBlock
        presc={presc}
        analysis={analysis}
        onMarkDone={() => setShowCompletion(true)}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Plano de Treino de Hoje
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${confStyle.bg} ${confStyle.text}`}>
          {conf}
        </span>
      </div>

      {/* Yesterday impact */}
      {yesterdayFeedback?.completed && <YesterdayImpact analysis={analysis} />}

      {/* Adaptation hints */}
      {adaptHints.map((hint, i) => (
        <p key={i} className="text-[10px] text-yellow-400/80 italic px-1">💡 {hint}</p>
      ))}

      {/* Option tabs */}
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Opções de treino">
        {presc.options.map(o => {
          const isActive = o.key === selected;
          return (
            <button
              key={o.key}
              role="radio"
              aria-checked={isActive}
              aria-label={`Opção ${o.key}: ${o.title}`}
              disabled={savingSelect}
              onClick={() => handleSelectOption(o.key)}
              className={`rounded-xl p-2.5 text-left transition-all border disabled:opacity-60 ${
                isActive
                  ? 'border-primary/50 bg-primary/8'
                  : 'border-border/50 bg-secondary/50 hover:bg-secondary'
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] font-black text-muted-foreground">{o.key}</span>
                <span className="text-xs">{MODALITY_EMOJI[o.modality] || '🏃'}</span>
              </div>
              <p className={`text-xs font-semibold leading-tight ${isActive ? 'text-primary' : 'text-foreground/80'}`}>
                {o.title}
              </p>
              {o.duration_min && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{o.duration_min}min</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected option detail */}
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
              {opt.structure.warmup && <p>🔥 <span className="font-medium text-foreground/70">Aquecimento:</span> {opt.structure.warmup}</p>}
              {opt.structure.main && <p>💪 <span className="font-medium text-foreground/70">Principal:</span> {opt.structure.main}</p>}
              {opt.structure.cooldown && <p>🧊 <span className="font-medium text-foreground/70">Volta à calma:</span> {opt.structure.cooldown}</p>}
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

      {/* Completion form inline */}
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

      {/* CTAs */}
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
            <Check className="w-3.5 h-3.5" /> Marcar como feito
          </button>
        )}
        {savedToday && (
          <span className="text-xs text-emerald-400 font-semibold">Salvo ✅</span>
        )}
      </div>

      {/* DB error notice */}
      {dbError && (
        <p className="text-[10px] text-amber-400/80">Não foi possível salvar agora. Tente novamente.</p>
      )}

      {/* Safety disclaimer */}
      <p className="text-[10px] text-muted-foreground/60 leading-relaxed border-t border-border/20 pt-2">
        Isto não é aconselhamento médico. Se sentir dor, tontura ou falta de ar, pare e procure assistência.
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WorkoutSuggestionCard({
  checkin,
  actionableRecs = [],
  strainTarget,
  currentStrain = 0,
  // Prescription props
  analysis,
  workoutPrescription,
  userPrefs,
  onScheduleOption,
  onCompleteOption,
  onSchedule,
}) {
  const bodyState = checkin?.current_body_state || 'default';
  const cfg = INTENSITY_MAP[bodyState] || INTENSITY_MAP.default;
  const { initial, transition: reducedTransition } = useMotionSafe();

  const presc = useMemo(() => {
    if (workoutPrescription !== undefined) return workoutPrescription;
    if (analysis) return prescribeWorkout(analysis, userPrefs || {});
    return null;
  }, [analysis, workoutPrescription, userPrefs]);

  const trainingRecs = actionableRecs.filter(r =>
    ['Treino', 'Mobilidade', 'Recuperação'].includes(r.category)
  );

  return (
    <motion.div
      initial={initial ?? { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedTransition ?? { delay: 0.1 }}
      className="rounded-2xl border p-5 space-y-4"
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4" style={{ color: cfg.color }} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Treino Sugerido
          </span>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: `${cfg.color}20`, color: cfg.color }}
        >
          <span>{cfg.emoji}</span>
          {cfg.label}
        </div>
      </div>

      {/* Legacy content (always shown) */}
      <p className="text-sm text-foreground/85 leading-relaxed">{cfg.detail}</p>

      {strainTarget != null && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Strain alvo hoje</p>
            <p className="text-lg font-mono font-bold" style={{ color: cfg.color }}>até {strainTarget}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{STRAIN_ZONE(strainTarget)}</p>
          </div>
          {currentStrain > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Acumulado</p>
              <p className={`text-lg font-mono font-bold ${currentStrain >= strainTarget ? 'text-red-400' : 'text-emerald-400'}`}>
                {currentStrain}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{STRAIN_ZONE(currentStrain)}</p>
            </div>
          )}
        </div>
      )}

      <ul className="space-y-1.5">
        {cfg.tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
            {tip}
          </li>
        ))}
      </ul>

      {trainingRecs.length > 0 && (
        <div className="pt-2 border-t border-border/30 space-y-2">
          {trainingRecs.map((rec, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-base leading-none mt-0.5">{rec.icon}</span>
              <p className="text-xs text-foreground/75 leading-snug">{rec.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Prescription block — only when presc is available */}
      {presc && (
        <div className="pt-3 border-t border-border/30">
          <PrescriptionBlock
            presc={presc}
            analysis={analysis}
            onScheduleOption={onScheduleOption}
            onCompleteOption={onCompleteOption}
            onSchedule={onSchedule}
          />
        </div>
      )}
    </motion.div>
  );
}
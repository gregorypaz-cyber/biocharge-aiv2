import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, ChevronDown, ChevronUp, Check, Calendar } from 'lucide-react';
import { useMotionSafe } from '@/hooks/use-motion-safe';
import { prescribeWorkout } from '../../lib/workout-prescription.js';

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

// ─── Confidence badge ─────────────────────────────────────────────────────────
const CONF_STYLE = {
  Alta:  { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  Média: { bg: 'bg-yellow-500/15',  text: 'text-yellow-400'  },
  Baixa: { bg: 'bg-zinc-500/15',    text: 'text-zinc-400'    },
};

const MODALITY_EMOJI = {
  Corrida: '🏃', Força: '🏋️', Mobilidade: '🧘', Recuperação: '🛌', Misto: '🔄',
};

// ─── Prescription block ───────────────────────────────────────────────────────
function PrescriptionBlock({ presc, onScheduleOption, onCompleteOption, onSchedule }) {
  const [selected, setSelected] = useState('A');
  const opt = presc.options.find(o => o.key === selected) || presc.options[0];
  const conf = presc.summary.confidence;
  const confStyle = CONF_STYLE[conf] || CONF_STYLE.Baixa;

  const handleSchedule = () => {
    if (onScheduleOption) onScheduleOption(opt);
    else if (onSchedule) onSchedule(presc);
  };
  const handleComplete = () => {
    if (onCompleteOption) onCompleteOption(opt);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Plano de Treino de Hoje
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${confStyle.bg} ${confStyle.text}`}>
          {conf}
        </span>
      </div>

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
              onClick={() => setSelected(o.key)}
              className={`rounded-xl p-2.5 text-left transition-all border ${
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

          {(opt.structure.warmup || opt.structure.main || opt.structure.cooldown) && (
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

      {/* CTAs */}
      <div className="flex gap-2">
        {(onScheduleOption || onSchedule) && (
          <button
            onClick={handleSchedule}
            aria-label={`Agendar opção ${opt.key}: ${opt.title}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all"
          >
            <Calendar className="w-3.5 h-3.5" /> Agendar
          </button>
        )}
        {onCompleteOption && (
          <button
            onClick={handleComplete}
            aria-label={`Marcar opção ${opt.key} como feito`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary border border-border text-xs font-semibold hover:bg-secondary/80 transition-all"
          >
            <Check className="w-3.5 h-3.5" /> Marcar como feito
          </button>
        )}
      </div>

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
  // New optional props
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
            onScheduleOption={onScheduleOption}
            onCompleteOption={onCompleteOption}
            onSchedule={onSchedule}
          />
        </div>
      )}
    </motion.div>
  );
}
import { motion } from 'framer-motion';
import { Dumbbell } from 'lucide-react';
import { useMotionSafe } from '@/hooks/use-motion-safe';

const INTENSITY_MAP = {
  Recovered: {
    label: 'Alta Intensidade',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
    emoji: '🏋️',
    detail: 'Seu corpo está pronto para desafio máximo. Aproveite para treinos de força, intervalado ou competição.',
    tips: ['Volume alto ou intensidade máxima', 'Bom momento para bater recordes pessoais', 'Garanta nutrição e hidratação adequadas'],
  },
  Balanced: {
    label: 'Intensidade Moderada',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.25)',
    emoji: '🚴',
    detail: 'Equilíbrio fisiológico estável. Treino moderado com monitoramento da frequência cardíaca.',
    tips: ['RPE entre 6-7 é ideal hoje', 'Evite volume excessivo', 'Hidratação contínua durante o treino'],
  },
  Fatigued: {
    label: 'Leve ou Recuperação Ativa',
    color: '#eab308',
    bg: 'rgba(234,179,8,0.08)',
    border: 'rgba(234,179,8,0.25)',
    emoji: '🧘',
    detail: 'Fadiga acumulada detectada. Priorize mobilidade, caminhada leve ou yoga.',
    tips: ['Evite cargas altas ou corridas intensas', 'Alongamento e mobilidade articular', 'Priorize sono de qualidade esta noite'],
  },
  Activated: {
    label: 'Alta Intensidade',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
    emoji: '🏋️',
    detail: 'Você está ativado e respondeu bem ao treino. Ótimo momento para alta intensidade.',
    tips: ['Volume alto ou intensidade máxima', 'Seu corpo está adaptado ao estímulo atual', 'Mantenha hidratação e nutrição em dia'],
  },
  Loaded: {
    label: 'Carga Moderada',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
    emoji: '⚖️',
    detail: 'Carga de treino acumulada. Seu corpo está trabalhando — monitore como se sente.',
    tips: ['Intensidade moderada no máximo', 'Observe sinais de fadiga durante o treino', 'Priorize sono esta noite'],
  },
  Sympathetic_Load: {
    label: 'Sistema Nervoso Ativado',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.25)',
    emoji: '⚡',
    detail: 'Carga simpática elevada. Seu sistema nervoso está sobrecarregado.',
    tips: ['Atividade leve apenas', 'Respiração profunda e meditação ajudam', 'Evite estressores adicionais hoje'],
  },
  'High Stress': {
    label: 'Leve — foque em recuperar',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.25)',
    emoji: '🌿',
    detail: 'Stress elevado detectado. Atividades de baixo impacto ajudam sem sobrecarregar o sistema nervoso.',
    tips: ['Caminhada, natação leve ou yoga', 'Respiração diafragmática pré-treino', '10min de meditação potencializa o HRV'],
  },
  Overreached: {
    label: 'Descanso ativo',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
    emoji: '🛌',
    detail: 'Sobrecarga fisiológica. Seu corpo precisa de recuperação real para avançar.',
    tips: ['Nenhum treino de alta intensidade hoje', 'Caminhada curta (<30min) se quiser se mover', 'Sono, alimentação e hidratação em foco'],
  },
  default: {
    label: 'Moderado',
    color: '#eab308',
    bg: 'rgba(234,179,8,0.08)',
    border: 'rgba(234,179,8,0.25)',
    emoji: '🚶',
    detail: 'Avalie como você está se sentindo e ajuste a intensidade conforme o aquecimento.',
    tips: ['Comece leve e avalie no aquecimento', 'Monitore a frequência cardíaca', 'Hidrate-se bem'],
  },
};

const STRAIN_ZONE = (v) =>
  v <= 9 ? '🟢 Leve' : v <= 13 ? '🟡 Moderado' : v <= 17 ? '🟠 Alto' : '🔴 Máximo';

export default function WorkoutSuggestionCard({ checkin, actionableRecs = [], strainTarget, currentStrain = 0 }) {
  const bodyState = checkin?.current_body_state || 'default';
  const cfg = INTENSITY_MAP[bodyState] || INTENSITY_MAP.default;
  const { initial, transition: reducedTransition } = useMotionSafe();

  // Filtrar recs de treino/mobilidade/recuperação do engine
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

      {/* Detail text */}
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

      {/* Tips from state config */}
      <ul className="space-y-1.5">
        {cfg.tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
            {tip}
          </li>
        ))}
      </ul>

      {/* Engine actionable recs for training */}
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
    </motion.div>
  );
}
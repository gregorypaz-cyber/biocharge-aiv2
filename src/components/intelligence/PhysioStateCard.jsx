import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMotionSafe } from '@/hooks/use-motion-safe';

const STATE_CONFIG = {
  Recovered: {
    label: 'Recuperado',
    emoji: '🟢',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/20',
    desc: 'Seu sistema parece responder bem à carga recente.',
    interpretation: 'Bom contexto fisiológico para treinos mais ambiciosos, se o resto do quadro acompanhar.',
  },
  Activated: {
    label: 'Ativado',
    emoji: '⚡',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/20',
    desc: 'Você parece responsivo à carga atual.',
    interpretation: 'Sinal de boa ativação, mas ainda vale confirmar isso no aquecimento e no comportamento do dia seguinte.',
  },
  Balanced: {
    label: 'Equilibrado',
    emoji: '🔵',
    color: 'text-sky-400',
    bg: 'bg-sky-500/5',
    border: 'border-sky-500/20',
    desc: 'Seu sistema está estável no momento.',
    interpretation: 'Esse contexto costuma favorecer consistência mais do que agressividade.',
  },
  Fatigued: {
    label: 'Fatigado',
    emoji: '🟡',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/5',
    border: 'border-yellow-500/20',
    desc: 'Há sinais relevantes de fadiga acumulada.',
    interpretation: 'Seu corpo ainda pode se mover, mas a margem para intensidade está mais estreita.',
  },
  'High Stress': {
    label: 'Alto estresse',
    emoji: '🟠',
    color: 'text-orange-400',
    bg: 'bg-orange-500/5',
    border: 'border-orange-500/20',
    desc: 'O sistema está sob carga de stress acima do padrão.',
    interpretation: 'Mesmo quando a recuperação parece aceitável, o custo fisiológico do treino pode subir.',
  },
  Overreached: {
    label: 'Sobrecarregado',
    emoji: '🔴',
    color: 'text-red-400',
    bg: 'bg-red-500/5',
    border: 'border-red-500/20',
    desc: 'Seu sistema mostra sinais de sobrecarga.',
    interpretation: 'Aqui, proteger e recuperar tende a render mais do que insistir em estímulo.',
  },
};

export default function PhysioStateCard({ physioState }) {
  const { initial, transition: reducedTransition } = useMotionSafe();

  if (!physioState) return null;

  const cfg = STATE_CONFIG[physioState.state] || STATE_CONFIG.Balanced;

  return (
    <motion.div
      initial={initial ?? { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedTransition}
      className={`rounded-2xl border p-5 space-y-4 ${cfg.border} ${cfg.bg}`}
    >
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          Estado fisiológico
        </p>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-lg">{cfg.emoji}</span>
          <span className={`text-xl font-semibold ${cfg.color}`}>{cfg.label}</span>
        </div>

        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          {cfg.desc}
        </p>
      </div>

      <div className="rounded-xl bg-secondary/30 border border-border/30 px-3 py-2.5">
        <p className="t-micro uppercase tracking-wider text-muted-foreground mb-1">
          O que isso significa
        </p>
        <p className="text-xs text-foreground/85 leading-relaxed">
          {cfg.interpretation}
        </p>
      </div>

      {physioState.signals?.length > 0 && (
        <div className="space-y-2">
          <p className="t-micro uppercase tracking-wider text-muted-foreground font-semibold">
            Sinais usados nesta leitura
          </p>

          <div className="flex flex-wrap gap-1.5">
            {physioState.signals.map((s, i) => (
              <span
                key={i}
                className={cn(
                  'text-xs px-2 py-1 rounded-full border font-medium',
                  s.type === 'positive'
                    ? 'bg-emerald-500/8 text-emerald-400 border-emerald-500/20'
                    : 'bg-red-500/8 text-red-400 border-red-500/20'
                )}
              >
                {s.type === 'positive' ? '↑' : '↓'} {s.text}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
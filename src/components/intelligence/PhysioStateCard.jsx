import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const STATE_CONFIG = {
  Recovered: {
    label: 'Recuperado',
    emoji: '🟢',
    color: 'hsl(142,70%,50%)',
    bg: 'hsl(142,70%,50%)/8',
    border: 'hsl(142,70%,50%)/25',
    desc: 'Sistema nervoso e muscular prontos para carga alta',
  },
  Balanced: {
    label: 'Equilibrado',
    emoji: '🔵',
    color: 'hsl(200,80%,55%)',
    bg: 'hsl(200,80%,55%)/8',
    border: 'hsl(200,80%,55%)/25',
    desc: 'Equilíbrio fisiológico estável — intensidade moderada',
  },
  Fatigued: {
    label: 'Fatigado',
    emoji: '🟡',
    color: 'hsl(45,93%,58%)',
    bg: 'hsl(45,93%,58%)/8',
    border: 'hsl(45,93%,58%)/25',
    desc: 'Fadiga acumulada — priorize recuperação ativa',
  },
  'High Stress': {
    label: 'Alto Estresse',
    emoji: '🟠',
    color: 'hsl(25,90%,55%)',
    bg: 'hsl(25,90%,55%)/8',
    border: 'hsl(25,90%,55%)/25',
    desc: 'Sistema sob carga de stress elevada',
  },
  Overreached: {
    label: 'Sobrecarregado',
    emoji: '🔴',
    color: 'hsl(0,72%,55%)',
    bg: 'hsl(0,72%,55%)/8',
    border: 'hsl(0,72%,55%)/25',
    desc: 'Sobrecarga fisiológica — descanso necessário',
  },
};

export default function PhysioStateCard({ physioState }) {
  if (!physioState) return null;

  const cfg = STATE_CONFIG[physioState.state] || STATE_CONFIG.Balanced;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-5"
      style={{
        borderColor: cfg.border.replace('/25', '').replace('hsl(', 'hsla(').replace(')', ', 0.25)'),
        backgroundColor: cfg.bg.replace('/8', '').replace('hsl(', 'hsla(').replace(')', ', 0.06)'),
        boxShadow: `0 0 30px -10px ${cfg.color}25`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Estado Fisiológico</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl">{cfg.emoji}</span>
            <span className="text-2xl font-black" style={{ color: cfg.color }}>{cfg.label}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{cfg.desc}</p>
        </div>
      </div>

      {physioState.signals.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {physioState.signals.map((s, i) => (
            <span
              key={i}
              className={cn(
                'text-xs px-2 py-1 rounded-full border font-medium',
                s.type === 'positive'
                  ? 'bg-primary/8 text-primary border-primary/20'
                  : 'bg-destructive/8 text-destructive border-destructive/20'
              )}
            >
              {s.type === 'positive' ? '↑' : '↓'} {s.text}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
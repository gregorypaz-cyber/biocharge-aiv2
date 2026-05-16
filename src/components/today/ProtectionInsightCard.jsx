import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

/**
 * ProtectionInsightCard — substitui WorkoutSuggestionCard quando
 * o DayPhase detecta OVERLOAD ou RECOVERY_DAY com intensidade mod/alta.
 */
export default function ProtectionInsightCard({ mutation }) {
  if (!mutation) return null;

  const variantStyles = {
    protection: {
      border: 'border-blue-500/20',
      bg:     'bg-blue-500/5',
      title:  'text-blue-300',
      icon:   'text-blue-400',
    },
    warning: {
      border: 'border-orange-500/25',
      bg:     'bg-orange-500/5',
      title:  'text-orange-300',
      icon:   'text-orange-400',
    },
    info: {
      border: 'border-border/50',
      bg:     'bg-secondary/40',
      title:  'text-foreground',
      icon:   'text-muted-foreground',
    },
  };

  const s = variantStyles[mutation.variant] ?? variantStyles.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 flex gap-3 ${s.border} ${s.bg}`}
    >
      <div className="mt-0.5 shrink-0">
        {mutation.icon
          ? <span className="text-xl">{mutation.icon}</span>
          : <ShieldCheck className={`w-5 h-5 ${s.icon}`} />
        }
      </div>
      <div className="space-y-1">
        <p className={`text-sm font-semibold ${s.title}`}>{mutation.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{mutation.body}</p>
      </div>
    </motion.div>
  );
}
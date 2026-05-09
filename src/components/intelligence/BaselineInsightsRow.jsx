import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function BaselineInsightsRow({ insights }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">vs. Seu Baseline Pessoal</h3>
      <div className="grid grid-cols-1 gap-2">
        {insights.map((ins, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className={cn(
              'flex items-center justify-between px-4 py-3 rounded-xl border',
              ins.isPositive
                ? 'bg-primary/5 border-primary/15'
                : 'bg-destructive/5 border-destructive/15'
            )}
          >
            <span className="text-sm text-foreground/80">{ins.text}</span>
            <span className={cn(
              'text-sm font-bold font-mono ml-3 shrink-0',
              ins.isPositive ? 'text-primary' : 'text-destructive'
            )}>
              {ins.delta > 0 ? '+' : ''}{ins.delta}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
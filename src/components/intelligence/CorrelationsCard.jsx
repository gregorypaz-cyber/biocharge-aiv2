import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CorrelationsCard({ correlations, laggedEffects }) {
  const all = [
    ...(correlations || []).map(c => ({ ...c, source: 'correlation' })),
    ...(laggedEffects || []).map(e => ({ icon: e.icon, text: e.text, type: 'lagged', source: 'lagged' })),
  ];

  if (all.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14 }}
      className="rounded-2xl border border-border/50 bg-card p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Padrões Detectados</span>
      </div>
      <div className="space-y-3">
        {all.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className={cn(
              'flex items-start gap-3 p-3 rounded-xl border text-sm',
              item.type === 'warning' || item.source === 'lagged'
                ? 'bg-yellow-500/5 border-yellow-500/15'
                : item.type === 'positive'
                ? 'bg-primary/5 border-primary/15'
                : 'bg-secondary/30 border-border/30'
            )}
          >
            <span className="text-base mt-0.5 shrink-0">{item.icon}</span>
            <span className="text-foreground/85">{item.text}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
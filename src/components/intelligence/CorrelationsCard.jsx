import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CorrelationsCard({ correlations, laggedEffects }) {
  const [expanded, setExpanded] = useState(false);

  const all = [
    ...(correlations || []).map(c => ({ ...c, source: 'correlation' })),
    ...(laggedEffects || []).map(e => ({ icon: e.icon, text: e.text, type: 'lagged', source: 'lagged' })),
  ];

  if (all.length === 0) return null;

  const visible = expanded ? all : all.slice(0, 3);

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
        {visible.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className={cn(
              'flex items-start gap-3 p-3 rounded-xl border text-sm',
              (() => {
                const dom = { '🌙':'sleep','💤':'sleep','🔬':'sleep','⚡':'strain','💪':'strain','🏃':'strain' }[item.icon];
                if (dom === 'sleep') return 'bg-blue-500/5 border-blue-400/20';
                if (dom === 'strain') return 'bg-secondary/30 border-border/50';
                return 'bg-emerald-500/5 border-emerald-500/15';
              })()
            )}
          >
            <span className="text-base mt-0.5 shrink-0">{item.icon}</span>
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <span className="text-foreground/85">{item.text}</span>
              {item.source === 'lagged' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground shrink-0">
                  Amanhã
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {all.length > 3 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-3 text-xs text-primary hover:underline"
        >
          {expanded ? 'Mostrar menos' : `Ver todos (${all.length})`}
        </button>
      )}
    </motion.div>
  );
}
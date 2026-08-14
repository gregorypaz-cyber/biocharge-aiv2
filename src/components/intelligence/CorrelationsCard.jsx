import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// p-valor como ficha técnica: <0,001 quando muito pequeno, senão 3 casas com
// vírgula decimal (padrão pt-BR).
function fmtP(p) {
  if (p == null || Number.isNaN(p)) return null;
  if (p < 0.001) return '<0,001';
  return p.toFixed(3).replace('.', ',');
}

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
        <TrendingUp className="w-4 h-4 text-primary" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold tracking-tight">Correlações</h2>
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
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-foreground/85">{item.text}</span>
                {item.source === 'lagged' && (
                  <span className="t-micro px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground shrink-0">
                    Amanhã
                  </span>
                )}
              </div>
              {item.source === 'correlation' && item.r != null && (
                <p className="t-micro font-mono text-muted-foreground/70 mt-1.5">
                  r = {item.r > 0 ? '+' : ''}{item.r} · n = {item.samples}
                  {fmtP(item.p) ? ` · p = ${fmtP(item.p)}` : ''}
                </p>
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
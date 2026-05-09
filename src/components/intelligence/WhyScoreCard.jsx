import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function WhyScoreCard({ whyScore, recoveryScore }) {
  const [open, setOpen] = useState(false);
  if (!whyScore || whyScore.length === 0) return null;

  const negatives = whyScore.filter(r => r.impact === 'negative');
  const positives = whyScore.filter(r => r.impact === 'positive');

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-border/50 bg-card overflow-hidden"
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Por que seu Recovery é {recoveryScore}?</span>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-2 border-t border-border/30 pt-4">
              {negatives.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2">Fatores negativos</p>
                  {negatives.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 py-1.5">
                      <span className="text-destructive mt-0.5 shrink-0">↓</span>
                      <span className="text-sm text-muted-foreground">{r.text}</span>
                    </div>
                  ))}
                </div>
              )}
              {positives.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 mt-3">Fatores positivos</p>
                  {positives.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 py-1.5">
                      <span className="text-primary mt-0.5 shrink-0">↑</span>
                      <span className="text-sm text-muted-foreground">{r.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
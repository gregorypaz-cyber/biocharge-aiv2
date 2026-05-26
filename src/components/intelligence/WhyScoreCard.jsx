import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, ArrowDown, ArrowUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

function getTitle(score) {
  if (score >= 80) return 'O que mais sustentou sua prontidão hoje';
  if (score >= 65) return 'O que mais influenciou sua prontidão hoje';
  return 'O que mais puxou sua prontidão para baixo hoje';
}

export default function WhyScoreCard({ whyScore, recoveryScore }) {
  const [open, setOpen] = useState(false);

  if (!whyScore || whyScore.length === 0) return null;

  const negatives = whyScore.filter((r) => r.impact === 'negative');
  const positives = whyScore.filter((r) => r.impact === 'positive');

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-border/50 bg-card overflow-hidden"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-start gap-3 text-left">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <HelpCircle className="w-4 h-4 text-primary" />
          </div>

          <div>
            <span className="text-sm font-semibold block">
              {getTitle(recoveryScore)}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-1">
              Explicação detalhada dos fatores que mais pesaram no seu score.
            </span>
          </div>
        </div>

        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform shrink-0',
            open && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-4 space-y-4 border-t border-border/30">
              {negatives.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-destructive uppercase tracking-wider mb-2">
                    Pesaram contra hoje
                  </p>

                  <div className="space-y-2">
                    {negatives.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 rounded-xl bg-secondary/40 border border-border/30 px-3 py-2.5"
                      >
                        <ArrowDown className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                        <span className="text-sm text-muted-foreground leading-relaxed">
                          {r.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {positives.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-2">
                    Sustentaram seu dia
                  </p>

                  <div className="space-y-2">
                    {positives.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 rounded-xl bg-secondary/40 border border-border/30 px-3 py-2.5"
                      >
                        <ArrowUp className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <span className="text-sm text-muted-foreground leading-relaxed">
                          {r.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {negatives.length === 0 && positives.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Ainda não há detalhes suficientes para explicar este score.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
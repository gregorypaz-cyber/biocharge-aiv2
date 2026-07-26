import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, ArrowDown, ArrowUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

function getTitle(score) {
  if (score >= 80) return 'O que mais sustentou seu recovery hoje';
  if (score >= 65) return 'O que mais influenciou seu recovery hoje';
  return 'O que mais puxou seu recovery para baixo hoje';
}

export default function WhyScoreCard({ whyScore, recoveryScore }) {
  // Em dias de recovery mais baixo (< 65), a causa importa mais —
  // abre por padrão para a explicação ficar visível sem exigir clique.
  const [open, setOpen] = useState((recoveryScore ?? 100) < 65);

  if (!whyScore || whyScore.length === 0) return null;

  const negatives = whyScore.filter((r) => r.impact === 'negative');
  const positives = whyScore.filter((r) => r.impact === 'positive');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card overflow-hidden"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-start gap-3 text-left">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
          </div>

          <div>
            <p className="text-base font-semibold leading-tight">
              {getTitle(recoveryScore)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Explicação detalhada dos fatores que mais pesaram no seu recovery.
            </p>
          </div>
        </div>

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 ml-3"
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
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
            <div className="px-5 pb-4 space-y-4">
              {negatives.length > 0 && (
                <div className="space-y-2">
                  <p className="t-micro font-bold uppercase tracking-wider text-red-400">
                    Pesaram contra seu recovery hoje
                  </p>

                  <div className="space-y-2">
                    {negatives.map((r, i) => (
                      <div
                        key={`neg-${i}-${r.text}`}
                        className="flex items-start gap-3 rounded-xl bg-secondary/40 border border-border/40 px-3 py-3"
                      >
                        <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <ArrowDown className="w-3 h-3 text-red-400" />
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {r.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {positives.length > 0 && (
                <div className="space-y-2">
                  <p className="t-micro font-bold uppercase tracking-wider text-emerald-400">
                    Sustentaram seu recovery hoje
                  </p>

                  <div className="space-y-2">
                    {positives.map((r, i) => (
                      <div
                        key={`pos-${i}-${r.text}`}
                        className="flex items-start gap-3 rounded-xl bg-secondary/40 border border-border/40 px-3 py-3"
                      >
                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <ArrowUp className="w-3 h-3 text-emerald-400" />
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {r.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {negatives.length === 0 && positives.length === 0 && (
                <div className="rounded-xl bg-secondary/40 border border-border/40 px-3 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Ainda não há detalhes suficientes para explicar este recovery.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

/**
 * SecondaryMetrics
 * Agrupa contexto avançado da Today para manter o topo simples:
 * - métricas
 * - estado fisiológico
 * - explicações
 * - projeções
 */
export default function SecondaryMetrics({ children, count = 0 }) {
  const [open, setOpen] = useState(false);

  if (!children || count === 0) return null;

  return (
    <div className="rounded-2xl border border-border/40 bg-secondary/25 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/45 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-background/40 border border-border/40 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Dados avançados
              </span>

              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-border text-muted-foreground">
                {count}
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Métricas, contexto fisiológico e explicação da recomendação.
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
            key="secondary-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/25">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
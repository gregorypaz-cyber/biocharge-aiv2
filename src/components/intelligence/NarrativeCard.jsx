import { motion } from 'framer-motion';
import { Brain, RefreshCw } from 'lucide-react';

export default function NarrativeCard({ narrative, tone = 'calm', onAlternateRequested }) {
  if (!narrative) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-2xl border border-border/50 bg-card p-5"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Narrativa Fisiológica</span>
        </div>
        {onAlternateRequested && (
          <button
            onClick={onAlternateRequested}
            aria-label="Ver versão alternativa da narrativa"
            className="flex items-center gap-1 t-micro text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary"
          >
            <RefreshCw className="w-3 h-3" />
            Ver alternativa
          </button>
        )}
      </div>
      <p className="text-sm leading-relaxed text-foreground/90 italic">
        "{narrative}"
      </p>
    </motion.div>
  );
}
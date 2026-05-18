import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown } from 'lucide-react';

/**
 * Versão compacta da Narrativa Fisiológica — máx 3 linhas visíveis,
 * com "ver análise completa →" que expande o restante.
 */
export default function NarrativeInline({ narrative }) {
  const [expanded, setExpanded] = useState(false);

  if (!narrative) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/40 bg-card px-4 py-3"
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Brain className="w-3 h-3 text-primary/70" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Narrativa Fisiológica</span>
      </div>

      <div className={expanded ? '' : 'line-clamp-3'}>
        <p className="text-xs leading-relaxed text-foreground/80 italic">"{narrative}"</p>
      </div>

      <AnimatePresence>
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1 mt-1.5 text-[11px] text-primary/70 hover:text-primary transition-colors font-medium"
          >
            ver análise completa
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
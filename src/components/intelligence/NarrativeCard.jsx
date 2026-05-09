import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';

export default function NarrativeCard({ narrative }) {
  if (!narrative) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-2xl border border-border/50 bg-card p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Brain className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Narrativa Fisiológica</span>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90 italic">
        "{narrative}"
      </p>
    </motion.div>
  );
}
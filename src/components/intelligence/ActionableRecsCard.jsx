import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

export default function ActionableRecsCard({ recs }) {
  if (!recs || recs.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16 }}
      className="rounded-2xl border border-border/50 bg-card p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações Recomendadas</span>
      </div>
      <div className="space-y-3">
        {recs.map((rec, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12 + i * 0.06 }}
            className="flex items-start gap-3"
          >
            <span className="text-xl shrink-0">{rec.icon}</span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{rec.category}</span>
              <p className="text-sm text-foreground/85 mt-0.5 leading-relaxed">{rec.text}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
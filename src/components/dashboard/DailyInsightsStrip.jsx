import { motion } from 'framer-motion';
import { Zap, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Exibe os Insights Automáticos (actionableRecs) diretamente na Home,
 * com link para a aba Hoje para detalhes de treino.
 */
export default function DailyInsightsStrip({ recs = [] }) {
  if (!recs || recs.length === 0) return null;

  // Mostrar no máximo 3 na home para não poluir
  const topRecs = recs.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="rounded-2xl border border-border/60 bg-card overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Insights do dia
          </span>
        </div>
        <Link
          to="/today"
          className="text-xs text-primary font-semibold hover:underline"
        >
          Ver treino sugerido →
        </Link>
      </div>

      <div className="px-4 pb-4 space-y-2.5">
        {topRecs.map((rec, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.14 + i * 0.06 }}
            className="flex items-start gap-3 p-3 rounded-xl bg-secondary/60"
          >
            <span className="text-lg shrink-0 leading-none mt-0.5">{rec.icon}</span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">{rec.category}</span>
              <p className="text-sm text-foreground/85 leading-snug mt-0.5">{rec.text}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
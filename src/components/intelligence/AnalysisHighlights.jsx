import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { getTopHighlights } from '@/utils/analysisHelpers';

export default function AnalysisHighlights({ analysisText }) {
  const highlights = getTopHighlights(analysisText);
  if (!highlights.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 space-y-2 mb-4"
    >
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Highlights</p>
      </div>
      <ul className="space-y-1.5">
        {highlights.map((h, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-foreground/85 leading-snug">
            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
            {h}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
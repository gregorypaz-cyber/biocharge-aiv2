import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';

export default function InsightPill({ text, delay = 0, icon: Icon }) {
  const I = Icon || Brain;
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="flex items-start gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15"
    >
      <I className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      <p className="text-sm text-foreground/85 leading-relaxed">{text}</p>
    </motion.div>
  );
}
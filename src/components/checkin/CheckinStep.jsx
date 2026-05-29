import { motion } from 'framer-motion';

export default function CheckinStep({ children, title, emoji, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="rounded-2xl border border-border/60 bg-card overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border/40">
        {emoji && <span className="text-base">{emoji}</span>}
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </motion.div>
  );
}
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ScoreCard({ label, value, icon: Icon, color, unit = '', delay = 0, sublabel, invertedScale = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl p-4 border border-border/60 bg-card"
      style={{ boxShadow: `0 0 0 1px ${color}15, inset 0 1px 0 ${color}10` }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
        )}
      </div>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-black font-mono tracking-tight" style={{ color }}>
          {value ?? '—'}
        </span>
        {unit && <span className="text-sm text-muted-foreground mb-0.5">{unit}</span>}
      </div>
      {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
      {invertedScale && value != null && (
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">quanto menor, melhor</p>
      )}
      {/* Subtle glow */}
      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10 blur-xl" style={{ backgroundColor: color }} />
    </motion.div>
  );
}
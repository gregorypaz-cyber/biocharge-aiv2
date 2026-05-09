import { motion } from 'framer-motion';
import { getZoneColor, getZoneLabel } from '@/lib/biocharge-utils';
import { cn } from '@/lib/utils';

const ZoneBar = ({ value, color }) => (
  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
    <motion.div
      className="h-full rounded-full"
      style={{ backgroundColor: color }}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(value, 100)}%` }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    />
  </div>
);

export default function LivePreview({ preview }) {
  const color = getZoneColor(preview.zone);
  const label = getZoneLabel(preview.zone);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-4"
      style={{ boxShadow: `0 0 30px -10px ${color}30` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Recovery Score</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-3xl font-black font-mono" style={{ color }}>
              {preview.recovery_score}
            </span>
            <span className="text-sm font-semibold" style={{ color }}>{label}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground">Readiness</span>
          <p className="text-xl font-bold font-mono text-foreground">{preview.readiness_score}</p>
        </div>
      </div>
      <ZoneBar value={preview.recovery_score} color={color} />
    </motion.div>
  );
}
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function MetricCard({ icon: Icon, title, value, unit, trend, color, className, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-card p-5',
        'hover:border-border/80 transition-all duration-300',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="p-2 rounded-xl bg-secondary">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        </div>
        {trend !== undefined && (
          <span className={cn(
            'text-xs font-semibold',
            trend > 0 ? 'text-[hsl(142,70%,50%)]' : trend < 0 ? 'text-[hsl(0,72%,55%)]' : 'text-muted-foreground'
          )}>
            {trend > 0 ? '+' : ''}{trend}{unit === '%' ? 'pp' : ''}
          </span>
        )}
      </div>
      <div className="flex items-end gap-1">
        <span className={cn('text-2xl font-bold font-mono', color || 'text-foreground')}>
          {value ?? '—'}
        </span>
        {unit && <span className="text-sm text-muted-foreground mb-0.5">{unit}</span>}
      </div>
      {children}
    </motion.div>
  );
}
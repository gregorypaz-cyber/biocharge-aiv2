import { motion } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getZoneColor } from '@/lib/biocharge-utils';
import { cn } from '@/lib/utils';

export default function WeekStrip({ data }) {
  // Build last 7 days, matching with data
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const checkin = data.find(c => c.date === dateStr);
    return {
      date: d,
      dayLabel: format(d, 'EEE', { locale: ptBR }),
      checkin,
    };
  });

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Últimos 7 dias</h3>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(({ date, dayLabel, checkin }, i) => {
          const score = checkin?.readiness_score ?? checkin?.recovery_score;
          const zone = checkin?.zone;
          const color = zone ? getZoneColor(zone) : 'hsl(210,20%,60%)';
          const isToday = i === 6;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex flex-col items-center gap-1.5"
            >
              <span className={cn('text-[10px] font-medium capitalize', isToday ? 'text-foreground' : 'text-muted-foreground')}>
                {dayLabel}
              </span>
              <div
                className={cn(
                  'w-full aspect-square rounded-xl flex items-center justify-center text-xs font-bold font-mono transition-all',
                  isToday && '',
                  !checkin && 'bg-secondary/50'
                )}
                style={
                  color
                    ? {
                        backgroundColor: `${color}18`,
                        color,
                        border: `1px solid ${color}30`,
                        ...(isToday && { boxShadow: `0 0 0 2px ${color}55, 0 0 0 4px hsl(var(--background))` }),
                      }
                    : isToday
                    ? { boxShadow: '0 0 0 2px hsl(var(--border)), 0 0 0 4px hsl(var(--background))' }
                    : {}
                }
                title={score ? `Prontidão: ${score}/100` : 'Sem dados'}
              >
                {score ?? '·'}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
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
          const score = checkin?.recovery_score;
          const zone = checkin?.zone;
          const color = zone ? getZoneColor(zone) : null;
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
                  isToday && 'ring-2 ring-offset-1 ring-offset-background',
                  !checkin && 'bg-secondary/50'
                )}
                style={
                  color
                    ? {
                        backgroundColor: `${color}18`,
                        color,
                        borderColor: `${color}30`,
                        border: '1px solid',
                        ...(isToday && { ringColor: color }),
                      }
                    : {}
                }
                title={score ? `Recovery: ${score}` : 'Sem dados'}
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
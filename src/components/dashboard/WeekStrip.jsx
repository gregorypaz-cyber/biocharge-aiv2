import { motion } from 'framer-motion';
import { format, subDays } from 'date-fns';

function toHSLA(colorStr, alpha = 0.18) {
  try {
    if (!colorStr) return undefined;
    const s = String(colorStr);
    if (s.startsWith('hsl(')) return s.replace(/^hsl\(/, 'hsla(').replace(/\)$/, `, ${alpha})`);
    if (s.startsWith('hsla(')) return s;
    return s;
  } catch { return colorStr; }
}
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

  const scores = days.filter(d => d.checkin).map(d => d.checkin?.readiness_score ?? d.checkin?.recovery_score ?? 0).filter(v => v > 0);
  const avg7 = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Últimos 7 dias</h3>
        {avg7 != null && (
          <span className="text-xs font-mono font-bold text-muted-foreground">
            média {avg7}
          </span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(({ date, dayLabel, checkin }, i) => {
          const score = checkin?.readiness_score ?? checkin?.recovery_score ?? null;
          const zone = checkin?.zone;
          const color = zone ? getZoneColor(zone) : 'hsl(210,20%,60%)';
          const isToday = i === 6;
          const bgColor = toHSLA(color, 0.12);
          const borderColor = toHSLA(color, 0.22);
          const todayRing = isToday ? `0 0 0 2px ${toHSLA(color, 0.34)}` : undefined;

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
                  !checkin && 'bg-secondary/50'
                )}
                style={{
                  backgroundColor: checkin ? bgColor : undefined,
                  color: checkin ? color : undefined,
                  border: checkin ? `1px solid ${borderColor}` : undefined,
                  ...(isToday && todayRing ? { boxShadow: todayRing } : {}),
                }}
                title={checkin ? `Prontidão: ${score}/100` : 'Sem dados'}
              >
                {(typeof score === 'number') ? score : '·'}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
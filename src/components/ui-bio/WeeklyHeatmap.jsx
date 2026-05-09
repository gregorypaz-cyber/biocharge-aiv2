import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function getHeatColor(value) {
  if (value == null) return 'bg-secondary';
  if (value >= 80) return 'bg-[hsl(142,70%,50%)]/80';
  if (value >= 60) return 'bg-[hsl(45,93%,58%)]/80';
  return 'bg-[hsl(0,72%,55%)]/80';
}

export default function WeeklyHeatmap({ data = [], label = 'Recovery' }) {
  const last7 = data.slice(0, 7).reverse();
  
  return (
    <div>
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label} - Últimos 7 dias</span>
      <div className="flex gap-1.5 mt-3">
        {dayLabels.map((day, i) => {
          const entry = last7[i];
          const val = entry?.recovery_score;
          return (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col items-center gap-1.5 flex-1"
            >
              <div
                className={cn('w-full aspect-square rounded-lg', getHeatColor(val))}
                title={val != null ? `${val}` : 'Sem dados'}
              />
              <span className="text-[10px] text-muted-foreground">{day}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
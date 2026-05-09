import { Dumbbell, BedDouble, TrendingDown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const recConfig = {
  'Treino Pesado': { icon: Zap, color: 'text-[hsl(142,70%,55%)]', bg: 'bg-[hsl(142,70%,50%)]/10' },
  'Moderado': { icon: Dumbbell, color: 'text-[hsl(45,93%,63%)]', bg: 'bg-[hsl(45,93%,58%)]/10' },
  'Moderado ou Leve': { icon: TrendingDown, color: 'text-[hsl(45,93%,63%)]', bg: 'bg-[hsl(45,93%,58%)]/10' },
  'Descanso': { icon: BedDouble, color: 'text-[hsl(0,72%,60%)]', bg: 'bg-[hsl(0,72%,55%)]/10' },
};

export default function RecommendationCard({ today }) {
  const config = recConfig[today.recommendation] || recConfig['Moderado'];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4"
    >
      <span className="text-xs text-muted-foreground uppercase tracking-wider">Recomendação do dia</span>
      <div className="flex items-center gap-4">
        <div className={cn('p-3 rounded-xl', config.bg)}>
          <Icon className={cn('w-6 h-6', config.color)} />
        </div>
        <div>
          <h3 className="text-lg font-bold">{today.recommendation}</h3>
          <p className="text-sm text-muted-foreground">{today.training_load}</p>
        </div>
      </div>
      {today.delta_pre != null && (
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Δ Pré:</span>{' '}
            <span className="font-mono font-semibold">{today.delta_pre}</span>
          </div>
          {today.delta_post != null && (
            <div>
              <span className="text-muted-foreground">Δ Pós:</span>{' '}
              <span className="font-mono font-semibold">{today.delta_post}</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
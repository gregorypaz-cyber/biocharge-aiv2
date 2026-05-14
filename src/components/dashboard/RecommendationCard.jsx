import { Dumbbell, BedDouble, TrendingDown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const recConfig = {
  'Treino Pesado': { icon: Zap, color: 'text-[hsl(142,70%,55%)]', bg: 'bg-[hsl(142,70%,50%)]/10' },
  'Moderado': { icon: Dumbbell, color: 'text-[hsl(45,93%,63%)]', bg: 'bg-[hsl(45,93%,58%)]/10' },
  'Moderado ou Leve': { icon: TrendingDown, color: 'text-[hsl(45,93%,63%)]', bg: 'bg-[hsl(45,93%,58%)]/10' },
  'Descanso': { icon: BedDouble, color: 'text-[hsl(0,72%,60%)]', bg: 'bg-[hsl(0,72%,55%)]/10' },
};

const CONFIDENCE_STYLE = {
  Alta:  'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  Média: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25',
  Baixa: 'bg-secondary text-muted-foreground border border-border',
};

export default function RecommendationCard({ today, rec, onSchedule, onExperiment, onSnooze }) {
  const config = recConfig[today.recommendation] || recConfig['Moderado'];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4"
      aria-label={`Recomendação: ${today.recommendation}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Recomendação do dia</span>
        {rec?.confidence && (
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', CONFIDENCE_STYLE[rec.confidence])}>
            {rec.confidence}
          </span>
        )}
      </div>

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

      {(onSchedule || onExperiment || onSnooze) && (
        <div className="flex gap-2 flex-wrap pt-1">
          {onSchedule && (
            <button
              onClick={onSchedule}
              aria-label="Agendar treino"
              className="text-xs px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-medium"
            >
              Agendar
            </button>
          )}
          {onExperiment && (
            <button
              onClick={onExperiment}
              aria-label="Marcar como experimento"
              className="text-xs px-3 py-1.5 rounded-xl bg-secondary text-foreground/80 border border-border hover:bg-secondary/80 transition-colors font-medium"
            >
              Testar
            </button>
          )}
          {onSnooze && (
            <button
              onClick={onSnooze}
              aria-label="Adiar recomendação"
              className="text-xs px-3 py-1.5 rounded-xl bg-secondary text-muted-foreground border border-border hover:bg-secondary/80 transition-colors"
            >
              Adiar
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
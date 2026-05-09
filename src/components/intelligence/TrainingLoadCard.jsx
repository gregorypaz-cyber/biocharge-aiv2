import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const RISK_CONFIG = {
  low: { label: 'Saudável', color: 'hsl(142,70%,50%)', text: 'Carga bem distribuída e sustentável' },
  moderate: { label: 'Atenção', color: 'hsl(45,93%,58%)', text: 'Carga aguda elevada — monitore a recuperação' },
  high: { label: 'Risco de Overreaching', color: 'hsl(0,72%,55%)', text: 'Spike de carga detectado — reduza o volume' },
};

export default function TrainingLoadCard({ trainingLoad, sleepDebt }) {
  if (!trainingLoad) return null;

  const risk = RISK_CONFIG[trainingLoad.risk] || RISK_CONFIG.low;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="rounded-2xl border border-border/50 bg-card p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Carga de Treino</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Aguda</p>
          <p className="text-xl font-black font-mono">{trainingLoad.acute}</p>
          <p className="text-[10px] text-muted-foreground">7 dias</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Crônica</p>
          <p className="text-xl font-black font-mono">{trainingLoad.chronic}</p>
          <p className="text-[10px] text-muted-foreground">42 dias</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Ratio A:C</p>
          <p className="text-xl font-black font-mono" style={{ color: risk.color }}>{trainingLoad.ratio}</p>
          <p className="text-[10px]" style={{ color: risk.color }}>{risk.label}</p>
        </div>
      </div>

      <div
        className="text-xs px-3 py-2 rounded-lg border"
        style={{
          color: risk.color,
          backgroundColor: risk.color.replace('hsl(', 'hsla(').replace(')', ', 0.06)'),
          borderColor: risk.color.replace('hsl(', 'hsla(').replace(')', ', 0.2)'),
        }}
      >
        {risk.text}
      </div>

      {sleepDebt && sleepDebt.debt > 0 && (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/30 pt-3">
          <span>Déficit de sono semanal</span>
          <span className={cn(
            'font-mono font-semibold',
            sleepDebt.debt > 5 ? 'text-destructive' : sleepDebt.debt > 2 ? 'text-yellow-400' : 'text-primary'
          )}>
            {sleepDebt.debt}h ({sleepDebt.avg}h/noite)
          </span>
        </div>
      )}
    </motion.div>
  );
}
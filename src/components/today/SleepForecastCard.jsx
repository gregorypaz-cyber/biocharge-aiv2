import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Sparkles } from 'lucide-react';

export default function SleepForecastCard({ checkin }) {
  const sleepNeed = checkin?.sleep_need_tonight;
  const forecast = checkin?.next_day_forecast;

  if (!sleepNeed && !forecast) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Moon className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide">
          Hoje à noite & amanhã
        </span>
      </div>

      {sleepNeed ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/8 border border-blue-500/15">
          <div className="text-3xl font-black font-mono text-blue-400">{sleepNeed}h</div>
          <div>
            <p className="text-sm font-semibold">Meta de sono para hoje à noite</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Esta é a recomendação para hoje, baseada na carga acumulada e na sua prontidão da manhã.
            </p>
          </div>
        </div>
      ) : null}

      {forecast ? (
        <div className="flex gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-400 mb-1">
              Amanhã cedo (projeção)
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {forecast}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Esta projeção vale para amanhã e depende do sono desta noite e da carga que você acumular hoje.
            </p>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
``
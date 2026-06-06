import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Sparkles, ArrowRight } from 'lucide-react';

export default function SleepForecastCard({ checkin, sleepDebt = 0 }) {
  const sleepNeed = checkin?.sleep_need_tonight;
  const forecast = checkin?.next_day_forecast;

  if (!sleepNeed && !forecast) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-blue-300 uppercase tracking-wide">
            Missão da noite
          </span>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
          Sono
        </span>
      </div>

      {sleepNeed ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/8 border border-blue-500/15">
          <div className="text-3xl font-black font-mono text-blue-400">
            {sleepNeed}h
          </div>

          <div>
            <p className="text-sm font-semibold">
              Meta de sono para hoje
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Esta é a dose de recuperação sugerida com base na carga acumulada e na leitura da manhã.
            </p>
          </div>
        </div>
      ) : null}

      {forecast ? (
        <div className="rounded-xl bg-black/15 border border-white/5 px-3 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs font-semibold text-amber-400">
              Amanhã cedo
            </p>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {forecast}
          </p>

          <div className="flex items-start gap-2 pt-1">
            <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              A leitura de amanhã ainda depende do sono desta noite, stress e carga restante do dia.
            </p>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
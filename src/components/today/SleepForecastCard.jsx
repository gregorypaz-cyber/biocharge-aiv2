import React from 'react';
import { motion } from 'framer-motion';
import { Moon, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// "Missão da noite": meta de sono PERSONALIZADA + débito.
// A previsão de amanhã (next_day_forecast) NÃO é mostrada aqui de propósito —
// ela já aparece no hero "Prévia de amanhã" (evita o texto duplicado).
export default function SleepForecastCard({ checkin, sleepDebt = 0 }) {
  const sleepNeed = checkin?.sleep_need_tonight;

  if (!sleepNeed && !(sleepDebt >= 2)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold tracking-tight">
            Missão da noite
          </span>
        </div>

        <span className="t-micro font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
          Sono
        </span>
      </div>

      {sleepNeed ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/8 border border-blue-500/15">
          <div className="text-3xl font-semibold font-mono text-blue-400">
            {sleepNeed}h
          </div>

          <div>
            <p className="text-sm font-semibold">
              Meta de sono para hoje
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Ajustada ao seu histórico: a faixa em que você costuma recuperar melhor, com um piso de saúde e um teto realista pra sua rotina.
            </p>
          </div>
        </div>
      ) : null}

      {sleepDebt >= 2 ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/15">
          <span className="text-xs">😴</span>
          <p className="text-xs text-amber-300/90">
            Débito de sono: <span className="font-semibold">~{Math.round(sleepDebt)}h</span> nos últimos 7 dias{sleepDebt >= 4 ? ' — vale priorizar sono nos próximos dias.' : '.'}
          </p>
        </div>
      ) : null}

      <Link
        to="/trends"
        className="flex items-center justify-end gap-1 t-micro font-medium text-blue-300/80 hover:text-blue-200 transition-colors tap-target"
      >
        Ver tendência do sono
        <ArrowRight className="w-3 h-3" />
      </Link>
    </motion.div>
  );
}

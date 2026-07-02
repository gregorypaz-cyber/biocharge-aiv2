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
      className="rounded-2xl border border-domain-sleep/20 bg-domain-sleep/5 p-4 space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-domain-sleep" />
          <span className="text-xs font-semibold text-domain-sleep uppercase tracking-wide">
            Missão da noite
          </span>
        </div>

        <span className="text-micro font-bold px-2 py-0.5 rounded-full bg-domain-sleep/10 text-domain-sleep border border-domain-sleep/20">
          Sono
        </span>
      </div>

      {sleepNeed ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-domain-sleep/8 border border-domain-sleep/15">
          <div className="text-3xl font-black font-mono text-domain-sleep">
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
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-health-amber/8 border border-health-amber/15">
          <span className="text-xs">😴</span>
          <p className="text-xs text-health-amber/60">
            Débito de sono: <span className="font-semibold">~{Math.round(sleepDebt)}h</span> nos últimos 7 dias{sleepDebt >= 4 ? ' — vale priorizar sono nos próximos dias.' : '.'}
          </p>
        </div>
      ) : null}

      <Link
        to="/trends"
        className="flex items-center justify-end gap-1 text-support font-medium text-domain-sleep/80 hover:text-blue-200 transition-colors"
      >
        Ver tendência do sono
        <ArrowRight className="w-3 h-3" />
      </Link>
    </motion.div>
  );
}

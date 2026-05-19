import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const ZONE_CONFIG = {
  green:  { label: 'Alta',     color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  yellow: { label: 'Moderada', color: 'text-yellow-400',  bg: 'bg-yellow-500/15'  },
  red:    { label: 'Baixa',    color: 'text-red-400',     bg: 'bg-red-500/15'     },
};

const AUTO_REDIRECT_MS = 5000;

export default function CheckinSuccessOverlay({ checkin, onContinue }) {
  const [progress, setProgress] = useState(0);

  const score = checkin?.readiness_score ?? checkin?.recovery_score ?? checkin?.morning_recovery_score ?? checkin?.biocharge_morning ?? 0;
  const zone = checkin?.zone ?? 'yellow';
  const zoneCfg = ZONE_CONFIG[zone] || ZONE_CONFIG.yellow;
  const headline = checkin?.headline_today;
  const recommendation = checkin?.recommendation;

  // Progress bar + auto-redirect
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / AUTO_REDIRECT_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        onContinue();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [onContinue]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm px-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Label */}
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center">
          Plano do dia gerado
        </p>

        {/* Headline */}
        {headline ? (
          <h1 className="text-2xl font-black leading-snug tracking-tight text-center">
            {headline}
          </h1>
        ) : (
          <h1 className="text-2xl font-black text-center">Seu plano está pronto.</h1>
        )}

        {/* Score + zona */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-mono font-black">{score}</span>
          <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${zoneCfg.bg} ${zoneCfg.color}`}>
            {zoneCfg.label}
          </span>
        </div>

        {/* Decisão principal */}
        {recommendation && (
          <div className="rounded-2xl border border-border/50 bg-card px-4 py-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Decisão principal</p>
            <p className="text-sm font-semibold leading-snug">{recommendation}</p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onContinue}
          className="w-full flex items-center justify-center gap-2 h-13 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all"
        >
          Ver meu dia completo <ArrowRight className="w-4 h-4" />
        </button>

        {/* Skip */}
        <button
          onClick={onContinue}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          Pular
        </button>

        {/* Progress bar */}
        <div className="w-full h-0.5 bg-border/40 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary/50 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
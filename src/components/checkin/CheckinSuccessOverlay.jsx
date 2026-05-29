import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const ZONE_CONFIG = {
  green: {
    label: 'Prontidão alta',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
  },
  yellow: {
    label: 'Prontidão moderada',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/15',
  },
  red: {
    label: 'Prontidão baixa',
    color: 'text-red-400',
    bg: 'bg-red-500/15',
  },
};

const AUTO_REDIRECT_MS = 8000;

function getDecisionLabel(mode, zone) {
  if (mode === 'train_high') return 'Treino mais forte';
  if (mode === 'train_moderate') return 'Treino moderado';
  if (mode === 'train_light') return 'Treino leve';
  if (mode === 'recover') return 'Recuperação';

  if (zone === 'green') return 'Boa margem hoje';
  if (zone === 'red') return 'Recuperação hoje';
  return 'Dia controlado';
}

function getMainText(checkin) {
  return (
    checkin?.headline_today ||
    checkin?.recommendation ||
    'Seu check-in foi salvo e o dia já pode ser interpretado.'
  );
}

function getTomorrowReason(checkin) {
  if (checkin?.delayed_fatigue_alert) {
    return checkin.delayed_fatigue_alert;
  }

  if (checkin?.next_day_forecast) {
    return checkin.next_day_forecast;
  }

  if (checkin?.sleep_need_tonight != null) {
    return `A resposta do seu corpo amanhã vai depender muito de como você dormir hoje. Meta sugerida: ${checkin.sleep_need_tonight}h.`;
  }

  return 'A leitura de amanhã pode mudar bastante com base no que você fizer hoje.';
}

export default function CheckinSuccessOverlay({ checkin, onContinue }) {
  const [progress, setProgress] = useState(0);

  const readiness =
  checkin?.readiness_score ??
  checkin?.recovery_score ??
  0;

const recovery =
  checkin?.recovery_score ??
  checkin?.morning_recovery_score ??
  readiness;


  const zone = checkin?.zone ?? 'yellow';
  const zoneCfg = ZONE_CONFIG[zone] || ZONE_CONFIG.yellow;
  const decisionMode = checkin?.decision_mode ?? null;
  const decisionLabel = getDecisionLabel(decisionMode, zone);
  const mainText = getMainText(checkin);
  const recommendation =
    checkin?.recommendation && checkin?.recommendation !== checkin?.headline_today
      ? checkin.recommendation
      : null;

const tomorrowReason = getTomorrowReason(checkin);

  const secondsLeft = useMemo(() => {
    const remaining = Math.max(0, AUTO_REDIRECT_MS - (progress / 100) * AUTO_REDIRECT_MS);
    return Math.ceil(remaining / 1000);
  }, [progress]);

  useEffect(() => {
    const start = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / AUTO_REDIRECT_MS) * 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        onContinue?.();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [onContinue]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm px-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm space-y-5"
      >
        {/* Top */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-primary" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Check-in salvo
            </p>
            <h1 className="text-2xl font-black leading-snug tracking-tight mt-2">
              {mainText}
            </h1>
          </div>
        </div>

        {/* Core summary */}
        <div className="rounded-2xl border border-border/50 bg-card px-4 py-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
<p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Prontidão do dia
              </p>
              <p className="text-3xl font-black font-mono">{readiness}</p>
<p className="text-[11px] text-muted-foreground">
  Base da manhã {recovery}
</p>

            </div>

            <div className="text-right">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${zoneCfg.bg} ${zoneCfg.color}`}
              >
                {zoneCfg.label}
              </span>

              <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wider">
                Prescrição do dia
              </p>
              <p className="text-sm font-semibold">{decisionLabel}</p>
            </div>
          </div>

          {recommendation && (
            <div className="rounded-xl bg-secondary/40 border border-border/40 px-3 py-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Linha do dia
              </p>
              <p className="text-sm leading-snug font-medium">{recommendation}</p>
            </div>
          )}

<div className="rounded-xl bg-primary/5 border border-primary/10 px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
  O que pode mudar amanhã
</p>
<p className="text-sm leading-snug font-medium">{tomorrowReason}</p>
          </div>

        </div>

        {/* CTA */}
        <button
          onClick={onContinue}
          className="w-full flex items-center justify-center gap-2 h-13 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all"
        >
          Ir para Hoje
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Auto redirect */}
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground text-center">
            Indo automaticamente para a tela <span className="font-semibold">Hoje</span> em {secondsLeft}s
          </p>

          <div className="w-full h-1 bg-border/40 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary/50 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Skip */}
        <button
          onClick={onContinue}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          Pular transição
        </button>
      </motion.div>
    </motion.div>
  );
}
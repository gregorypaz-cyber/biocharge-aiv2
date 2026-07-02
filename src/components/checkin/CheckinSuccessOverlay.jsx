import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Moon, Target, Zap } from 'lucide-react';

const ZONE_CONFIG = {
  green: {
    label: 'Alta',
    title: 'Recovery alto',
    color: 'text-zone-green',
    bg: 'bg-zone-green/15',
    border: 'border-zone-green/20',
  },
  yellow: {
    label: 'Moderada',
    title: 'Recovery moderado',
    color: 'text-zone-yellow',
    bg: 'bg-zone-yellow/15',
    border: 'border-zone-yellow/20',
  },
  red: {
    label: 'Baixa',
    title: 'Recovery baixo',
    color: 'text-zone-red',
    bg: 'bg-zone-red/15',
    border: 'border-zone-red/20',
  },
};

const AUTO_REDIRECT_MS = 8000;

function getDecisionLabel(mode, zone) {
  if (mode === 'train_high') return 'Treino forte';
  if (mode === 'train_moderate') return 'Treino moderado';
  if (mode === 'train_light') return 'Treino leve';
  if (mode === 'recover') return 'Recuperação';

  if (zone === 'green') return 'Boa margem hoje';
  if (zone === 'red') return 'Recuperação hoje';
  return 'Dia controlado';
}

function getDecisionText(mode, zone) {
  if (mode === 'train_high') {
    return 'Há boa margem para intensidade, desde que o aquecimento confirme a resposta do corpo.';
  }

  if (mode === 'train_moderate') {
    return 'A melhor dose hoje é consistência com controle, sem transformar moderado em máximo.';
  }

  if (mode === 'train_light') {
    return 'Há espaço para movimento, mas a prioridade é preservar recuperação para os próximos dias.';
  }

  if (mode === 'recover') {
    return 'Hoje o maior retorno vem de reduzir carga, recuperar energia e proteger o sono.';
  }

  if (zone === 'green') return 'Seu corpo acordou com boa margem, mas ainda vale executar com controle.';
  if (zone === 'red') return 'Sua leitura sugere um dia mais conservador, com foco em recuperação.';
  return 'Seu dia pede uma dose controlada e atenção aos sinais do corpo.';
}

function getMainText(checkin, decisionLabel) {
  return (
    checkin?.headline_today ||
    checkin?.recommendation ||
    `${decisionLabel} é a melhor direção para hoje.`
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
    return `A resposta do seu corpo amanhã vai depender bastante do sono de hoje. Meta sugerida: ${checkin.sleep_need_tonight}h.`;
  }

  return 'A leitura de amanhã ainda depende da carga, do stress e principalmente do sono de hoje.';
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
  const decisionText = getDecisionText(decisionMode, zone);
  const mainText = getMainText(checkin, decisionLabel);
  const tomorrowReason = getTomorrowReason(checkin);
  const sleepNeed = checkin?.sleep_need_tonight ?? null;

  const recommendation =
    checkin?.recommendation && checkin?.recommendation !== checkin?.headline_today
      ? checkin.recommendation
      : null;

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
              Plano do dia calculado
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              {mainText}
            </p>
          </div>
        </div>

        {/* Core summary */}
        <div className="rounded-2xl border border-border/50 bg-card px-4 py-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-micro text-muted-foreground uppercase tracking-wider mb-1">
                Score do dia
              </p>

              <p className="text-4xl font-black font-mono leading-none">
                {readiness}
              </p>

              <p className="text-support text-muted-foreground mt-1">
                Recovery base {recovery}
              </p>
            </div>

            <div className="text-right">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${zoneCfg.bg} ${zoneCfg.color} ${zoneCfg.border}`}
              >
                {zoneCfg.label}
              </span>

              <p className="text-micro text-muted-foreground mt-2 uppercase tracking-wider">
                Dose do dia
              </p>

              <p className="text-sm font-semibold">
                {decisionLabel}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-secondary/40 border border-border/40 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <Target className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-micro text-muted-foreground uppercase tracking-wider mb-1">
                  Missão de hoje
                </p>

                <p className="text-sm leading-snug font-medium">
                  {decisionText}
                </p>
              </div>
            </div>
          </div>

          {recommendation && (
            <div className="rounded-xl bg-secondary/30 border border-border/30 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-zone-yellow shrink-0 mt-0.5" />
                <div>
                  <p className="text-micro text-muted-foreground uppercase tracking-wider mb-1">
                    Linha do dia
                  </p>

                  <p className="text-sm leading-snug font-medium">
                    {recommendation}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <Moon className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />

              <div>
                <p className="text-micro text-muted-foreground uppercase tracking-wider mb-1">
                  Hoje à noite
                </p>

                <p className="text-sm leading-snug font-medium">
                  {sleepNeed != null ? `Meta de sono: ${sleepNeed}h.` : 'Feche o dia protegendo a recuperação.'}
                </p>

                <p className="text-support text-muted-foreground leading-relaxed mt-1">
                  {tomorrowReason}
                </p>
              </div>
            </div>
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
          <p className="text-support text-muted-foreground text-center">
            Indo automaticamente para <span className="font-semibold">Hoje</span> em {secondsLeft}s
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
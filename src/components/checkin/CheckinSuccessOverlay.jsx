import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Moon, Target, Zap } from 'lucide-react';
import RecoveryField from '@/components/today/RecoveryField';
import { getZone, getZoneColor } from '@/lib/biocharge-utils';

// slate desaturado do "nascimento" — quando não há ontem, a gema nasce cinza
// e ganha cor (WHOOP), em vez de morfar de um dia anterior (ART).
const BIRTH_COLOR = 'hsl(215, 14%, 42%)';
const ZONE_FAIXA = { green: 'Alta', yellow: 'Moderada', red: 'Baixa' };

function parseHslParts(str) {
  const m = String(str).match(/hsl\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/i);
  return m ? { h: +m[1], s: +m[2], l: +m[3] } : { h: 215, s: 14, l: 42 };
}
const lerp = (a, b, t) => a + (b - a) * t;
// lerp linear no HSL — hue não dá volta, então red(0)→green(142) varre
// exatamente o gradiente de zona (passa pelo âmbar), que é o significado certo.
function lerpHsl(from, to, t) {
  const a = parseHslParts(from), b = parseHslParts(to);
  // quantiza pra não re-disparar os efeitos internos da gema a cada frame
  const h = Math.round(lerp(a.h, b.h, t) / 3) * 3;
  const s = Math.round(lerp(a.s, b.s, t) / 2) * 2;
  const l = Math.round(lerp(a.l, b.l, t) / 2) * 2;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

// O SALTO — a gema se remorfa ao vivo do valor de ontem pro de hoje: uma única
// animação orgânica (~760ms) depois de um respiro pra tela assentar. Valor conta,
// cor migra pela zona, e o peso do glifo engrossa junto (movimento 1).
export function useGemMorph({ fromVal, toVal, fromColor, toColor, delay = 300, dur = 880 }) {
  const [state, setState] = useState({ value: fromVal, color: fromColor });
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setState({ value: toVal, color: toColor }); return; }
    let raf;
    const t0 = performance.now() + delay;
    const step = (now) => {
      if (now < t0) { raf = requestAnimationFrame(step); return; }
      const k = Math.max(0, Math.min(1, (now - t0) / dur));
      if (k >= 1) { setState({ value: toVal, color: toColor }); return; } // pousa exato na cor da Today
      // smoothstep (easeInOutCubic): pontas suaves, meio firme — deixa o âmbar
      // ser atravessado num ritmo visível (o morph de cor é o gesto, ART).
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      setState({ value: lerp(fromVal, toVal, e), color: lerpHsl(fromColor, toColor, e) });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [fromVal, toVal, fromColor, toColor, delay, dur]);
  return state;
}

const ZONE_CONFIG = {
  green: {
    label: 'Alta',
    title: 'Recovery alto',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/20',
  },
  yellow: {
    label: 'Moderada',
    title: 'Recovery moderado',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/15',
    border: 'border-yellow-500/20',
  },
  red: {
    label: 'Baixa',
    title: 'Recovery baixo',
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/20',
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

export default function CheckinSuccessOverlay({ checkin, previousCheckin, onContinue }) {
  const [progress, setProgress] = useState(0);

  const readiness =
    checkin?.readiness_score ??
    checkin?.recovery_score ??
    0;

  const recovery =
    checkin?.recovery_score ??
    checkin?.morning_recovery_score ??
    readiness;

  // A gema é a de Recovery (a mesma da Today) — morfa do Recovery de ontem pro
  // de hoje. Sem ontem: nasce slate num piso e floresce na cor/valor de hoje.
  const todayRec = Math.round(recovery);
  const todayColor = getZoneColor(getZone(todayRec));
  const prevRec =
    previousCheckin?.recovery_score ??
    previousCheckin?.morning_recovery_score ??
    null;
  const hasPrev = prevRec != null;
  const fromVal = hasPrev ? Math.round(prevRec) : Math.max(0, todayRec - 16);
  const fromColor = hasPrev ? getZoneColor(getZone(Math.round(prevRec))) : BIRTH_COLOR;

  const gem = useGemMorph({ fromVal, toVal: todayRec, fromColor, toColor: todayColor });
  const gemZoneFaixa = ZONE_FAIXA[getZone(todayRec)] || 'Moderada';

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
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-background/95 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm mx-auto space-y-5 min-h-full flex flex-col justify-center py-8 px-6"
      >
        {/* Top — O SALTO: a gema se forma ao vivo do dia de ontem pro de hoje */}
        <div className="flex flex-col items-center text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Check-in salvo
          </p>

          {/* O SALTO: layoutId compartilhado com o herói da Today. Ao "Ir para
             Hoje", esta gema VOA e cresce até virar o herói, sem cold mount. */}
          <motion.div
            layoutId="reck-hero"
            transition={{ type: 'spring', stiffness: 230, damping: 28 }}
            className="-mt-1"
          >
            <RecoveryField
              value={gem.value}
              max={100}
              color={gem.color}
              label="Recovery"
              caption={gemZoneFaixa}
              size={208}
              live
            />
          </motion.div>

          <div className="-mt-2">
            <h1 className="text-2xl font-semibold leading-snug tracking-tight">
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
              <p className="t-micro text-muted-foreground uppercase tracking-wider mb-1">
                Prontidão do dia
              </p>
              <p className="text-sm">
                <span className="font-semibold text-foreground">Readiness {readiness}</span>
                <span className="text-muted-foreground"> · Recovery base {recovery}</span>
              </p>
            </div>

            <div className="text-right shrink-0">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${zoneCfg.bg} ${zoneCfg.color} ${zoneCfg.border}`}
              >
                {zoneCfg.label}
              </span>

              <p className="t-micro text-muted-foreground mt-2 uppercase tracking-wider">
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
                <p className="t-micro text-muted-foreground uppercase tracking-wider mb-1">
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
                <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="t-micro text-muted-foreground uppercase tracking-wider mb-1">
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
                <p className="t-micro text-muted-foreground uppercase tracking-wider mb-1">
                  Hoje à noite
                </p>

                <p className="text-sm leading-snug font-medium">
                  {sleepNeed != null ? `Meta de sono: ${sleepNeed}h.` : 'Feche o dia protegendo a recuperação.'}
                </p>

                <p className="t-micro text-muted-foreground leading-relaxed mt-1">
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
          <p className="t-micro text-muted-foreground text-center">
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
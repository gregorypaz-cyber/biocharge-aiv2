import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Clock, HeartPulse, BedDouble, Activity } from 'lucide-react';
import { getZoneColor } from '@/lib/biocharge-utils';
import { formatDateFull } from '@/lib/date-utils';
import { useMotionSafe } from '@/hooks/use-motion-safe';

function getRecoverySummary(score) {
  if (score >= 85) {
    return { title: 'Manhã muito boa', subtitle: 'Seu corpo acordou com ótima recuperação.' };
  }
  if (score >= 70) {
    return { title: 'Manhã boa', subtitle: 'Recuperação adequada para sustentar o dia com controle.' };
  }
  if (score >= 55) {
    return { title: 'Manhã moderada', subtitle: 'Há recuperação parcial — vale respeitar mais o contexto do dia.' };
  }
  if (score >= 40) {
    return { title: 'Manhã limitada', subtitle: 'Seu corpo não acordou com grande margem para carga.' };
  }
  return { title: 'Manhã crítica', subtitle: 'Seu corpo pede cautela e recuperação.' };
}

function toHSLA(colorStr, alpha = 0.18) {
  try {
    if (!colorStr) return undefined;
    const s = String(colorStr);
    if (s.startsWith('hsl(')) return s.replace(/^hsl\(/, 'hsla(').replace(/\)$/, `, ${alpha})`);
    if (s.startsWith('hsla(')) return s;
    return s;
  } catch {
    return colorStr;
  }
}

function formatDelta(delta) {
  if (delta == null || Math.abs(delta) <= 5) return null;
  if (delta > 0) return `↑ ${delta}% acima do seu normal`;
  return `↓ ${Math.abs(delta)}% abaixo do seu normal`;
}

// ─── Contexto pessoal por métrica (faixa dos últimos dias) ──────────────────
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

function hrvContext(current, baseline) {
  if (current == null || baseline == null) return null;
  const d = ((current - baseline) / baseline) * 100; // HRV: maior = melhor
  if (d <= -8) return { text: `abaixo do normal (~${Math.round(baseline)})`, tone: 'low' };
  if (d >= 8) return { text: `acima do normal (~${Math.round(baseline)})`, tone: 'good' };
  return { text: 'dentro da sua faixa', tone: 'neutral' };
}

function rhrContext(current, baseline) {
  if (current == null || baseline == null) return null;
  const d = current - baseline; // FC repouso: menor = melhor
  if (d >= 3) return { text: `acima do normal (~${Math.round(baseline)})`, tone: 'low' };
  if (d <= -3) return { text: `abaixo do normal (~${Math.round(baseline)})`, tone: 'good' };
  return { text: `no seu normal (~${Math.round(baseline)})`, tone: 'neutral' };
}

function sleepContext(hours, target) {
  if (hours == null) return null;
  const t = target || 7.5;
  if (hours >= t - 0.25) return { text: `na meta (~${t}h)`, tone: 'good' };
  if (hours >= t - 1) return { text: `pouco abaixo da meta (~${t}h)`, tone: 'low' };
  return { text: `abaixo da meta (~${t}h)`, tone: 'low' };
}

function Qualifier({ ctx }) {
  if (!ctx) return null;
  const cls =
    ctx.tone === 'good' ? 'text-emerald-400' :
    ctx.tone === 'low' ? 'text-amber-400' :
    'text-muted-foreground';
  return <p className={`text-[10px] mt-0.5 leading-tight ${cls}`}>{ctx.text}</p>;
}

export default function MorningRecoveryCard({ checkin, delta = null, recentCheckins = [] }) {
  const score = checkin?.morning_recovery_score || checkin?.recovery_score || 0;
  const zone = checkin?.zone || 'yellow';
  const color = getZoneColor(zone) || 'hsl(45,93%,58%)';
  const summary = getRecoverySummary(score);
  const deltaText = formatDelta(delta);

  const { initial, transition: reducedTransition } = useMotionSafe();

  // Valores de hoje
  const hrvVal = checkin?.hrv_manual ?? checkin?.hrv ?? null;
  const rhrVal = checkin?.resting_hr ?? checkin?.resting_heart_rate ?? null;
  const sleepVal = typeof checkin?.sleep_hours === 'number' ? checkin.sleep_hours : null;

  // Faixas pessoais (média dos últimos ~14 dias)
  const hrvSamples = (recentCheckins || [])
    .map((c) => c.hrv_manual ?? c.hrv)
    .filter((v) => typeof v === 'number' && v > 0)
    .slice(0, 14);
  const rhrSamples = (recentCheckins || [])
    .map((c) => c.resting_hr ?? c.resting_heart_rate)
    .filter((v) => typeof v === 'number' && v > 0)
    .slice(0, 14);

  const hrvCtx = hrvContext(hrvVal, mean(hrvSamples));
  const rhrCtx = rhrContext(rhrVal, mean(rhrSamples));
  const sleepCtx = sleepContext(sleepVal, checkin?.sleep_need_tonight ?? 7.5);

  return (
    <motion.div
      initial={initial ?? { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedTransition}
      className="rounded-2xl border border-border bg-card p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Moon className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Resumo da manhã
        </span>

        <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDateFull(checkin.date)}
        </span>
      </div>

      {/* Main block */}
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center font-mono font-black text-xl shrink-0"
          style={{ backgroundColor: toHSLA(color, 0.2), color }}
        >
          {score}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug">{summary.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            {summary.subtitle}
          </p>

          {deltaText && (
            <p className={`text-[11px] mt-1 font-medium ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {deltaText}
            </p>
          )}

          {checkin?.delayed_fatigue_alert && (
            <p className="text-[11px] text-amber-400 mt-1 leading-relaxed">
              ⚠️ {checkin.delayed_fatigue_alert}
            </p>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-secondary/50 border border-border/40 p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">RMSSD</span>
          </div>
          <p className="text-sm font-semibold">
            {hrvVal != null ? <>{hrvVal}<span className="text-[10px] font-normal text-muted-foreground"> ms</span></> : '—'}
          </p>
          <Qualifier ctx={hrvCtx} />
        </div>

        <div className="rounded-xl bg-secondary/50 border border-border/40 p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <HeartPulse className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">RHR</span>
          </div>
          <p className="text-sm font-semibold">
            {rhrVal != null ? <>{rhrVal}<span className="text-[10px] font-normal text-muted-foreground"> bpm</span></> : '—'}
          </p>
          <Qualifier ctx={rhrCtx} />
        </div>

        <div className="rounded-xl bg-secondary/50 border border-border/40 p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <BedDouble className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Sono</span>
          </div>
          <p className="text-sm font-semibold">
            {sleepVal != null ? `${sleepVal}h` : '—'}
          </p>
          <Qualifier ctx={sleepCtx} />
        </div>
      </div>
    </motion.div>
  );
}

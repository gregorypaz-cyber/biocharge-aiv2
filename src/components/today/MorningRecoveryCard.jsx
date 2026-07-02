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
    ctx.tone === 'good' ? 'text-zone-green' :
    ctx.tone === 'low' ? 'text-health-amber' :
    'text-muted-foreground';
  return <p className={`text-micro mt-0.5 leading-tight ${cls}`}>{ctx.text}</p>;
}

// ─── Marcadores estilo Noop: sparkline 14d + chip de delta vs baseline ──────
function MiniSpark({ data = [], color = 'hsl(215,20%,55%)' }) {
  const vals = (data || []).filter((v) => v != null && !Number.isNaN(v));
  if (vals.length < 3) return null;
  const mn = Math.min(...vals);
  const range = Math.max(...vals) - mn || 1;
  const pts = vals
    .map((v, i) => `${((i / (vals.length - 1)) * 100).toFixed(1)},${(18 - ((v - mn) / range) * 16).toFixed(1)}`)
    .join(' ');
  return (
    <svg width="100%" height="20" viewBox="0 0 100 20" preserveAspectRatio="none" className="mt-1.5" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

function DeltaChip({ delta, goodUp = true, unit = '' }) {
  if (delta == null || Number.isNaN(delta)) return null;
  const r = Math.round(delta);
  if (Math.abs(r) <= 1) return <p className="text-micro mt-0.5 text-muted-foreground">no seu normal</p>;
  const good = goodUp ? r > 0 : r < 0;
  const cls = good ? 'text-zone-green' : 'text-health-amber';
  return (
    <p className={`text-micro mt-0.5 font-medium ${cls}`}>
      {r > 0 ? '+' : ''}{r}{unit} vs base
    </p>
  );
}

// ─── Estágios do sono — breakdown bar estilo WHOOP/Noop ──────────────────────
function SleepStages({ sleepHours, deepPct, remPct }) {
  if (deepPct == null || sleepHours == null || sleepHours <= 0) return null;
  const hasRem = remPct != null && remPct > 0;
  const deep = Math.round(deepPct);
  const rem = hasRem ? Math.round(remPct) : 0;
  const light = Math.max(0, 100 - deep - rem);
  const fmtH = (pct) => {
    const hrs = sleepHours * pct / 100;
    const h = Math.floor(hrs);
    const m = Math.round((hrs - h) * 60);
    return `${h}h${String(m).padStart(2, '0')}`;
  };
  const stages = [
    { label: 'Profundo', pct: deep, color: 'hsl(222,55%,38%)' },
    ...(hasRem ? [{ label: 'REM', pct: rem, color: 'hsl(205,88%,58%)' }] : []),
    { label: 'Leve', pct: light, color: 'hsl(215,35%,50%)' },
  ];
  return (
    <div className="space-y-2.5">
      <p className="text-micro st text-muted-foreground">
        Estágios do sono
      </p>
      <div className="flex h-3 rounded-full overflow-hidden gap-[2px]">
        {stages.map((s) => (
          <motion.div
            key={s.label}
            initial={{ width: 0 }}
            animate={{ width: `${s.pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ backgroundColor: s.color }}
            className="h-full first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>
      <div className={`grid gap-2 ${hasRem ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {stages.map((s) => (
          <div key={s.label} className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-micro text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-sm font-mono font-semibold">{s.pct}%</p>
            <p className="text-micro text-muted-foreground">{fmtH(s.pct)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MorningRecoveryCard({ checkin, delta = null, recentCheckins = [] }) {
  // Cold-start: sem recovery confiável, NÃO mostramos "0"/"Manhã crítica" (falso).
  const rawScore = checkin?.morning_recovery_score ?? checkin?.recovery_score ?? null;
  const isCalibrating = rawScore == null;
  const score = rawScore ?? 0;
  const zone = checkin?.zone || 'yellow';
  const color = isCalibrating ? 'hsl(215,15%,55%)' : (getZoneColor(zone) || 'hsl(45,93%,58%)');
  const summary = isCalibrating
    ? { title: 'Calibrando', subtitle: 'Ainda reunindo noites de HRV para um Recovery confiável. Os sinais crus abaixo já valem.' }
    : getRecoverySummary(score);
  const deltaText = isCalibrating ? null : formatDelta(delta);

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

  // Séries 14d (cronológicas: antigo → recente) e deltas vs baseline pessoal.
  // Puramente descritivo dos sinais crus — não entra em nenhum score (não-circular).
  const sleepSamples = (recentCheckins || [])
    .map((c) => (typeof c.sleep_hours === 'number' ? c.sleep_hours : null))
    .filter((v) => v != null)
    .slice(0, 14);
  const sparkHrv = [...hrvSamples].reverse();
  const sparkRhr = [...rhrSamples].reverse();
  const sparkSleep = [...sleepSamples].reverse();
  const hrvBase = mean(hrvSamples);
  const rhrBase = mean(rhrSamples);
  const hrvDelta = hrvVal != null && hrvBase != null ? hrvVal - hrvBase : null;
  const rhrDelta = rhrVal != null && rhrBase != null ? rhrVal - rhrBase : null;

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

        <span className="ml-auto text-micro text-muted-foreground flex items-center gap-1">
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
          {isCalibrating ? '—' : score}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug">{summary.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            {summary.subtitle}
          </p>

          {deltaText && (
            <p className={`text-support mt-1 font-medium ${delta > 0 ? 'text-zone-green' : 'text-zone-red'}`}>
              {deltaText}
            </p>
          )}

          {checkin?.delayed_fatigue_alert && (
            <p className="text-support text-health-amber mt-1 leading-relaxed">
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
            <span className="text-micro text-muted-foreground">RMSSD</span>
          </div>
          <p className="text-sm font-semibold">
            {hrvVal != null ? <>{hrvVal}<span className="text-micro font-normal text-muted-foreground"> ms</span></> : '—'}
          </p>
          <DeltaChip delta={hrvDelta} goodUp unit=" ms" />
          <MiniSpark data={sparkHrv} color="hsl(199,89%,60%)" />
        </div>

        <div className="rounded-xl bg-secondary/50 border border-border/40 p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <HeartPulse className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-micro text-muted-foreground">RHR</span>
          </div>
          <p className="text-sm font-semibold">
            {rhrVal != null ? <>{rhrVal}<span className="text-micro font-normal text-muted-foreground"> bpm</span></> : '—'}
          </p>
          <DeltaChip delta={rhrDelta} goodUp={false} unit=" bpm" />
          <MiniSpark data={sparkRhr} color="hsl(215,20%,55%)" />
        </div>

        <div className="rounded-xl bg-secondary/50 border border-border/40 p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <BedDouble className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-micro text-muted-foreground">Sono</span>
          </div>
          <p className="text-sm font-semibold">
            {sleepVal != null ? `${sleepVal}h` : '—'}
          </p>
          <Qualifier ctx={sleepCtx} />
          <MiniSpark data={sparkSleep} color="hsl(199,89%,60%)" />
        </div>
      </div>

      <SleepStages
        sleepHours={sleepVal}
        deepPct={checkin?.deep_sleep_pct}
        remPct={checkin?.rem_sleep_pct}
      />
    </motion.div>
  );
}

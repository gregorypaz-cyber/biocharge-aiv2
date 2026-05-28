import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Clock, HeartPulse, BedDouble, Activity } from 'lucide-react';
import { getZoneColor } from '@/lib/biocharge-utils';
import { formatDateFull } from '@/lib/date-utils';
import { useMotionSafe } from '@/hooks/use-motion-safe';

function getRecoverySummary(score) {
  if (score >= 85) {
    return {
      title: 'Manhã muito boa',
      subtitle: 'Seu corpo acordou com ótima recuperação.',
    };
  }

  if (score >= 70) {
    return {
      title: 'Manhã boa',
      subtitle: 'Recuperação adequada para sustentar o dia com controle.',
    };
  }

  if (score >= 55) {
    return {
      title: 'Manhã moderada',
      subtitle: 'Há recuperação parcial — vale respeitar mais o contexto do dia.',
    };
  }

  if (score >= 40) {
    return {
      title: 'Manhã limitada',
      subtitle: 'Seu corpo não acordou com grande margem para carga.',
    };
  }

  return {
    title: 'Manhã crítica',
    subtitle: 'Seu corpo pede cautela e recuperação.',
  };
}

function toHSLA(colorStr, alpha = 0.18) {
  try {
    if (!colorStr) return undefined;
    const s = String(colorStr);
    if (s.startsWith('hsl(')) {
      return s.replace(/^hsl\(/, 'hsla(').replace(/\)$/, `, ${alpha})`);
    }
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

export default function MorningRecoveryCard({ checkin, delta = null }) {
  const score = checkin?.morning_recovery_score || checkin?.recovery_score || 0;
  const zone = checkin?.zone || 'yellow';
  const color = getZoneColor(zone) || 'hsl(45,93%,58%)';
  const summary = getRecoverySummary(score);
  const deltaText = formatDelta(delta);

  const { initial, transition: reducedTransition } = useMotionSafe();

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
            <p
              className={`text-[11px] mt-1 font-medium ${
                delta > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
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
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              RMSSD
            </span>
          </div>
          <p className="text-sm font-semibold">
            {checkin?.hrv_manual ?? checkin?.hrv ?? '—'}
          </p>

        </div>

        <div className="rounded-xl bg-secondary/50 border border-border/40 p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <HeartPulse className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              RHR
            </span>
          </div>
          <p className="text-sm font-semibold">
            {checkin?.resting_hr ?? checkin?.resting_heart_rate ?? '—'}
          </p>
        </div>

        <div className="rounded-xl bg-secondary/50 border border-border/40 p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <BedDouble className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Sono
            </span>
          </div>
          <p className="text-sm font-semibold">
            {checkin?.sleep_hours ? `${checkin.sleep_hours}h` : '—'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
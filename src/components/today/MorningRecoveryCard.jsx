import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Clock } from 'lucide-react';
import { getZoneColor } from '@/lib/biocharge-utils';
import { formatDateFull } from '@/lib/date-utils';

const recoveryLabel = (score) => {
  if (score >= 85) return 'Excelente — Corpo totalmente recuperado';
  if (score >= 70) return 'Bom — Recuperação adequada';
  if (score >= 55) return 'Moderado — Recuperação parcial';
  if (score >= 40) return 'Baixo — Recuperação insuficiente';
  return 'Crítico — Corpo necessita descanso';
};

export default function MorningRecoveryCard({ checkin }) {
  const score = checkin.morning_recovery_score || checkin.recovery_score || 0;
  const zone = checkin.zone || 'yellow';
  const color = getZoneColor(zone);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Moon className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recovery Matinal</span>
        <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDateFull(checkin.date)}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center font-mono font-black text-2xl shrink-0"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {score}
        </div>
        <div>
          <p className="text-sm font-semibold leading-snug">{recoveryLabel(score)}</p>
          {checkin.delayed_fatigue_alert && (
            <p className="text-xs text-amber-400 mt-1">⚠️ {checkin.delayed_fatigue_alert}</p>
          )}
          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
            {checkin.hrv && <span>HRV: <b className="text-foreground">{checkin.hrv}</b></span>}
            {checkin.resting_hr && <span>RHR: <b className="text-foreground">{checkin.resting_hr}</b></span>}
            {checkin.sleep_hours && <span>Sono: <b className="text-foreground">{checkin.sleep_hours}h</b></span>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
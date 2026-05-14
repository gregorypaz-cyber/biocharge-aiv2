import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Battery } from 'lucide-react';
import BodyStateBadge, { STATE_CONFIG } from '@/components/ui-bio/BodyStateBadge';

const CAPACITY_CONFIG = {
  High:     { pct: 90, color: '#22c55e', label: 'Alta' },
  Moderate: { pct: 60, color: '#eab308', label: 'Moderada' },
  Low:      { pct: 30, color: '#f97316', label: 'Baixa' },
  Minimal:  { pct: 10, color: '#ef4444', label: 'Mínima' },
};

export default function CurrentStateCard({ checkin, totalStrain }) {
  const bodyState = checkin.current_body_state || 'Balanced';
  const capacity = checkin.remaining_capacity || 'Moderate';
  const morningRecovery = checkin.morning_recovery_score || checkin.recovery_score || 70;
  const strain = checkin.daily_strain_accumulated || totalStrain || 0;
  const recoveryDemand = checkin.recovery_demand || 0;
  const stateConfig = STATE_CONFIG[bodyState] || STATE_CONFIG.Balanced;
  const capConfig = CAPACITY_CONFIG[capacity] || CAPACITY_CONFIG.Moderate;

  const exceedsCapacity = recoveryDemand > morningRecovery;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4 space-y-4"
    >
      <div className="flex items-center gap-2 mb-1">
        <Activity className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide">Estado Atual</span>
      </div>

      {/* State + Capacity */}
      <div className="flex items-center justify-between">
        <BodyStateBadge state={bodyState} size="lg" />
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Strain acumulado</p>
          <p className="text-xl font-black font-mono" style={{ color: strain > 60 ? '#ef4444' : '#eab308' }}>
            {strain}
          </p>
          <span className="text-[10px] text-muted-foreground">(menor é melhor)</span>
        </div>
      </div>

      {/* Recovery vs Strain bar */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>Recovery Matinal: <b className="text-foreground">{morningRecovery}</b></span>
          <span>Strain: <b className="text-foreground">{strain}</b></span>
        </div>
        <div className="h-2.5 rounded-full bg-secondary overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, morningRecovery)}%`, background: 'hsl(142,70%,50%)' }}
          />
          <div
            className="h-full rounded-full absolute top-0 left-0 transition-all duration-700"
            style={{
              width: `${Math.min(100, strain)}%`,
              background: strain > morningRecovery ? '#ef4444' : '#eab308',
              opacity: 0.6
            }}
          />
        </div>
        {exceedsCapacity && (
          <p className="text-xs text-red-400 mt-1.5">
            ⚠️ Carga excede recuperação disponível — priorize descanso
          </p>
        )}
      </div>

      {/* Remaining Capacity */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Battery className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Capacidade Restante: </span>
          <span className="text-xs font-semibold" style={{ color: capConfig.color }}>{capConfig.label}</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${capConfig.pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: capConfig.color }}
          />
        </div>
      </div>
    </motion.div>
  );
}
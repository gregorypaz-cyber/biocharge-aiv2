import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Battery, AlertTriangle } from 'lucide-react';
import BodyStateBadge, { STATE_CONFIG } from '@/components/ui-bio/BodyStateBadge';

const CAPACITY_CONFIG = {
  High: { pct: 90, color: '#22c55e', label: 'Alta' },
  Moderate: { pct: 60, color: '#eab308', label: 'Moderada' },
  Low: { pct: 30, color: '#f97316', label: 'Baixa' },
  Minimal: { pct: 10, color: '#ef4444', label: 'Mínima' },
};

function getCapacitySummary(capacity) {
  if (capacity === 'High') {
    return 'Seu corpo ainda mostra boa margem para absorver carga.';
  }
  if (capacity === 'Moderate') {
    return 'Há alguma margem, mas vale evitar exagero.';
  }
  if (capacity === 'Low') {
    return 'Sua margem está mais limitada hoje.';
  }
  return 'A capacidade restante está mínima — proteger faz mais sentido.';
}

export default function CurrentStateCard({ checkin, totalStrain }) {
  const bodyState = checkin?.current_body_state || 'Balanced';
  const capacity = checkin?.remaining_capacity || 'Moderate';
  const morningRecovery = checkin?.morning_recovery_score || checkin?.recovery_score || 70;
  const strain = checkin?.daily_strain_accumulated || totalStrain || 0;
  const recoveryDemand = checkin?.recovery_demand || 0;

  const stateConfig = STATE_CONFIG[bodyState] || STATE_CONFIG.Balanced;
  const capConfig = CAPACITY_CONFIG[capacity] || CAPACITY_CONFIG.Moderate;

  const exceedsCapacity = recoveryDemand > morningRecovery;
  const demandPct = Math.max(0, Math.min(100, recoveryDemand));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide">
          Estado do corpo agora
        </span>
      </div>

      {/* Badge + current load */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <BodyStateBadge state={bodyState} size="lg" />
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {stateConfig?.description || 'Use este estado como contexto do dia, não como decisão isolada.'}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Strain hoje
          </p>
          <p
            className={`text-xl font-black font-mono ${
              strain >= 16 ? 'text-red-400' :
              strain >= 12 ? 'text-yellow-400' :
              'text-emerald-400'
            }`}
          >
            {strain}
          </p>
          <span className="text-[10px] text-muted-foreground">
            acumulado
          </span>
        </div>
      </div>

      {/* Recovery demand vs morning recovery */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Base da manhã: <b className="text-foreground">{morningRecovery}</b>
          </span>
          <span>
            Demanda atual: <b className="text-foreground">{recoveryDemand}</b>
          </span>
        </div>

        <div className="h-2.5 rounded-full bg-secondary overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, morningRecovery)}%`,
              background: 'hsl(142,70%,50%)',
            }}
          />
          <div
            className="h-full rounded-full absolute top-0 left-0 transition-all duration-700"
            style={{
              width: `${demandPct}%`,
              background: recoveryDemand > morningRecovery ? '#ef4444' : '#eab308',
              opacity: 0.65,
            }}
          />
        </div>

        {exceedsCapacity ? (
          <div className="flex items-start gap-2 text-xs text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              A demanda do dia já passou da margem que seu corpo mostrou pela manhã. Agora vale mais recuperar do que adicionar carga.
            </p>
          </div>
        ) : strain === 0 && recoveryDemand > 0 ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            A demanda de hoje vem da sua recuperação mais baixa, não de treino — você ainda não acumulou carga. Proteger o básico já ajuda.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground leading-relaxed">
            Até aqui, a demanda do dia ainda parece compatível com a base que você trouxe pela manhã.
          </p>
        )}
      </div>

      {/* Remaining capacity */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Battery className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Capacidade restante:
          </span>
          <span
            className="text-xs font-semibold"
            style={{ color: capConfig.color }}
          >
            {capConfig.label}
          </span>
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

        <p className="text-xs text-muted-foreground leading-relaxed">
          {getCapacitySummary(capacity)}
        </p>
      </div>
    </motion.div>
  );
}
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useUserCheckins, useUserTrainingSessions } from '@/hooks/useUserData';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, Zap, Dumbbell } from 'lucide-react';
import { getTodayLocal } from '@/lib/date-utils';
import { computeCheckinScores } from '@/lib/biocharge-utils';
import { calculateBodyState, calculateRemainingCapacity, calculateRecoveryDemand, calculateSleepNeed } from '@/lib/training-impact-engine';

import MorningRecoveryCard from '@/components/today/MorningRecoveryCard';
import TrainingSessionsList from '@/components/today/TrainingSessionsList';
import CurrentStateCard from '@/components/today/CurrentStateCard';
import SleepForecastCard from '@/components/today/SleepForecastCard';

export default function Today() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const today = getTodayLocal();

  const { data: checkins = [], isLoading: loadingCheckins } = useUserCheckins(30);
  const { data: allSessions = [], isLoading: loadingSessions } = useUserTrainingSessions(100);

  const todayCheckins = checkins.filter(c => c.date === today);
  const rawCheckin = todayCheckins[0];
  const checkin = rawCheckin ? computeCheckinScores(rawCheckin) : null;
  const todaySessions = allSessions.filter(s => s.date === today);

  const totalStrain = todaySessions.reduce((s, t) => s + (t.strain_score || 0), 0);
  const morningRecovery = checkin?.morning_recovery_score || checkin?.recovery_score || 0;

  // Derive live state if not saved yet
  const liveBodyState = checkin ? calculateBodyState(morningRecovery, totalStrain) : null;
  const liveCapacity = checkin ? calculateRemainingCapacity(morningRecovery, totalStrain) : null;
  const liveRecoveryDemand = checkin ? calculateRecoveryDemand(totalStrain, morningRecovery) : null;
  const liveSleepNeed = checkin ? calculateSleepNeed(totalStrain, morningRecovery) : null;

  // Merge live state into checkin
  const enrichedCheckin = checkin ? {
    ...checkin,
    current_body_state: checkin.current_body_state || liveBodyState,
    remaining_capacity: checkin.remaining_capacity || liveCapacity,
    recovery_demand: checkin.recovery_demand ?? liveRecoveryDemand,
    sleep_need_tonight: checkin.sleep_need_tonight ?? liveSleepNeed,
  } : null;

  const isLoading = loadingCheckins || loadingSessions;

  // openAddSignal: incrementar para abrir modal no TrainingSessionsList
  const [openAddSignal, setOpenAddSignal] = useState(0);

  // Score único de prontidão com fallback
  const displayedScore = checkin?.readiness_score ?? checkin?.recovery_score ?? checkin?.morning_recovery_score ?? 0;
  const readinessFaixa = displayedScore >= 67 ? 'Alta' : displayedScore >= 34 ? 'Moderada' : 'Baixa';

  // Strain acumulado com cap 21
  const cappedStrain = Math.min(21, totalStrain);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!enrichedCheckin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-[70vh] text-center px-6"
      >
        <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
          <Zap className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-black mb-2">Sem check-in hoje</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Faça seu check-in para calcular sua prontidão e acompanhar o dia.
        </p>
        <Link
          to="/checkin"
          className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-2xl font-semibold hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" /> Fazer check-in
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">Hoje</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Organize seu treino e recuperação</p>
      </div>

      {/* Section 0 — Execução do dia (above the fold) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border bg-card p-5 space-y-4"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prontidão da manhã</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              displayedScore >= 67 ? 'bg-emerald-500/15 text-emerald-400' :
              displayedScore >= 34 ? 'bg-yellow-500/15 text-yellow-400' :
              'bg-red-500/15 text-red-400'
            }`}>{readinessFaixa}</span>
          </div>
          <p className="text-3xl font-mono font-black">{displayedScore}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-secondary p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Strain acumulado</p>
            <p className={`text-xl font-mono font-bold ${
              cappedStrain >= 18 ? 'text-red-400' :
              cappedStrain >= 14 ? 'text-orange-400' :
              cappedStrain >= 10 ? 'text-yellow-400' :
              'text-emerald-400'
            }`}>⚡ {cappedStrain}</p>
          </div>
          <div className="rounded-2xl bg-secondary p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Capacidade restante</p>
            <p className="text-xl font-bold">{enrichedCheckin.remaining_capacity ?? '—'}</p>
          </div>
        </div>

        <button
          onClick={() => setOpenAddSignal(v => v + 1)}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
        >
          <Dumbbell className="w-4 h-4" /> Adicionar treino
        </button>
      </motion.div>

      {/* Section 1 — Morning Recovery (fixed) */}
      <MorningRecoveryCard checkin={enrichedCheckin} />

      {/* Section 2 — Training Sessions */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <TrainingSessionsList
          checkin={enrichedCheckin}
          sessions={todaySessions}
          openAddSignal={openAddSignal}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['checkins', user?.email] });
            queryClient.invalidateQueries({ queryKey: ['training-sessions', user?.email] });
          }}
        />
      </div>

      {/* Section 3 — Current State (dynamic) */}
      <CurrentStateCard checkin={enrichedCheckin} totalStrain={totalStrain} />

      {/* Section 4 — Recovery Demand alert */}
      {(enrichedCheckin.recovery_demand || 0) > morningRecovery && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-red-500/30 bg-red-500/8 p-4 flex gap-3"
        >
          <span className="text-xl">🚨</span>
          <div>
            <p className="text-sm font-semibold text-red-400">Carga acima da recuperação disponível</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Demanda: {enrichedCheckin.recovery_demand} vs Prontidão: {displayedScore}. Priorize descanso e sono para evitar fadiga acumulada.
            </p>
          </div>
        </motion.div>
      )}

      {/* Section 5 — Sleep Forecast */}
      <SleepForecastCard checkin={enrichedCheckin} />
    </div>
  );
}
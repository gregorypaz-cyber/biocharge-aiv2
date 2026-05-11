import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useUserCheckins, useUserTrainingSessions } from '@/hooks/useUserData';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, Zap } from 'lucide-react';
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
          Registre seu estado matinal para ativar o monitoramento fisiológico do dia.
        </p>
        <Link
          to="/checkin"
          className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-2xl font-semibold hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" /> Fazer Check-in Matinal
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">Estado de Hoje</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Monitoramento fisiológico em tempo real</p>
      </div>

      {/* Section 1 — Morning Recovery (fixed) */}
      <MorningRecoveryCard checkin={enrichedCheckin} />

      {/* Section 2 — Training Sessions */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <TrainingSessionsList
          checkin={enrichedCheckin}
          sessions={todaySessions}
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
            <p className="text-sm font-semibold text-red-400">Carga Excede Recuperação Disponível</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Demand: {enrichedCheckin.recovery_demand} vs Recovery: {morningRecovery}. 
              Priorize descanso, sono e hidratação para não acumular fadiga residual.
            </p>
          </div>
        </motion.div>
      )}

      {/* Section 5 — Sleep Forecast */}
      <SleepForecastCard checkin={enrichedCheckin} />
    </div>
  );
}
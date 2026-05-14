import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, Plus } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Link } from 'react-router-dom';
import { computeCheckinScores, calculateStreak } from '@/lib/biocharge-utils';
import { runPhysiologicalAnalysis, calculateSleepConsistency } from '@/lib/physiological-engine';
import { useUserCheckins, useUserTrainingSessions } from '@/hooks/useUserData';

import MiniChart from '@/components/dashboard/MiniChart';
import WeekStrip from '@/components/dashboard/WeekStrip';
import StreakCard from '@/components/dashboard/StreakCard';
import PhysioStateCard from '@/components/intelligence/PhysioStateCard';
import TrainingLoadCard from '@/components/intelligence/TrainingLoadCard';
import CorrelationsCard from '@/components/intelligence/CorrelationsCard';

export default function Dashboard() {
  const { data: checkins = [], isLoading } = useUserCheckins(60);
  const { data: allSessions = [] } = useUserTrainingSessions(200);

  const [rangeDays, setRangeDays] = useState(14);
  const [showSleep, setShowSleep] = useState(true);
  const [showFatigue, setShowFatigue] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const computed = useMemo(() => checkins.map((c, i) => computeCheckinScores(c, checkins.slice(i + 1), [])), [checkins]);
  const streak = calculateStreak(checkins);
  const analysis = useMemo(() => computed.length > 0 ? runPhysiologicalAnalysis(computed, allSessions) : null, [computed.length, allSessions.length]);
  const sleepConsistency = useMemo(() => calculateSleepConsistency(checkins), [checkins.length]);
  const [hrvAlertDismissed, setHrvAlertDismissed] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-32 rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  if (computed.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-[70vh] text-center px-6"
      >
        <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
          <Zap className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-3xl font-black mb-2 tracking-tight">Sem dados ainda</h1>
        <p className="text-muted-foreground mb-8 max-w-sm leading-relaxed">
          Faça seu primeiro check-in para começar a ver tendências e padrões.
        </p>
        <Link
          to="/checkin"
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-semibold hover:bg-primary/90 transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" /> Fazer check-in
        </Link>
      </motion.div>
    );
  }

  const RANGE_OPTIONS = [7, 14, 30];

  const SERIES_TOGGLES = [
    { key: 'sleep', label: 'Sono', color: 'hsl(200,80%,55%)', active: showSleep, toggle: () => setShowSleep(v => !v) },
    { key: 'fatigue', label: 'Fadiga', color: 'hsl(0,72%,55%)', active: showFatigue, toggle: () => setShowFatigue(v => !v) },
  ];

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black tracking-tight">Resumo</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Tendências e padrões dos seus últimos dias</p>
      </motion.div>

      {/* Seletor de período */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="flex gap-2">
        {RANGE_OPTIONS.map(d => (
          <button
            key={d}
            onClick={() => setRangeDays(d)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              rangeDays === d
                ? 'bg-primary/15 border-primary/25 text-primary'
                : 'bg-secondary/60 border-border/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            {d} dias
          </button>
        ))}
      </motion.div>

      {/* HRV Anomaly Banner */}
      {analysis?.hrvAnomaly && !hrvAlertDismissed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border p-4 flex gap-3 items-start ${
            analysis.hrvAnomaly.alert.type === 'critical'
              ? 'border-red-500/40 bg-red-500/8'
              : 'border-yellow-500/40 bg-yellow-500/8'
          }`}
        >
          <span className="text-xl shrink-0">{analysis.hrvAnomaly.alert.icon}</span>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${
              analysis.hrvAnomaly.alert.type === 'critical' ? 'text-red-400' : 'text-yellow-400'
            }`}>{analysis.hrvAnomaly.alert.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{analysis.hrvAnomaly.alert.text}</p>
          </div>
          <button
            onClick={() => setHrvAlertDismissed(true)}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm leading-none shrink-0"
          >✕</button>
        </motion.div>
      )}

      {/* Gráfico de tendência */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Prontidão — {rangeDays} dias
          </h2>
          <div className="flex gap-2">
            {/* Prontidão — sempre ativa */}
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-primary/10 border-primary/20 text-primary">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Prontidão
            </span>
            {SERIES_TOGGLES.map(s => (
              <button
                key={s.key}
                onClick={s.toggle}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  s.active
                    ? 'border-white/20 text-foreground'
                    : 'border-border/30 text-muted-foreground opacity-50'
                }`}
                style={s.active ? { backgroundColor: s.color + '18', borderColor: s.color + '40', color: s.color } : {}}
              >
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <MiniChart data={computed} days={rangeDays} showSleep={showSleep} showFatigue={showFatigue} />
      </motion.div>

      {/* WeekStrip — últimos 7 dias */}
      <WeekStrip data={computed} />

      {/* Streak motivacional */}
      <StreakCard streak={streak} />

      {/* Análise fisiológica detalhada — colapsível */}
      {analysis && (
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-border/40 bg-card/60 text-sm font-semibold hover:bg-card transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-base">🔬</span>
                <span>Análise fisiológica detalhada</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {showDetails ? '↑ Fechar' : '↓ Expandir'}
              </span>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-2">
            {analysis.physioState && <PhysioStateCard physioState={analysis.physioState} />}
            <TrainingLoadCard trainingLoad={analysis.trainingLoad} sleepDebt={analysis.sleepDebt} />
            {(analysis.correlations?.length > 0 || analysis.laggedEffects?.length > 0 || sleepConsistency?.discovery) && (
              <CorrelationsCard
                correlations={[...(analysis.correlations || []), ...(sleepConsistency?.discovery ? [sleepConsistency.discovery] : [])]}
                laggedEffects={analysis.laggedEffects}
              />
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

    </div>
  );
}
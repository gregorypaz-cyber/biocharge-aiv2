import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, Plus } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Link } from 'react-router-dom';
import { computeCheckinScores, calculateStreak } from '@/lib/biocharge-utils';
import { runPhysiologicalAnalysisAsync, calculateRunningEconomy, calculatePerformanceWindow, detectCardiacDrift, calculateSleepConsistency } from '@/lib/physiological-engine';
import { useUserCheckins, useUserTrainingSessions } from '@/hooks/useUserData';
import { getTodayLocal } from '@/lib/date-utils';

import MiniChart from '@/components/dashboard/MiniChart';
import WeekStrip from '@/components/dashboard/WeekStrip';
import StreakCard from '@/components/dashboard/StreakCard';
import ScoresGrid from '@/components/dashboard/ScoresGrid';
import PhysioStateCard from '@/components/intelligence/PhysioStateCard';
import TrainingLoadCard from '@/components/intelligence/TrainingLoadCard';
import CorrelationsCard from '@/components/intelligence/CorrelationsCard';
import DetectedPatternBlock from '@/components/trends/DetectedPatternBlock';

export default function Dashboard() {
  const { data: checkins = [], isLoading } = useUserCheckins(60);
  const { data: allSessions = [] } = useUserTrainingSessions(200);

  const [rangeDays, setRangeDays] = useState(14);
  const [showSleep, setShowSleep] = useState(true);
  const [showFatigue, setShowFatigue] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // Usa os scores SALVOS (o que você viu no dia), não recalcula. Recalcular
  // aqui (a) divergia do Today e da Timeline, (b) era feito sem os treinos
  // (sessions vazio). O gráfico e os cards passam a refletir a história real.
  const computed = useMemo(
    () =>
      checkins.map((c) => ({
        ...c,
        readiness_score: c.readiness_score ?? c.recovery_score ?? c.morning_recovery_score ?? null,
        recovery_score: c.recovery_score ?? c.morning_recovery_score ?? null,
      })),
    [checkins]
  );
  const streak = calculateStreak(checkins);
  const sleepConsistency = useMemo(() => calculateSleepConsistency(checkins), [checkins.length]);
  const [hrvAlertDismissed, setHrvAlertDismissed] = useState(false);

  // Snapshot de HOJE para o ScoresGrid. fatigue_score/stress_score/sleep_quality/
  // hrv resolvido não são persistidos (CONTEXT.md: campo computado não vai pro
  // schema) — por isso recalcula ao vivo aqui, igual o Today.jsx já faz. Só
  // recalcula o dia de hoje, não o histórico (o `computed` de cima continua
  // usando score salvo, de propósito, pra não divergir da Timeline).
  const todayDate = getTodayLocal();
  const rawToday = useMemo(
    () => checkins.find((c) => c.date === todayDate) || null,
    [checkins, todayDate]
  );
  const todayScores = useMemo(() => {
    if (!rawToday) return null;
    const recentCheckins = [...checkins]
      .filter((c) => c.date !== todayDate)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const todaySessions = allSessions.filter((s) => s.date === todayDate);
    return computeCheckinScores(rawToday, recentCheckins, todaySessions);
  }, [rawToday, checkins, allSessions, todayDate]);

  // ✅ FIX: analysis state declarado aqui, junto com os outros hooks
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    if (checkins.length < 2) return;
    runPhysiologicalAnalysisAsync(checkins, allSessions)
      .then(result => setAnalysis(result))
      .catch(e => console.warn('Análise fisiológica falhou', e));
  }, [checkins.length, allSessions.length]);

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

  function toHSLA(colorStr, alpha = 0.18) {
    try {
      if (!colorStr) return undefined;
      const s = String(colorStr);
      if (s.startsWith('hsl(')) return s.replace(/^hsl\(/, 'hsla(').replace(/\)$/, `, ${alpha})`);
      if (s.startsWith('hsla(')) return s;
      return s;
    } catch { return colorStr; }
  }

  const SERIES_TOGGLES = [
    { key: 'sleep', label: 'Sono', color: 'hsl(200,80%,55%)', active: showSleep, toggle: () => setShowSleep(v => !v) },
    { key: 'fatigue', label: 'Fadiga', color: 'hsl(45,93%,58%)', active: showFatigue, toggle: () => setShowFatigue(v => !v) },
  ];

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black tracking-tight">Resumo</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Seu estado atual e a semana</p>
      </motion.div>

      {/* Snapshot numérico de hoje — números crus (HRV ms, FC bpm, Fadiga,
          Estresse) que não aparecem em nenhum outro lugar do app. Hoje só, não
          histórico — recalculado ao vivo. */}
      {todayScores && <ScoresGrid today={todayScores} />}


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


      {/* Padrão detectado por IA */}
      <DetectedPatternBlock checkins={computed} allCheckins={computed} />

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

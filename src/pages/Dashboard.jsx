import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { computeCheckinScores, calculateStreak } from '@/lib/biocharge-utils';
import { runPhysiologicalAnalysis } from '@/lib/physiological-engine';
import { useUserCheckins } from '@/hooks/useUserData';

import HeroSection from '@/components/dashboard/HeroSection';
import ScoresGrid from '@/components/dashboard/ScoresGrid';
import WeekStrip from '@/components/dashboard/WeekStrip';
import MiniChart from '@/components/dashboard/MiniChart';
import StreakCard from '@/components/dashboard/StreakCard';

import PhysioStateCard from '@/components/intelligence/PhysioStateCard';
import NarrativeCard from '@/components/intelligence/NarrativeCard';
import WhyScoreCard from '@/components/intelligence/WhyScoreCard';
import BaselineInsightsRow from '@/components/intelligence/BaselineInsightsRow';
import TrainingLoadCard from '@/components/intelligence/TrainingLoadCard';
import CorrelationsCard from '@/components/intelligence/CorrelationsCard';
import ActionableRecsCard from '@/components/intelligence/ActionableRecsCard';

export default function Dashboard() {
  const { data: checkins = [], isLoading } = useUserCheckins(60);

  const computed = checkins.map(computeCheckinScores);
  const today = computed[0];
  const streak = calculateStreak(checkins);

  // Run full physiological analysis
  const analysis = computed.length > 0 ? runPhysiologicalAnalysis(computed) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando dados...</span>
        </div>
      </div>
    );
  }

  if (!today) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-[70vh] text-center px-6"
      >
        <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
          <Zap className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-3xl font-black mb-2 tracking-tight">BioCharge AI</h1>
        <p className="text-muted-foreground mb-8 max-w-sm leading-relaxed">
          Registre seu primeiro check-in para ativar seu painel de inteligência fisiológica e receber insights personalizados.
        </p>
        <Link
          to="/checkin"
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-semibold hover:bg-primary/90 transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" /> Fazer Primeiro Check-in
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Hero */}
      <HeroSection today={today} streak={streak} />

      {/* Physiological State — flagship card */}
      {analysis?.physioState && (
        <PhysioStateCard physioState={analysis.physioState} />
      )}

      {/* Narrative — human language interpretation */}
      {analysis?.narrative && (
        <NarrativeCard narrative={analysis.narrative} />
      )}

      {/* Why Score */}
      {analysis?.whyScore?.length > 0 && (
        <WhyScoreCard whyScore={analysis.whyScore} recoveryScore={today.recovery_score} />
      )}

      {/* Baseline Comparison */}
      {analysis?.baselineInsights?.length > 0 && (
        <BaselineInsightsRow insights={analysis.baselineInsights} />
      )}

      {/* Score Grid */}
      <ScoresGrid today={today} />

      {/* Actionable Recommendations */}
      {analysis?.actionableRecs?.length > 0 && (
        <ActionableRecsCard recs={analysis.actionableRecs} />
      )}

      {/* Training Load + Sleep Debt */}
      {analysis && (
        <TrainingLoadCard
          trainingLoad={analysis.trainingLoad}
          sleepDebt={analysis.sleepDebt}
        />
      )}

      {/* Streak */}
      <StreakCard streak={streak} />

      {/* Correlations + Lagged Effects */}
      {analysis && (analysis.correlations?.length > 0 || analysis.laggedEffects?.length > 0) && (
        <CorrelationsCard
          correlations={analysis.correlations}
          laggedEffects={analysis.laggedEffects}
        />
      )}

      {/* Week + Chart */}
      <WeekStrip data={computed} />
      <MiniChart data={computed} />
    </div>
  );
}
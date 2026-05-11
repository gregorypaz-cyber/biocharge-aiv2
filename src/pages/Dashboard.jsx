import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Plus, ChevronDown } from 'lucide-react';
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
  const [showDetails, setShowDetails] = useState(false);
  const { data: checkins = [], isLoading } = useUserCheckins(60);

  const computed = checkins.map(computeCheckinScores);
  const today = computed[0];
  const streak = calculateStreak(checkins);
  const analysis = computed.length > 0 ? runPhysiologicalAnalysis(computed) : null;

  // Score único exibido — prioriza readiness_score, fallback para recovery_score
  const displayedScore = today?.readiness_score ?? today?.recovery_score;

  // Top 3 drivers para o bloco "Por que hoje está assim?"
  const drivers = (analysis?.baselineInsights?.length > 0
    ? analysis.baselineInsights
    : analysis?.whyScore ?? []
  ).slice(0, 3);

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
          Sem dados de hoje. Faça seu check-in para gerar o plano do dia.
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

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* BLOCO 1 — Plano de hoje */}
      <HeroSection
        today={today}
        streak={streak}
        displayedScore={displayedScore}
        onShowDetails={() => setShowDetails(v => !v)}
        showDetails={showDetails}
      />

      {/* BLOCO 2 — Por que hoje está assim? */}
      {drivers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border/60 bg-card p-5"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Por que hoje está assim?
          </h2>
          <ul className="space-y-2">
            {drivers.map((d, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="text-foreground/80 leading-snug">
                  {typeof d === 'string' ? d : d.label ?? d.message ?? JSON.stringify(d)}
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setShowDetails(v => !v)}
            className="mt-3 text-xs text-primary font-semibold hover:underline"
          >
            Ver mais
          </button>
        </motion.div>
      )}

      {/* BLOCO 3 — Tendência */}
      <MiniChart data={computed} />

      {/* DETALHES — colapsável */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden space-y-4"
          >
            {analysis?.physioState && <PhysioStateCard physioState={analysis.physioState} />}
            {analysis?.narrative && <NarrativeCard narrative={analysis.narrative} />}
            {analysis?.whyScore?.length > 0 && (
              <WhyScoreCard whyScore={analysis.whyScore} recoveryScore={displayedScore} />
            )}
            {analysis?.baselineInsights?.length > 0 && (
              <BaselineInsightsRow insights={analysis.baselineInsights} />
            )}
            <ScoresGrid today={today} />
            {analysis?.actionableRecs?.length > 0 && (
              <ActionableRecsCard recs={analysis.actionableRecs} />
            )}
            {analysis && (
              <TrainingLoadCard
                trainingLoad={analysis.trainingLoad}
                sleepDebt={analysis.sleepDebt}
              />
            )}
            <StreakCard streak={streak} />
            {analysis && (analysis.correlations?.length > 0 || analysis.laggedEffects?.length > 0) && (
              <CorrelationsCard
                correlations={analysis.correlations}
                laggedEffects={analysis.laggedEffects}
              />
            )}
            <WeekStrip data={computed} />

            {/* Botão fechar detalhes */}
            <button
              onClick={() => setShowDetails(false)}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-border/60 bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5 rotate-180" /> Recolher detalhes
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
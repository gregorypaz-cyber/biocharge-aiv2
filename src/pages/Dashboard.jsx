import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Zap, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { computeCheckinScores, getSmartMessage, calculateStreak } from '@/lib/biocharge-utils';
import HeroSection from '@/components/dashboard/HeroSection';
import ScoresGrid from '@/components/dashboard/ScoresGrid';
import WeekStrip from '@/components/dashboard/WeekStrip';
import MiniChart from '@/components/dashboard/MiniChart';
import InsightPill from '@/components/ui-bio/InsightPill';
import RecommendationCard from '@/components/dashboard/RecommendationCard';
import StreakCard from '@/components/dashboard/StreakCard';

export default function Dashboard() {
  const { data: checkins = [], isLoading } = useQuery({
    queryKey: ['checkins'],
    queryFn: () => base44.entities.DailyCheckin.list('-date', 60),
  });

  const computed = checkins.map(computeCheckinScores);
  const today = computed[0];
  const streak = calculateStreak(checkins);
  const messages = today ? getSmartMessage(today, computed) : [];

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
          Registre seu primeiro check-in para ativar seu painel de inteligência biológica e receber insights personalizados.
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

      {/* Score Grid */}
      <ScoresGrid today={today} />

      {/* AI Insights */}
      {messages.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Insights IA</h3>
          {messages.map((msg, i) => (
            <InsightPill key={i} text={msg} delay={i * 0.07} />
          ))}
        </div>
      )}

      {/* Streak */}
      <StreakCard streak={streak} />

      {/* Recommendation */}
      <RecommendationCard today={today} />

      {/* Week + Chart */}
      <WeekStrip data={computed} />
      <MiniChart data={computed} />
    </div>
  );
}
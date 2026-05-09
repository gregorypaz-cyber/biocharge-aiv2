import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Moon, Zap, Activity, Dumbbell, TrendingUp, Heart, AlertTriangle, Flame, Brain } from 'lucide-react';
import CircularGauge from '@/components/ui-bio/CircularGauge';
import StatusBadge from '@/components/ui-bio/StatusBadge';
import MetricCard from '@/components/ui-bio/MetricCard';
import WeeklyHeatmap from '@/components/ui-bio/WeeklyHeatmap';
import { computeCheckinScores, getSmartMessage, getZoneColor } from '@/lib/biocharge-utils';
import { Link } from 'react-router-dom';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import RecommendationCard from '@/components/dashboard/RecommendationCard';

export default function Dashboard() {
  const { data: checkins = [], isLoading } = useQuery({
    queryKey: ['checkins'],
    queryFn: () => base44.entities.DailyCheckin.list('-date', 30),
  });

  const computed = checkins.map(computeCheckinScores);
  const today = computed[0];
  const messages = today ? getSmartMessage(today, computed) : ['Faça seu primeiro check-in para começar'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!today) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-[60vh] text-center"
      >
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
          <Zap className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Bem-vindo ao BioCharge AI</h1>
        <p className="text-muted-foreground mb-8 max-w-sm">
          Comece registrando seu primeiro check-in para desbloquear insights de performance.
        </p>
        <Link
          to="/checkin"
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
        >
          Fazer Check-in
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-3xl border border-border bg-card"
      >
        <CircularGauge
          value={today.recovery_score}
          size={180}
          strokeWidth={12}
          color={getZoneColor(today.zone)}
          label="Recovery"
        />
        <div className="flex-1 text-center md:text-left">
          <StatusBadge zone={today.zone} className="mb-3" />
          <h1 className="text-3xl font-bold mb-1">Recovery Score</h1>
          <p className="text-muted-foreground text-sm mb-4">BioCharge: {today.biocharge_morning || '—'}</p>
          
          {/* Alert */}
          {today.alert === 'high_performance' && (
            <div className="flex items-center gap-2 text-sm text-[hsl(142,70%,55%)] bg-[hsl(142,70%,50%)]/10 px-3 py-2 rounded-lg w-fit">
              <Flame className="w-4 h-4" /> Alta Performance
            </div>
          )}
          {today.alert === 'attention' && (
            <div className="flex items-center gap-2 text-sm text-[hsl(45,93%,63%)] bg-[hsl(45,93%,58%)]/10 px-3 py-2 rounded-lg w-fit">
              <AlertTriangle className="w-4 h-4" /> Atenção
            </div>
          )}
        </div>
      </motion.div>

      {/* Smart Messages */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
      >
        {messages.map((msg, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
            <Brain className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground/80">{msg}</p>
          </div>
        ))}
      </motion.div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={Moon} title="Sono" value={today.sleep_score} unit="pts" />
        <MetricCard icon={Activity} title="Fadiga" value={today.fatigue} unit="%" />
        <MetricCard icon={Dumbbell} title="RPE" value={today.rpe} unit="/10" />
        <MetricCard icon={Heart} title="HRV" value={today.hrv} unit="ms" />
      </div>

      {/* Recommendation + Weekly */}
      <div className="grid md:grid-cols-2 gap-4">
        <RecommendationCard today={today} />
        <div className="rounded-2xl border border-border bg-card p-5">
          <WeeklyHeatmap data={computed} />
        </div>
      </div>

      {/* Charts */}
      <DashboardCharts data={computed} />
    </div>
  );
}
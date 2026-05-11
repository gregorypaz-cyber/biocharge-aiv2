import React from 'react';
import { useUserCheckins, useUserTrainingSessions } from '@/hooks/useUserData';
import { computeCheckinScores, calculateBioChargeScore, detectOvertainingAlerts } from '@/lib/biocharge-utils';

import BioChargeScoreCard from '@/components/dashboard/BioChargeScoreCard';
import QuickMetricsGrid from '@/components/dashboard/QuickMetricsGrid';
import ScoreChart from '@/components/dashboard/ScoreChart';
import OvertainingAlerts from '@/components/dashboard/OvertainingAlerts';

export default function Dashboard() {
  const { data: checkins = [], isLoading } = useUserCheckins(30);
  const { data: sessions = [] } = useUserTrainingSessions(10);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const computed = checkins.map(computeCheckinScores);

  // Today's checkin: same local date
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  const todayCheckin = computed.find(c => c.date === todayStr) || null;

  // Score com histórico para HRV relativo
  const bioScore = todayCheckin ? calculateBioChargeScore(todayCheckin, computed) : null;

  // Enrich checkins with _biocharge_score for alert detection
  const enriched = computed.map(c => ({ ...c, _biocharge_score: calculateBioChargeScore(c, computed) }));

  const alerts = detectOvertainingAlerts(enriched);
  const lastSession = sessions[0] || null;

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-8">
      {/* Alerts */}
      <OvertainingAlerts alerts={alerts} />

      {/* Main Score Card */}
      <BioChargeScoreCard score={bioScore} checkin={todayCheckin} />

      {/* Quick Metrics */}
      {todayCheckin && (
        <QuickMetricsGrid todayCheckin={todayCheckin} lastSession={lastSession} />
      )}

      {/* 7-day Score Chart */}
      <ScoreChart checkins={computed} />
    </div>
  );
}
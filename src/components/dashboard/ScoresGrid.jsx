import { Moon, Activity, Zap, Heart, Brain, Battery } from 'lucide-react';
import ScoreCard from '@/components/ui-bio/ScoreCard';

export default function ScoresGrid({ today }) {
  const scores = [
    {
      label: 'Prontidão',
      value: today.readiness_score ?? today.recovery_score,
      icon: Zap,
      color: 'hsl(142,70%,50%)',
      sublabel: 'Prontidão geral',
      delay: 0,
    },
    {
      label: 'Sono',
      value: today.sleep_quality,
      icon: Moon,
      color: 'hsl(200,80%,55%)',
      sublabel: `${today.sleep_hours ?? '—'}h · ${today.deep_sleep_pct ?? '—'}% profundo`,
      delay: 0.05,
    },
    {
      label: 'Fadiga',
      value: today.fatigue_score,
      icon: Battery,
      color: 'hsl(45,93%,58%)',
      sublabel: 'Índice de desgaste',
      delay: 0.1,
    },
    {
      label: 'Estresse',
      value: today.stress_score,
      icon: Brain,
      color: 'hsl(280,65%,60%)',
      sublabel: 'Carga mental',
      delay: 0.15,
    },
    {
      label: 'HRV',
      value: today.hrv,
      icon: Activity,
      color: 'hsl(200,80%,65%)',
      unit: 'ms',
      sublabel: 'Variabilidade cardíaca',
      delay: 0.2,
    },
    {
      label: 'FC Repouso',
      value: today.resting_hr,
      icon: Heart,
      color: 'hsl(0,72%,55%)',
      unit: 'bpm',
      sublabel: 'Frequência de repouso',
      delay: 0.25,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {scores.map(s => (
        <ScoreCard key={s.label} {...s} />
      ))}
    </div>
  );
}
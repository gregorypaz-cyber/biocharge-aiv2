import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { format, subDays, subMonths } from 'date-fns';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts';
import { computeCheckinScores } from '@/lib/biocharge-utils';
import { cn } from '@/lib/utils';

const timeFilters = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1A', days: 365 },
];

const metrics = [
  { key: 'recovery_score', label: 'Recovery', color: 'hsl(142,70%,50%)' },
  { key: 'sleep_score', label: 'Sono', color: 'hsl(200,80%,55%)' },
  { key: 'fatigue', label: 'Fadiga', color: 'hsl(0,72%,55%)' },
  { key: 'hrv', label: 'HRV', color: 'hsl(280,65%,60%)' },
  { key: 'biocharge_morning', label: 'BioCharge', color: 'hsl(45,93%,58%)' },
  { key: 'deep_sleep_pct', label: 'Sono Profundo', color: 'hsl(200,80%,55%)' },
];

const tooltipStyle = {
  background: 'hsl(220, 18%, 7%)',
  border: '1px solid hsl(220, 15%, 14%)',
  borderRadius: '12px',
  fontSize: '12px',
  color: 'hsl(210, 40%, 96%)',
};

export default function Trends() {
  const [period, setPeriod] = useState(30);
  const [selectedMetric, setSelectedMetric] = useState('recovery_score');

  const { data: checkins = [] } = useQuery({
    queryKey: ['checkins'],
    queryFn: () => base44.entities.DailyCheckin.list('-date', 365),
  });

  const computed = checkins.map(computeCheckinScores);
  const cutoff = subDays(new Date(), period);
  const filtered = computed.filter(c => c.date && new Date(c.date) >= cutoff);
  const chartData = [...filtered].reverse().map(c => ({
    date: c.date ? format(new Date(c.date), 'dd/MM') : '',
    ...c,
  }));

  const metricConfig = metrics.find(m => m.key === selectedMetric);

  // Calculate averages
  const avg = (arr, key) => {
    const vals = arr.filter(c => c[key] != null).map(c => c[key]);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  };

  const last3Avg = avg(computed.slice(0, 3), selectedMetric);
  const last7Avg = avg(computed.slice(0, 7), selectedMetric);
  const periodAvg = avg(filtered, selectedMetric);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Tendências</h1>
        <p className="text-sm text-muted-foreground mt-1">Acompanhe sua evolução ao longo do tempo</p>
      </div>

      {/* Period Filter */}
      <div className="flex gap-2">
        {timeFilters.map(f => (
          <button
            key={f.days}
            onClick={() => setPeriod(f.days)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
              period === f.days
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Metric Selector */}
      <div className="flex flex-wrap gap-2">
        {metrics.map(m => (
          <button
            key={m.key}
            onClick={() => setSelectedMetric(m.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
              selectedMetric === m.key
                ? 'border-primary/50 bg-primary/10 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: m.color }} />
            {m.label}
          </button>
        ))}
      </div>

      {/* Averages */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '3 dias', val: last3Avg },
          { label: '7 dias', val: last7Avg },
          { label: 'Período', val: periodAvg },
        ].map(a => (
          <motion.div
            key={a.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-4 text-center"
          >
            <span className="text-xs text-muted-foreground">Média {a.label}</span>
            <p className="text-xl font-bold font-mono mt-1" style={{ color: metricConfig?.color }}>
              {a.val ?? '—'}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Main Chart */}
      {chartData.length >= 2 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <h3 className="text-sm font-semibold mb-4">{metricConfig?.label}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={metricConfig?.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={metricConfig?.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,12%)" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(215,15%,50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(215,15%,50%)', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={metricConfig?.color}
                  fill="url(#metricGrad)"
                  strokeWidth={2}
                  dot={chartData.length <= 14}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>Registre mais check-ins para ver tendências</p>
        </div>
      )}

      {/* Recovery Bar Chart */}
      {chartData.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <h3 className="text-sm font-semibold mb-4">Recovery vs Fadiga</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fill: 'hsl(215,15%,50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(215,15%,50%)', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="recovery_score" fill="hsl(142,70%,50%)" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Bar dataKey="fatigue" fill="hsl(0,72%,55%)" radius={[4, 4, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[hsl(142,70%,50%)]/80" />
              <span className="text-muted-foreground">Recovery</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[hsl(0,72%,55%)]/60" />
              <span className="text-muted-foreground">Fadiga</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { format, subDays } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine, Cell,
} from 'recharts';
import { computeCheckinScores } from '@/lib/biocharge-utils';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const timeFilters = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

const metrics = [
  { key: 'recovery_score', label: 'Recovery', color: 'hsl(142,70%,50%)' },
  { key: 'readiness_score', label: 'Readiness', color: 'hsl(142,60%,65%)' },
  { key: 'sleep_quality', label: 'Sono', color: 'hsl(200,80%,55%)' },
  { key: 'fatigue_score', label: 'Fadiga', color: 'hsl(0,72%,55%)' },
  { key: 'stress_score', label: 'Estresse', color: 'hsl(280,65%,60%)' },
  { key: 'hrv', label: 'HRV', color: 'hsl(45,93%,58%)' },
  { key: 'biocharge_morning', label: 'BioCharge', color: 'hsl(200,80%,65%)' },
];

const tooltipStyle = {
  background: 'hsl(220,18%,7%)',
  border: '1px solid hsl(220,15%,14%)',
  borderRadius: '12px',
  fontSize: '12px',
  color: 'hsl(210,40%,96%)',
  padding: '8px 12px',
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
    // Null out performance metrics on rest days so they show as gaps
    ...(c.rest_day ? {
      recovery_score: null, readiness_score: null,
      fatigue_score: null, stress_score: null, rpe: null,
    } : {}),
  }));

  const metricConfig = metrics.find(m => m.key === selectedMetric);

  // Performance metrics exclude rest days
  const performanceMetrics = ['recovery_score', 'readiness_score', 'fatigue_score', 'stress_score', 'rpe', 'biocharge_morning'];
  const avg = (arr, key) => {
    const filtered = performanceMetrics.includes(key) ? arr.filter(c => !c.rest_day) : arr;
    const vals = filtered.filter(c => c[key] != null).map(c => c[key]);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  };

  const movingAvg = chartData.map((point, i) => {
    const window = chartData.slice(Math.max(0, i - 2), i + 1);
    const vals = window.filter(p => p[selectedMetric] != null).map(p => p[selectedMetric]);
    return { ...point, moving_avg: vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null };
  });

  const last7Avg = avg(computed.slice(0, 7), selectedMetric);
  const prev7Avg = avg(computed.slice(7, 14), selectedMetric);
  const periodAvg = avg(filtered, selectedMetric);
  const trend = last7Avg && prev7Avg ? last7Avg - prev7Avg : null;

  const TrendIcon = trend === null ? Minus : trend > 2 ? TrendingUp : trend < -2 ? TrendingDown : Minus;
  const trendColor = trend === null ? 'text-muted-foreground' : trend > 2 ? 'text-[hsl(142,70%,55%)]' : trend < -2 ? 'text-[hsl(0,72%,60%)]' : 'text-muted-foreground';

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Tendências</h1>
        <p className="text-sm text-muted-foreground mt-1">Evolução e padrões da sua performance</p>
      </div>

      {/* Period + Metric selectors */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {timeFilters.map(f => (
            <button
              key={f.days}
              onClick={() => setPeriod(f.days)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                period === f.days
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {metrics.map(m => (
            <button
              key={m.key}
              onClick={() => setSelectedMetric(m.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                selectedMetric === m.key
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-border/40 bg-card text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: m.color }} />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Últimos 7 dias', val: last7Avg, trend: true },
          { label: 'Período selecionado', val: periodAvg },
          { label: 'vs. 7 dias anteriores', val: trend, isChange: true },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl border border-border/60 bg-card p-4 text-center"
          >
            <span className="text-xs text-muted-foreground block mb-1">{s.label}</span>
            {s.isChange ? (
              <div className="flex items-center justify-center gap-1">
                <TrendIcon className={cn('w-4 h-4', trendColor)} />
                <span className={cn('text-xl font-black font-mono', trendColor)}>
                  {trend !== null ? (trend > 0 ? `+${trend}` : trend) : '—'}
                </span>
              </div>
            ) : (
              <p className="text-2xl font-black font-mono" style={{ color: metricConfig?.color }}>
                {s.val ?? '—'}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Main Area Chart */}
      {chartData.length >= 2 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/60 bg-card p-5"
        >
          <h3 className="text-sm font-semibold mb-1">{metricConfig?.label}</h3>
          <p className="text-xs text-muted-foreground mb-4">Área + média móvel 3 dias</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={movingAvg}>
                <defs>
                  <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={metricConfig?.color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={metricConfig?.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,10%)" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(215,15%,45%)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'hsl(215,15%,45%)', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={tooltipStyle} />
                {periodAvg && <ReferenceLine y={periodAvg} stroke={metricConfig?.color} strokeDasharray="4 4" strokeOpacity={0.4} />}
                <Area
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={metricConfig?.color}
                  fill="url(#metricGrad)"
                  strokeWidth={2}
                  dot={chartData.length <= 10 ? { fill: metricConfig?.color, r: 3 } : false}
                  name={metricConfig?.label}
                />
                <Area
                  type="monotone"
                  dataKey="moving_avg"
                  stroke={metricConfig?.color}
                  fill="none"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  strokeOpacity={0.6}
                  dot={false}
                  name="Média móvel"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p>Registre mais check-ins para ver tendências</p>
        </div>
      )}

      {/* Recovery vs Fatigue Bar */}
      {chartData.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border/60 bg-card p-5"
        >
          <h3 className="text-sm font-semibold mb-1">Recovery vs Fadiga</h3>
          <p className="text-xs text-muted-foreground mb-4">Equilíbrio carga-recuperação diário</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2}>
                <XAxis dataKey="date" tick={{ fill: 'hsl(215,15%,45%)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'hsl(215,15%,45%)', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="recovery_score" radius={[3, 3, 0, 0]} opacity={0.85} name="Recovery">
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.rest_day ? 'hsl(220,15%,30%)' : 'hsl(142,70%,50%)'} />
                  ))}
                </Bar>
                <Bar dataKey="fatigue_score" fill="hsl(0,72%,55%)" radius={[3, 3, 0, 0]} opacity={0.7} name="Fadiga" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-5 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-sm bg-[hsl(142,70%,50%)]" /> Recovery
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-sm bg-[hsl(0,72%,55%)]" /> Fadiga
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
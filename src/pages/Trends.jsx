import React, { useState } from 'react';
import { useUserCheckins } from '@/hooks/useUserData';
import { motion } from 'framer-motion';
import { formatDateChart, parseLocalDate } from '@/lib/date-utils';
import {
  AreaChart, Area, BarChart, Bar, ScatterChart, Scatter, Line, ComposedChart,
  XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine, Cell,
} from 'recharts';
import { computeCheckinScores } from '@/lib/biocharge-utils';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Gauge, ShieldCheck, ShieldAlert } from 'lucide-react';
import DetectedPatternBlock from '@/components/trends/DetectedPatternBlock';

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

function pearson(x, y) {
  const n = x.length;
  if (n < 2) return 0;

  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;

  const num = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0);
  const den = Math.sqrt(
    x.reduce((s, xi) => s + (xi - mx) ** 2, 0) *
    y.reduce((s, yi) => s + (yi - my) ** 2, 0)
  );

  return den === 0 ? 0 : num / den;
}

const CORRELATION_FIELDS = [
  {
    key: 'hrv',
    label: 'HRV',
    getValue: (c) => c.hrv,
  },
  {
    key: 'sleep_hours',
    label: 'Horas de sono',
    getValue: (c) => c.sleep_hours,
  },
  {
    key: 'deep_sleep_pct',
    label: 'Sono profundo',
    getValue: (c) => c.deep_sleep_pct,
  },
  {
    key: 'rem_sleep_pct',
    label: 'Sono REM',
    getValue: (c) => c.rem_sleep_pct,
  },
  {
    key: 'resting_hr',
    label: 'FC de repouso',
    getValue: (c) => c.resting_hr ?? c.resting_heart_rate ?? null,
  },
  {
    key: 'fatigue',
    label: 'Fadiga',
    getValue: (c) => c.fatigue_score ?? c.fatigue ?? null,
  },
  {
    key: 'soreness',
    label: 'Dor muscular',
    getValue: (c) => c.muscle_soreness ?? c.muscle_soreness_level ?? null,
  },
  {
    key: 'stress',
    label: 'Estresse',
    getValue: (c) => c.stress_score ?? c.stress ?? null,
  },
  {
    key: 'hydration',
    label: 'Hidratação',
    getValue: (c) => c.hydration ?? c.hydration_liters ?? null,
  },
  {
    key: 'daily_strain_accumulated',
    label: 'Strain diário',
    getValue: (c) => c.daily_strain_accumulated,
  },
];

function getCorrelationStrengthLabel(absR) {
  if (absR >= 0.7) return 'Muito forte';
  if (absR >= 0.5) return 'Forte';
  if (absR >= 0.3) return 'Moderada';
  return 'Leve';
}

function getCorrelationTone(r) {
  if (r > 0) {
    return {
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      fill: 'bg-emerald-500',
      direction: 'Quando sobe, seu recovery tende a subir',
      short: '↑ favorece recovery',
    };
  }

  return {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    fill: 'bg-red-500',
    direction: 'Quando sobe, seu recovery tende a cair',
    short: '↑ prejudica recovery',
  };
}

function RecoveryInfluencersCard({ checkins = [] }) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const recent30 = [...checkins]
    .filter((c) => c?.date && parseLocalDate(c.date) >= cutoff)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  if (recent30.length < 8) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 bg-card p-5"
      >
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold">
              Seus maiores influenciadores de recuperação (30 dias)
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Ainda faltam dados suficientes para detectar correlações confiáveis.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const ranked = CORRELATION_FIELDS
    .map((field) => {
      const pairs = recent30
        .map((c) => ({
          x: field.getValue(c),
          y: c.recovery_score,
        }))
        .filter((p) => p.x != null && !isNaN(p.x) && p.y != null && !isNaN(p.y));

      if (pairs.length < 8) return null;

      const x = pairs.map((p) => Number(p.x));
      const y = pairs.map((p) => Number(p.y));
      const r = pearson(x, y);

      return {
        key: field.key,
        label: field.label,
        r,
        absR: Math.abs(r),
        n: pairs.length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.absR - a.absR)
    .slice(0, 3);

  if (!ranked.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 bg-card p-5"
      >
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold">
              Seus maiores influenciadores de recuperação (30 dias)
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Ainda não há variáveis suficientes com consistência para ranquear seus principais influenciadores.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-5 space-y-4"
    >
      <div>
        <h3 className="text-sm font-semibold">
          Seus maiores influenciadores de recuperação (30 dias)
        </h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Ranking das variáveis que mais se moveram junto com seu recovery nos dados recentes.
        </p>
      </div>

      <div className="space-y-3">
        {ranked.map((item, index) => {
          const tone = getCorrelationTone(item.r);
          const width = `${Math.max(item.absR * 100, 6)}%`;

          return (
            <div
              key={item.key}
              className={`rounded-xl border px-4 py-3 ${tone.bg} ${tone.border}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      #{index + 1}
                    </span>
                    <p className="text-sm font-semibold">{item.label}</p>
                  </div>

                  <p className={`text-xs mt-1 ${tone.color}`}>
                    {tone.direction}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className={`text-sm font-mono font-black ${tone.color}`}>
                    {item.r > 0 ? '+' : ''}
                    {item.r.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {getCorrelationStrengthLabel(item.absR)}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="w-full h-2 rounded-full bg-secondary/70 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${tone.fill}`}
                    style={{ width }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">
                    {tone.short}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    n={item.n}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Correlação mostra associação estatística — não garante causalidade.
      </p>
    </motion.div>
  );
}

function avgList(values) {
  const valid = values.filter((v) => v != null && !isNaN(v));
  if (!valid.length) return null;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

function clampRange(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getBalanceClassification(balanceIndex) {
  if (balanceIndex > 20) {
    return {
      label: 'Subutilizado',
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      icon: TrendingUp,
      summary: 'Seu corpo parece estar suportando mais do que você vem exigindo.',
      recommendation: 'Há margem para aumentar a carga de forma progressiva e controlada.',
    };
  }

  if (balanceIndex >= -10 && balanceIndex <= 20) {
    return {
      label: 'Em equilíbrio',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      icon: ShieldCheck,
      summary: 'Sua relação entre carga e recuperação está em uma faixa saudável.',
      recommendation: 'A tendência é boa para sustentar consistência sem forçar demais.',
    };
  }

  if (balanceIndex >= -30 && balanceIndex < -10) {
    return {
      label: 'Carga elevada',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      icon: ShieldAlert,
      summary: 'A carga recente já está começando a pressionar sua capacidade de recuperação.',
      recommendation: 'Vale moderar a intensidade ou reduzir volume antes de empilhar mais fadiga.',
    };
  }

  return {
    label: 'Overreaching',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: TrendingDown,
    summary: 'Sua carga recente está acima do que sua recuperação vem sustentando.',
    recommendation: 'Priorize recuperação e evite continuar acumulando carga até estabilizar.',
  };
}

function getBalancePointerPercent(balanceIndex) {
  // escala visual fixa entre -40 e +40
  const clamped = clampRange(balanceIndex, -40, 40);
  return ((clamped + 40) / 80) * 100;
}

function StrainRecoveryBalanceCard({ checkins = [] }) {
  const sorted = [...checkins]
    .filter((c) => c?.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const last7 = sorted.slice(0, 7);
  const validRecovery = last7.filter((c) => c?.recovery_score != null);

  if (validRecovery.length < 4) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 bg-card p-5"
      >
        <div className="flex items-start gap-3">
          <Gauge className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold">Balance de carga e recuperação</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Ainda faltam registros suficientes para calcular seu equilíbrio semanal com confiança.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const avgRecovery = avgList(last7.map((c) => c.recovery_score));
  const avgStrain = avgList(last7.map((c) => Number(c.daily_strain_accumulated ?? 0)));

  const balanceIndex = Number(((avgRecovery ?? 0) - (avgStrain ?? 0)).toFixed(1));
  const classification = getBalanceClassification(balanceIndex);
  const pointerPercent = getBalancePointerPercent(balanceIndex);
  const Icon = classification.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Gauge className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold">Balance de carga e recuperação</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Recovery médio vs strain médio dos últimos 7 dias.
            </p>
          </div>
        </div>

        <span
          className={`text-[10px] font-bold px-2 py-1 rounded-full border ${classification.bg} ${classification.border} ${classification.color}`}
        >
          {classification.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-secondary/30 border border-border/30 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Recovery médio
          </p>
          <p className="text-xl font-mono font-black text-foreground">
            {avgRecovery != null ? avgRecovery.toFixed(1) : '—'}
          </p>
        </div>

        <div className="rounded-xl bg-secondary/30 border border-border/30 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Strain médio
          </p>
          <p className="text-xl font-mono font-black text-foreground">
            {avgStrain != null ? avgStrain.toFixed(1) : '—'}
          </p>
        </div>

        <div className="rounded-xl bg-secondary/30 border border-border/30 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Índice
          </p>
          <p className={`text-xl font-mono font-black ${classification.color}`}>
            {balanceIndex > 0 ? `+${balanceIndex}` : balanceIndex}
          </p>
        </div>
      </div>

      {/* Gauge */}
      <div className="space-y-2">
        <div className="relative">
          <div className="h-3 w-full rounded-full overflow-hidden border border-border/40 flex">
            <div className="w-[12.5%] bg-red-500/75" />
            <div className="w-[25%] bg-yellow-500/75" />
            <div className="w-[37.5%] bg-emerald-500/75" />
            <div className="w-[25%] bg-sky-500/75" />
          </div>

          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${pointerPercent}%` }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-background border-2 border-white shadow" />
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Over</span>
          <span>Carga</span>
          <span>Equilíbrio</span>
          <span>Subutil.</span>
        </div>
      </div>

      <div className={`rounded-xl border px-4 py-3 ${classification.bg} ${classification.border}`}>
        <div className="flex items-start gap-3">
          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${classification.color}`} />
          <div>
            <p className={`text-sm font-semibold ${classification.color}`}>
              {classification.summary}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              {classification.recommendation}
            </p>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Baseado nos seus últimos {last7.length} check-ins com recovery e strain diário.
      </p>
    </motion.div>
  );
}

export default function Trends() {
  const [period, setPeriod] = useState(30);
  const [selectedMetric, setSelectedMetric] = useState('recovery_score');

  const { data: checkins = [] } = useUserCheckins(365);

  const computed = checkins.map((c, i) => computeCheckinScores(c, checkins.slice(i + 1), []));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - period);
  const filtered = computed.filter(c => c.date && parseLocalDate(c.date) >= cutoff);
  const chartData = [...filtered].reverse().map(c => ({
    date: c.date ? formatDateChart(c.date) : '',
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

{/* Strain vs Recovery Balance */}
      <StrainRecoveryBalanceCard checkins={computed} />

      {/* Empty state */}
      {filtered.length < 5 && (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center px-6">
          <span className="text-4xl mb-4">📊</span>
          <p className="font-semibold mb-1">Dados insuficientes</p>
          <p className="text-sm text-muted-foreground">
            Continue fazendo check-ins diários. Os gráficos aparecem após{' '}
            {5 - filtered.length} {5 - filtered.length === 1 ? 'dia' : 'dias'} mais no período selecionado.
          </p>
        </div>
      )}

      {/* Main Area Chart */}
      {chartData.length >= 2 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/60 bg-card p-5"
        >
          <div className="flex items-baseline gap-2 mb-1">
            <h3 className="text-sm font-semibold">{metricConfig?.label}</h3>
            {(selectedMetric === 'fatigue_score' || selectedMetric === 'stress_score') && (
              <span className="text-[10px] text-muted-foreground">(quanto menor, melhor)</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-4">Área + média móvel 3 dias</p>
          <div role="img" aria-label="Gráfico de evolução da métrica selecionada ao longo do tempo" className="h-56">
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

      {/* Detected Pattern Block */}
      <DetectedPatternBlock checkins={filtered} allCheckins={computed} />

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
          <div role="img" aria-label="Gráfico de barras comparando Recovery e Fadiga diários" className="h-44">
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

      {/* Sleep × Next-day Recovery Scatter */}
      {(() => {
        const last30 = computed.filter(c => c.date && parseLocalDate(c.date) >= (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })());
        const sorted = [...last30].sort((a, b) => a.date < b.date ? -1 : 1);
        const scatterPoints = sorted.slice(0, -1).reduce((acc, c, i) => {
          const nextDay = sorted[i + 1];
          const sleepH = c.sleep_hours;
          const nextRecovery = nextDay?.recovery_score;
          if (sleepH != null && nextRecovery != null) {
            acc.push({ x: sleepH, y: nextRecovery, date: c.date });
          }
          return acc;
        }, []);

        // Simple linear regression
        let trendLine = [];
        if (scatterPoints.length >= 3) {
          const n = scatterPoints.length;
          const sumX = scatterPoints.reduce((s, p) => s + p.x, 0);
          const sumY = scatterPoints.reduce((s, p) => s + p.y, 0);
          const sumXY = scatterPoints.reduce((s, p) => s + p.x * p.y, 0);
          const sumX2 = scatterPoints.reduce((s, p) => s + p.x * p.x, 0);
          const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
          const intercept = (sumY - slope * sumX) / n;
          const xVals = [Math.min(...scatterPoints.map(p => p.x)), Math.max(...scatterPoints.map(p => p.x))];
          trendLine = xVals.map(x => ({ x, trend: Math.round(slope * x + intercept) }));
        }

        if (scatterPoints.length < 3) return null;

        return (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border/60 bg-card p-5"
          >
            <h3 className="text-sm font-semibold mb-0.5">Impacto do Sono no Recovery</h3>
            <p className="text-xs text-muted-foreground mb-4">Cada ponto = um dia dos seus dados</p>
            <div role="img" aria-label="Gráfico de dispersão mostrando relação entre horas de sono e recovery do dia seguinte" className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,10%)" />
                  <XAxis
                    type="number" dataKey="x" name="Sono"
                    domain={['auto', 'auto']}
                    tick={{ fill: 'hsl(215,15%,45%)', fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    label={{ value: 'Horas de sono', position: 'insideBottom', offset: -2, fill: 'hsl(215,15%,45%)', fontSize: 10 }}
                  />
                  <YAxis
                    type="number" dataKey="y" name="Recovery"
                    domain={[0, 100]}
                    tick={{ fill: 'hsl(215,15%,45%)', fontSize: 10 }}
                    axisLine={false} tickLine={false} width={30}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val, name) => name === 'Recovery' ? [`${val}`, 'Recovery no dia seguinte'] : [`${val}h`, 'Horas de sono']}
                    cursor={{ strokeDasharray: '3 3' }}
                  />
                  <Scatter
                    name="dias"
                    data={scatterPoints}
                    fill="hsl(200,80%,55%)"
                    fillOpacity={0.8}
                    r={4}
                  />
                  {trendLine.length === 2 && (
                    <Line
                      data={trendLine}
                      dataKey="trend"
                      stroke="hsl(142,70%,50%)"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      dot={false}
                      name="Tendência"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Linha verde = tendência. Pontos mais à direita = mais sono.
            </p>
          </motion.div>
        );
      })()}
    </div>
  );
}
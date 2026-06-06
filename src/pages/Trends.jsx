import React, { useMemo, useState } from 'react';
import { useUserCheckins, useUserTrainingSessions } from '@/hooks/useUserData';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { formatDateChart, parseLocalDate } from '@/lib/date-utils';
import {
  AreaChart, Area, BarChart, Bar, ScatterChart, Scatter, Line, ComposedChart,
  XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine, Cell,
} from 'recharts';
import { computeCheckinScores } from '@/lib/biocharge-utils';
import { calculateTrainingLoad } from '@/lib/physiological-engine';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Loader2,
  Moon,
  Scale,
  Footprints,
} from 'lucide-react';

const timeFilters = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

const metrics = [
  { key: 'recovery_score', label: 'Recovery base', color: 'hsl(142,70%,50%)' },
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

function safeJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function averageField(items, getter) {
  const values = items
    .map(getter)
    .filter((v) => v != null && !isNaN(v));

  if (!values.length) return null;
  return values.reduce((sum, v) => sum + Number(v), 0) / values.length;
}

function zoneTone(zone) {
  if (zone === 'green') {
    return {
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      label: 'Green',
    };
  }

  if (zone === 'yellow') {
    return {
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      label: 'Yellow',
    };
  }

  return {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    label: 'Red',
  };
}

function confidenceTone(confidence) {
  if (confidence === 'high') {
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  }

  if (confidence === 'medium') {
    return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
  }

  return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
}

function RecoveryTomorrowPredictorCard({ checkins = [] }) {
  const [plannedSleep, setPlannedSleep] = useState(7.5);
  const [plannedStrain, setPlannedStrain] = useState(8);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const sorted = [...checkins]
    .filter((c) => c?.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const today = sorted[0] || null;
  const prior3 = sorted.slice(1, 4);

  const canPredict = !!today && prior3.length >= 2;

  async function handlePredict() {
    if (!today) return;

    setLoading(true);
    setError('');
    setResult(null);

    const todayData = {
      biocharge_morning: today.biocharge_morning ?? null,
      recovery_score: today.recovery_score ?? null,
      hrv: today.hrv ?? null,
      sleep_hours: today.sleep_hours ?? null,
      deep_sleep_pct: today.deep_sleep_pct ?? null,
      rem_sleep_pct: today.rem_sleep_pct ?? null,
      daily_strain_accumulated: today.daily_strain_accumulated ?? 0,
      fatigue: today.fatigue_score ?? today.fatigue ?? null,
      soreness: today.muscle_soreness ?? today.muscle_soreness_level ?? null,
      stress: today.stress_score ?? today.stress ?? null,
      hydration: today.hydration ?? today.hydration_liters ?? null,
    };

    const trendData = {
      biocharge_morning_avg_3d: averageField(prior3, (c) => c.biocharge_morning),
      recovery_score_avg_3d: averageField(prior3, (c) => c.recovery_score),
      hrv_avg_3d: averageField(prior3, (c) => c.hrv),
      sleep_hours_avg_3d: averageField(prior3, (c) => c.sleep_hours),
      deep_sleep_pct_avg_3d: averageField(prior3, (c) => c.deep_sleep_pct),
      rem_sleep_pct_avg_3d: averageField(prior3, (c) => c.rem_sleep_pct),
      strain_avg_3d: averageField(prior3, (c) => c.daily_strain_accumulated),
      fatigue_avg_3d: averageField(prior3, (c) => c.fatigue_score ?? c.fatigue),
      soreness_avg_3d: averageField(prior3, (c) => c.muscle_soreness ?? c.muscle_soreness_level),
      stress_avg_3d: averageField(prior3, (c) => c.stress_score ?? c.stress),
      hydration_avg_3d: averageField(prior3, (c) => c.hydration ?? c.hydration_liters),
    };

    const prompt = `Você é um motor fisiológico de predição de recuperação atlética.
Com base nos dados abaixo, preveja o BioCharge score de amanhã (0-100)
e a zona de recuperação (green/yellow/red).

Dados de hoje:
${JSON.stringify(todayData, null, 2)}

Tendência dos últimos 3 dias:
${JSON.stringify(trendData, null, 2)}

Sono planejado: ${plannedSleep}h
Strain planejado amanhã: ${plannedStrain}/21 (escala 0–21, a mesma do strain de hoje e da tendência acima)

Regras:
- trate como tendência, não como certeza
- seja conservador
- use os dados de hoje e a tendência para modular a previsão
- se os dados forem incompletos, reduza a confiança
- NÃO escreva nada fora do JSON

Responda APENAS em JSON:
{
  "predicted_score": number,
  "predicted_zone": "green"|"yellow"|"red",
  "confidence": "high"|"medium"|"low",
  "key_factors": ["fator1", "fator2"],
  "recommendation": "frase curta de recomendação"
}`;

    try {
      const raw = await base44.integrations.Core.InvokeLLM({ prompt });
      const parsed = safeJsonFromText(raw);

      if (!parsed) {
        throw new Error('Resposta inválida do modelo');
      }

      const normalized = {
        predicted_score: Number(parsed.predicted_score ?? 0),
        predicted_zone: ['green', 'yellow', 'red'].includes(parsed.predicted_zone)
          ? parsed.predicted_zone
          : 'yellow',
        confidence: ['high', 'medium', 'low'].includes(parsed.confidence)
          ? parsed.confidence
          : 'low',
        key_factors: Array.isArray(parsed.key_factors)
          ? parsed.key_factors.slice(0, 3)
          : [],
        recommendation:
          typeof parsed.recommendation === 'string'
            ? parsed.recommendation
            : 'Use esta previsão como tendência, não como garantia.',
      };

      if (isNaN(normalized.predicted_score)) {
        throw new Error('Predicted score inválido');
      }

      normalized.predicted_score = Math.max(0, Math.min(100, Math.round(normalized.predicted_score)));

      setResult(normalized);
    } catch (err) {
      console.warn('RecoveryTomorrowPredictorCard failed', err);
      setError('Não foi possível gerar a previsão agora. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }

  const zone = zoneTone(result?.predicted_zone || 'yellow');

  return (
<motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/60 bg-card p-4 space-y-3.5"
    >

<div className="flex items-start gap-2.5">
        <Sparkles className="w-4.5 h-4.5 text-primary mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Prever amanhã</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            Simule como sono planejado e carga prevista podem influenciar sua recuperação.
          </p>
        </div>
      </div>

      {!canPredict && (
        <div className="rounded-xl border border-border/40 bg-secondary/20 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Ainda faltam dados suficientes para gerar uma previsão útil. Registre mais alguns check-ins.
          </p>
        </div>
      )}

      {canPredict && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/40 bg-secondary/20 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Sono planejado
                </p>
                <p className="text-sm font-mono font-bold">{plannedSleep}h</p>
              </div>

              <input
                type="range"
                min={4}
                max={10}
                step={0.5}
                value={plannedSleep}
                onChange={(e) => setPlannedSleep(Number(e.target.value))}
                className="w-full accent-primary"
              />

              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>4h</span>
                <span>10h</span>
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-secondary/20 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Strain planejado
                </p>
                <p className="text-sm font-mono font-bold">{plannedStrain}/21</p>
              </div>

              <input
                type="range"
                min={0}
                max={21}
                step={0.5}
                value={plannedStrain}
                onChange={(e) => setPlannedStrain(Number(e.target.value))}
                className="w-full accent-primary"
              />

              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Leve</span>
                <span>Alto</span>
              </div>
            </div>
          </div>

<button
            onClick={handlePredict}
            disabled={loading}
            className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >

            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando previsão...
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" />
                Prever amanhã
              </>
            )}
          </button>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className={`rounded-xl border px-4 py-3.5 ${zone.bg} ${zone.border}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Recovery previsto
                    </p>
                    <div className="flex items-end gap-2">
                      <span className={`text-4xl font-black font-mono ${zone.color}`}>
                        {result.predicted_score}
                      </span>
                      <span className={`text-sm font-semibold mb-1 ${zone.color}`}>
                        {zone.label}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full border ${confidenceTone(result.confidence)}`}
                  >
                    {result.confidence === 'high'
                      ? 'Confiança alta'
                      : result.confidence === 'medium'
                      ? 'Confiança média'
                      : 'Confiança baixa'}
                  </span>
                </div>
              </div>

              {result.key_factors?.length > 0 && (
                <div className="rounded-xl border border-border/40 bg-secondary/20 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                    Fatores-chave
                  </p>
                  <ul className="space-y-1.5">
                    {result.key_factors.map((factor, i) => (
                      <li key={i} className="text-sm text-foreground/85 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-xl border border-border/40 bg-secondary/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Recomendação
                </p>
                <p className="text-sm text-foreground/85 leading-relaxed">
                  {result.recommendation}
                </p>
              </div>

              <p className="text-[10px] text-muted-foreground">
                Esta previsão é uma tendência gerada a partir do seu estado atual e do plano informado — não é garantia.
              </p>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

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
        className="rounded-xl border border-border/60 bg-card p-4"
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
        className="rounded-xl border border-border/60 bg-card p-4"
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
      className="rounded-xl border border-border/60 bg-card p-4 space-y-3.5"
    >
<div>
        <h3 className="text-sm font-semibold tracking-tight">
          Influenciadores da recuperação
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
          Top 3 fatores dos últimos 30 dias com associação mais forte ao seu recovery.
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

function getLoadClassification(load) {
  const ratio = load?.ratio;
  if (ratio == null) {
    return {
      label: 'Sem dados', color: 'text-muted-foreground', bg: 'bg-secondary/30', border: 'border-border/40', icon: Gauge,
      summary: 'Ainda não dá para calcular a relação carga aguda/crônica.',
      recommendation: 'Continue registrando treinos e check-ins por algumas semanas.',
    };
  }
  if (ratio < 0.8) {
    return {
      label: 'Subcarga', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', icon: TrendingUp,
      summary: `Sua carga recente está abaixo da sua média (ACWR ${ratio.toFixed(2)}).`,
      recommendation: 'Há espaço para aumentar volume/intensidade de forma progressiva, se a recuperação acompanhar.',
    };
  }
  if (ratio <= 1.3) {
    return {
      label: 'Faixa ideal', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: ShieldCheck,
      summary: `Sua carga aguda está alinhada com a crônica (ACWR ${ratio.toFixed(2)}).`,
      recommendation: 'Boa zona para sustentar consistência sem sobrecarregar.',
    };
  }
  if (ratio <= 1.5) {
    return {
      label: 'Carga elevada', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: ShieldAlert,
      summary: `Sua carga aguda subiu acima da sua média recente (ACWR ${ratio.toFixed(2)}).`,
      recommendation: 'Vale evitar novos saltos de volume por alguns dias antes de seguir subindo.',
    };
  }
  return {
    label: 'Carga muito alta', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: TrendingDown,
    summary: `Sua carga aguda está bem acima da crônica (ACWR ${ratio.toFixed(2)}).`,
    recommendation: 'Priorize recuperação e segure novos aumentos de carga até a relação cair.',
  };
}

function getLoadPointerPercent(ratio) {
  // Mapeia o ACWR (0–~2) para a posição na barra, alinhado às zonas:
  // subcarga <0,8 | ideal 0,8–1,3 | elevada 1,3–1,5 | risco >1,5
  if (ratio == null) return 50;
  const r = Math.max(0, ratio);
  if (r <= 0.8) return (r / 0.8) * 25;
  if (r <= 1.3) return 25 + ((r - 0.8) / 0.5) * 35;
  if (r <= 1.5) return 60 + ((r - 1.3) / 0.2) * 20;
  return Math.min(100, 80 + ((r - 1.5) / 0.5) * 20);
}

function StrainRecoveryBalanceCard({ checkins = [], sessions = [] }) {
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
        className="rounded-xl border border-border/60 bg-card p-4"
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

  const load = calculateTrainingLoad(sorted, sessions);
  const acwr = load?.ratio ?? null;
  const classification = getLoadClassification(load);
  const pointerPercent = getLoadPointerPercent(acwr);
  const Icon = classification.icon;

  return (
<motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/60 bg-card p-4 space-y-3.5"
    >
<div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Gauge className="w-4.5 h-4.5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Balance de carga e recuperação</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Carga aguda (7 dias) vs crônica — razão ACWR.
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
            Carga aguda (7d)
          </p>
          <p className="text-xl font-mono font-black text-foreground">
            {load?.acute != null ? load.acute : '—'}
          </p>
        </div>

        <div className="rounded-xl bg-secondary/30 border border-border/30 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Carga crônica
          </p>
          <p className="text-xl font-mono font-black text-foreground">
            {load?.chronic != null ? load.chronic : '—'}
          </p>
        </div>

        <div className="rounded-xl bg-secondary/30 border border-border/30 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            ACWR
          </p>
          <p className={`text-xl font-mono font-black ${classification.color}`}>
            {acwr != null ? acwr.toFixed(2) : '—'}
          </p>
        </div>
      </div>

      {/* Gauge */}
      <div className="space-y-2">
        <div className="relative">
          <div className="h-3 w-full rounded-full overflow-hidden border border-border/40 flex">
            <div className="w-[25%] bg-sky-500/75" />
            <div className="w-[35%] bg-emerald-500/75" />
            <div className="w-[20%] bg-yellow-500/75" />
            <div className="w-[20%] bg-red-500/75" />
          </div>

          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${pointerPercent}%` }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-background border-2 border-white shadow" />
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Subcarga</span>
          <span>Ideal</span>
          <span>Elevada</span>
          <span>Risco</span>
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
        {load?.lowConfidence
          ? `ACWR com histórico curto (${last7.length} check-ins) — baixa confiança; fica mais preciso com mais semanas.`
          : 'Razão entre a carga dos últimos 7 dias e a sua média recente — a mesma leitura de carga usada no Hoje e no Insights.'}
      </p>
    </motion.div>
  );
}

function WeeklyRunningVolumeCard({ sessions = [] }) {
  function weekStartMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }
  const fmt = (t) => {
    const d = new Date(t);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const runs = (sessions || [])
    .filter(
      (s) =>
        s?.date &&
        String(s.sport || '').toLowerCase().includes('corr') &&
        Number(s.distance_km) > 0
    )
    .map((s) => ({ date: parseLocalDate(s.date), km: Number(s.distance_km) }));

  const byWeek = new Map();
  for (const r of runs) {
    const key = weekStartMonday(r.date).getTime();
    byWeek.set(key, (byWeek.get(key) || 0) + r.km);
  }

  if (byWeek.size < 2) {
    return (
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-start gap-3">
          <Footprints className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold">Volume de corrida (semanal)</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Registre a <strong>distância</strong> das suas corridas ao adicionar o treino. Depois de ~2–3 semanas, o volume semanal e a variação aparecem aqui.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const WEEK = 7 * 86400000;
  const keys = [...byWeek.keys()].sort((a, b) => a - b);
  const curWeek = weekStartMonday(new Date()).getTime();
  const start = Math.max(keys[0], curWeek - 9 * WEEK);
  const weeks = [];
  for (let t = start; t <= curWeek; t += WEEK) {
    weeks.push({ label: fmt(t), km: Number((byWeek.get(t) || 0).toFixed(1)) });
  }

  const curKm = weeks[weeks.length - 1]?.km ?? 0;
  const prevKm = weeks.length >= 2 ? weeks[weeks.length - 2].km : 0;
  const deltaKm = Number((curKm - prevKm).toFixed(1));
  const pct = prevKm > 0 ? Math.round((deltaKm / prevKm) * 100) : null;
  const DirIcon = deltaKm > 0.1 ? TrendingUp : deltaKm < -0.1 ? TrendingDown : Minus;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/60 bg-card p-4 space-y-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Footprints className="w-4.5 h-4.5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Volume de corrida (semanal)</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Soma de km por semana (segunda a domingo). Só corridas com distância informada.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-black font-mono leading-none">
            {curKm.toFixed(1)}<span className="text-xs font-semibold text-muted-foreground"> km</span>
          </p>
          <div className="flex items-center justify-end gap-1 mt-1 text-muted-foreground">
            <DirIcon className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono">
              {deltaKm > 0 ? '+' : ''}{deltaKm} km{pct != null ? ` (${pct > 0 ? '+' : ''}${pct}%)` : ''}
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground/70 mt-0.5">semana atual vs anterior</p>
        </div>
      </div>

      <div role="img" aria-label="Gráfico de volume de corrida por semana" className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeks}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,10%)" />
            <XAxis dataKey="label" tick={{ fill: 'hsl(215,15%,45%)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'hsl(215,15%,45%)', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v).toFixed(1)} km`, 'Semana']} />
            <Bar dataKey="km" fill="hsl(142,70%,50%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-border/40 pt-2.5">
        Subidas bruscas de volume semana a semana aumentam o risco de lesão — use para progredir aos poucos. Não entra no recovery; é leitura de carga de corrida.
      </p>
    </motion.div>
  );
}

function WeightTrendCard({ checkins = [] }) {
  // Peso é sinal LENTO: suavizamos o ruído diário (água, glicogênio, dias copiados).
  const points = [...(checkins || [])]
    .filter((c) => c?.date && c.body_weight != null && Number(c.body_weight) > 0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((c) => ({ rawDate: c.date, weight: Number(c.body_weight) }));

  if (points.length < 8) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border/60 bg-card p-4"
      >
        <div className="flex items-start gap-3">
          <Scale className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold">Peso — tendência lenta</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Registre o peso em mais alguns dias (idealmente pela manhã) para ver a direção da sua tendência. O dia-a-dia oscila demais para ter valor isolado.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const smoothed = points.map((p, i) => {
    const window = points.slice(Math.max(0, i - 6), i + 1).map((w) => w.weight);
    const avg = window.reduce((s, v) => s + v, 0) / window.length;
    return { date: formatDateChart(p.rawDate), ma7: Number(avg.toFixed(2)) };
  });

  const firstMa = smoothed[0].ma7;
  const lastMa = smoothed[smoothed.length - 1].ma7;
  const deltaKg = Number((lastMa - firstMa).toFixed(1));

  const spanDays = Math.max(
    1,
    Math.round(
      (parseLocalDate(points[points.length - 1].rawDate) - parseLocalDate(points[0].rawDate)) / 86400000
    )
  );

  const dirUp = deltaKg >= 0.3;
  const dirDown = deltaKg <= -0.3;
  const DirIcon = dirUp ? TrendingUp : dirDown ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/60 bg-card p-4 space-y-3.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Scale className="w-4.5 h-4.5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Peso — tendência lenta</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Média de 7 pesagens. O dia-a-dia oscila por água e comida; o que importa é a direção.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-black font-mono leading-none">
            {lastMa.toFixed(1)}
            <span className="text-xs font-semibold text-muted-foreground"> kg</span>
          </p>
          <div className="flex items-center justify-end gap-1 mt-1 text-muted-foreground">
            <DirIcon className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono">
              {deltaKg > 0 ? '+' : ''}{deltaKg} kg / ~{spanDays}d
            </span>
          </div>
        </div>
      </div>

      <div role="img" aria-label="Gráfico da média móvel do peso ao longo do tempo" className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={smoothed}>
            <defs>
              <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(190,65%,55%)" stopOpacity={0.22} />
                <stop offset="95%" stopColor="hsl(190,65%,55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,10%)" />
            <XAxis dataKey="date" tick={{ fill: 'hsl(215,15%,45%)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{ fill: 'hsl(215,15%,45%)', fontSize: 10 }} axisLine={false} tickLine={false} width={36} tickFormatter={(v) => v.toFixed(1)} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v).toFixed(1)} kg`, 'Média 7d']} />
            <Area type="monotone" dataKey="ma7" stroke="hsl(190,65%,55%)" fill="url(#weightGrad)" strokeWidth={2} dot={false} name="Média 7d" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-border/40 pt-2.5">
        Baseado em {points.length} pesagens. O peso <span className="text-foreground/80">não entra</span> no seu recovery nem em correlações diárias — variação de 1 dia é quase só água. Aqui ele é só direção de médio prazo.
      </p>
    </motion.div>
  );
}

export default function Trends() {
  const [period, setPeriod] = useState(30);
  const [selectedMetric, setSelectedMetric] = useState('recovery_score');

  const { data: checkins = [] } = useUserCheckins(365);
  const { data: trainingSessions = [] } = useUserTrainingSessions(365);

  const computed = checkins.map((c, i) => computeCheckinScores(c, checkins.slice(i + 1), []));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - period);
  const filtered = computed.filter(c => c.date && parseLocalDate(c.date) >= cutoff);
  const chartData = [...filtered].reverse().map(c => ({
    date: c.date ? formatDateChart(c.date) : '',
    ...c,
    // Null out performance metrics on rest days so they show as gaps
    ...(c.rest_day ? {
      recovery_score: null,
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
    <div className="space-y-4 max-w-3xl mx-auto">
<div>
        <h1 className="text-2xl font-black tracking-tight">Tendências</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Evolução dos seus sinais fisiológicos ao longo do tempo.
        </p>
      </div>



{/* Period + Metric selectors */}
      <div className="space-y-2.5">
        <div className="flex gap-1.5">
          {timeFilters.map(f => (
            <button
              key={f.days}
              onClick={() => setPeriod(f.days)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                period === f.days
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {metrics.map(m => (
            <button
              key={m.key}
              onClick={() => setSelectedMetric(m.key)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border',
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
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: 'Últimos 7 dias', val: last7Avg },
          { label: 'Período selecionado', val: periodAvg },
          { label: 'vs. 7 dias anteriores', val: trend, isChange: true },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border/60 bg-card px-3 py-3 text-center"
          >
            <span className="text-[10px] text-muted-foreground block mb-1 leading-tight">
              {s.label}
            </span>

            {s.isChange ? (
              <div className="flex items-center justify-center gap-1">
                <TrendIcon className={cn('w-3.5 h-3.5', trendColor)} />
                <span className={cn('text-lg font-black font-mono', trendColor)}>
                  {trend !== null ? (trend > 0 ? `+${trend}` : trend) : '—'}
                </span>
              </div>
            ) : (
              <p className="text-xl font-black font-mono" style={{ color: metricConfig?.color }}>
                {s.val ?? '—'}
              </p>
            )}
          </motion.div>
        ))}
      </div>

<div className="space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Leitura avançada
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Equilíbrio semanal e simulação de recovery.
          </p>
        </div>

        {/* Strain vs Recovery Balance */}
        <StrainRecoveryBalanceCard checkins={computed} sessions={trainingSessions} />

        {/* Recovery D+1 Predictor */}
        <RecoveryTomorrowPredictorCard checkins={computed} />
      </div>

      {/* Peso — tendência lenta (sinal de médio prazo, fora do recovery) */}
      <WeightTrendCard checkins={computed} />

      {/* Volume de corrida semanal (carga de corrida, fora do recovery) */}
      <WeeklyRunningVolumeCard sessions={trainingSessions} />

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
          className="rounded-xl border border-border/60 bg-card p-4"
        >
          <div className="flex items-baseline gap-2 mb-0.5">
            <h3 className="text-sm font-semibold tracking-tight">{metricConfig?.label}</h3>
            {(selectedMetric === 'fatigue_score' || selectedMetric === 'stress_score') && (
              <span className="text-[10px] text-muted-foreground">(quanto menor, melhor)</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">Área + média móvel 3 dias</p>
          <div role="img" aria-label="Gráfico de evolução da métrica selecionada ao longo do tempo" className="h-52">
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
          className="rounded-xl border border-border/60 bg-card p-4"
        >
          <h3 className="text-sm font-semibold mb-0.5 tracking-tight">Recovery vs Fadiga</h3>
          <p className="text-[11px] text-muted-foreground mb-3">Equilíbrio carga-recuperação diário</p>
          <div role="img" aria-label="Gráfico de barras comparando Recovery e Fadiga diários" className="h-40">
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
        const last30 = computed.filter(
          (c) =>
            c.date &&
            parseLocalDate(c.date) >= (() => {
              const d = new Date();
              d.setDate(d.getDate() - 30);
              return d;
            })()
        );

        const sortedScatter = [...last30].sort((a, b) =>
          a.date < b.date ? -1 : 1
        );

        const scatterPoints = sortedScatter.slice(0, -1).reduce((acc, c, i) => {
          const nextDay = sortedScatter[i + 1];
          const sleepH = c.sleep_hours;
          const nextRecovery = nextDay?.recovery_score;

          if (sleepH != null && nextRecovery != null) {
            acc.push({ x: sleepH, y: nextRecovery, date: c.date });
          }

          return acc;
        }, []);

        let trendLine = [];
        if (scatterPoints.length >= 3) {
          const n = scatterPoints.length;
          const sumX = scatterPoints.reduce((s, p) => s + p.x, 0);
          const sumY = scatterPoints.reduce((s, p) => s + p.y, 0);
          const sumXY = scatterPoints.reduce((s, p) => s + p.x * p.y, 0);
          const sumX2 = scatterPoints.reduce((s, p) => s + p.x * p.x, 0);

          const slope =
            (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
          const intercept = (sumY - slope * sumX) / n;

          const xVals = [
            Math.min(...scatterPoints.map((p) => p.x)),
            Math.max(...scatterPoints.map((p) => p.x)),
          ];

          trendLine = xVals.map((x) => ({
            x,
            trend: Math.round(slope * x + intercept),
          }));
        }

        if (scatterPoints.length < 3) return null;

        return (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border border-border/60 bg-card p-4"
          >
            <h3 className="text-sm font-semibold mb-0.5 tracking-tight">
              Impacto do Sono no Recovery
            </h3>
            <p className="text-[11px] text-muted-foreground mb-3">
              Cada ponto representa um dia com dados válidos
            </p>

            <div
              role="img"
              aria-label="Gráfico de dispersão mostrando relação entre horas de sono e recovery do dia seguinte"
              className="h-52"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(220,15%,10%)"
                  />

                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Sono"
                    domain={['auto', 'auto']}
                    tick={{ fill: 'hsl(215,15%,45%)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    label={{
                      value: 'Horas de sono',
                      position: 'insideBottom',
                      offset: -2,
                      fill: 'hsl(215,15%,45%)',
                      fontSize: 10,
                    }}
                  />

                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Recovery"
                    domain={[0, 100]}
                    tick={{ fill: 'hsl(215,15%,45%)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />

                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val, name) =>
                      name === 'Recovery'
                        ? [`${val}`, 'Recovery no dia seguinte']
                        : [`${val}h`, 'Horas de sono']
                    }
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

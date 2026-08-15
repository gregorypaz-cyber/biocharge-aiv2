import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { base44 } from '@/api/base44Client';
import { computeLongevityTrend } from '@/utils/longevityTrend';

// Card "Vitalidade ao longo do tempo" (Fase 3) — SOMENTE LEITURA.
// Recalcula o histórico semanal a partir dos dados existentes. Vai na página Tendências.
export default function LongevityTrendCard() {
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await base44.auth.me();
        const p = me?.preferences || {};
        const profile = {
          birth_year: p.birth_year || null,
          sex: p.sex || null,
          height_cm: p.height_cm || null,
          waist_cm: p.waist_cm || null,
        };
        const email = me?.email;
        let checkins = [], trainings = [], workouts = [];
        if (email) {
          try { checkins = await base44.entities.DailyCheckin.filter({ created_by: email }, '-date', 150) || []; } catch (e) {}
          try { trainings = await base44.entities.TrainingSession.filter({ created_by: email }, '-date', 200) || []; } catch (e) {}
          try { workouts = await base44.entities.WorkoutSession.filter({ created_by: email }, '-date', 200) || []; } catch (e) {}
        }
        const r = computeLongevityTrend({
          profile,
          maxHrPref: p.max_hr || null,
          vo2maxManual: p.vo2max_manual || null,
          checkins, trainings, workouts,
          weeks: 12,
        });
        if (alive) setTrend(r);
      } catch (e) {
        if (alive) setTrend({ ok: false, reason: 'error' });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const Wrap = ({ children }) => (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">{children}</div>
  );

  if (loading) return <Wrap><div className="h-44 animate-pulse rounded-lg bg-secondary/40" /></Wrap>;

  if (!trend?.ok) {
    const msg = trend?.reason === 'profile'
      ? 'Preencha seu perfil físico em Configurações para ver a tendência.'
      : 'Ainda não há semanas suficientes de dados para traçar a tendência. Siga registrando — em ~2–3 semanas isto ganha vida.';
    return (
      <Wrap>
        <div>
          <p className="text-sm font-semibold tracking-tight">Vitalidade ao longo do tempo</p>
          <p className="t-micro text-muted-foreground mt-1">{msg}</p>
        </div>
      </Wrap>
    );
  }

  const delta = trend.deltaVitality;
  const up = delta > 0;
  const deltaColor = delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-amber-400' : 'text-muted-foreground';

  return (
    <Wrap>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold tracking-tight">Vitalidade ao longo do tempo</p>
          <p className="t-micro text-muted-foreground mt-0.5">
            Recalculada por semana a partir do seu histórico.
            <span className="text-muted-foreground/60"> · janelas móveis de 3 semanas</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-foreground">{trend.current.vitality}</p>
          <p className="t-micro text-muted-foreground/70">média 3 semanas</p>
          <p className={`t-micro ${deltaColor}`}>
            {delta === 0 ? 'estável' : `${up ? '+' : ''}${delta} no período`}
          </p>
        </div>
      </div>

      <div className="h-44 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,100%,0.06)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(0,0%,60%)' }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(0,0%,60%)' }} tickLine={false} axisLine={false} width={28} />
            <Tooltip
              contentStyle={{ background: 'hsl(0,0%,10%)', border: '1px solid hsl(0,0%,20%)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'hsl(0,0%,70%)' }}
              formatter={(v) => [v, 'Vitalidade']}
            />
            <Line
              type="monotone"
              dataKey="vitality"
              stroke="hsl(142,70%,50%)"
              strokeWidth={2}
              dot={trend.points.length <= 12 ? { r: 3, fill: 'hsl(142,70%,50%)' } : false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="t-micro text-muted-foreground">
        Mesma engine do card de Vitalidade, aplicada a janelas móveis de 3 semanas. Tendência importa
        mais que o ponto isolado. Se o VO₂max do Zepp não mudar, a curva reflete sobretudo sono, regularidade,
        FC de repouso e atividade.
      </p>
    </Wrap>
  );
}

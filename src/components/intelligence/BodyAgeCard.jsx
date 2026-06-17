import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { computeBodyAge } from '@/utils/bodyAge';

// Card "Vitalidade + Idade Corporal" (Fase 2) — SOMENTE LEITURA.
// Reaproveita o perfil físico (Configurações) e os dados de sono/FC/treino.
export default function BodyAgeCard() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

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
        const maxHrPref = p.max_hr || null;
        const vo2maxManual = p.vo2max_manual || null;
        const email = me?.email;

        let restingHRs = [];
        let observedHRmax = null;
        const activity = { sessions: 0, minutes: 0 };
        const sleepHours = [];
        const sleepReg = [];
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 28);
        const within = (d) => d && new Date(d) >= cutoff;

        if (email) {
          try {
            const checkins = await base44.entities.DailyCheckin.filter({ created_by: email }, '-date', 30);
            (checkins || []).forEach((c) => {
              const rhr = c.resting_hr ?? c.resting_heart_rate;
              if (typeof rhr === 'number') restingHRs.push(rhr);
              if (typeof c.sleep_hours === 'number' && c.sleep_hours > 0) sleepHours.push(c.sleep_hours);
              if (typeof c.sleep_regularity_pct === 'number' && c.sleep_regularity_pct > 0) sleepReg.push(c.sleep_regularity_pct);
            });
          } catch (e) { /* segue */ }
          try {
            const hrv = await base44.entities.HRVRecord.filter({ created_by: email }, '-date', 30);
            restingHRs = restingHRs.concat((hrv || []).map((h) => h.resting_heart_rate).filter((v) => typeof v === 'number'));
          } catch (e) { /* segue */ }
          try {
            const ts = await base44.entities.TrainingSession.filter({ created_by: email }, '-date', 100);
            (ts || []).forEach((s) => {
              if (typeof s.heart_rate_max === 'number') observedHRmax = Math.max(observedHRmax || 0, s.heart_rate_max);
              if (within(s.date)) { activity.sessions += 1; activity.minutes += s.duration_minutes || 0; }
            });
          } catch (e) { /* segue */ }
          try {
            // WorkoutSession é só leitura (espelho do device) -> usamos apenas p/ FCmax,
            // NUNCA para somar atividade (evita duplicar minutos já contados no TrainingSession).
            const ws = await base44.entities.WorkoutSession.filter({ created_by: email }, '-date', 100);
            (ws || []).forEach((s) => {
              if (typeof s.max_heart_rate === 'number') observedHRmax = Math.max(observedHRmax || 0, s.max_heart_rate);
            });
          } catch (e) { /* segue */ }
        }
        if (observedHRmax && observedHRmax > 215) observedHRmax = null;

        const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
        const sleep = { hours: avg(sleepHours.slice(0, 14)), regularity: avg(sleepReg.slice(0, 14)) };

        const r = computeBodyAge({ profile, restingHRs, observedHRmax, maxHrPref, vo2maxManual, activity, sleep });
        if (alive) setResult(r);
      } catch (e) {
        if (alive) setResult({ ok: false, reason: 'error' });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const Card = ({ children }) => (
    <div className="rounded-2xl bg-card border border-border p-5 text-foreground">{children}</div>
  );

  if (loading) return <Card><div className="h-28 animate-pulse rounded-xl bg-secondary" /></Card>;

  if (!result?.ok && result?.reason === 'profile') {
    return (
      <Card>
        <div className="text-sm font-medium text-muted-foreground">Vitalidade</div>
        <p className="mt-2 text-xs text-muted-foreground">
          Para calcular, preencha seu perfil físico em{' '}
          <Link to="/settings" className="text-primary hover:underline">Configurações</Link>.
        </p>
      </Card>
    );
  }
  if (!result?.ok) {
    return (
      <Card>
        <div className="text-sm font-medium text-muted-foreground">Vitalidade</div>
        <p className="mt-2 text-xs text-muted-foreground">
          Ainda não há dados suficientes (sono e FC de repouso) nos seus registros para estimar.
        </p>
      </Card>
    );
  }

  const r = result;
  const vitBand = r.vitality >= 70 ? 'text-emerald-400' : r.vitality >= 40 ? 'text-amber-400' : 'text-red-400';
  const younger = r.deltaYears < 0;
  const deltaAbs = Math.abs(r.deltaYears);
  const fmtYears = (y) => `${y > 0 ? '+' : ''}${y.toFixed(1)} ${Math.abs(y) === 1 ? 'ano' : 'anos'}`;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Vitalidade</div>
          <div className="mt-1 flex items-end gap-2">
            <span className={`text-5xl font-semibold ${vitBand}`}>{r.vitality}</span>
            <span className="mb-1 text-sm text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Idade corporal</div>
          <div className="text-2xl font-semibold text-foreground">{r.bodyAge}</div>
          <div className="text-[10px] text-muted-foreground">
            {deltaAbs === 0 ? 'igual à real' : younger ? `${deltaAbs} mais jovem` : `${deltaAbs} acima`} ({r.age})
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-1.5 text-xs">
        {r.best && r.best.years < 0 && (
          <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
            <span className="text-muted-foreground">Mais ajuda: <span className="text-foreground">{r.best.label}</span></span>
            <span className="text-emerald-400">{fmtYears(r.best.years)}</span>
          </div>
        )}
        {r.worst && r.worst.years > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
            <span className="text-muted-foreground">Mais atrapalha: <span className="text-foreground">{r.worst.label}</span></span>
            <span className="text-amber-400">{fmtYears(r.worst.years)}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs">
        <button onClick={() => setShowInfo((s) => !s)} className="text-primary underline-offset-2 hover:underline">
          Ver detalhamento
        </button>
        <Link to="/settings" className="text-muted-foreground hover:text-foreground">Editar meus dados</Link>
      </div>

      {showInfo && (
        <div className="mt-3 space-y-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
          <p className="text-foreground">Quanto cada fator pesa (em anos)</p>
          <ul className="space-y-1">
            {r.contributors
              .slice()
              .sort((a, b) => a.years - b.years)
              .map((c) => (
                <li key={c.key} className="flex items-center justify-between">
                  <span>{c.label} <span className="text-muted-foreground/70">({c.detail})</span></span>
                  <span className={c.years < 0 ? 'text-emerald-400' : c.years > 0 ? 'text-amber-400' : ''}>
                    {fmtYears(c.years)}
                  </span>
                </li>
              ))}
          </ul>
          <p className="pt-1">
            Leitura de longevidade baseada em associações publicadas com mortalidade por todas as causas
            (FC de repouso, sono, regularidade, VO₂max, atividade), convertidas em anos pela lei de Gompertz.
            É uma estimativa de bem-estar, não um diagnóstico. Para o número mais fiel, mantenha seu VO₂max
            do Zepp atualizado em Configurações.
          </p>
        </div>
      )}
    </Card>
  );
}

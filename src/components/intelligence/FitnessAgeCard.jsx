import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { computeFitnessAge } from '@/utils/fitnessAge';

// Card de "Idade de condicionamento" (Fitness Age) — SOMENTE LEITURA.
// O perfil físico é preenchido em Configurações (user.preferences). Aqui só lemos.
export default function FitnessAgeCard() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Lê o usuário SEMPRE fresco (evita preferências desatualizadas em cache).
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

        let restingHRs = [];
        let observedHRmax = null;
        const activity = { sessions: 0, minutes: 0 };
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 28);
        const within = (d) => d && new Date(d) >= cutoff;
        const email = me?.email;

        if (email) {
          try {
            const checkins = await base44.entities.DailyCheckin.filter({ created_by: email }, '-date', 30);
            restingHRs = (checkins || [])
              .map((c) => c.resting_hr ?? c.resting_heart_rate)
              .filter((v) => typeof v === 'number');
          } catch (e) { /* segue */ }
          try {
            const hrv = await base44.entities.HRVRecord.filter({ created_by: email }, '-date', 30);
            restingHRs = restingHRs.concat(
              (hrv || []).map((h) => h.resting_heart_rate).filter((v) => typeof v === 'number')
            );
          } catch (e) { /* segue */ }
          try {
            const ts = await base44.entities.TrainingSession.filter({ created_by: email }, '-date', 100);
            (ts || []).forEach((s) => {
              if (typeof s.heart_rate_max === 'number') observedHRmax = Math.max(observedHRmax || 0, s.heart_rate_max);
              if (within(s.date)) { activity.sessions += 1; activity.minutes += s.duration_minutes || 0; }
            });
          } catch (e) { /* segue */ }
          try {
            const ws = await base44.entities.WorkoutSession.filter({ created_by: email }, '-date', 100);
            (ws || []).forEach((s) => {
              if (typeof s.max_heart_rate === 'number') observedHRmax = Math.max(observedHRmax || 0, s.max_heart_rate);
            });
          } catch (e) { /* segue */ }
        }
        if (observedHRmax && observedHRmax > 215) observedHRmax = null;

        const r = computeFitnessAge({ profile, restingHRs, observedHRmax, maxHrPref, vo2maxManual, activity });
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

  if (loading) {
    return <Card><div className="h-24 animate-pulse rounded-xl bg-secondary" /></Card>;
  }

  // Perfil incompleto -> dica curta apontando p/ Configurações (NÃO mostra formulário).
  if (!result?.ok && result?.reason === 'profile') {
    return (
      <Card>
        <div className="text-sm font-medium text-muted-foreground">Idade de condicionamento</div>
        <p className="mt-2 text-xs text-muted-foreground">
          Para calcular, preencha seu perfil físico (ano de nascimento e sexo) em{' '}
          <Link to="/settings" className="text-primary hover:underline">Configurações</Link>.
        </p>
      </Card>
    );
  }

  if (!result?.ok) {
    return (
      <Card>
        <div className="text-sm font-medium text-muted-foreground">Idade de condicionamento</div>
        <p className="mt-2 text-xs text-muted-foreground">
          Ainda não há FC de repouso suficiente nos seus registros. Faça alguns check-ins com FC de
          repouso — ou informe seu VO₂max do Zepp em{' '}
          <Link to="/settings" className="text-primary hover:underline">Configurações</Link>.
        </p>
      </Card>
    );
  }

  const r = result;
  const younger = r.deltaYears < 0;
  const deltaAbs = Math.abs(r.deltaYears);
  const accent = younger ? 'text-emerald-400' : r.deltaYears === 0 ? 'text-foreground' : 'text-amber-400';

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Idade de condicionamento</div>
          <div className="mt-1 flex items-end gap-2">
            <span className={`text-5xl font-semibold ${accent}`}>{r.fitnessAge}</span>
            <span className="mb-1 text-sm text-muted-foreground">anos</span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {deltaAbs === 0
              ? 'Igual à sua idade real'
              : younger
              ? `${deltaAbs} ${deltaAbs === 1 ? 'ano' : 'anos'} mais jovem que sua idade real (${r.age})`
              : `${deltaAbs} ${deltaAbs === 1 ? 'ano' : 'anos'} acima da sua idade real (${r.age})`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">VO₂max</div>
          <div className="text-2xl font-semibold text-foreground">{r.vo2max}</div>
          <div className="text-[10px] text-muted-foreground">mL/kg/min</div>
        </div>
      </div>

      {r.waistContext && (
        <div className="mt-3 text-xs text-muted-foreground">
          Relação cintura/altura: <span className="text-foreground">{r.waistContext.whtr}</span> ({r.waistContext.flag})
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 text-xs">
        <button onClick={() => setShowInfo((s) => !s)} className="text-primary underline-offset-2 hover:underline">
          Quão preciso é isso?
        </button>
        <Link to="/settings" className="text-muted-foreground hover:text-foreground">
          Editar meus dados
        </Link>
        <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
          confiança: {r.confidence}
        </span>
      </div>

      {showInfo && (
        <div className="mt-3 space-y-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
          <p className="text-foreground">Como esse número foi calculado</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>VO₂max: {r.vo2max} mL/kg/min — fonte: {r.vo2Source}.</li>
            {r.inputs.hrMax && <li>FCmax usada: {r.inputs.hrMax} bpm ({r.inputs.hrMaxSource}).</li>}
            {r.inputs.hrRest && <li>FC de repouso: {r.inputs.hrRest} bpm (média de {r.inputs.restingSamples} registro(s)).</li>}
            <li>
              Idade de condicionamento = sua idade equivalente nas normas de VO₂max por idade/sexo do
              estudo HUNT3 (NTNU). Média de referência aos {r.age}: {r.normVO2} mL/kg/min.
            </li>
            {r.inputs.activity && (
              <li>Atividade recente (28d): {r.inputs.activity.sessions} sessão(ões), {Math.round(r.inputs.activity.minutes)} min.</li>
            )}
            {r.inputs.waist && <li>Cintura {r.inputs.waist} cm usada só como contexto, não altera o VO₂max.</li>}
          </ul>
          <p className="pt-1">
            Estimativa de bem-estar — não é medida clínica. Para o número mais fiel, informe seu VO₂max
            do Zepp em Configurações. Use a tendência ao longo do tempo, não o valor de um dia isolado.
          </p>
        </div>
      )}
    </Card>
  );
}

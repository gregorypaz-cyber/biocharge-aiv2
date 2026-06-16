import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { computeFitnessAge } from '@/utils/fitnessAge';

// Card de "Idade de condicionamento" (Fitness Age) para o Reck.
// Perfil corporal é guardado em user.preferences (sem mudança de schema).
export default function FitnessAgeCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ birth_year: null, sex: null, height_cm: null, waist_cm: null });
  const [form, setForm] = useState({ birth_year: '', sex: '', height_cm: '', waist_cm: '' });

  // Semeia o perfil a partir das preferências do usuário.
  useEffect(() => {
    const p = user?.preferences || {};
    const prof = {
      birth_year: p.birth_year ?? null,
      sex: p.sex ?? null,
      height_cm: p.height_cm ?? null,
      waist_cm: p.waist_cm ?? null,
    };
    setProfile(prof);
    setForm({
      birth_year: prof.birth_year ?? '',
      sex: prof.sex ?? '',
      height_cm: prof.height_cm ?? '',
      waist_cm: prof.waist_cm ?? '',
    });
  }, [user]);

  const compute = useCallback(async (prof) => {
    if (!user?.email) return;
    setLoading(true);
    try {
      let restingHRs = [];
      let observedHRmax = null;
      const activity = { sessions: 0, minutes: 0 };

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 28);
      const within = (d) => d && new Date(d) >= cutoff;

      try {
        const checkins = await base44.entities.DailyCheckin.filter({ created_by: user.email }, '-date', 30);
        restingHRs = (checkins || [])
          .map((c) => c.resting_hr ?? c.resting_heart_rate)
          .filter((v) => typeof v === 'number');
      } catch (e) { /* segue sem check-ins */ }

      try {
        const hrv = await base44.entities.HRVRecord.filter({ created_by: user.email }, '-date', 30);
        const extra = (hrv || []).map((h) => h.resting_heart_rate).filter((v) => typeof v === 'number');
        restingHRs = restingHRs.concat(extra);
      } catch (e) { /* segue */ }

      try {
        const ts = await base44.entities.TrainingSession.filter({ created_by: user.email }, '-date', 100);
        (ts || []).forEach((s) => {
          if (typeof s.heart_rate_max === 'number') observedHRmax = Math.max(observedHRmax || 0, s.heart_rate_max);
          if (within(s.date)) { activity.sessions += 1; activity.minutes += s.duration_minutes || 0; }
        });
      } catch (e) { /* segue */ }

      try {
        const ws = await base44.entities.WorkoutSession.filter({ created_by: user.email }, '-date', 100);
        (ws || []).forEach((s) => {
          if (typeof s.max_heart_rate === 'number') observedHRmax = Math.max(observedHRmax || 0, s.max_heart_rate);
        });
      } catch (e) { /* segue */ }

      if (observedHRmax && observedHRmax > 215) observedHRmax = null; // descarta outlier

      setResult(computeFitnessAge({ profile: prof, restingHRs, observedHRmax, activity }));
    } catch (e) {
      setResult({ ok: false, error: true });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { compute(profile); }, [compute, profile]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const next = {
        birth_year: form.birth_year ? Number(form.birth_year) : null,
        sex: form.sex || null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        waist_cm: form.waist_cm ? Number(form.waist_cm) : null,
      };
      await base44.auth.updateMe({ preferences: { ...(user?.preferences || {}), ...next } });
      setProfile(next);     // otimista — não depende do refresh do AuthContext
      setEditing(false);
    } catch (e) {
      // mantém o formulário aberto se falhar
    } finally {
      setSaving(false);
    }
  };

  // ---------- UI ----------
  const Card = ({ children }) => (
    <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 text-zinc-100">{children}</div>
  );

  if (loading) {
    return <Card><div className="h-24 animate-pulse rounded-xl bg-zinc-800/60" /></Card>;
  }

  const needsProfile = !result?.ok && result?.missing?.some((m) => m === 'birth_year' || m === 'sex');
  if (needsProfile || editing) {
    return (
      <Card>
        <div className="mb-3 text-sm font-medium text-zinc-300">Sua idade de condicionamento</div>
        <p className="mb-4 text-xs text-zinc-500">
          Preencha uma vez. A cintura é opcional (refina o contexto de composição corporal).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-zinc-400">
            Ano de nascimento
            <input type="number" inputMode="numeric" value={form.birth_year}
              onChange={(e) => setForm({ ...form, birth_year: e.target.value })}
              placeholder="1990"
              className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-zinc-100 outline-none" />
          </label>
          <label className="text-xs text-zinc-400">
            Sexo
            <select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}
              className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-zinc-100 outline-none">
              <option value="">—</option>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
            </select>
          </label>
          <label className="text-xs text-zinc-400">
            Altura (cm)
            <input type="number" inputMode="numeric" value={form.height_cm}
              onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
              placeholder="178"
              className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-zinc-100 outline-none" />
          </label>
          <label className="text-xs text-zinc-400">
            Cintura (cm) — opcional
            <input type="number" inputMode="numeric" value={form.waist_cm}
              onChange={(e) => setForm({ ...form, waist_cm: e.target.value })}
              placeholder="84"
              className="mt-1 w-full rounded-lg bg-zinc-800 px-3 py-2 text-zinc-100 outline-none" />
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={saveProfile} disabled={saving || !form.birth_year || !form.sex}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-40">
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          {editing && (
            <button onClick={() => setEditing(false)} className="rounded-lg px-4 py-2 text-sm text-zinc-400">
              Cancelar
            </button>
          )}
        </div>
      </Card>
    );
  }

  if (!result?.ok) {
    return (
      <Card>
        <div className="text-sm font-medium text-zinc-300">Idade de condicionamento</div>
        <p className="mt-2 text-xs text-zinc-500">
          Ainda não há FC de repouso suficiente nos seus registros para estimar. Faça alguns check-ins
          com FC de repouso e isto aparece automaticamente.
        </p>
      </Card>
    );
  }

  const r = result;
  const younger = r.deltaYears < 0;
  const deltaAbs = Math.abs(r.deltaYears);
  const accent = younger ? 'text-emerald-400' : r.deltaYears === 0 ? 'text-zinc-300' : 'text-amber-400';

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500">Idade de condicionamento</div>
          <div className="mt-1 flex items-end gap-2">
            <span className={`text-5xl font-semibold ${accent}`}>{r.fitnessAge}</span>
            <span className="mb-1 text-sm text-zinc-500">anos</span>
          </div>
          <div className="mt-1 text-sm text-zinc-400">
            {deltaAbs === 0
              ? 'Igual à sua idade real'
              : younger
              ? `${deltaAbs} ${deltaAbs === 1 ? 'ano' : 'anos'} mais jovem que sua idade real (${r.age})`
              : `${deltaAbs} ${deltaAbs === 1 ? 'ano' : 'anos'} acima da sua idade real (${r.age})`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500">VO₂max est.</div>
          <div className="text-2xl font-semibold text-zinc-100">{r.vo2max}</div>
          <div className="text-[10px] text-zinc-500">mL/kg/min</div>
        </div>
      </div>

      {r.waistContext && (
        <div className="mt-3 text-xs text-zinc-500">
          Relação cintura/altura: <span className="text-zinc-300">{r.waistContext.whtr}</span> ({r.waistContext.flag})
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 text-xs">
        <button onClick={() => setShowInfo((s) => !s)} className="text-emerald-400 underline-offset-2 hover:underline">
          Quão preciso é isso?
        </button>
        <button onClick={() => setEditing(true)} className="text-zinc-500 hover:text-zinc-300">
          Editar meus dados
        </button>
        <span className="ml-auto rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
          confiança: {r.confidence}
        </span>
      </div>

      {showInfo && (
        <div className="mt-3 space-y-2 rounded-xl bg-zinc-950/60 p-3 text-xs text-zinc-400">
          <p className="text-zinc-300">Como esse número foi calculado</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>VO₂max pela razão FCmax/FCrepouso (Uth et al. 2004).</li>
            <li>FCmax: {r.inputs.hrMax} bpm — {r.inputs.hrMaxSource}.</li>
            <li>FC de repouso: {r.inputs.hrRest} bpm (média de {r.inputs.restingSamples} registro(s)).</li>
            <li>
              Idade de condicionamento = sua idade equivalente nas normas de VO₂max por idade/sexo do
              estudo HUNT3 (NTNU). Sua média de referência aos {r.age}: {r.normVO2} mL/kg/min.
            </li>
            {r.inputs.activity && (
              <li>
                Atividade recente (28d): {r.inputs.activity.sessions} sessão(ões),
                {' '}{Math.round(r.inputs.activity.minutes)} min.
              </li>
            )}
            {r.inputs.waist && <li>Cintura {r.inputs.waist} cm usada só como contexto, não altera o VO₂max.</li>}
          </ul>
          <p className="pt-1 text-zinc-500">
            Estimativa de bem-estar — não é medida clínica. Margem típica de métodos sem teste de esforço:
            ±5 mL/kg/min. Use a tendência ao longo do tempo, não o número de um dia isolado.
          </p>
        </div>
      )}
    </Card>
  );
}

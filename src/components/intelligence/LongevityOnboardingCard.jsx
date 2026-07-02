import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

// Onboarding leve — aparece só na 1ª sessão enquanto o perfil estiver incompleto.
// Some sozinho depois de preencher OU se o usuário tocar em "Agora não".
export default function LongevityOnboardingCard() {
  const { checkUserAuth } = useAuth();
  const [state, setState] = useState('loading'); // loading | show | hidden
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ birth_year: '', sex: '', vo2max_manual: '' });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await base44.auth.me();
        const p = me?.preferences || {};
        const complete = p.birth_year && p.sex;
        if (alive) setState(complete || p.longevity_onboarding_skipped ? 'hidden' : 'show');
      } catch (e) {
        if (alive) setState('hidden');
      }
    })();
    return () => { alive = false; };
  }, []);

  const persist = async (extra) => {
    const me = await base44.auth.me();
    await base44.auth.updateMe({ preferences: { ...(me?.preferences || {}), ...extra } });
    try { await checkUserAuth?.(); } catch (e) { /* segue */ }
  };

  const activate = async () => {
    setSaving(true);
    try {
      await persist({
        birth_year: form.birth_year ? Number(form.birth_year) : null,
        sex: form.sex || null,
        vo2max_manual: form.vo2max_manual ? Number(form.vo2max_manual) : null,
      });
      setState('hidden');
    } catch (e) {
      // mantém aberto se falhar
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    setState('hidden');
    try { await persist({ longevity_onboarding_skipped: true }); } catch (e) { /* segue */ }
  };

  if (state !== 'show') return null;

  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold tracking-tight">Descubra sua Idade de Condicionamento e Vitalidade</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Dois números no estilo WHOOP/Oura a partir dos seus dados. Leva 15 segundos — preencha uma vez.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-support font-semibold uppercase tracking-wider text-muted-foreground">Ano de nascimento</p>
          <input
            type="number" inputMode="numeric" placeholder="1992"
            value={form.birth_year}
            onChange={(e) => setForm({ ...form, birth_year: e.target.value })}
            className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground outline-none"
          />
        </div>
        <div className="space-y-1">
          <p className="text-support font-semibold uppercase tracking-wider text-muted-foreground">Sexo</p>
          <div className="flex gap-2">
            {[{ v: 'male', l: 'M' }, { v: 'female', l: 'F' }].map((s) => (
              <button
                key={s.v}
                onClick={() => setForm({ ...form, sex: s.v })}
                className={`flex-1 rounded-lg px-2 py-2 text-sm font-semibold border transition-all ${
                  form.sex === s.v
                    ? 'border-primary/50 bg-primary/15 text-foreground'
                    : 'border-border bg-secondary text-muted-foreground'
                }`}
              >
                {s.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-support font-semibold uppercase tracking-wider text-muted-foreground">
          VO₂max do relógio (opcional)
        </p>
        <input
          type="number" inputMode="decimal" placeholder="ex.: 50 (pegue no app Zepp)"
          value={form.vo2max_manual}
          onChange={(e) => setForm({ ...form, vo2max_manual: e.target.value })}
          className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={activate}
          disabled={saving || !form.birth_year || !form.sex}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-40"
        >
          {saving ? 'Ativando…' : 'Ativar'}
        </button>
        <button onClick={skip} className="text-xs text-muted-foreground hover:text-foreground">
          Agora não
        </button>
        <Link to="/settings" className="ml-auto text-xs text-muted-foreground hover:text-foreground">
          Mais opções
        </Link>
      </div>
    </div>
  );
}

// bodyAge.js — Reck (Fase 2)
// Vitality (0–100) + Idade Corporal (Body Age) — leitura de longevidade.
// É uma ESTIMATIVA DE BEM-ESTAR baseada em associações publicadas com mortalidade
// por todas as causas — NÃO é diagnóstico nem idade clínica.
//
// Método (transparente e citável):
//  - Cada fator vira um "risco relativo" (HR) frente ao seu ponto de referência.
//  - HR -> anos equivalentes pela lei de Gompertz: a mortalidade dobra ~8 anos,
//    então Δanos = ln(HR)/ln(2) × 8  (mesma lógica de "idade efetiva" do WHOOP).
//  - Soma dos Δanos, com amortecimento de sobreposição, define a Idade Corporal.
//  - Vitality sai do MESMO número (fonte única -> nunca contradiz a Idade Corporal).
//
// Fatores e fontes:
//  - VO₂max / condicionamento: HUNT3 (reaproveita a Fase 1)
//  - FC de repouso: meta-análise Zhang 2016 (~1,09 por +10 bpm)
//  - Regularidade do sono: Windred 2023/2024 (UK Biobank, SRI) — mais forte que duração
//  - Duração do sono: curva em U, ótimo ~7–7,5h
//  - Atividade física: diretriz de 150 min/semana
//  - HRV é deliberadamente excluído (muito individual) — fica no score diário.

import { computeFitnessAge, ageFromBirthYear } from './fitnessAge';

const MRDT = 8; // anos — tempo de duplicação da mortalidade (Gompertz)
const hrToYears = (hr) => (Math.log(hr) / Math.LN2) * MRDT;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function computeBodyAge({
  profile,
  restingHRs = [],
  observedHRmax = null,
  maxHrPref = null,
  vo2maxManual = null,
  activity = null,
  sleep = null, // { hours: number|null, regularity: number|null }
}) {
  if (!profile || !profile.birth_year || !profile.sex) {
    return { ok: false, reason: 'profile', missing: ['birth_year', 'sex'].filter((k) => !profile || !profile[k]) };
  }
  const age = ageFromBirthYear(profile.birth_year);
  const contributors = [];

  // 1) Condicionamento (reaproveita a Fase 1 — já vem em anos)
  const fit = computeFitnessAge({ profile, restingHRs, observedHRmax, maxHrPref, vo2maxManual, activity });
  const usedManualVo2 = fit.ok && (fit.vo2Source || '').startsWith('informado');
  if (fit.ok) {
    contributors.push({ key: 'fitness', label: 'Condicionamento (VO₂max)', years: fit.deltaYears, detail: `VO₂max ${fit.vo2max}` });
  }

  // 2) FC de repouso
  const valid = restingHRs.filter((v) => typeof v === 'number' && v >= 30 && v <= 110).slice(0, 14);
  if (valid.length) {
    const rhr = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
    let yrs = hrToYears(Math.pow(1.10, (rhr - 60) / 10));
    // Se o VO₂max veio da razão de FC, a FC de repouso já está embutida -> evita dupla contagem.
    if (!usedManualVo2) yrs *= 0.5;
    contributors.push({ key: 'rhr', label: 'FC de repouso', years: yrs, detail: `${rhr} bpm` });
  }

  // 3) Duração do sono (curva em U, ótimo ~7,25h)
  if (sleep && typeof sleep.hours === 'number' && sleep.hours > 0) {
    const dev = sleep.hours - 7.25;
    const hr = clamp(1 + 0.06 * dev * dev, 0.9, 1.6);
    contributors.push({ key: 'sleep_dur', label: 'Duração do sono', years: hrToYears(hr), detail: `${sleep.hours.toFixed(1)} h` });
  }

  // 4) Regularidade do sono (proxy do SRI; ref. ~72 = neutro)
  if (sleep && typeof sleep.regularity === 'number' && sleep.regularity > 0) {
    const hr = clamp(Math.exp(-0.013 * (sleep.regularity - 72)), 0.7, 1.6);
    contributors.push({ key: 'sleep_reg', label: 'Regularidade do sono', years: hrToYears(hr), detail: `${Math.round(sleep.regularity)}%` });
  }

  // 5) Atividade física (min/semana vs 150)
  if (activity && typeof activity.minutes === 'number') {
    const weekly = activity.minutes / 4; // janela de 28 dias -> semana
    let hr;
    if (weekly <= 0) hr = 1.20;
    else if (weekly >= 300) hr = 0.85;
    else if (weekly >= 150) hr = 1.00 - ((weekly - 150) / 150) * 0.15;
    else hr = 1.20 - (weekly / 150) * 0.20;
    contributors.push({ key: 'activity', label: 'Atividade física', years: hrToYears(hr), detail: `${Math.round(weekly)} min/sem` });
  }

  if (contributors.length === 0) return { ok: false, reason: 'data' };

  let sum = contributors.reduce((a, c) => a + c.years, 0);
  sum *= 0.85; // amortecimento de sobreposição entre fatores correlacionados

  let bodyAge = clamp(Math.round(age + sum), 18, 95);
  const deltaYears = bodyAge - age;
  const vitality = clamp(Math.round(55 - sum * 3), 0, 100);

  // Arredonda os anos por fator (para exibição) e ordena.
  const rounded = contributors.map((c) => ({ ...c, years: Math.round(c.years * 10) / 10 }));
  const sorted = [...rounded].sort((a, b) => a.years - b.years);
  const best = sorted[0];                         // mais negativo = mais ajuda
  const worst = sorted[sorted.length - 1];        // mais positivo = mais atrapalha

  return {
    ok: true,
    age,
    bodyAge,
    deltaYears,
    vitality,
    contributors: rounded,
    best,
    worst,
    usedManualVo2,
  };
}

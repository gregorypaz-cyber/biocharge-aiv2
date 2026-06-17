// bodyAge.js — Reck (Fase 2, modelo de META/LIMIAR estilo WHOOP)
// Vitality (0–100) + Idade Corporal (Body Age) — leitura de longevidade.
// ESTIMATIVA DE BEM-ESTAR baseada em metas de saúde publicadas — NÃO é diagnóstico.
//
// Método (igual à lógica do WHOOP Healthspan):
//  - Cada fator tem uma META otimizada para saúde (diretriz clínica), por idade/sexo.
//  - Bater a meta = 0 anos. Superar = SUBTRAI (com teto). Ficar abaixo = ADICIONA (com teto).
//    -> nenhum fator isolado domina; superar não vira crédito infinito.
//  - Soma dos anos (amortecida p/ sobreposição) define a Idade Corporal.
//  - Vitality sai do MESMO número (fonte única -> nunca contradiz a Idade Corporal).
//    Cumprir todas as metas ≈ 72/100 e Idade Corporal = idade real; superar sobe a partir daí.
//
// Metas e fontes:
//  - VO₂max: meta = norma populacional por idade/sexo (Cooper/ACSM/FRIEND) ≈ meta WHOOP (44 aos 30, homem)
//  - FC de repouso: meta ≤60 bpm (saúde cardiovascular)
//  - Duração do sono: faixa-alvo 7–9 h (diretriz de sono)
//  - Regularidade do sono: meta ≥80% (SRI alto; Windred 2023/2024)
//  - Atividade física: meta ≥150 min/semana (diretriz de atividade)
//  - HRV fica de fora de propósito (muito individual) — vive no score diário.

import { computeFitnessAge, ageFromBirthYear, normVO2 } from './fitnessAge';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Desempenho vs meta -> anos (assimétrico, com teto). Bater meta = 0.
function targetYears(value, target, { higherIsBetter, unit, perUnit, capDown, capUp }) {
  const margin = higherIsBetter ? value - target : target - value; // >0 = atingiu/superou
  if (margin >= 0) return -Math.min(capDown, (margin / unit) * perUnit); // subtrai (bom)
  return Math.min(capUp, (-margin / unit) * perUnit);                    // adiciona (ruim)
}

export function computeBodyAge({
  profile,
  restingHRs = [],
  observedHRmax = null,
  maxHrPref = null,
  vo2maxManual = null,
  activity = null,
  sleep = null, // { hours, regularity }
}) {
  if (!profile || !profile.birth_year || !profile.sex) {
    return { ok: false, reason: 'profile', missing: ['birth_year', 'sex'].filter((k) => !profile || !profile[k]) };
  }
  const age = ageFromBirthYear(profile.birth_year);
  const sex = profile.sex;
  const contributors = [];

  // 1) VO₂max vs meta de saúde por idade/sexo (≈ meta WHOOP). Superar é bom, com teto.
  const fit = computeFitnessAge({ profile, restingHRs, observedHRmax, maxHrPref, vo2maxManual, activity });
  const usedManualVo2 = fit.ok && (fit.vo2Source || '').startsWith('informado');
  if (fit.ok) {
    const target = normVO2(age, sex);
    const yrs = targetYears(fit.vo2max, target, { higherIsBetter: true, unit: 4, perUnit: 2, capDown: 8, capUp: 10 });
    contributors.push({ key: 'fitness', label: 'Condicionamento vs meta', years: yrs, detail: `VO₂max ${fit.vo2max} (meta ~${Math.round(target)})` });
  }

  // 2) FC de repouso — meta ≤60 bpm (menor é melhor)
  const valid = restingHRs.filter((v) => typeof v === 'number' && v >= 30 && v <= 110).slice(0, 14);
  if (valid.length) {
    const rhr = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
    let yrs = targetYears(rhr, 60, { higherIsBetter: false, unit: 8, perUnit: 2, capDown: 3, capUp: 6 });
    if (!usedManualVo2) yrs *= 0.5; // VO₂max via FC já embute a FC -> evita dupla contagem
    contributors.push({ key: 'rhr', label: 'FC de repouso', years: yrs, detail: `${rhr} bpm (meta ≤60)` });
  }

  // 3) Duração do sono — faixa-alvo 7–9 h (dentro = 0; fora adiciona, com teto)
  if (sleep && typeof sleep.hours === 'number' && sleep.hours > 0) {
    const h = sleep.hours;
    let yrs = 0;
    if (h < 7) yrs = Math.min(5, (7 - h) * 2);
    else if (h > 9) yrs = Math.min(5, (h - 9) * 2);
    contributors.push({ key: 'sleep_dur', label: 'Duração do sono', years: yrs, detail: `${h.toFixed(1)} h (meta 7–9)` });
  }

  // 4) Regularidade do sono — meta ≥80%
  if (sleep && typeof sleep.regularity === 'number' && sleep.regularity > 0) {
    const yrs = targetYears(sleep.regularity, 80, { higherIsBetter: true, unit: 10, perUnit: 2, capDown: 3, capUp: 5 });
    contributors.push({ key: 'sleep_reg', label: 'Regularidade do sono', years: yrs, detail: `${Math.round(sleep.regularity)}% (meta ≥80)` });
  }

  // 5) Atividade física — meta ≥150 min/semana
  if (activity && typeof activity.minutes === 'number') {
    const weekly = activity.minutes / 4; // janela de 28 dias -> semana
    const yrs = targetYears(weekly, 150, { higherIsBetter: true, unit: 75, perUnit: 1.5, capDown: 3, capUp: 5 });
    contributors.push({ key: 'activity', label: 'Atividade física', years: yrs, detail: `${Math.round(weekly)} min/sem (meta ≥150)` });
  }

  if (contributors.length === 0) return { ok: false, reason: 'data' };

  let sum = contributors.reduce((a, c) => a + c.years, 0) * 0.85; // amortece sobreposição
  const bodyAge = clamp(Math.round(age + sum), 18, 95);
  const deltaYears = bodyAge - age;
  const vitality = clamp(Math.round(72 - sum * 3), 0, 100);

  const rounded = contributors.map((c) => ({ ...c, years: Math.round(c.years * 10) / 10 }));
  const sorted = [...rounded].sort((a, b) => a.years - b.years);

  return {
    ok: true, age, bodyAge, deltaYears, vitality,
    contributors: rounded, best: sorted[0], worst: sorted[sorted.length - 1], usedManualVo2,
  };
}

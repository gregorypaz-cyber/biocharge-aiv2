// fitnessAge.js — Reck
// Fitness Age + estimativa de VO2max. 100% determinístico, sem LLM.
// É uma ESTIMATIVA DE BEM-ESTAR, nunca uma idade clínica.
//
// Fundamentos abertos e citáveis:
//  - VO2max: Uth, Sørensen, Overgaard & Pedersen (2004) -> VO2max ≈ 15.3 * (FCmax / FCrep)
//  - FCmax fallback: Tanaka et al. (2001) -> 208 - 0.7 * idade
//  - Normas de VO2max por idade/sexo: HUNT3 Fitness Study (Nes/Aspenes, NTNU) — dados públicos
//
// Por que NÃO usamos os coeficientes do worldfitnesslevel: o algoritmo exato do Nes 2011
// é licenciado comercialmente pela NTNU/TTO. Aqui o NÚMERO vem do método aberto (Uth),
// e a cintura entra como CONTEXTO de composição corporal (não altera o número).

// --- Normas de VO2max (mL/kg/min) por idade/sexo — HUNT3 (NTNU) ---
// Pontos = ponto médio de cada faixa etária reportada.
const HUNT_NORMS = {
  male:   [[25, 54], [35, 49], [45, 47], [55, 42], [65, 39], [75, 34]],
  female: [[25, 43], [35, 40], [45, 38], [55, 34], [65, 31], [75, 27]],
};

// Interpolação linear com "clamp" plano nas pontas.
function interp(points, x) {
  if (x <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return last[1];
}

export function normVO2(age, sex) {
  const pts = HUNT_NORMS[sex] || HUNT_NORMS.male;
  return interp(pts, age);
}

// Inverte a curva de normas: devolve a idade cujo VO2max médio == vo2.
// A norma é monotonicamente decrescente com a idade, então uma busca binária resolve.
export function fitnessAgeFromVO2(vo2, sex) {
  const lo = 20, hi = 90;
  if (vo2 >= normVO2(lo, sex)) return lo; // mais apto que a média de quem tem 20
  if (vo2 <= normVO2(hi, sex)) return hi;
  let a = lo, b = hi;
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2;
    if (normVO2(m, sex) > vo2) a = m;
    else b = m;
  }
  return Math.round((a + b) / 2);
}

// FCmax estimada — Tanaka 2001 (mais precisa que 220−idade).
export function estimateHRmax(age) {
  return Math.round(208 - 0.7 * age);
}

// VO2max — Uth et al. 2004.
export function estimateVO2max(hrMax, hrRest) {
  return 15.3 * (hrMax / hrRest);
}

export function ageFromBirthYear(birthYear, now = new Date()) {
  return now.getFullYear() - birthYear;
}

/**
 * Orquestrador principal.
 * @param {Object} args
 * @param {Object} args.profile       { birth_year, sex, height_cm, waist_cm }
 * @param {number[]} args.restingHRs  FC de repouso (bpm) — pode vir em qualquer ordem
 * @param {number|null} args.observedHRmax  maior FC observada em treinos (bpm) ou null
 * @param {Object|null} args.activity { sessions, minutes } nos últimos 28 dias
 * @returns objeto com vo2max, fitnessAge, deltaYears, inputs, confidence, etc.
 */
export function computeFitnessAge({
  profile,
  restingHRs = [],
  observedHRmax = null,
  activity = null,
}) {
  if (!profile || !profile.birth_year || !profile.sex) {
    return {
      ok: false,
      missing: ["birth_year", "sex"].filter((k) => !profile || !profile[k]),
    };
  }

  const age = ageFromBirthYear(profile.birth_year);

  // FC de repouso: média robusta das amostras válidas mais recentes (até 14).
  const valid = restingHRs.filter((v) => typeof v === "number" && v >= 30 && v <= 110);
  if (valid.length === 0) return { ok: false, missing: ["resting_hr"] };
  const sample = valid.slice(0, 14);
  const hrRest = Math.round(sample.reduce((a, b) => a + b, 0) / sample.length);

  // FCmax: usa a observada se for plausível, senão Tanaka.
  let hrMax, hrMaxSource;
  if (observedHRmax && observedHRmax >= 150 && observedHRmax <= 215) {
    hrMax = observedHRmax;
    hrMaxSource = "observada nos seus treinos";
  } else {
    hrMax = estimateHRmax(age);
    hrMaxSource = "estimada (Tanaka 208−0,7×idade)";
  }

  let vo2 = estimateVO2max(hrMax, hrRest);
  vo2 = Math.max(15, Math.min(75, vo2)); // limites de sanidade

  const fitnessAge = fitnessAgeFromVO2(vo2, profile.sex);
  const norm = normVO2(age, profile.sex);
  const deltaYears = fitnessAge - age; // negativo = condicionamento "mais jovem" que a idade real

  // Contexto de cintura — NÃO altera o VO2max, só informa composição corporal.
  let waistContext = null;
  if (profile.waist_cm && profile.height_cm) {
    const whtr = profile.waist_cm / profile.height_cm;
    waistContext = {
      whtr: Math.round(whtr * 100) / 100,
      flag: whtr >= 0.6 ? "alto" : whtr >= 0.5 ? "moderado" : "saudável",
    };
  }

  // Confiança da estimativa.
  let confidence = "média";
  if (hrMaxSource.startsWith("observada") && valid.length >= 7) confidence = "boa";
  if (valid.length < 3) confidence = "baixa";

  return {
    ok: true,
    age,
    vo2max: Math.round(vo2 * 10) / 10,
    normVO2: Math.round(norm * 10) / 10,
    fitnessAge,
    deltaYears,
    inputs: {
      hrRest,
      hrMax,
      hrMaxSource,
      restingSamples: sample.length,
      activity,
      waist: profile.waist_cm || null,
      height: profile.height_cm || null,
    },
    waistContext,
    confidence,
  };
}

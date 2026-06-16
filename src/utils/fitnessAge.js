// fitnessAge.js — Reck
// Fitness Age + estimativa de VO2max. 100% determinístico, sem LLM.
// É uma ESTIMATIVA DE BEM-ESTAR, nunca uma idade clínica.
//
// Fundamentos abertos e citáveis:
//  - VO2max (fallback): Uth, Sørensen, Overgaard & Pedersen (2004) -> 15.3 * (FCmax / FCrep)
//  - FCmax (fallback): Tanaka et al. (2001) -> 208 - 0.7 * idade
//  - Normas de VO2max por idade/sexo: HUNT3 Fitness Study (Nes/Aspenes, NTNU) — dados públicos
//
// Prioridade da fonte de VO2max (da mais confiável p/ a menos):
//  1) VO2max informado pelo usuário (ex.: do app Zepp / relógio)
//  2) Uth com a FC máxima pessoal salva em Configurações (prefs.max_hr)
//  3) Uth com a maior FC observada nos treinos
//  4) Uth com FCmax estimada (Tanaka)

const HUNT_NORMS = {
  male:   [[25, 54], [35, 49], [45, 47], [55, 42], [65, 39], [75, 34]],
  female: [[25, 43], [35, 40], [45, 38], [55, 34], [65, 31], [75, 27]],
};

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

export function fitnessAgeFromVO2(vo2, sex) {
  const lo = 20, hi = 90;
  if (vo2 >= normVO2(lo, sex)) return lo;
  if (vo2 <= normVO2(hi, sex)) return hi;
  let a = lo, b = hi;
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2;
    if (normVO2(m, sex) > vo2) a = m;
    else b = m;
  }
  return Math.round((a + b) / 2);
}

export function estimateHRmax(age) {
  return Math.round(208 - 0.7 * age);
}

export function estimateVO2max(hrMax, hrRest) {
  return 15.3 * (hrMax / hrRest);
}

export function ageFromBirthYear(birthYear, now = new Date()) {
  return now.getFullYear() - Number(birthYear);
}

/**
 * @param {Object} args
 * @param {Object}   args.profile        { birth_year, sex, height_cm, waist_cm }
 * @param {number[]} args.restingHRs     FC de repouso (bpm)
 * @param {number|null} args.observedHRmax  maior FC observada em treinos
 * @param {number|null} args.maxHrPref   FC máxima pessoal salva em Configurações (prefs.max_hr)
 * @param {number|null} args.vo2maxManual VO2max informado pelo usuário (Zepp/relógio)
 * @param {Object|null} args.activity    { sessions, minutes } nos últimos 28 dias
 */
export function computeFitnessAge({
  profile,
  restingHRs = [],
  observedHRmax = null,
  maxHrPref = null,
  vo2maxManual = null,
  activity = null,
}) {
  if (!profile || !profile.birth_year || !profile.sex) {
    return {
      ok: false,
      reason: 'profile',
      missing: ['birth_year', 'sex'].filter((k) => !profile || !profile[k]),
    };
  }

  const age = ageFromBirthYear(profile.birth_year);
  const sex = profile.sex;

  const valid = restingHRs.filter((v) => typeof v === 'number' && v >= 30 && v <= 110);
  const sample = valid.slice(0, 14);
  const hrRest = sample.length ? Math.round(sample.reduce((a, b) => a + b, 0) / sample.length) : null;

  let vo2, vo2Source, hrMax = null, hrMaxSource = null;
  const manual = Number(vo2maxManual);

  if (Number.isFinite(manual) && manual >= 15 && manual <= 80) {
    // 1) VO2max informado
    vo2 = manual;
    vo2Source = 'informado por você (Zepp/relógio)';
  } else {
    // Precisa de FC de repouso para os métodos por FC.
    if (!hrRest) return { ok: false, reason: 'data', missing: ['resting_hr'] };

    const pref = Number(maxHrPref);
    if (Number.isFinite(pref) && pref >= 120 && pref <= 220) {
      hrMax = pref; hrMaxSource = 'sua FC máxima (Configurações)';
    } else if (observedHRmax && observedHRmax >= 150 && observedHRmax <= 215) {
      hrMax = observedHRmax; hrMaxSource = 'observada nos seus treinos';
    } else {
      hrMax = estimateHRmax(age); hrMaxSource = 'estimada (Tanaka 208−0,7×idade)';
    }
    vo2 = Math.max(15, Math.min(75, estimateVO2max(hrMax, hrRest)));
    vo2Source = 'razão FCmax/FCrepouso (Uth 2004)';
  }

  vo2 = Math.round(vo2 * 10) / 10;
  const fitnessAge = fitnessAgeFromVO2(vo2, sex);
  const norm = normVO2(age, sex);
  const deltaYears = fitnessAge - age;

  let waistContext = null;
  if (profile.waist_cm && profile.height_cm) {
    const whtr = Number(profile.waist_cm) / Number(profile.height_cm);
    waistContext = {
      whtr: Math.round(whtr * 100) / 100,
      flag: whtr >= 0.6 ? 'alto' : whtr >= 0.5 ? 'moderado' : 'saudável',
    };
  }

  // Confiança
  let confidence = 'média';
  if (vo2Source.startsWith('informado')) confidence = 'boa';
  else if ((hrMaxSource || '').match(/FC máxima|observada/) && sample.length >= 7) confidence = 'boa';
  if (!vo2Source.startsWith('informado') && sample.length < 3) confidence = 'baixa';

  return {
    ok: true,
    age,
    vo2max: vo2,
    vo2Source,
    normVO2: Math.round(norm * 10) / 10,
    fitnessAge,
    deltaYears,
    inputs: {
      hrRest,
      hrMax,
      hrMaxSource,
      restingSamples: sample.length,
      activity,
      waist: profile.waist_cm ? Number(profile.waist_cm) : null,
      height: profile.height_cm ? Number(profile.height_cm) : null,
    },
    waistContext,
    confidence,
  };
}

// fitnessAge.js — Reck
// Fitness Age + estimativa de VO2max. 100% determinístico, sem LLM.
// É uma ESTIMATIVA DE BEM-ESTAR, nunca uma idade clínica.
//
// Fundamentos abertos e citáveis:
//  - VO2max (fallback): Uth, Sørensen, Overgaard & Pedersen (2004) -> 15.3 * (FCmax / FCrep)
//  - FCmax (fallback): Tanaka et al. (2001) -> 208 - 0.7 * idade
//  - Normas de VO2max por idade/sexo: POPULAÇÃO GERAL (Cooper Institute / ACSM Tab. 4.7
//    e registro FRIEND). Medianas: homem ~48 e mulher ~38 ml/kg/min aos 25 anos,
//    com declínio de ~10% por década. São as MESMAS referências usadas por relógios
//    de consumo (ex.: Zepp/Amazfit) — por isso o veredito do Reck bate com o do relógio.
//    Curva exponencial suave (sem "saltos" da idade de condicionamento).
//
// Prioridade da fonte de VO2max (da mais confiável p/ a menos):
//  1) VO2max informado pelo usuário (ex.: do app Zepp / relógio)
//  2) Uth com a FC máxima pessoal salva em Configurações (prefs.max_hr)
//  3) Uth com a maior FC observada nos treinos
//  4) Uth com FCmax estimada (Tanaka)

const PEAK = { male: 48, female: 38 }; // VO2max mediano aos 25 (Cooper/ACSM/FRIEND, população geral)
const DECLINE = 0.90;                  // ~10% por década
const REF_AGE = 25;

export function normVO2(age, sex) {
  const peak = PEAK[sex] || PEAK.male;
  return peak * Math.pow(DECLINE, (age - REF_AGE) / 10);
}

export function fitnessAgeFromVO2(vo2, sex) {
  const peak = PEAK[sex] || PEAK.male;
  const age = REF_AGE + (10 * Math.log(vo2 / peak)) / Math.log(DECLINE);
  return Math.round(Math.max(20, Math.min(90, age)));
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
    vo2 = manual;
    vo2Source = 'informado por você (Zepp/relógio)';
  } else {
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
      hrRest, hrMax, hrMaxSource,
      restingSamples: sample.length,
      activity,
      waist: profile.waist_cm ? Number(profile.waist_cm) : null,
      height: profile.height_cm ? Number(profile.height_cm) : null,
    },
    waistContext,
    confidence,
  };
}

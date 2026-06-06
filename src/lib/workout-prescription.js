// ─── Workout Prescription Engine ─────────────────────────────────────────────
// Versão alinhada com a UX da Today:
// - uma decisão principal por dia
// - evita contradições entre recuperação x treino
// - separa melhor treino forte / moderado / leve / recuperação

const SAFETY_WARNINGS = [
  'Isto não é aconselhamento médico.',
  'Se sentir dor no peito, falta de ar severa, tontura ou desmaio, interrompa e procure atendimento.',
  'Se tiver condição clínica, siga orientação profissional.',
];

function clampTime(mins, fallback = 45) {
  const base = mins != null && mins > 0 ? mins : fallback;
  return Math.max(15, Math.min(90, base));
}

function strain(range) {
  return { type: 'strain', range };
}

function rpe(range) {
  return { type: 'RPE', range };
}

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function uid() {
  return 'rx_' + Math.random().toString(36).slice(2, 9);
}

function hasRunFocus(userPrefs, analysis) {
  const sports = userPrefs?.preferred_sports || [];
  return sports.some((s) => String(s).toLowerCase().includes('corr')) || !!analysis?.runningEconomy;
}

function getSleepDebtHours(analysis) {
  return analysis?.sleepDebt?.debt ?? analysis?.sleepDebtHours ?? 0;
}

export function buildWorkoutDecision(analysis, userPrefs = {}, context = {}) {
  if (!analysis) return null;

  const today = analysis.today || {};
  const trainingLoad = analysis.trainingLoad || {};
  const physioState = analysis.physioState || {};
  const hrvAnomaly = analysis.hrvAnomaly || null;

  const recovery = today.recovery_score ?? today.readiness_score ?? 0;
  const fatigue = today.fatigue_score ?? today.fatigue ?? 0;
  const sleepDebt = getSleepDebtHours(analysis);
  const trainingRisk = trainingLoad.risk ?? null;
  const trainingRatio = trainingLoad.ratio ?? null;
  const deepSleepPct = context.deepSleepPct ?? today.deep_sleep_pct ?? null;

  const deepSleepLow = deepSleepPct != null && deepSleepPct < 18;
  const sleepIsLimiting = sleepDebt >= 4 || deepSleepLow;

  const overloaded =
    trainingRisk === 'high' ||
    physioState.state === 'Overreached' ||
    physioState.state === 'Fatigued' ||
    (fatigue != null && fatigue >= 75) ||
    (hrvAnomaly?.alert?.type === 'critical');

  if (context.forceRecovery === true) {
    return {
      mode: 'recover',
      headline: 'Hoje o foco é recuperar',
      subheadline: 'Seu corpo se beneficia mais de descanso ou atividade leve do que de mais carga.',
      primaryReason: 'forced_recovery',
      confidence: 'Alta',
    };
  }

  if (overloaded) {
    return {
      mode: 'recover',
      headline: 'Hoje o foco é recuperar',
      subheadline: 'Seu sistema mostra sinais de fadiga ou sobrecarga. Recuperar traz mais retorno do que insistir em treino.',
      primaryReason: 'overload',
      confidence: 'Alta',
    };
  }

  if (recovery >= (today.recovery_high_threshold ?? 80) && !sleepIsLimiting && trainingRisk !== 'high' && trainingRisk !== 'moderate') {
    return {
      mode: 'train_high',
      headline: 'Hoje é uma boa janela para intensidade',
      subheadline: 'Seu corpo acordou bem e tem margem para um estímulo mais forte com controle.',
      primaryReason: 'high_readiness',
      confidence: 'Alta',
    };
  }

  if (recovery >= 65) {
    if (sleepIsLimiting || trainingRisk === 'moderate') {
      return {
        mode: 'train_moderate',
        headline: 'Treino moderado com cautela',
        subheadline: 'Seu corpo está funcional, mas o sono ou a carga recente reduzem sua margem de intensidade.',
        primaryReason: 'moderate_with_limiters',
        confidence: 'Alta',
      };
    }

    return {
      mode: 'train_moderate',
      headline: 'Treino moderado recomendado',
      subheadline: 'Seu sistema está estável para manter ritmo e consistência hoje.',
      primaryReason: 'moderate_readiness',
      confidence: 'Alta',
    };
  }

  if (recovery >= 50 || sleepIsLimiting || fatigue >= 50) {
    return {
      mode: 'train_light',
      headline: 'Hoje vale manter leve',
      subheadline: 'Há espaço para movimento, mas não para insistir em intensidade.',
      primaryReason: 'low_margin',
      confidence: 'Média',
    };
  }

  return {
    mode: 'recover',
    headline: 'Recuperação é a melhor decisão',
    subheadline: 'Seu corpo não mostra boa margem para carga útil hoje.',
    primaryReason: 'low_readiness',
    confidence: 'Alta',
  };
}

function overloadOptions(time) {
  const t = clampTime(time);
  return [
    {
      key: 'A',
      title: 'Mobilidade + Respiração',
      modality: 'Recuperação',
      duration_min: Math.min(t, 20),
      intensity: rpe([1, 2]),
      structure: {
        warmup: '2min respiração nasal',
        main: '10–15min mobilidade leve + respiração diafragmática',
        cooldown: '2–3min relaxamento',
      },
      rationale: 'Hoje o melhor retorno vem de baixar o estresse do sistema.',
      riskNote: 'Evite intensidade moderada ou alta.',
    },
    {
      key: 'B',
      title: 'Caminhada leve',
      modality: 'Recuperação',
      duration_min: Math.min(t, 25),
      intensity: strain([1, 4]),
      structure: {
        warmup: '3min soltando o corpo',
        main: '15–20min caminhada leve, confortável',
        cooldown: '2min respiração',
      },
      rationale: 'Movimento leve ajuda sem adicionar carga relevante.',
      riskNote: 'Se o corpo parecer pesado, reduza ainda mais.',
    },
    {
      key: 'C',
      title: 'Descanso total',
      modality: 'Recuperação',
      duration_min: null,
      intensity: null,
      structure: {
        main: 'Descanso total. Priorize sono, hidratação e alimentação.',
      },
      rationale: 'Hoje descansar é uma escolha estratégica, não perda de dia.',
      riskNote: null,
    },
  ];
}

function highOptions(time, runFocus, level) {
  const t = clampTime(time);
  const highStrain =
    level === 'advanced' ? [13, 17] :
    level === 'beginner' ? [10, 14] :
    [12, 16];

  if (runFocus) {
    return [
      {
        key: 'A',
        title: 'Corrida com estímulo forte',
        modality: 'Corrida',
        duration_min: t,
        intensity: strain(highStrain),
        structure: {
          warmup: '8min trote leve + mobilidade',
          main: `Bloco principal de qualidade por ${Math.max(20, Math.round(t * 0.55))}min`,
          cooldown: '5–8min trote leve + alongamento',
        },
        rationale: 'Hoje há boa margem para um estímulo mais forte.',
        riskNote: 'Se o aquecimento não encaixar, troque para a opção B.',
      },
      {
        key: 'B',
        title: 'Corrida Z2 moderada',
        modality: 'Corrida',
        duration_min: Math.min(t, 50),
        intensity: strain([8, 12]),
        structure: {
          warmup: '5min caminhada + mobilidade',
          main: `Corrida Z2 contínua por ${Math.min(40, Math.max(25, t - 10))}min`,
          cooldown: '5min caminhada + alongamento',
        },
        rationale: 'Alternativa segura caso você queira manter o dia produtivo sem forçar tanto.',
        riskNote: null,
      },
      {
        key: 'C',
        title: 'Corrida curta + mobilidade',
        modality: 'Misto',
        duration_min: 30,
        intensity: strain([5, 9]),
        structure: {
          warmup: '3min caminhada',
          main: '20min corrida leve',
          cooldown: '7min mobilidade',
        },
        rationale: 'Opção eficiente para agenda curta.',
        riskNote: null,
      },
    ];
  }

  return [
    {
      key: 'A',
      title: 'Força moderada/alta',
      modality: 'Força',
      duration_min: t,
      intensity: rpe([7, 9]),
      structure: {
        warmup: '5min mobilidade + ativação',
        main: 'Treino de força com séries principais em carga moderada/alta',
        cooldown: '5min alongamento',
      },
      rationale: 'Hoje há boa margem para um treino mais forte.',
      riskNote: 'Mantenha técnica e controle.',
    },
    {
      key: 'B',
      title: 'Força técnica',
      modality: 'Força',
      duration_min: Math.min(t, 45),
      intensity: rpe([5, 7]),
      structure: {
        warmup: '5min mobilidade',
        main: 'Treino técnico com cargas submáximas',
        cooldown: '5min alongamento',
      },
      rationale: 'Alternativa para manter progresso com menor custo de recuperação.',
      riskNote: null,
    },
    {
      key: 'C',
      title: 'Mobilidade + caminhada',
      modality: 'Misto',
      duration_min: 30,
      intensity: rpe([2, 4]),
      structure: {
        main: '15min mobilidade + 15min caminhada',
      },
      rationale: 'Opção curta e conservadora.',
      riskNote: null,
    },
  ];
}

function moderateOptions(time, runFocus, cautious = false) {
  const t = clampTime(time);

  if (runFocus) {
    return [
      {
        key: 'A',
        title: cautious ? 'Corrida Z2 controlada' : 'Corrida Z2 moderada',
        modality: 'Corrida',
        duration_min: Math.min(t, 45),
        intensity: strain([8, 12]),
        structure: {
          warmup: '5min caminhada + mobilidade',
          main: `Corrida Z2 contínua ${Math.min(35, Math.max(20, t - 10))}min`,
          cooldown: '5min caminhada + alongamento',
        },
        rationale: cautious
          ? 'Moderado é a melhor dose hoje. Evite transformar o moderado em forte.'
          : 'Z2 é a melhor forma de manter adaptação sem custo excessivo.',
        riskNote: cautious ? 'Reduza se o corpo não responder bem nos primeiros 10min.' : null,
      },
      {
        key: 'B',
        title: 'Corrida leve curta',
        modality: 'Corrida',
        duration_min: Math.min(t, 30),
        intensity: strain([5, 8]),
        structure: {
          warmup: '5min caminhada',
          main: '15–20min corrida leve',
          cooldown: '5min caminhada',
        },
        rationale: 'Versão mais conservadora do dia.',
        riskNote: null,
      },
      {
        key: 'C',
        title: 'Mobilidade + caminhada',
        modality: 'Misto',
        duration_min: 25,
        intensity: rpe([2, 4]),
        structure: {
          main: '10min mobilidade + 15min caminhada',
        },
        rationale: 'Opção de manutenção sem quase nenhum custo de recuperação.',
        riskNote: null,
      },
    ];
  }

  return [
    {
      key: 'A',
      title: cautious ? 'Força técnica controlada' : 'Força técnica',
      modality: 'Força',
      duration_min: Math.min(t, 45),
      intensity: rpe([5, 7]),
      structure: {
        warmup: '5min mobilidade',
        main: 'Treino técnico com cargas submáximas',
        cooldown: '5min alongamento',
      },
      rationale: cautious
        ? 'Hoje o ganho está em consistência e controle, não em agressividade.'
        : 'Boa alternativa para manter estímulo com controle.',
      riskNote: cautious ? 'Se estiver pesado, migre para a opção B ou C.' : null,
    },
    {
      key: 'B',
      title: 'Cardio leve/moderado',
      modality: 'Corrida',
      duration_min: Math.min(t, 35),
      intensity: strain([6, 10]),
      structure: {
        warmup: '5min caminhada',
        main: '20–25min cardio confortável',
        cooldown: '5min caminhada',
      },
      rationale: 'Alternativa aeróbica controlada.',
      riskNote: null,
    },
    {
      key: 'C',
      title: 'Mobilidade + caminhada',
      modality: 'Misto',
      duration_min: 25,
      intensity: rpe([2, 4]),
      structure: {
        main: '10min mobilidade + 15min caminhada',
      },
      rationale: 'Opção conservadora.',
      riskNote: null,
    },
  ];
}

function lightOptions(time) {
  const t = clampTime(time);
  return [
    {
      key: 'A',
      title: 'Corrida ou caminhada leve',
      modality: 'Corrida',
      duration_min: Math.min(t, 30),
      intensity: strain([5, 8]),
      structure: {
        warmup: '5min caminhada',
        main: '15–20min muito confortáveis',
        cooldown: '5min caminhada',
      },
      rationale: 'Hoje faz mais sentido manter o corpo ativo do que buscar performance.',
      riskNote: 'Se o corpo estiver pesado, troque pela opção B ou C.',
    },
    {
      key: 'B',
      title: 'Mobilidade',
      modality: 'Mobilidade',
      duration_min: Math.min(t, 20),
      intensity: rpe([1, 3]),
      structure: {
        main: 'Rotina leve de mobilidade global',
      },
      rationale: 'Ajuda a manter movimento com custo mínimo.',
      riskNote: null,
    },
    {
      key: 'C',
      title: 'Descanso',
      modality: 'Recuperação',
      duration_min: null,
      intensity: null,
      structure: {
        main: 'Descanso ou caminhada muito leve, se quiser se mover.',
      },
      rationale: 'Hoje descansar pode render mais do que insistir em treino.',
      riskNote: null,
    },
  ];
}

function insufficientDataOptions(time) {
  const t = clampTime(time);
  const note = 'Poucos dados disponíveis — recomendação conservadora por segurança.';
  return [
    {
      key: 'A',
      title: 'Cardio leve',
      modality: 'Corrida',
      duration_min: Math.min(t, 30),
      intensity: strain([5, 9]),
      structure: {
        warmup: '5min caminhada',
        main: '15–20min leves',
        cooldown: '5min caminhada',
      },
      rationale: note,
      riskNote: 'Se não estiver encaixando, reduza.',
    },
    {
      key: 'B',
      title: 'Mobilidade + caminhada',
      modality: 'Misto',
      duration_min: 25,
      intensity: rpe([2, 4]),
      structure: {
        main: '10min mobilidade + 15min caminhada',
      },
      rationale: note,
      riskNote: null,
    },
    {
      key: 'C',
      title: 'Descanso',
      modality: 'Recuperação',
      duration_min: null,
      intensity: null,
      structure: {
        main: 'Descanso ou atividade muito leve.',
      },
      rationale: note,
      riskNote: null,
    },
  ];
}

function scoreOptions(options, analysis, userPrefs, adaptationHint, decision) {
  const runFocus = hasRunFocus(userPrefs, analysis);
  const freqC = adaptationHint?.freqC ?? 0;
  const avgRPE = adaptationHint?.avgPerceivedRPE ?? null;
  const ratio = analysis?.trainingLoad?.ratio ?? null;
  const recovery = analysis?.today?.recovery_score ?? analysis?.today?.readiness_score ?? null;

  return options.map((opt) => {
    let score = 50;
    const explain = [];

    if (decision?.mode === 'train_high' && opt.key === 'A') {
      score += 18;
      explain.push({ feature: 'best_match_high', impact: +18 });
    }

    if (decision?.mode === 'train_moderate' && opt.key === 'A') {
      score += 18;
      explain.push({ feature: 'best_match_moderate', impact: +18 });
    }

    if (decision?.mode === 'train_light' && opt.key === 'A') {
      score += 18;
      explain.push({ feature: 'best_match_light', impact: +18 });
    }

    if (decision?.mode === 'recover' && ['B', 'C'].includes(opt.key)) {
      score += 18;
      explain.push({ feature: 'best_match_recovery', impact: +18 });
    }

    if (runFocus && ['Corrida', 'Misto'].includes(opt.modality)) {
      score += 10;
      explain.push({ feature: 'run_focus', impact: +10 });
    }

    const maxIntensity = opt.intensity?.range?.[1];
    if (avgRPE != null && avgRPE >= 8 && maxIntensity != null && maxIntensity >= 8) {
      score -= 15;
      explain.push({ feature: 'high_rpe_history', impact: -15 });
    }

    if (freqC > 0.5 && (opt.key === 'C' || (opt.duration_min != null && opt.duration_min <= 30))) {
      score += 6;
      explain.push({ feature: 'prefers_short', impact: +6 });
    }

    if (ratio != null && ratio > 1.3 && ['Recuperação', 'Mobilidade', 'Misto'].includes(opt.modality)) {
      score += 10;
      explain.push({ feature: 'protective_under_high_load', impact: +10 });
    }

    if (recovery != null && recovery >= (analysis.today?.recovery_high_threshold ?? 80) && opt.key === 'A' && decision?.mode === 'train_high') {
      score += 10;
      explain.push({ feature: 'high_recovery_supports_A', impact: +10 });
    }

    return {
      ...opt,
      _score: Math.max(0, Math.min(100, score)),
      _explain: explain.slice(0, 3),
    };
  });
}

export function prescribeWorkout(analysis, userPrefs = {}, opts = {}) {
  try {
    if (!analysis) return null;

    const today = analysis.today || {};
    const trainingLoad = analysis.trainingLoad || {};
    const sleepDebt = analysis.sleepDebt || {};
    const physioState = analysis.physioState || {};
    const hrvAnomaly = analysis.hrvAnomaly || null;

    const recovery = today.recovery_score ?? today.readiness_score ?? null;
    const fatigue = today.fatigue_score ?? today.fatigue ?? null;
    const trainingRisk = trainingLoad.risk ?? null;
    const trainingRatio = trainingLoad.ratio ?? null;
    const sleepDebtHours = sleepDebt.debt ?? null;

    let hrvDeltaPct = null;
    if (Array.isArray(analysis.baselineInsights)) {
      const hrvInsight = analysis.baselineInsights.find((i) => i.label === 'HRV');
      if (hrvInsight) hrvDeltaPct = hrvInsight.delta ?? null;
    }

    const time = userPrefs.available_time_minutes;
    const level = userPrefs.level || 'intermediate';
    const runFocus = hasRunFocus(userPrefs, analysis);
    const adaptationHint = opts.adaptationHint ?? null;

    const decision = buildWorkoutDecision(analysis, userPrefs, {
      deepSleepPct: opts.deepSleepPct ?? today.deep_sleep_pct ?? null,
      forceRecovery: opts.forceRecovery ?? false,
    });

    let options;

    if (!decision || recovery == null) {
      options = insufficientDataOptions(time);
    } else if (decision.mode === 'recover') {
      options = overloadOptions(time);
    } else if (decision.mode === 'train_high') {
      options = highOptions(time, runFocus, level);
    } else if (decision.mode === 'train_moderate') {
      const cautious = decision.primaryReason === 'moderate_with_limiters';
      options = moderateOptions(time, runFocus, cautious);
    } else if (decision.mode === 'train_light') {
      options = lightOptions(time);
    } else {
      options = insufficientDataOptions(time);
    }

    options = scoreOptions(options, analysis, userPrefs, adaptationHint, decision);

    if (adaptationHint) {
      options = options.map((opt) => {
        const adapted = { ...opt };

        if (adapted.duration_min != null) {
          adapted.duration_min = Math.max(15, Math.round(adapted.duration_min * 0.9));
        }

        if (adapted.intensity?.range) {
          adapted.intensity = {
            ...adapted.intensity,
            range: adapted.intensity.range.map((v) => Math.max(1, Math.round(v * 0.9))),
          };
        }

        adapted.adaptationApplied = true;
        adapted.adaptationReason = 'historic_adherence';
        return adapted;
      });
    }

    const sorted = [...options].sort((a, b) => b._score - a._score);
    const recommendedKey = sorted[0]?.key ?? 'A';
    const explainTop = (sorted[0]?._explain || []).slice(0, 3);

    const result = {
      id: uid(),
      date: today.date || todayStr(),
      summary: {
        confidence: decision?.confidence || 'Média',
        stateTag: physioState.state || null,
        riskTag: trainingRisk || null,
        mode: decision?.mode || 'train_light',
        primaryReason: decision?.primaryReason || 'fallback',
        headline: decision?.headline || 'Plano do dia',
        subheadline: decision?.subheadline || 'Use o treino de hoje com controle.',
      },
      options,
      recommendedKey,
      explainTop,
      evidence: {
        recovery,
        fatigue,
        sleepDebtHours,
        trainingRatio,
        trainingRisk,
        hrvDeltaPct,
      },
      safetyWarnings: SAFETY_WARNINGS,
      provenance: 'heuristic_v2',
    };

    return result;
  } catch (e) {
    console.warn('prescribeWorkout failed', e);
    return null;
  }
}

export function formatPrescriptionText(prescription) {
  if (!prescription) return '';
  try {
    const lines = [];
    lines.push(`📋 Prescrição de Treino — ${prescription.date}`);
    lines.push(
      `Confiança: ${prescription.summary.confidence}${
        prescription.summary.stateTag ? ` | Estado: ${prescription.summary.stateTag}` : ''
      }`
    );
    lines.push('');

    for (const opt of prescription.options) {
      lines.push(`[${opt.key}] ${opt.title} (${opt.modality})`);
      if (opt.duration_min) lines.push(`  ⏱ ${opt.duration_min}min`);
      if (opt.intensity) {
        lines.push(
          `  💥 ${opt.intensity.type === 'strain' ? 'Strain' : 'RPE'} ${opt.intensity.range[0]}–${opt.intensity.range[1]}`
        );
      }
      if (opt.structure?.main) lines.push(`  📌 ${opt.structure.main}`);
      lines.push(`  💬 ${opt.rationale}`);
      if (opt.riskNote) lines.push(`  ⚠️ ${opt.riskNote}`);
      lines.push('');
    }

    return lines.join('\n');
  } catch (e) {
    console.warn('formatPrescriptionText failed', e);
    return '';
  }
}
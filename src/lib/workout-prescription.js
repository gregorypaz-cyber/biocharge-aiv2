// ─── Workout Prescription Engine ─────────────────────────────────────────────
// Produces 3 daily workout options based on physiological analysis.
// Conservative heuristic — inspired by Whoop strain model.
// No network calls, no external dependencies.

const SAFETY_WARNINGS = [
  'Isto não é aconselhamento médico.',
  'Se sentir dor no peito, falta de ar severa, tontura ou desmaio, interrompa e procure atendimento.',
  'Se tiver condição clínica, siga orientação profissional.',
];

function _clampTime(mins, available) {
  const base = available != null && available > 0 ? available : 45;
  return Math.max(15, Math.min(90, base));
}

function _strainIntensity(range) {
  return { type: 'strain', range };
}

function _rpeIntensity(range) {
  return { type: 'RPE', range };
}

function _todayStr() {
  try {
    return new Date().toISOString().slice(0, 10);
  } catch {
    return 'unknown';
  }
}

function _uid() {
  return 'rx_' + Math.random().toString(36).slice(2, 9);
}

function _runFocus(userPrefs, analysis) {
  const sports = userPrefs.preferred_sports || [];
  return sports.some(s => s.toLowerCase().includes('corr')) || !!analysis.runningEconomy;
}

// ─── Build 3 options per scenario ────────────────────────────────────────────

function _overloadOptions(time) {
  const t = _clampTime(time);
  return [
    {
      key: 'A',
      title: 'Recuperação Ativa',
      modality: 'Recuperação',
      duration_min: Math.min(t, 30),
      intensity: _strainIntensity([1, 4]),
      structure: {
        warmup: '5min caminhada leve',
        main: 'Alongamento global + respiração diafragmática 10min',
        cooldown: 'Repouso 10min',
      },
      rationale: 'Sinais de sobrecarga detectados — recuperação ativa é o estímulo correto agora.',
      riskNote: 'Evite qualquer intensidade moderada ou alta hoje.',
    },
    {
      key: 'B',
      title: 'Mobilidade + Caminhada Leve',
      modality: 'Mobilidade',
      duration_min: Math.min(t, 25),
      intensity: _rpeIntensity([2, 4]),
      structure: {
        warmup: '2min respiração',
        main: 'Rotina de mobilidade articular + caminhada 10min em Z1',
        cooldown: 'Alongamento estático 5min',
      },
      rationale: 'Movimentação suave mantém circulação sem adicionar carga ao sistema nervoso.',
      riskNote: 'Mantenha FC abaixo de 120 bpm.',
    },
    {
      key: 'C',
      title: 'Descanso Total',
      modality: 'Recuperação',
      duration_min: null,
      intensity: null,
      structure: {
        main: 'Descanso completo. Priorize hidratação, alimentação e sono.',
      },
      rationale: 'Com múltiplos sinais de sobrecarga, descanso total é a opção mais segura.',
      riskNote: null,
    },
  ];
}

function _highRecoveryOptions(time, runFocus, ratio, level) {
  const t = _clampTime(time);
  const strainHigh = level === 'advanced' ? [13, 17] : level === 'beginner' ? [10, 14] : [12, 16];
  if (runFocus) {
    const mainDesc = ratio != null && ratio > 1.3
      ? `Corrida Z2 contínua ${Math.round(t * 0.75)}min (FC confortável, fala possível)`
      : `Intervalado leve: ${Math.round(t * 0.6)}min Z2 + 2x3min Z3 com recuperação`;
    return [
      {
        key: 'A',
        title: ratio != null && ratio > 1.3 ? 'Corrida Z2 Build' : 'Corrida Intervalada Leve',
        modality: 'Corrida',
        duration_min: t,
        intensity: _strainIntensity(strainHigh),
        structure: {
          warmup: '8min trote leve + mobilidade',
          main: mainDesc,
          cooldown: '5min trote + alongamento',
        },
        rationale: `Recovery alto${ratio != null ? ` e ratio ${ratio.toFixed(2)}` : ''} — bom momento para carga de qualidade.`,
        riskNote: null,
      },
      {
        key: 'B',
        title: 'Corrida Z2 Moderada',
        modality: 'Corrida',
        duration_min: Math.min(t, 50),
        intensity: _strainIntensity([8, 12]),
        structure: {
          warmup: '5min caminhada + mobilidade',
          main: `Corrida Z2 contínua ${Math.min(t - 10, 40)}min`,
          cooldown: '5min caminhada + alongamento',
        },
        rationale: 'Alternativa segura com volume adequado em zona aeróbica.',
        riskNote: null,
      },
      {
        key: 'C',
        title: 'Corrida Curta + Mobilidade',
        modality: 'Misto',
        duration_min: 30,
        intensity: _strainIntensity([5, 9]),
        structure: {
          warmup: '3min caminhada',
          main: '20min corrida Z2 leve',
          cooldown: '7min mobilidade',
        },
        rationale: 'Opção de 30min para dias com pouco tempo disponível.',
        riskNote: null,
      },
    ];
  }
  // Strength focus
  return [
    {
      key: 'A',
      title: 'Força Moderada',
      modality: 'Força',
      duration_min: t,
      intensity: _rpeIntensity([7, 9]),
      structure: {
        warmup: '5min mobilidade + ativação',
        main: `Treino de força: ${Math.round(t * 0.7)}min — série principal com cargas moderadas`,
        cooldown: '5min alongamento',
      },
      rationale: 'Recovery alto — bom momento para carga de força.',
      riskNote: null,
    },
    {
      key: 'B',
      title: 'Corrida Z2',
      modality: 'Corrida',
      duration_min: Math.min(t, 45),
      intensity: _strainIntensity([8, 12]),
      structure: {
        warmup: '5min caminhada',
        main: `Corrida Z2 ${Math.min(t - 10, 35)}min`,
        cooldown: '5min caminhada',
      },
      rationale: 'Alternativa aeróbica de baixo impacto articular.',
      riskNote: null,
    },
    {
      key: 'C',
      title: 'Mobilidade + Z1 Curto',
      modality: 'Misto',
      duration_min: 30,
      intensity: _strainIntensity([4, 8]),
      structure: { main: '15min mobilidade + 15min caminhada ativa' },
      rationale: 'Opção curta para dias com agenda apertada.',
      riskNote: null,
    },
  ];
}

function _moderateRecoveryOptions(time, runFocus) {
  const t = _clampTime(time);
  return [
    {
      key: 'A',
      title: 'Corrida Z2 Moderada',
      modality: 'Corrida',
      duration_min: Math.min(t, 45),
      intensity: _strainIntensity([8, 12]),
      structure: {
        warmup: '5min caminhada + mobilidade',
        main: `Corrida Z2 contínua ${Math.min(t - 10, 35)}min`,
        cooldown: '5min caminhada + alongamento',
      },
      rationale: 'Recovery moderado — Z2 é a zona ideal para manter adaptação sem adicionar estresse.',
      riskNote: 'Reduza se sentir cansaço excessivo nos primeiros 10min.',
    },
    {
      key: 'B',
      title: 'Força Técnica',
      modality: 'Força',
      duration_min: Math.min(t, 45),
      intensity: _rpeIntensity([5, 7]),
      structure: {
        warmup: '5min mobilidade',
        main: 'Treino de força com ênfase técnica — cargas submáximas',
        cooldown: '5min alongamento',
      },
      rationale: 'Alternativa de força em intensidade controlada.',
      riskNote: null,
    },
    {
      key: 'C',
      title: 'Mobilidade + Caminhada',
      modality: 'Misto',
      duration_min: Math.min(t, 30),
      intensity: _rpeIntensity([2, 4]),
      structure: { main: '15min mobilidade + 15min caminhada leve' },
      rationale: 'Opção conservadora para manter movimento sem carga.',
      riskNote: null,
    },
  ];
}

function _lowRecoveryOptions(time) {
  const t = _clampTime(time);
  return [
    {
      key: 'A',
      title: 'Corrida Z1/Z2 Leve',
      modality: 'Corrida',
      duration_min: Math.min(t, 35),
      intensity: _strainIntensity([5, 9]),
      structure: {
        warmup: '5min caminhada',
        main: `Corrida Z1/Z2 muito leve ${Math.min(t - 10, 25)}min — priorize conforto`,
        cooldown: '5min caminhada',
      },
      rationale: 'Recovery baixo ou débito de sono elevado — intensidade reduzida é essencial.',
      riskNote: 'Se cansaço piorar, converta em caminhada.',
    },
    {
      key: 'B',
      title: 'Mobilidade',
      modality: 'Mobilidade',
      duration_min: Math.min(t, 25),
      intensity: _rpeIntensity([1, 3]),
      structure: {
        main: 'Rotina de mobilidade completa — quadril, coluna, ombros',
        cooldown: '5min respiração',
      },
      rationale: 'Mobilidade mantém amplitude sem adicionar carga cardiovascular.',
      riskNote: null,
    },
    {
      key: 'C',
      title: 'Descanso',
      modality: 'Recuperação',
      duration_min: null,
      intensity: null,
      structure: { main: 'Descanso ativo — caminhada leve ou repouso completo.' },
      rationale: 'Com fadiga ou sono em déficit, descanso pode ser o melhor treino.',
      riskNote: null,
    },
  ];
}

function _insufficientDataOptions(time) {
  const t = _clampTime(time);
  const note = 'Poucos dados disponíveis — recomendação conservadora por precaução.';
  return [
    {
      key: 'A',
      title: 'Corrida Z2 Conservadora',
      modality: 'Corrida',
      duration_min: Math.min(t, 35),
      intensity: _strainIntensity([5, 10]),
      structure: { warmup: '5min caminhada', main: '25–30min corrida Z2 leve', cooldown: '5min caminhada' },
      rationale: note,
      riskNote: 'Sem dados suficientes — reduza se necessário.',
    },
    {
      key: 'B',
      title: 'Mobilidade + Caminhada',
      modality: 'Misto',
      duration_min: Math.min(t, 30),
      intensity: _rpeIntensity([2, 4]),
      structure: { main: '15min mobilidade + 15min caminhada' },
      rationale: note,
      riskNote: null,
    },
    {
      key: 'C',
      title: 'Descanso',
      modality: 'Recuperação',
      duration_min: null,
      intensity: null,
      structure: { main: 'Descanso ou atividade muito leve.' },
      rationale: note,
      riskNote: null,
    },
  ];
}

// ─── Option scoring ───────────────────────────────────────────────────────────

function scoreOptions(options, analysis, userPrefs, adaptationHint) {
  const runFocus = _runFocus(userPrefs, analysis);
  const freqC = adaptationHint?.freqC ?? 0;
  const avgRPE = adaptationHint?.avgPerceivedRPE ?? null;
  const recovery = analysis?.today?.recovery_score ?? analysis?.today?.readiness_score ?? null;
  const ratio = analysis?.trainingLoad?.ratio ?? null;

  return options.map(opt => {
    let score = 50;
    const explain = [];

    // +20 if modality matches run focus
    if (runFocus && ['Corrida', 'Misto'].includes(opt.modality)) {
      score += 20;
      explain.push({ feature: 'run_focus', impact: +20 });
    }

    // -25 if high intensity but avg RPE >= 8 historically
    const maxIntensity = opt.intensity?.range?.[1];
    if (avgRPE != null && avgRPE >= 8 && maxIntensity != null && maxIntensity >= 12) {
      score -= 25;
      explain.push({ feature: 'high_rpe_history', impact: -25 });
    }

    // +10 if shorter option preferred (freqC > 0.5) and this is option C or short
    if (freqC > 0.5 && (opt.key === 'C' || (opt.duration_min != null && opt.duration_min <= 30))) {
      score += 10;
      explain.push({ feature: 'prefers_short', impact: +10 });
    }

    // +15 if high recovery and option is quality/competitive
    if (recovery != null && recovery >= 80 && ['Corrida', 'Força'].includes(opt.modality) && opt.key === 'A') {
      score += 15;
      explain.push({ feature: 'high_recovery_quality', impact: +15 });
    }

    // +15 if high ratio and option is protective (Recuperação/Mobilidade)
    if (ratio != null && ratio > 1.3 && ['Recuperação', 'Mobilidade'].includes(opt.modality)) {
      score += 15;
      explain.push({ feature: 'high_ratio_protective', impact: +15 });
    }

    return { ...opt, _score: Math.max(0, Math.min(100, score)), _explain: explain.slice(0, 3) };
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

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
    const rhr = today.resting_hr ?? today.resting_heart_rate ?? null;

    const trainingRisk = trainingLoad.risk ?? null;
    const trainingRatio = trainingLoad.ratio ?? null;
    const sleepDebtHours = sleepDebt.debt ?? null;

    // HRV delta from baseline insights
    let hrvDeltaPct = null;
    if (Array.isArray(analysis.baselineInsights)) {
      const hrvInsight = analysis.baselineInsights.find(i => i.label === 'HRV');
      if (hrvInsight) hrvDeltaPct = hrvInsight.delta ?? null;
    }

    const time = userPrefs.available_time_minutes;
    const level = userPrefs.level || 'intermediate';
    const runFocus = _runFocus(userPrefs, analysis);

    // ── Determine confidence ──────────────────────────────────────────────────
    let confidence = 'Média';
    if (trainingRisk === 'insufficient_data' || recovery == null) {
      confidence = 'Baixa';
    }

    // ── Overload guardrail ────────────────────────────────────────────────────
    const isOverloaded =
      trainingRisk === 'high' ||
      physioState.state === 'Overreached' ||
      (fatigue != null && fatigue > 75) ||
      (hrvAnomaly && hrvAnomaly.alert && hrvAnomaly.alert.type === 'critical');

    if (isOverloaded) {
      confidence = 'Alta';
    }

    // ── State tags ────────────────────────────────────────────────────────────
    const stateTag = physioState.state || null;
    const riskTag = trainingRisk || null;

    const adaptationHint = opts.adaptationHint ?? null;

    // ── Choose options ────────────────────────────────────────────────────────
    let options;

    if (confidence === 'Baixa' && recovery == null) {
      options = _insufficientDataOptions(time);
    } else if (isOverloaded) {
      options = _overloadOptions(time);
    } else if (recovery != null && recovery >= 80) {
      options = _highRecoveryOptions(time, runFocus, trainingRatio, level);
    } else if (recovery != null && recovery >= 65) {
      options = _moderateRecoveryOptions(time, runFocus);
    } else if (
      (recovery != null && recovery >= 50) ||
      (sleepDebtHours != null && sleepDebtHours >= 3) ||
      (fatigue != null && fatigue >= 50 && fatigue <= 75)
    ) {
      options = _lowRecoveryOptions(time);
    } else if (recovery != null && recovery < 50) {
      options = _overloadOptions(time);
    } else {
      options = _insufficientDataOptions(time);
    }

    // ── Strengthen confidence when signals are consistent ────────────────────
    if (
      confidence === 'Média' &&
      trainingRisk !== 'insufficient_data' &&
      recovery != null &&
      fatigue != null
    ) {
      if ((trainingRisk === 'high' || trainingRisk === 'moderate') && fatigue > 50) {
        confidence = 'Alta';
      }
    }

    // ── Score options + apply adaptation ─────────────────────────────────────
    options = scoreOptions(options, analysis, userPrefs, adaptationHint);

    // Apply soft adaptation cap (15%) if adaptationHint provided
    if (adaptationHint) {
      options = options.map(opt => {
        let adapted = { ...opt };
        if (adapted.duration_min != null) {
          adapted.duration_min = Math.max(15, Math.round(adapted.duration_min * 0.85));
        }
        if (adapted.intensity?.range) {
          adapted.intensity = {
            ...adapted.intensity,
            range: adapted.intensity.range.map(v => Math.max(1, Math.round(v * 0.85))),
          };
        }
        adapted.adaptationApplied = true;
        adapted.adaptationReason = 'historic_adherence';
        return adapted;
      });
    }

    // Determine recommendedKey by highest score (stable sort, keep original order for ties)
    const sorted = [...options].sort((a, b) => b._score - a._score);
    const recommendedKey = sorted[0]?.key ?? 'A';
    const explainTop = (sorted[0]?._explain || []).slice(0, 3);

    const result = {
      id: _uid(),
      date: today.date || _todayStr(),
      summary: { confidence, stateTag, riskTag },
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
      provenance: 'heuristic',
    };

    return result;
  } catch (e) {
    console.warn('prescribeWorkout failed', e);
    return null;
  }
}

// ─── Optional text formatter ──────────────────────────────────────────────────

export function formatPrescriptionText(prescription) {
  if (!prescription) return '';
  try {
    const lines = [];
    lines.push(`📋 Prescrição de Treino — ${prescription.date}`);
    lines.push(`Confiança: ${prescription.summary.confidence}${prescription.summary.stateTag ? ` | Estado: ${prescription.summary.stateTag}` : ''}`);
    lines.push('');
    for (const opt of prescription.options) {
      lines.push(`[${opt.key}] ${opt.title} (${opt.modality})`);
      if (opt.duration_min) lines.push(`  ⏱ ${opt.duration_min}min`);
      if (opt.intensity) lines.push(`  💥 ${opt.intensity.type === 'strain' ? 'Strain' : 'RPE'} ${opt.intensity.range[0]}–${opt.intensity.range[1]}`);
      if (opt.structure.main) lines.push(`  📌 ${opt.structure.main}`);
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
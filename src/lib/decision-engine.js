// ─── Camada de Decisão (extraída de Today.jsx — Swing 2) ─────────────────────
// Consome scores JÁ calculados e devolve a "Decisão de hoje" do herói:
//   { mode, workoutIntensity, headline, subheadline, rationale, caution }
//
// Função PURA: recebe tudo por parâmetro, não toca em fórmula de score nem em UI.
// Lógica idêntica à que vivia inline na Today — extraída só para ficar testável
// e desacoplada da apresentação. Qualquer divergência aqui muda a decisão do dia,
// por isso é coberta por decision-engine.test.js.

export function getSleepDebtHours(analysis) {
  return analysis?.sleepDebt?.debt ?? analysis?.sleepDebtHours ?? 0;
}

export function getDailyVerdict({
  checkin,
  analysis,
  phase,
  intent,
  locked,
  displayedScore,
  prescriptionScore,
  deepSleepPct,
  totalStrain,
  todaySessions,
}) {
  
 const canUseStoredDecision =
  checkin?.decision_mode &&
  todaySessions.length === 0 &&
  phase === 'PLANNING' &&
  !(intent === 'recovery' && locked);

if (canUseStoredDecision) {
  return {
    mode: checkin.decision_mode,
    workoutIntensity:
      checkin.decision_mode === 'train_high' ? 'high' :
      checkin.decision_mode === 'train_moderate' ? 'moderate' :
      checkin.decision_mode === 'train_light' ? 'low' :
      'low',
    headline: checkin.headline_today || 'Direção do dia definida',
    subheadline: 'Baseado no seu check-in mais recente.',
    rationale: 'Engine principal',
    caution: null,
  };
}

  const sleepDebt = getSleepDebtHours(analysis);
  const acwr = analysis?.trainingLoad?.ratio ?? null;
  const physioState = analysis?.physioState?.state ?? checkin?.current_body_state ?? null;
  const recoveryDemand = checkin?.recovery_demand ?? 0;
  const morningRecovery = checkin?.morning_recovery_score ?? checkin?.recovery_score ?? 0;

  const forcedRecovery =
    (intent === 'recovery' && locked) ||
    phase === 'RECOVERY_DAY' ||
    phase === 'OVERLOAD' ||
    physioState === 'Overreached' ||
    physioState === 'Fatigued' ||
    recoveryDemand > morningRecovery;

  if (forcedRecovery) {
    return {
      mode: 'recover',
      workoutIntensity: 'low',
      headline: 'Hoje o foco é recuperar',
      subheadline: 'Seu corpo se beneficia mais de descanso ou atividade leve do que de mais carga.',
      rationale: 'Recuperação > treino hoje',
      caution: 'Evite intensidade alta e preserve o sistema para os próximos 1–2 dias.',
    };
  }

  const deepSleepLow = deepSleepPct != null && deepSleepPct < 18;
  const sleepIsLimiting = sleepDebt >= 4 || deepSleepLow;
  const lowLoad = acwr != null && acwr <= 0.8;
  const highLoad = acwr != null && acwr >= 1.3;

  const hasPhysio =
    ((checkin?.hrv_manual && checkin.hrv_manual > 0) ||
      (checkin?.hrv && checkin.hrv > 0)) ||
    (checkin?.resting_hr && checkin.resting_hr > 0);

  // train_high usa o personalHigh adaptativo (mesmo gate da decisão e do strain),
  // não o 74 fixo — resíduo de antes da recalibração relativa-a-você.
  const personalHighGate = checkin?.recovery_high_threshold ?? 74;

if (prescriptionScore >= personalHighGate && !sleepIsLimiting && !highLoad && hasPhysio) {

    return {
        mode: 'train_high',
        workoutIntensity: 'high',
        headline: 'Hoje é uma boa janela para intensidade',
        subheadline: 'Seu corpo acordou bem e tem margem para um estímulo mais forte com controle.',
        rationale: 'Recovery alto',
        caution: lowLoad ? 'Há margem de carga, mas ainda vale respeitar sua percepção no aquecimento.' : 'Aqueça progressivamente e confirme a resposta do corpo.',
      };
  }

  if (displayedScore >= 55) {
    if (sleepIsLimiting || highLoad) {
      return {
        mode: 'train_moderate',
        workoutIntensity: 'moderate',
        headline: 'Treino moderado com cautela',
        subheadline: 'Seu corpo está funcional, mas o sono ou a carga recente reduzem sua margem de intensidade.',
        rationale: 'Moderado é a melhor dose hoje',
        caution: 'Mantenha o treino sob controle e evite transformar o moderado em forte.',
      };
    }

    return {
      mode: 'train_moderate',
      workoutIntensity: 'moderate',
      headline: 'Treino moderado recomendado',
      subheadline: 'Seu sistema está estável para manter ritmo e consistência hoje.',
      rationale: 'Melhor dose para hoje',
      caution: 'Se o aquecimento não encaixar, reduza um nível.',
    };
  }

  if (displayedScore >= 42) {
    return {
      mode: 'train_light',
      workoutIntensity: 'low',
      headline: 'Hoje vale manter leve',
      subheadline: 'Há espaço para movimento, mas não para insistir em intensidade.',
      rationale: 'Leve para preservar amanhã',
      caution: 'Use o treino como manutenção, não como teste.',
    };
  }

  return {
    mode: 'recover',
    workoutIntensity: 'low',
    headline: 'Recuperação é a melhor decisão',
    subheadline: 'Seu corpo não mostra boa margem para carga útil hoje.',
    rationale: 'Recovery baixo',
    caution: 'Sono, hidratação e redução de estresse geram mais retorno do que forçar treino.',
  };
}

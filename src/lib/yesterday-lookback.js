/**
 * Yesterday Look-back Engine
 * Analisa o treino mais recente (ontem) e retorna ajustes de prescrição e uma nota contextual.
 * Não altera DailyCheckin — opera apenas sobre TrainingSession.
 */

const HIGH_STRAIN_THRESHOLD = 14;
const HIGH_RPE_THRESHOLD = 8;
const LIGHT_STRAIN_THRESHOLD = 8;
const LIGHT_RPE_THRESHOLD = 5;

// Retorna data no formato YYYY-MM-DD para N dias atrás
function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * sports musculares = trabalham grupos musculares com carga
 */
function isStrengthSport(sport) {
  if (!sport) return false;
  const lower = sport.toLowerCase();
  return (
    lower.includes('força') ||
    lower.includes('muscu') ||
    lower.includes('weight') ||
    lower.includes('crossfit') ||
    lower.includes('funcional') ||
    lower.includes('jiu') ||
    lower.includes('luta') ||
    lower.includes('combate')
  );
}

/**
 * Resolve o TrainingSession mais recente de ontem ou antes.
 * allSessions: array de TrainingSession ordenado mais recente primeiro.
 * todayDate: string YYYY-MM-DD
 */
export function resolveYesterdaySession(allSessions, todayDate) {
  if (!allSessions || allSessions.length === 0) return null;
  const today = todayDate || new Date().toISOString().slice(0, 10);
  // Sessões anteriores a hoje, ordenadas por data desc
  const past = allSessions
    .filter(s => s.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));
  return past[0] || null;
}

/**
 * Retorna quantos dias corridos sem treino antes de hoje.
 */
export function daysSinceLastTraining(allSessions, todayDate) {
  const today = todayDate || new Date().toISOString().slice(0, 10);
  const last = resolveYesterdaySession(allSessions, today);
  if (!last) return null;
  const ms = new Date(today) - new Date(last.date);
  return Math.round(ms / 86400000);
}

/**
 * Resultado principal — retorna { note, intensityModifier, recommendKey }
 *
 * intensityModifier:
 *   'reduce'   → reduzir intensidade/strain das opções
 *   'elevate'  → elevar levemente
 *   null       → sem ajuste
 *
 * recommendKey:
 *   'C'  → forçar opção conservadora
 *   'B'  → sugerir intermediária
 *   null → deixar engine decidir
 */
export function applyYesterdayLookback(allSessions, todayDate, todayCheckin) {
  const today = todayDate || new Date().toISOString().slice(0, 10);
  const last = resolveYesterdaySession(allSessions, today);
  const daysSince = daysSinceLastTraining(allSessions, today);

  // ── Caso 1: 2+ dias sem treino ────────────────────────────────────────────
  if (daysSince != null && daysSince >= 2) {
    return {
      note: `${daysSince} dias de descanso — seu corpo está pronto para voltar. Comece em ritmo progressivo.`,
      noteLevel: 'positive',
      intensityModifier: 'elevate',
      recommendKey: null,
      lastSession: null,
      daysSince,
    };
  }

  if (!last) return null;

  const strain = last.strain_score ?? 0;
  const rpe = last.perceived_effort ?? null;
  const sport = last.sport ?? '';
  const isStrength = isStrengthSport(sport);
  const soreness = todayCheckin?.muscle_soreness ?? todayCheckin?.muscle_soreness_level ?? 0;

  // ── Caso 2: RPE alto ontem ────────────────────────────────────────────────
  if (rpe != null && rpe > HIGH_RPE_THRESHOLD) {
    return {
      note: `Seu esforço de ontem foi alto (RPE ${rpe}). Hoje é dia de absorver — intensidade reduzida protege o ganho.`,
      noteLevel: 'caution',
      intensityModifier: 'reduce',
      recommendKey: 'C',
      lastSession: last,
      daysSince,
    };
  }

  // ── Caso 3: Força ontem + soreness hoje ──────────────────────────────────
  if (isStrength && strain >= HIGH_STRAIN_THRESHOLD && soreness >= 3) {
    return {
      note: `Você trabalhou ${sport} ontem (strain ${strain}). Hoje evitamos sobrepor carga muscular — priorize zona aeróbica.`,
      noteLevel: 'caution',
      intensityModifier: 'reduce',
      recommendKey: 'B',
      lastSession: last,
      daysSince,
    };
  }

  // ── Caso 4: Força ontem sem soreness — menor ajuste ──────────────────────
  if (isStrength && strain >= HIGH_STRAIN_THRESHOLD) {
    return {
      note: `Você fez ${sport} ontem (strain ${strain}). Considere treino aeróbico hoje para alternar grupos musculares.`,
      noteLevel: 'info',
      intensityModifier: null,
      recommendKey: 'B',
      lastSession: last,
      daysSince,
    };
  }

  // ── Caso 5: Treino leve ontem → sem ajuste ────────────────────────────────
  if (strain < LIGHT_STRAIN_THRESHOLD && (rpe == null || rpe < LIGHT_RPE_THRESHOLD)) {
    return null; // sem nota, sem ajuste
  }

  // ── Caso 6: strain moderado/alto mas RPE ok ───────────────────────────────
  if (strain >= HIGH_STRAIN_THRESHOLD) {
    return {
      note: `Carga acumulada ontem (strain ${strain}). Monitore a intensidade durante o aquecimento.`,
      noteLevel: 'info',
      intensityModifier: null,
      recommendKey: null,
      lastSession: last,
      daysSince,
    };
  }

  return null;
}
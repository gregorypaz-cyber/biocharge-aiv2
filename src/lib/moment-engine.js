/* ═══ O RECK NOTOU — motor de revelação determinística ════════════════════════
   O app deixa de só EXPLICAR (por que o score é o score) e PRESCREVER (o verbo
   do dia) e passa a PERCEBER: uma observação por dia, dita sem ser perguntada,
   "ei, isto aqui é diferente, e eu reparei em você".

   Princípio (painel WHOOP/APPLE/ART, unânime): cada momento é um FATO
   infalsificável — uma contagem, um rank, um recorde, um limiar cruzado — nunca
   uma interpretação e nunca um número fabricado. Número é prova, data é drama:
   "subiu 4 manhãs seguidas", "mais baixo em 23 dias", "menor FC que já registrei".
   O LLM nunca diria isso porque não conta as manhãs. A engine conta.

   Anti-placebo (CONTEXT §2, BRAND §8 — INVIOLÁVEL): todo detector tem portão de
   dado mínimo; abaixo dele, SILÊNCIO. `detectMoments` pode devolver [] — e []
   é a resposta certa num dia comum. Nunca um card genérico de preenchimento.

   Pureza: função pura de `checkins` (mesma forma do resto do app). A não-
   repetição entre dias é decidida FORA (o card guarda a última assinatura vista),
   pra este módulo continuar testável sem estado. */

const MIN_HISTORY = 8;         // abaixo disto o app está calibrando — silêncio
const RANK_WINDOW_DAYS = 30;   // janela do "mais baixo/alto em N dias"
const RANK_MIN_READINGS = 10;  // leituras mínimas na janela pra afirmar um rank
const RANK_MIN_DEPTH = 12;     // só vira momento se o recorde tiver ≥12 dias de profundidade
const STREAK_MIN_RISES = 3;    // ≥3 altas consecutivas pra nomear a sequência
const RECORD_MIN_HISTORY = 14; // "que já registrei" exige histórico com lastro
const SLEEP_DEBT_LINE = 6;     // horas — o limiar cuja TRAVESSIA vira evento

const day = (s) => Math.round(Date.parse(s) / 86400000); // 'YYYY-MM-DD' → índice de dia (UTC)
const daysBetween = (a, b) => Math.abs(day(b) - day(a));
const num = (v) => (v != null && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
const rhrOf = (c) => num(c?.resting_hr) ?? num(c?.resting_heart_rate);

function sortedDesc(checkins) {
  return [...(checkins || [])]
    .filter((c) => c && c.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

/* Profundidade do recorde: há quantos dias existe uma leitura tão ou mais
   extrema que a de hoje. null = nunca houve no histórico (recorde absoluto). */
function recordDepthDays(desc, getVal, todayVal, mode) {
  for (let i = 1; i < desc.length; i++) {
    const v = getVal(desc[i]);
    if (v == null) continue;
    const asExtreme = mode === 'min' ? v <= todayVal : v >= todayVal;
    if (asExtreme) return daysBetween(desc[i].date, desc[0].date);
  }
  return null; // recorde absoluto no histórico conhecido
}

function countIn(desc, getVal, sinceDayIdx) {
  let n = 0;
  for (const c of desc) {
    if (day(c.date) < sinceDayIdx) break;
    if (getVal(c) != null) n++;
  }
  return n;
}

/* Dívida de sono (soma do déficit vs meta nas últimas 7 noites), floor 0. */
function sleepDebt(desc, target = 7.5) {
  const last7 = desc.slice(0, 7);
  if (!last7.length) return null;
  const total = last7.reduce((s, c) => s + (num(c.sleep_hours) ?? 0), 0);
  return Math.max(0, target * last7.length - total);
}

// ─── Detectores ───────────────────────────────────────────────────────────────
// Cada um: fato + portão → candidato { id, priority, tone, text, evidence, signature } | null.
// priority = raridade×impacto (recorde absoluto > sequência > rank profundo > limiar).

function detectHrvRisingStreak(desc) {
  const pts = desc.filter((c) => num(c.hrv) != null);
  if (pts.length < STREAK_MIN_RISES + 1) return null;
  // conta altas consecutivas entre manhãs de dias adjacentes (newest→older)
  let rises = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const newer = pts[i], older = pts[i + 1];
    if (daysBetween(older.date, newer.date) === 1 && num(newer.hrv) > num(older.hrv)) rises++;
    else break;
  }
  if (rises < STREAK_MIN_RISES) return null;
  return {
    id: 'hrv_rising',
    priority: 88 + rises,
    tone: 'positive',
    text: `Teu HRV subiu ${rises} manhãs seguidas. Tua base está se reconstruindo.`,
    evidence: { label: 'HRV', value: `${Math.round(num(pts[0].hrv))}ms` },
    signature: `hrv_rising:${rises}`,
  };
}

function detectRhrRecord(desc) {
  const today = rhrOf(desc[0]);
  if (today == null) return null;
  const history = desc.filter((c) => rhrOf(c) != null);
  if (history.length < RECORD_MIN_HISTORY) return null;
  const depth = recordDepthDays(desc, rhrOf, today, 'min');
  if (depth !== null) return null; // não é recorde absoluto
  return {
    id: 'rhr_record',
    priority: 100,
    tone: 'positive',
    text: `Menor FC de repouso que já registrei em você: ${Math.round(today)} bpm. Teu coração está trabalhando com folga.`,
    evidence: { label: 'FC repouso', value: `${Math.round(today)} bpm` },
    signature: `rhr_record:${Math.round(today)}`,
  };
}

function detectHrvLow(desc) {
  const today = num(desc[0].hrv);
  if (today == null) return null;
  const since = day(desc[0].date) - RANK_WINDOW_DAYS;
  if (countIn(desc, (c) => num(c.hrv), since) < RANK_MIN_READINGS) return null;
  const depth = recordDepthDays(desc, (c) => num(c.hrv), today, 'min');
  const history = desc.filter((c) => num(c.hrv) != null);
  if (depth === null && history.length >= RECORD_MIN_HISTORY) {
    return {
      id: 'hrv_low', priority: 95, tone: 'caution',
      text: `Teu HRV hoje é o mais baixo que já registrei. Não é o fim do mundo — mas é sinal de segurar.`,
      evidence: { label: 'HRV', value: `${Math.round(today)}ms` },
      signature: `hrv_low:absolute:${Math.round(today)}`,
    };
  }
  if (depth != null && depth >= RANK_MIN_DEPTH) {
    return {
      id: 'hrv_low', priority: 60 + Math.min(depth, 40), tone: 'caution',
      text: `Teu HRV hoje é o mais baixo em ${depth} dias. Não é o fim do mundo — mas é sinal de segurar.`,
      evidence: { label: 'HRV', value: `${Math.round(today)}ms` },
      signature: `hrv_low:${depth}`,
    };
  }
  return null;
}

function detectRecoveryHigh(desc) {
  const today = num(desc[0].recovery_score);
  if (today == null) return null;
  const since = day(desc[0].date) - RANK_WINDOW_DAYS;
  if (countIn(desc, (c) => num(c.recovery_score), since) < RANK_MIN_READINGS) return null;
  const depth = recordDepthDays(desc, (c) => num(c.recovery_score), today, 'max');
  const history = desc.filter((c) => num(c.recovery_score) != null);
  if (depth === null && history.length >= RECORD_MIN_HISTORY) {
    return {
      id: 'recovery_high', priority: 92, tone: 'positive',
      text: `Melhor recovery que já registrei em você: ${Math.round(today)}. Se a vontade pedir, hoje aguenta.`,
      evidence: { label: 'Recovery', value: `${Math.round(today)}` },
      signature: `recovery_high:absolute:${Math.round(today)}`,
    };
  }
  if (depth != null && depth >= RANK_MIN_DEPTH) {
    return {
      id: 'recovery_high', priority: 58 + Math.min(depth, 40), tone: 'positive',
      text: `Melhor recovery em ${depth} dias. Se a vontade pedir, hoje aguenta.`,
      evidence: { label: 'Recovery', value: `${Math.round(today)}` },
      signature: `recovery_high:${depth}`,
    };
  }
  return null;
}

function detectSleepDebtCrossing(desc) {
  if (desc.length < 8) return null;
  const today = sleepDebt(desc);
  const yesterday = sleepDebt(desc.slice(1));
  if (today == null || yesterday == null) return null;
  if (!(today > SLEEP_DEBT_LINE && yesterday <= SLEEP_DEBT_LINE)) return null;
  return {
    id: 'sleep_debt_cross',
    priority: 80,
    tone: 'caution',
    text: `Tua dívida de sono passou de ${SLEEP_DEBT_LINE}h esta semana. Hoje o ganho está em dormir, não em treinar.`,
    evidence: { label: 'Dívida', value: `${Math.round(today * 10) / 10}h` },
    signature: `sleep_debt_cross:${Math.round(today)}`,
  };
}

const DETECTORS = [
  detectRhrRecord,
  detectHrvLow,
  detectRecoveryHigh,
  detectHrvRisingStreak,
  detectSleepDebtCrossing,
];

/**
 * detectMoments(checkins) → array de momentos, rankeado por prioridade (maior
 * primeiro). [] quando nada cruza o portão (silêncio honesto). Puro e determinístico.
 * O consumidor escolhe o 1º cuja assinatura difere da última mostrada (não-repetição).
 */
export function detectMoments(checkins) {
  const desc = sortedDesc(checkins);
  if (desc.length < MIN_HISTORY) return [];
  const out = [];
  for (const d of DETECTORS) {
    try {
      const m = d(desc);
      if (m) out.push(m);
    } catch { /* um detector nunca derruba os outros */ }
  }
  return out.sort((a, b) => b.priority - a.priority);
}

/**
 * pickMoment(checkins, lastSignature) → o momento a mostrar hoje, ou null.
 * Pula a assinatura já mostrada (não repete o mesmo card em dias seguidos);
 * uma sequência que CRESCE (3→4 manhãs) tem assinatura nova e reaparece de propósito.
 */
export function pickMoment(checkins, lastSignature = null) {
  const moments = detectMoments(checkins);
  return moments.find((m) => m.signature !== lastSignature) || null;
}

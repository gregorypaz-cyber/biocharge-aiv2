/**
 * Extracts the 2 most important highlights from an AI analysis text.
 * Priority: alerts (overtraining, high fatigue) > strong patterns (sleep → recovery)
 */
export function getTopHighlights(analysisText) {
  if (!analysisText || typeof analysisText !== 'string') return [];

  // Split into sentences (by newlines and ". ")
  const sentences = analysisText
    .replace(/#+\s*/g, '')       // strip markdown headers
    .replace(/\*\*/g, '')        // strip bold
    .replace(/\*/g, '')          // strip italic
    .split(/\n|(?<=\.)\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 200);

  if (!sentences.length) return [];

  // Scoring: higher = more important
  const scored = sentences.map(s => {
    const lower = s.toLowerCase();
    let score = 0;

    // Alert signals (highest priority)
    if (/overtraining|sobretreino|sobrecarga|overreach/i.test(lower)) score += 30;
    if (/fadiga\s*(elevada|alta|acumulada)/i.test(lower)) score += 25;
    if (/alerta|atenção|cuidado|risco/i.test(lower)) score += 20;
    if (/reduzir|pausar|descanso obrigatório/i.test(lower)) score += 18;

    // Strong patterns (second priority)
    if (/sono.*recup|recup.*sono/i.test(lower)) score += 15;
    if (/hrv.*caiu|caiu.*hrv|hrv\s*abaixo/i.test(lower)) score += 15;
    if (/padrão|correlação|tendência/i.test(lower)) score += 12;
    if (/consistência|melhora|evolução/i.test(lower)) score += 10;

    // Numbers make insights more concrete
    if (/\d+/.test(s)) score += 5;

    // Emojis indicate summary sentences
    if (/[⚠️🔴🚨💡📊🔍]/u.test(s)) score += 8;

    return { text: s, score };
  });

  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(s => s.text);

  return top;
}
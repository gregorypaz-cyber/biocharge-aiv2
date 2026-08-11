/* ═══ BYO-LLM — traga sua própria chave ═══════════════════════════════════════
   Um cliente de LLM externo, com a CHAVE DO USUÁRIO, pra os poucos usos que pedem
   linguagem aberta de verdade (o coach; futuramente nota→ação) SEM queimar crédito
   de integração do Base44. Genérico e compatível com a API OpenAI /chat/completions
   — então serve OpenAI, OpenRouter, Groq, Together, um servidor local, etc.: é só
   trocar baseUrl + model.

   CERCA (painel WHOOP/APPLE/ART, INVIOLÁVEL): este cliente só dá VOZ a fatos que a
   camada determinística já afirmou. NUNCA é ligado a um caminho que emite número,
   confiança ou causa fisiológica — isso continua 100% determinístico. Aqui mora só
   a conversa.

   Privacidade: a chave vive SÓ no aparelho (localStorage), nunca vai pro backend do
   Base44; a chamada sai direto do navegador do usuário pro provedor dele. */

const STORAGE_KEY = 'reck-byo-llm';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';
const TIMEOUT_MS = 30000;

export function getByoConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      baseUrl: (raw.baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, ''),
      apiKey: raw.apiKey || '',
      model: (raw.model || DEFAULT_MODEL).trim(),
      enabled: raw.enabled !== false, // default ligado quando há chave
    };
  } catch {
    return { baseUrl: DEFAULT_BASE_URL, apiKey: '', model: DEFAULT_MODEL, enabled: true };
  }
}

export function setByoConfig(cfg) {
  const next = {
    baseUrl: (cfg.baseUrl || DEFAULT_BASE_URL).trim(),
    apiKey: (cfg.apiKey || '').trim(),
    model: (cfg.model || DEFAULT_MODEL).trim(),
    enabled: cfg.enabled !== false,
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

export function clearByoConfig() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/** Há provedor próprio utilizável? (chave presente e não desligado). */
export function isByoConfigured() {
  const c = getByoConfig();
  return !!c.apiKey && c.enabled;
}

export const BYO_DEFAULTS = { baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL };

/* Monta a requisição compatível-OpenAI. Pura e exportada pra ser testável sem rede. */
export function buildChatRequest(prompt, cfg = getByoConfig(), { maxTokens = 700, temperature = 0.4 } = {}) {
  return {
    url: `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: {
      model: cfg.model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    },
  };
}

/** Extrai o texto da resposta compatível-OpenAI (pura, testável). */
export function parseChatResponse(data) {
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === 'string' ? text.trim() : null;
}

/**
 * Chama o LLM do usuário. Lança em erro (o chamador decide o fallback).
 * Só use em tarefas de LINGUAGEM (coach/notas) — nunca pra gerar número.
 */
export async function callByo(prompt, opts = {}) {
  const cfg = getByoConfig();
  if (!cfg.apiKey) throw new Error('BYO-LLM sem chave configurada');

  const { url, headers, body } = buildChatRequest(prompt, cfg, opts);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Provedor respondeu ${res.status}${detail ? `: ${detail.slice(0, 140)}` : ''}`);
    }
    const data = await res.json();
    const text = parseChatResponse(data);
    if (!text) throw new Error('Resposta vazia do provedor');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** Ping curto pra a UI de "Testar conexão". Retorna { ok, message }. */
export async function testByo() {
  try {
    const reply = await callByo('Responda apenas com a palavra: ok', { maxTokens: 5, temperature: 0 });
    return { ok: true, message: `Conectado — respondeu "${reply.slice(0, 40)}".` };
  } catch (e) {
    return { ok: false, message: e?.message || 'Falha ao conectar.' };
  }
}

/**
 * Caminho ÚNICO de chamada de LLM do app.
 * Usa o provedor do usuário (BYO) quando configurado; senão executa o fallback
 * injetado (tipicamente a integração do Base44, que gasta crédito).
 * O fallback é injetado para este módulo continuar puro e testável sem rede.
 * Não faz fallback automático em ERRO do BYO: se a chave do usuário falhar, o
 * erro sobe — gastar crédito silenciosamente seria o oposto da intenção.
 */
export async function askLLM(prompt, fallback, opts = {}) {
  if (isByoConfigured()) return callByo(prompt, opts);
  if (typeof fallback !== 'function') throw new Error('askLLM sem fallback');
  return fallback(prompt);
}

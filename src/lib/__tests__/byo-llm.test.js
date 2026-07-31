import { describe, it, expect, beforeEach } from 'vitest';
import {
  getByoConfig, setByoConfig, clearByoConfig, isByoConfigured,
  buildChatRequest, parseChatResponse, BYO_DEFAULTS,
} from '@/lib/byo-llm.js';

// stub de localStorage (o motor roda no navegador do usuário; aqui simulamos)
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

describe('byo-llm — configuração', () => {
  it('defaults sensatos quando vazio', () => {
    const c = getByoConfig();
    expect(c.baseUrl).toBe(BYO_DEFAULTS.baseUrl);
    expect(c.model).toBe(BYO_DEFAULTS.model);
    expect(c.apiKey).toBe('');
    expect(isByoConfigured()).toBe(false);
  });

  it('round-trip salvar/ler, normalizando a baseUrl (sem barra final)', () => {
    setByoConfig({ baseUrl: 'https://openrouter.ai/api/v1/', apiKey: 'sk-x', model: 'llama-3.1' });
    const c = getByoConfig();
    expect(c.baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(c.apiKey).toBe('sk-x');
    expect(c.model).toBe('llama-3.1');
    expect(isByoConfigured()).toBe(true);
  });

  it('desligado não conta como configurado, mesmo com chave', () => {
    setByoConfig({ apiKey: 'sk-x', enabled: false });
    expect(isByoConfigured()).toBe(false);
  });

  it('clear remove tudo', () => {
    setByoConfig({ apiKey: 'sk-x' });
    clearByoConfig();
    expect(isByoConfigured()).toBe(false);
  });
});

describe('byo-llm — requisição compatível-OpenAI', () => {
  it('monta url, auth e corpo corretos', () => {
    const cfg = { baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-abc', model: 'gpt-4o-mini' };
    const req = buildChatRequest('oi', cfg, { maxTokens: 42, temperature: 0.1 });
    expect(req.url).toBe('https://api.openai.com/v1/chat/completions');
    expect(req.headers.Authorization).toBe('Bearer sk-abc');
    expect(req.body.model).toBe('gpt-4o-mini');
    expect(req.body.max_tokens).toBe(42);
    expect(req.body.messages).toEqual([{ role: 'user', content: 'oi' }]);
  });

  it('parseia a resposta e devolve null quando não há texto', () => {
    expect(parseChatResponse({ choices: [{ message: { content: '  ok  ' } }] })).toBe('ok');
    expect(parseChatResponse({ choices: [] })).toBeNull();
    expect(parseChatResponse({})).toBeNull();
  });
});

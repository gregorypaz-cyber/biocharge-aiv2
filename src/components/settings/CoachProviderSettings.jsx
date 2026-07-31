import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { getByoConfig, setByoConfig, clearByoConfig, testByo, BYO_DEFAULTS } from '@/lib/byo-llm';

/* Seção opcional: liga um LLM externo com a CHAVE DO USUÁRIO pro coach, sem gastar
   crédito de integração do Base44. Compatível-OpenAI (OpenAI, OpenRouter, Groq…).
   A chave fica só no aparelho. Cercado a linguagem — nunca gera número. */
export default function CoachProviderSettings() {
  const [cfg, setCfg] = useState(() => getByoConfig());
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const update = (patch) => { setCfg((c) => ({ ...c, ...patch })); setSaved(false); setTestResult(null); };

  const save = () => { setByoConfig(cfg); setCfg(getByoConfig()); setSaved(true); };
  const remove = () => {
    clearByoConfig();
    setCfg(getByoConfig());
    setSaved(false);
    setTestResult(null);
  };
  const runTest = async () => {
    setByoConfig(cfg); // testa o que está na tela
    setTesting(true);
    setTestResult(null);
    setTestResult(await testByo());
    setTesting(false);
  };

  const inputCls = 'w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 transition-colors';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
      className="rounded-2xl border border-border bg-card p-5 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">Coach com IA própria</span>
        <span className="t-micro font-bold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground ml-auto">opcional</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Use sua própria chave de um provedor compatível com a API da OpenAI (OpenAI, OpenRouter, Groq…)
        para conversar com o coach sem gastar créditos de integração. A chave fica só neste aparelho e é
        usada apenas para a conversa — nunca para calcular seus números.
      </p>

      <div className="space-y-2.5">
        <div>
          <label className="t-micro uppercase tracking-wider text-muted-foreground">Base URL</label>
          <input
            className={inputCls}
            value={cfg.baseUrl}
            onChange={(e) => update({ baseUrl: e.target.value })}
            placeholder={BYO_DEFAULTS.baseUrl}
            spellCheck={false}
          />
        </div>

        <div>
          <label className="t-micro uppercase tracking-wider text-muted-foreground">Chave de API</label>
          <div className="relative">
            <input
              className={inputCls + ' pr-10'}
              type={showKey ? 'text' : 'password'}
              value={cfg.apiKey}
              onChange={(e) => update({ apiKey: e.target.value })}
              placeholder="sk-…"
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              aria-label={showKey ? 'Ocultar chave' : 'Mostrar chave'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="t-micro uppercase tracking-wider text-muted-foreground">Modelo</label>
          <input
            className={inputCls}
            value={cfg.model}
            onChange={(e) => update({ model: e.target.value })}
            placeholder={BYO_DEFAULTS.model}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={save}
          className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          {saved ? 'Salvo' : 'Salvar'}
        </button>
        <button
          onClick={runTest}
          disabled={testing || !cfg.apiKey}
          className="h-9 px-3 rounded-lg bg-secondary text-foreground font-semibold text-sm hover:bg-secondary/70 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Testar
        </button>
        {cfg.apiKey ? (
          <button
            onClick={remove}
            className="h-9 px-3 rounded-lg text-muted-foreground hover:text-red-400 font-medium text-sm transition-colors"
          >
            Remover
          </button>
        ) : null}
      </div>

      {testResult ? (
        <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${testResult.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
          {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-px" /> : <XCircle className="w-4 h-4 shrink-0 mt-px" />}
          <span className="leading-relaxed">{testResult.message}</span>
        </div>
      ) : null}

      <p className="t-micro text-muted-foreground/70 leading-relaxed">
        Sem chave, o coach segue usando a integração padrão do app. Isto muda só o coach — recovery,
        zonas e insights continuam determinísticos e locais.
      </p>
    </motion.div>
  );
}

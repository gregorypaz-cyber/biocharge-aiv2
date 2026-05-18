import { motion } from 'framer-motion';
import { Sparkles, AlertTriangle, ChevronRight } from 'lucide-react';
import { getNextSteps } from '@/utils/analysisHelpers';

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanSentences(text) {
  return text
    .replace(/#+\s*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .split(/\n|(?<=\.)\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 220);
}

function makeTitle(sentence) {
  // Grab first meaningful noun phrase (up to ~5 words)
  const cleaned = sentence.replace(/^[-–•]\s*/, '');
  const words = cleaned.split(' ');
  return words.slice(0, 5).join(' ').replace(/[,:;]$/, '') + (words.length > 5 ? '…' : '');
}

function extractAlerts(sentences) {
  return sentences
    .map(s => {
      const l = s.toLowerCase();
      let score = 0;
      if (/overtraining|sobretreino|sobrecarga|overreach/i.test(l)) score += 30;
      if (/fadiga\s*(elevada|alta|acumulada)/i.test(l)) score += 25;
      if (/alerta|atenção|cuidado/i.test(l)) score += 22;
      if (/risco/i.test(l)) score += 20;
      if (/reduzir|pausar|descanso obrigatório/i.test(l)) score += 18;
      if (/déficit|débito/i.test(l)) score += 15;
      if (/[⚠️🔴🚨]/u.test(s)) score += 10;
      if (/\d+/.test(s)) score += 4;
      return { text: s, score };
    })
    .filter(s => s.score >= 15)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(s => s.text);
}

function extractPatterns(sentences, alertTexts) {
  const alertSet = new Set(alertTexts);
  return sentences
    .filter(s => !alertSet.has(s))
    .map(s => {
      const l = s.toLowerCase();
      let score = 0;
      if (/padrão|correlação|tendência|coincidi/i.test(l)) score += 20;
      if (/tendem|tende a/i.test(l)) score += 18;
      if (/sono.*recup|recup.*sono/i.test(l)) score += 16;
      if (/hrv.*caiu|caiu.*hrv|hrv\s*abaixo/i.test(l)) score += 15;
      if (/consistência|melhora|evolução/i.test(l)) score += 10;
      if (/💡📊🔍/u.test(s)) score += 8;
      if (/\d+/.test(s)) score += 4;
      return { text: s, score };
    })
    .filter(s => s.score >= 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.text);
}

// ── Sub-section ───────────────────────────────────────────────────────────────

function Section({ icon: Icon, label, color, items, dotColor }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
        <p className={`text-[10px] font-bold uppercase tracking-widest ${color}`}>{label}</p>
      </div>
      <ul className="space-y-2">
        {items.map((text, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
            <div>
              <p className="text-[10px] font-bold text-foreground/60 uppercase tracking-wide leading-none mb-0.5">
                {makeTitle(text)}
              </p>
              <p className="text-xs text-foreground/85 leading-snug">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AnalysisHighlights({ analysisText }) {
  if (!analysisText || typeof analysisText !== 'string') return null;

  const sentences = cleanSentences(analysisText);
  const alerts = extractAlerts(sentences);
  const patterns = extractPatterns(sentences, alerts);
  const steps = getNextSteps(analysisText);

  if (!alerts.length && !patterns.length && !steps.length) return null;

  const hasDivider = (a, b) => a.length > 0 && b.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-secondary/40 px-4 py-4 space-y-4 mb-4"
    >
      <Section
        icon={AlertTriangle}
        label="Alertas"
        color="text-red-400"
        dotColor="bg-red-400/70"
        items={alerts}
      />
      {hasDivider(alerts, patterns) && <div className="h-px bg-border/40" />}
      <Section
        icon={Sparkles}
        label="Padrões detectados"
        color="text-primary"
        dotColor="bg-primary/60"
        items={patterns}
      />
      {(alerts.length > 0 || patterns.length > 0) && steps.length > 0 && (
        <div className="h-px bg-border/40" />
      )}
      {steps.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-yellow-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">Próximos passos</p>
          </div>
          <ul className="space-y-1.5">
            {steps.map((text, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground/85 leading-snug">
                <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0 bg-yellow-400/60" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
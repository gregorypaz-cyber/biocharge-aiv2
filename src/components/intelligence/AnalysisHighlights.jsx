import { motion } from 'framer-motion';import { motion } from || '')
    .replace(/#+\s*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim();
}

function splitSentences(text) {
  return normalizeText(text)
    .split(/\n|(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 240);
}

function pickAlerts(sentences) {
  return sentences
    .map((s) => {
      const l = s.toLowerCase();
      let score = 0;

      if (/alerta|atenção|risco|sobrecarga|overreach|fadiga|déficit/i.test(l)) score += 25;
      if (/reduzir|evitar|proteger|pausar|descanso/i.test(l)) score += 18;
      if (/sono.*curto|sono.*ruim|stress alto|hrv.*baixo/i.test(l)) score += 12;
      if (/\d+/.test(s)) score += 4;

      return { text: s, score };
    })
    .filter((x) => x.score >= 18)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((x) => x.text);
}

function pickPatterns(sentences, used) {
  const usedSet = new Set(used);

  return sentences
    .filter((s) => !usedSet.has(s))
    .map((s) => {
      const l = s.toLowerCase();
      let score = 0;

      if (/padrão|tendência|responde|associad|correlação/i.test(l)) score += 20;
      if (/melhorando|piorando|acima|abaixo|média/i.test(l)) score += 12;
      if (/sono|hrv|recovery|carga|stress/i.test(l)) score += 10;
      if (/\d+/.test(s)) score += 4;

      return { text: s, score };
    })
    .filter((x) => x.score >= 14)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.text);
}

function pickActions(sentences, used) {
  const usedSet = new Set(used);

  return sentences
    .filter((s) => !usedSet.has(s))
    .map((s) => {
      const l = s.toLowerCase();
      let score = 0;

      if (/priorize|tente|observe|reduza|mantenha|ajuste|durma|hidrate/i.test(l)) score += 20;
      if (/próximos 7 dias|esta semana|hoje à noite/i.test(l)) score += 10;

      return { text: s, score };
    })
    .filter((x) => x.score >= 16)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.text);
}

function shortTitle(sentence) {
  const cleaned = sentence.replace(/^[-–•]\s*/, '');
  const words = cleaned.split(' ');
  return words.slice(0, 5).join(' ').replace(/[,:;]$/, '') + (words.length > 5 ? '…' : '');
}

function Section({ icon: Icon, label, color, dotColor, items }) {
  if (!items.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
        <p className={`text-[10px] font-bold uppercase tracking-widest ${color}`}>
          {label}
        </p>
      </div>

      <ul className="space-y-2">
        {items.map((text, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
            <div>
              <p className="text-[10px] font-bold text-foreground/60 uppercase tracking-wide leading-none mb-0.5">
                {shortTitle(text)}
              </p>
              <p className="text-xs text-foreground/85 leading-snug">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AnalysisHighlights({ analysisText }) {
  if (!analysisText || typeof analysisText !== 'string') return null;

  const sentences = splitSentences(analysisText);
  if (!sentences.length) return null;

  const alerts = pickAlerts(sentences);
  const patterns = pickPatterns(sentences, alerts);
  const actions = pickActions(sentences, [...alerts, ...patterns]);

  if (!alerts.length && !patterns.length && !actions.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-secondary/40 px-4 py-4 space-y-4 mb-4"
    >
      <Section
        icon={AlertTriangle}
        label="Sinais de atenção"
        color="text-red-400"
        dotColor="bg-red-400/70"
        items={alerts}
      />

      {alerts.length > 0 && patterns.length > 0 && <div className="h-px bg-border/40" />}

      <Section
        icon={Sparkles}
        label="O que vale observar"
        color="text-primary"
        dotColor="bg-primary/60"
        items={patterns}
      />

      {(alerts.length > 0 || patterns.length > 0) && actions.length > 0 && (
        <div className="h-px bg-border/40" />
      )}

      {actions.length > 0 && (
        <Section
          icon={ChevronRight}
          label="Ajustes práticos"
          color="text-yellow-400"
          dotColor="bg-yellow-400/60"
          items={actions}
        />
      )}
    </motion.div>
  );
}
import { Sparkles, AlertTriangle, ChevronRight } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers */
/* ────────────────────────────────────────────────────────────────────────── */

function normalizeText(text) {

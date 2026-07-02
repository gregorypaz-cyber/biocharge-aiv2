import { motion } from 'framer-motion';
import { Sparkles, AlertTriangle, ChevronRight, Target } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers */
/* ────────────────────────────────────────────────────────────────────────── */

function normalizeText(text) {
  return String(text || '')
    .replace(/#+\s*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .trim();
}

function splitSentences(text) {
  return normalizeText(text)
    .split(/\n|(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 18 && s.length < 260)
    // descarta linhas que são cabeçalhos (curtas, sem pontuação final),
    // para não virarem "leitura principal" / item de destaque
    .filter((s) => /[.!?]$/.test(s) || (s.match(/\s/g) || []).length > 6);
}

function scoreMainReading(sentence) {
  const l = sentence.toLowerCase();
  let score = 0;

  if (/principal|mais importante|padrão|tendência|agora|momento/i.test(l)) score += 18;
  if (/sono|recovery|recuperação|hrv|carga|fadiga|stress|strain/i.test(l)) score += 14;
  if (/limitando|segurando|melhorando|piorando|associado|responde/i.test(l)) score += 12;
  if (/\d+/.test(sentence)) score += 4;

  return score;
}

function scoreAlert(sentence) {
  const l = sentence.toLowerCase();
  let score = 0;

  if (/atenção|alerta|risco|sobrecarga|overreach|fadiga|déficit|dívida/i.test(l)) score += 22;
  if (/reduzir|evitar|proteger|pausar|descanso|controle|cautela/i.test(l)) score += 16;
  if (/sono.*curto|sono.*ruim|stress alto|hrv.*baixo|carga.*alta/i.test(l)) score += 12;
  if (/\d+/.test(sentence)) score += 4;

  return score;
}

function scoreAction(sentence) {
  const l = sentence.toLowerCase();
  let score = 0;

  if (/priorize|tente|observe|reduza|mantenha|ajuste|durma|hidrate|faça|evite/i.test(l)) score += 22;
  if (/próximos 3 dias|próximos 7 dias|esta semana|hoje à noite|amanhã/i.test(l)) score += 12;
  if (/sono|treino|carga|recuperação|stress|hidratação/i.test(l)) score += 8;

  return score;
}

function pickBest(sentences, scorer, limit, usedTexts = []) {
  const used = new Set(usedTexts);

  return sentences
    .filter((s) => !used.has(s))
    .map((s) => ({ text: s, score: scorer(s) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.text);
}

function shortTitle(sentence) {
  const cleaned = sentence.replace(/^[-–•]\s*/, '').trim();
  const words = cleaned.split(/\s+/);
  return words.slice(0, 6).join(' ').replace(/[,:;]$/, '') + (words.length > 6 ? '…' : '');
}

function HighlightBlock({ icon: Icon, label, color, bg, border, items, maxItems = 2 }) {
  if (!items?.length) return null;

  return (
    <div className={`rounded-xl border px-3 py-3 space-y-2 ${bg} ${border}`}>
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
        <p className={`text-micro st ${color}`}>
          {label}
        </p>
      </div>

      <ul className="space-y-2">
        {items.slice(0, maxItems).map((text, i) => (
          <li key={i}>
            <p className="text-xs text-foreground/85 leading-snug">
              {text}
            </p>
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

  const mainReading = pickBest(sentences, scoreMainReading, 1);
  const alerts = pickBest(sentences, scoreAlert, 2, mainReading);
  const actions = pickBest(sentences, scoreAction, 2, [...mainReading, ...alerts]);

  if (!mainReading.length && !alerts.length && !actions.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-secondary/30 px-4 py-4 space-y-3 mb-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-micro font-black uppercase tracking-widest text-primary">
            Resumo da análise
          </p>
          <p className="text-support text-muted-foreground mt-0.5">
            O que mais importa antes de abrir o relatório completo.
          </p>
        </div>

        <Sparkles className="w-4 h-4 text-primary shrink-0" />
      </div>

      <HighlightBlock
        icon={Target}
        label="Leitura principal"
        color="text-primary"
        bg="bg-primary/5"
        border="border-primary/15"
        items={mainReading}
        maxItems={1}
      />

      <HighlightBlock
        icon={AlertTriangle}
        label="Pede atenção"
        color="text-zone-yellow"
        bg="bg-zone-yellow/5"
        border="border-zone-yellow/15"
        items={alerts}
        maxItems={2}
      />

      <HighlightBlock
        icon={ChevronRight}
        label="Próxima ação"
        color="text-zone-green"
        bg="bg-zone-green/5"
        border="border-zone-green/15"
        items={actions}
        maxItems={2}
      />
    </motion.div>
  );
}
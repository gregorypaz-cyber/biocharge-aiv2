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

/* O prompt da análise pede 5 cabeçalhos markdown fixos. Ler a estrutura é
   determinístico; pontuar frases por palavra-chave não é — e promovia linha de
   dado bruto a "Pede atenção". Se os cabeçalhos não vierem, este componente não
   renderiza: silêncio > destaque fabricado. */
function parseSections(text) {
  const out = {};
  let current = null;
  for (const line of String(text || '').split('\n')) {
    const h = line.match(/^\s*#{1,4}\s*(.+?)\s*$/);
    if (h) {
      current = normalizeText(h[1]).toLowerCase();
      out[current] = [];
    } else if (current && line.trim()) {
      out[current].push(line.trim());
    }
  }
  return out;
}

function sectionLines(sections, ...aliases) {
  for (const a of aliases) {
    const key = Object.keys(sections).find((k) => k.startsWith(a));
    if (key && sections[key].length) return sections[key];
  }
  return [];
}

/* Limpa marcação e bullet; devolve null se não sobrar frase útil. */
function cleanLine(line) {
  const t = normalizeText(line).replace(/^[-–•]\s*/, '').trim();
  return t.length > 18 ? t : null;
}

function HighlightBlock({ icon: Icon, label, color, bg, border, items, maxItems = 2 }) {
  if (!items?.length) return null;

  return (
    <div className={`rounded-xl border px-3 py-3 space-y-2 ${bg} ${border}`}>
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
        <p className={`t-micro font-bold uppercase tracking-widest ${color}`}>
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

  const sections = parseSections(analysisText);

  const mainReading = sectionLines(sections, 'leitura principal')
    .map(cleanLine).filter(Boolean).slice(0, 1);
  const alerts = sectionLines(sections, 'o que está limitando', 'o que esta limitando')
    .map(cleanLine).filter(Boolean).slice(0, 2);
  const actions = sectionLines(sections, 'ajuste para os próximos', 'ajuste para os proximos')
    .map(cleanLine).filter(Boolean).slice(0, 2);

  // Sem estrutura reconhecível não inventa destaque. O texto completo continua
  // sendo renderizado normalmente pela tela que consome este componente.
  if (!mainReading.length && !alerts.length && !actions.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-secondary/30 px-4 py-4 space-y-3 mb-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="t-micro font-semibold uppercase tracking-widest text-primary">
            Resumo da análise
          </p>
          <p className="t-micro text-muted-foreground mt-0.5">
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
        color="text-yellow-400"
        bg="bg-yellow-500/5"
        border="border-yellow-500/15"
        items={alerts}
        maxItems={2}
      />

      <HighlightBlock
        icon={ChevronRight}
        label="Próxima ação"
        color="text-emerald-400"
        bg="bg-emerald-500/5"
        border="border-emerald-500/15"
        items={actions}
        maxItems={2}
      />
    </motion.div>
  );
}
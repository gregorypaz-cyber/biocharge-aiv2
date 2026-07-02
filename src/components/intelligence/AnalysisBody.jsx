const PREVIEW_SECTIONS = 2;

function clean(text) {
  return String(text || '')
    .replace(/#+\s*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .trim();
}

// Quebra o texto da IA em seções { title, items[] } usando as linhas de
// cabeçalho (curtas, sem pontuação final, poucas palavras) como divisores.
function parseSections(text) {
  const lines = clean(text).split('\n').map((l) => l.trim()).filter(Boolean);
  const sections = [];
  let current = null;
  const isHeader = (l) =>
    l.length <= 46 &&
    !/[.!?:,]$/.test(l) &&
    !/^[-–•]/.test(l) &&
    /[a-zA-ZÀ-ÿ]/.test(l) &&
    (l.match(/\s/g) || []).length <= 6;
  for (const l of lines) {
    if (isHeader(l)) {
      current = { title: l, items: [] };
      sections.push(current);
    } else {
      if (!current) {
        current = { title: null, items: [] };
        sections.push(current);
      }
      current.items.push(l.replace(/^[-–•]\s*/, ''));
    }
  }
  return sections;
}

function Section({ title, items }) {
  return (
    <div className="space-y-1.5">
      {title && (
        <p className="text-micro st text-primary/80">
          {title}
        </p>
      )}
      <div className="space-y-1.5">
        {items.map((t, i) => (
          <p key={i} className="text-sm text-foreground/80 leading-relaxed">
            {t}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function AnalysisBody({ text, expanded, onExpand }) {
  if (!text) return null;

  const sections = parseSections(text);
  if (!sections.length) return null;

  const visible = expanded ? sections : sections.slice(0, PREVIEW_SECTIONS);
  const hasMore = sections.length > PREVIEW_SECTIONS;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/40 bg-secondary/20 px-4 py-4 space-y-4">
        {visible.map((s, i) => (
          <Section key={i} title={s.title} items={s.items} />
        ))}
      </div>

      {!expanded && hasMore && (
        <button
          onClick={onExpand}
          className="w-full text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-2.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10"
        >
          Abrir leitura completa
        </button>
      )}
    </div>
  );
}
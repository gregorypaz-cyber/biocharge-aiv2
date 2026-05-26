import ReactMarkdown from 'react-markdown';

const PREVIEW_CHARS = 420;

function stripMarkdown(text) {
  return String(text || '')
    .replace(/#+\s*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .trim();
}

export default function AnalysisBody({ text, expanded, onExpand }) {
  if (!text) return null;

  const clean = stripMarkdown(text);
  const isLong = clean.length > PREVIEW_CHARS;
  const previewText = isLong ? clean.slice(0, PREVIEW_CHARS).trim() + '…' : clean;

  return (
    <div className="space-y-3">
      {!expanded ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-border/40 bg-secondary/20 px-4 py-4">
            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
              {previewText}
            </p>
          </div>

          {isLong && (
            <button
              onClick={onExpand}
              className="w-full text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-2 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10"
            >
              Ver análise completa ↓
            </button>
          )}
        </div>
      ) : (
        <div className="prose prose-invert prose-sm max-w-none [&_strong]:text-foreground [&_p]:text-foreground/85">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
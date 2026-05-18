import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

const PREVIEW_CHARS = 400;

export default function AnalysisBody({ text, expanded, onExpand }) {
  if (!text) return null;

  const isLong = text.length > PREVIEW_CHARS;
  const preview = isLong && !expanded ? text.slice(0, PREVIEW_CHARS) : text;

  return (
    <div>
      <div className="prose prose-invert prose-sm max-w-none [&_strong]:text-foreground [&_p]:text-foreground/85">
        <ReactMarkdown>{preview}</ReactMarkdown>
      </div>

      {isLong && !expanded && (
        <div className="relative mt-[-32px]">
          {/* fade overlay */}
          <div className="h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
          <button
            onClick={onExpand}
            className="mt-1 w-full text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-2 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10"
          >
            Ver análise completa ↓
          </button>
        </div>
      )}
    </div>
  );
}
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { buildMomentTimeline } from '@/lib/moment-engine';
import { getTodayLocal } from '@/lib/date-utils';

/* ═══ O QUE O RECK NOTOU — o acervo ═══════════════════════════════════════════
   A Today é o palco (uma percepção por dia); aqui é o arquivo consultável: o
   diário do que o app notou ao longo do tempo, determinístico e datado. Reusa o
   moment-engine (buildMomentTimeline reproduz os detectores como-se-fosse cada
   dia e colapsa repetições). Sem histórico suficiente → não renderiza (§8). */

const TONE = { positive: 'hsl(142 70% 50%)', caution: 'hsl(45 93% 58%)' };
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function fmtDate(dateStr, today) {
  const d = Math.round(Date.parse(dateStr) / 86400000);
  const t = Math.round(Date.parse(today) / 86400000);
  if (d === t) return 'Hoje';
  if (d === t - 1) return 'Ontem';
  const dt = new Date(`${dateStr}T12:00:00`);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
}

export default function MomentTimeline({ checkins }) {
  const today = getTodayLocal();
  const items = buildMomentTimeline(checkins, { maxDays: 90, limit: 30 });
  if (!items.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card p-4"
    >
      <div className="flex items-center gap-1.5 mb-3.5">
        <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-sm font-semibold tracking-tight">
          O que o Reck notou
        </span>
      </div>

      <ul className="space-y-3.5">
        {items.map((m, i) => {
          const color = TONE[m.tone] || TONE.positive;
          return (
            <li key={`${m.date}-${m.signature}`} className="relative flex gap-3">
              {/* trilho: ponto + linha conectando ao próximo */}
              <div className="relative flex flex-col items-center" style={{ width: 8 }}>
                <span
                  className="rounded-full shrink-0"
                  style={{ width: 8, height: 8, marginTop: 4, background: color, boxShadow: `0 0 6px ${color}` }}
                />
                {i < items.length - 1 && (
                  <span className="flex-1" style={{ width: 1, marginTop: 4, background: 'hsl(220 15% 20%)' }} />
                )}
              </div>

              <div className="flex-1 pb-0.5">
                <p className="t-micro font-mono text-muted-foreground/70 num">{fmtDate(m.date, today)}</p>
                <p className="text-sm leading-snug text-foreground/90 mt-0.5">{m.text}</p>
                {m.evidence && (
                  <span className="inline-block mt-1.5 t-micro font-mono num text-muted-foreground/80 bg-secondary/50 border border-border/40 rounded-full px-2 py-0.5">
                    {m.evidence.label} {m.evidence.value}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const CONFIDENCE_STYLE = {
  Alta: 'bg-emerald-500/15 text-emerald-400',
  Média: 'bg-yellow-500/15 text-yellow-400',
  Baixa: 'bg-zinc-500/15 text-zinc-400',
};

function confidenceOrder(conf) {
  if (conf === 'Alta') return 3;
  if (conf === 'Média') return 2;
  return 1;
}

function normalizeDiscoveries(discoveries = []) {
  return [...discoveries]
    .filter(Boolean)
    .filter((d) => d.confidence !== 'Baixa') // defesa interna: não mostrar insight fraco
    .sort((a, b) => confidenceOrder(b.confidence) - confidenceOrder(a.confidence))
    .slice(0, 6);
}

function getEmptyMessage(rawCount) {
  if (!rawCount || rawCount === 0) {
    return 'Ainda não há evidência suficiente para descobertas relevantes. Continue registrando seus check-ins e treinos.';
  }

  return 'Seus dados até geraram sinais, mas ainda não fortes o suficiente para virar insight confiável.';
}

export default function DiscoveriesCard({ discoveries = [] }) {
  const visibleDiscoveries = normalizeDiscoveries(discoveries);

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40">
        <h2 className="text-sm font-semibold">🔭 O Reck descobriu</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Padrões dos seus próprios dados que merecem atenção.
        </p>
      </div>

      <div className="p-5">
        {visibleDiscoveries.length === 0 ? (
          <div className="rounded-xl border border-border/40 bg-secondary/30 px-4 py-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {getEmptyMessage(discoveries.length)}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleDiscoveries.map((d, i) => (
              <motion.div
                key={`${d.title}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={cn(
                  'rounded-2xl border p-4 space-y-2',
                  d.sentiment === 'positive'
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : d.sentiment === 'negative'
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-secondary/30 border-border/40'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-xl shrink-0 leading-none mt-0.5">{d.icon}</span>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">{d.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {d.text}
                      </p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                      CONFIDENCE_STYLE[d.confidence] || CONFIDENCE_STYLE.Baixa
                    )}
                  >
                    {d.confidence}
                  </span>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Baseado em {d.days} {d.days === 1 ? 'registro útil' : 'registros úteis'}.
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
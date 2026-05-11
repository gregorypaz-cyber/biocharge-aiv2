import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const CONFIDENCE_STYLE = {
  Alta: 'bg-emerald-500/15 text-emerald-400',
  Média: 'bg-yellow-500/15 text-yellow-400',
  Baixa: 'bg-muted text-muted-foreground',
};

export default function DiscoveriesCard({ discoveries = [] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40">
        <h2 className="text-sm font-semibold">🔭 O BioCharge Descobriu</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Padrões identificados nos seus dados pessoais</p>
      </div>

      <div className="p-5">
        {discoveries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Acumulando dados... Descobertas aparecem após 14 dias de check-ins.
          </p>
        ) : (
          <div className="space-y-3">
            {discoveries.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-xl border',
                  d.sentiment === 'positive'
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : d.sentiment === 'negative'
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-secondary border-border/40'
                )}
              >
                <span className="text-2xl shrink-0 leading-none mt-0.5">{d.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-sm font-bold leading-tight">{d.title}</p>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', CONFIDENCE_STYLE[d.confidence] || CONFIDENCE_STYLE.Baixa)}>
                      {d.confidence} · {d.days} dias
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{d.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
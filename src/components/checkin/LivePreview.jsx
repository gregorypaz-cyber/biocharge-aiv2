import { motion } from 'framer-motion';
import { getZoneColor, getZoneLabel } from '@/lib/biocharge-utils';
import { cn } from '@/lib/utils';

function ZoneBar({ value, color }) {
  return (
    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value || 0, 100)}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}

function getDecisionLabel(mode) {
  if (mode === 'train_high') return 'Treino mais forte';
  if (mode === 'train_moderate') return 'Treino moderado';
  if (mode === 'train_light') return 'Treino leve';
  if (mode === 'recover') return 'Recuperação';
  return 'Em análise';
}

function getDecisionTone(mode) {
  if (mode === 'train_high') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (mode === 'train_moderate') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
  if (mode === 'train_light') return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
  if (mode === 'recover') return 'text-red-400 bg-red-500/10 border-red-500/20';
  return 'text-muted-foreground bg-secondary border-border/40';
}

export default function LivePreview({ preview }) {
  if (!preview) return null;

  const score = preview.readiness_score ?? preview.recovery_score ?? 0;
  const zone = preview.zone || 'yellow';
  const color = getZoneColor(zone);
  const zoneLabel = getZoneLabel(zone);
  const decisionMode = preview.decision_mode || null;

  const headline =
    preview.headline_today ||
    preview.recommendation ||
    'Complete seu check-in para ver como o dia está se desenhando.';

  const sleepNeed = preview.sleep_need_tonight ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-4 space-y-4"
      style={{ boxShadow: `0 0 30px -10px ${color}22` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Prévia do dia
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Leitura provisória com base no que você já preencheu.
          </p>
        </div>

        {decisionMode && (
          <span
            className={cn(
              'text-[10px] font-bold px-2 py-1 rounded-full border',
              getDecisionTone(decisionMode)
            )}
          >
            {getDecisionLabel(decisionMode)}
          </span>
        )}
      </div>

      {/* Main score */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            Prontidão estimada
          </p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black font-mono leading-none" style={{ color }}>
              {score}
            </span>
            <span className="text-sm font-semibold mb-1" style={{ color }}>
              {zoneLabel}
            </span>
          </div>
        </div>

        {sleepNeed != null && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              Sono sugerido
            </p>
            <p className="text-lg font-mono font-bold text-foreground">
              {sleepNeed}h
            </p>
          </div>
        )}
      </div>

      <ZoneBar value={score} color={color} />

      {/* Main interpretation */}
      <div className="rounded-xl bg-secondary/40 border border-border/40 px-3 py-2.5">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
          Como o dia está ficando
        </p>
        <p className="text-sm font-semibold leading-snug">
          {headline}
        </p>
      </div>

      {/* Secondary signals */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-secondary/30 border border-border/30 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Recovery
          </p>
          <p className="text-sm font-mono font-bold">
            {preview.recovery_score ?? '—'}
          </p>
        </div>

        <div className="rounded-xl bg-secondary/30 border border-border/30 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Fadiga
          </p>
          <p className="text-sm font-mono font-bold">
            {preview.fatigue_score ?? preview.fatigue ?? '—'}
          </p>
        </div>

        <div className="rounded-xl bg-secondary/30 border border-border/30 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Sono
          </p>
          <p className="text-sm font-mono font-bold">
            {preview.sleep_quality ?? preview.sleep_score ?? '—'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
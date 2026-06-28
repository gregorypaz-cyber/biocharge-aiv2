import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, CheckCircle2 } from 'lucide-react';

/**
 * HealthStatusCard
 *
 * variant="card"  → renders amber/red card for acute/sustained; null for normal/calibrating.
 * variant="line"  → renders the "✓ Sinais vitais no padrão" line for normal; null otherwise.
 *
 * Both variants navigate to /saude on tap.
 */
export default function HealthStatusCard({ healthSignals, variant = 'card' }) {
  if (!healthSignals) return null;
  const { state, flagCount, sleepHoursToday, flags } = healthSignals;

  if (state === 'calibrating') return null;

  // ── variant="line" — only renders in normal state (lives inside SecondaryMetrics) ──
  if (variant === 'line') {
    if (state !== 'normal') return null;
    return (
      <Link
        to="/saude"
        className="flex items-center justify-between py-1 text-sm text-emerald-400/80 hover:text-emerald-400 transition-colors"
      >
        <span className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          Sinais vitais no padrão
        </span>
        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
      </Link>
    );
  }

  // ── variant="card" — renders alert card for acute/sustained ──
  if (state === 'normal') return null;

  const isAcute = state === 'acute';
  const isSustained = state === 'sustained';

  // Compute HRV drop % for the copy (uses the hrv flag deltaPct)
  const hrvFlag = flags?.find((f) => f.id === 'hrv');
  const hrvDrop = hrvFlag?.deltaPct != null ? Math.abs(hrvFlag.deltaPct) : null;

  // Frase benigna de sono (estado acute com noite curta)
  const fraseSono =
    isAcute && sleepHoursToday != null && sleepHoursToday < 6.5
      ? `Pode ser só a noite curta (${sleepHoursToday}h de sono).`
      : '';

  if (isAcute) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-amber-500/40 bg-amber-500/8 p-4 space-y-2"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-400">
              Sinais um pouco fora do teu padrão
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {hrvDrop != null ? `HRV ${hrvDrop}% abaixo da tua média e FC de repouso elevada.` : 'HRV e FC de repouso fora do padrão.'}
              {fraseSono ? ` ${fraseSono}` : ''}
              {' '}Observe hoje — se persistir amanhã, eu aviso.
            </p>
          </div>
        </div>
        <Link
          to="/saude"
          className="flex items-center gap-1 text-xs font-semibold text-amber-400/80 hover:text-amber-400 transition-colors"
        >
          Ver detalhes
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </motion.div>
    );
  }

  if (isSustained) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-red-500/40 bg-red-500/8 p-4 space-y-2"
      >
        <div className="space-y-1">
          <p className="text-sm font-semibold text-red-400">
            🚨 2º dia de sinais alterados
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            HRV abaixo do padrão e FC elevada por 2 dias seguidos. Teu corpo pode estar sob carga acumulada ou combatendo algo. Priorize descanso, hidratação e sono hoje.
          </p>
        </div>
        <Link
          to="/saude"
          className="flex items-center gap-1 text-xs font-semibold text-red-400/80 hover:text-red-400 transition-colors"
        >
          Ver detalhes
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </motion.div>
    );
  }

  return null;
}

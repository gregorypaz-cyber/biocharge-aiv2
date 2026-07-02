import { Link } from 'react-router-dom';
import { ChevronRight, CheckCircle2 } from 'lucide-react';

/**
 * HealthStatusCard
 *
 * variant="card" → renders amber/red card for acute/sustained; null for normal/calibrating.
 * variant="line" → renders the "Sinais vitais no padrão" line for normal; null otherwise.
 *
 * Both variants navigate to /saude on tap.
 */
export default function HealthStatusCard({ healthSignals, variant = 'card' }) {
  if (!healthSignals) return null;

  const { state, sleepHoursToday, flags } = healthSignals;

  if (state === 'calibrating') return null;

  if (variant === 'line') {
    if (state !== 'normal') return null;

    return (
      <Link
        to="/saude"
        className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card px-4 py-3 text-support text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-zone-green shrink-0" />
          <span>Sinais vitais no padrão</span>
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
      </Link>
    );
  }

  if (state === 'normal') return null;

  const isAcute = state === 'acute';
  const isSustained = state === 'sustained';

  const hrvFlag = flags?.find((f) => f.id === 'hrv');
  const hrvDrop = hrvFlag?.deltaPct != null ? Math.abs(hrvFlag.deltaPct) : null;

  const fraseSono =
    isAcute && sleepHoursToday != null && sleepHoursToday < 6.5
      ? `Pode ser só a noite curta (${sleepHoursToday}h de sono).`
      : '';

  if (isAcute) {
    return (
      <Link
        to="/saude"
        className="block rounded-2xl border border-health-amber/30 bg-health-amber/10 p-4 hover:bg-health-amber/15 transition-colors"
      >
        <p className="text-heading text-health-amber">Sinais um pouco fora do teu padrão</p>
        <p className="text-support text-muted-foreground leading-relaxed mt-1">
          {hrvDrop != null
            ? `HRV ${hrvDrop}% abaixo da tua média e FC de repouso elevada.`
            : 'HRV e FC de repouso fora do padrão.'}
          {fraseSono ? ` ${fraseSono}` : ''} Observe hoje — se persistir amanhã, eu aviso.
        </p>
        <p className="text-support text-health-amber mt-2 font-semibold">Ver detalhes →</p>
      </Link>
    );
  }

  if (isSustained) {
    return (
      <Link
        to="/saude"
        className="block rounded-2xl border border-zone-red/30 bg-zone-red/10 p-4 hover:bg-zone-red/15 transition-colors"
      >
        <p className="text-heading text-zone-red">2º dia de sinais alterados</p>
        <p className="text-support text-muted-foreground leading-relaxed mt-1">
          HRV abaixo do padrão e FC elevada por 2 dias seguidos. Teu corpo pode estar sob carga acumulada ou combatendo algo. Priorize descanso, hidratação e sono hoje.
        </p>
        <p className="text-support text-zone-red mt-2 font-semibold">Ver detalhes →</p>
      </Link>
    );
  }

  return null;
}
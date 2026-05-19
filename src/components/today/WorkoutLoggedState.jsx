import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const INTENSITY_LABELS = {
  very_light: 'Muito Leve',
  light: 'Leve',
  moderate: 'Moderado',
  hard: 'Intenso',
  very_hard: 'Máximo',
};

function interpretAcwr(acwr) {
  if (acwr == null) return null;
  if (acwr > 1.5) return 'Carga muito alta — risco de lesão elevado.';
  if (acwr > 1.3) return 'Acima do ideal — monitore a fadiga.';
  if (acwr < 0.8) return 'Abaixo da zona ideal — seu corpo pode absorver mais.';
  return 'Dentro da zona segura.';
}

function predictTomorrowZone(checkin, totalStrain) {
  const recovery = checkin?.recovery_score ?? checkin?.morning_recovery_score ?? 50;
  const demand = checkin?.recovery_demand ?? 0;
  // Heurística: strain alto + recovery baixo → zona vermelha amanhã
  if (totalStrain >= 16 || recovery < 55) return { label: 'baixa 🔴', color: 'text-red-400' };
  if (totalStrain >= 12 || recovery < 70) return { label: 'moderada 🟡', color: 'text-yellow-400' };
  return { label: 'boa 🟢', color: 'text-emerald-400' };
}

export default function WorkoutLoggedState({ sessions = [], checkin, analysis }) {
  if (!sessions.length) return null;

  const lastSession = sessions[sessions.length - 1];
  const totalStrain = sessions.reduce((s, t) => s + (t.strain_score || 0), 0);
  const acwr = analysis?.trainingLoad?.ratio ?? null;
  const acwrBefore = acwr != null && totalStrain > 0
    ? Math.max(0, acwr - totalStrain / 100).toFixed(2)
    : null;
  const acwrAfter = acwr != null ? acwr.toFixed(2) : null;
  const acwrInterpretation = interpretAcwr(acwr);
  const tomorrow = predictTomorrowZone(checkin, totalStrain);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          Treino registrado
        </span>
      </div>

      {/* Session summary */}
      <div className="space-y-2">
        {sessions.map((s, i) => (
          <div key={s.id || i} className="flex items-center justify-between gap-2">
            <div>
              <span className="text-sm font-semibold">{s.sport}</span>
              {s.intensity && (
                <span className="text-xs text-muted-foreground ml-2">
                  {INTENSITY_LABELS[s.intensity] ?? s.intensity}
                </span>
              )}
              {s.duration_minutes && (
                <span className="text-xs text-muted-foreground ml-1">· {s.duration_minutes}min</span>
              )}
            </div>
            <div className="text-right shrink-0">
              {s.strain_score != null && (
                <span className="text-sm font-mono font-bold text-emerald-400">⚡ {s.strain_score}</span>
              )}
              {s.perceived_effort != null && (
                <p className="text-[10px] text-muted-foreground">RPE {s.perceived_effort}</p>
              )}
            </div>
          </div>
        ))}
        {sessions.length > 1 && (
          <div className="flex justify-between pt-1 border-t border-border/30 text-xs text-muted-foreground">
            <span>Total strain</span>
            <span className="font-mono font-bold text-emerald-400">⚡ {totalStrain}</span>
          </div>
        )}
      </div>

      {/* ACWR impact line */}
      {acwrAfter && (
        <div className="rounded-xl bg-black/20 border border-white/5 px-3 py-2.5 space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Impacto na carga</p>
          <p className="text-xs text-foreground/85">
            {acwrBefore && acwrBefore !== acwrAfter ? (
              <>ACWR foi de <span className="font-mono font-semibold">{acwrBefore}</span> para{' '}
              <span className="font-mono font-semibold">{acwrAfter}</span>. </>
            ) : (
              <>ACWR atual: <span className="font-mono font-semibold">{acwrAfter}</span>. </>
            )}
            {acwrInterpretation}
          </p>
        </div>
      )}

      {/* Tomorrow forecast */}
      <div className="rounded-xl bg-black/20 border border-white/5 px-3 py-2.5">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Previsão para amanhã</p>
        <p className="text-xs text-foreground/85">
          Com base neste treino, sua prontidão amanhã deve ser{' '}
          <span className={`font-semibold ${tomorrow.color}`}>{tomorrow.label}</span>.
        </p>
      </div>

      {/* CTA */}
      <Link
        to="/checkin"
        className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl bg-secondary/60 border border-border/40 hover:bg-secondary/80 transition-colors group"
      >
        <span className="text-xs text-muted-foreground">
          Veja o impacto no check-in de amanhã
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-primary group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </motion.div>
  );
}
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { buildDayFocus } from '@/lib/biocharge-utils';

/* ═══ FOCO DE HOJE ════════════════════════════════════════════════════════════
   Duas ações concretas pra executar o dia — a dose (o que fazer) e o proteger (o
   que cuidar). Determinístico via buildDayFocus, consistente por construção com a
   decisão do dia. Compacto de propósito: não compete com o herói, complementa.
   Sem check-in / calibração → o pai não renderiza (não há decisão ainda). */

const DOT = {
  good: 'hsl(142 70% 50%)',
  caution: 'hsl(45 72% 58%)',
  neutral: 'hsl(215 15% 62%)',
};

export default function DayFocusCard({ strainTarget, mode, acwr, sleepDebtHours, soreness, stress, hrvDeltaPct, restDay, seed }) {
  // UM SÓ NÚMERO DE DÉBITO: a dívida de sono canônica vive no SleepForecastCard
  // (1 casa decimal). Aqui a bullet de débito sai — DayFocusCard e SleepForecastCard
  // mostravam o mesmo número com arredondamentos diferentes (6.9h vs ~7h).
  const items = buildDayFocus({ mode, acwr, sleepDebtHours, soreness, stress, hrvDeltaPct, restDay, seed })
    .filter((it) => !/dívida de sono|déficit de sono/i.test(it?.text || ''));
  if (!items?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card p-4"
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <Target className="w-3.5 h-3.5 text-muted-foreground" />
        <h3 className="text-sm font-semibold tracking-tight">Foco de hoje</h3>
      </div>

      {/* ALVO DE CARGA: só o número-alvo, sem prescrever treino. */}
      {strainTarget != null && (
        <p className="text-sm font-medium text-foreground/90 mb-2.5">
          Hoje · carga alvo até <span className="font-mono">{strainTarget}</span>
        </p>
      )}

      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span
              className="mt-1.5 shrink-0 rounded-full"
              style={{ width: 6, height: 6, background: DOT[it.tone] || DOT.neutral }}
              aria-hidden="true"
            />
            <span className="text-sm leading-snug text-foreground/90">{it.text}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

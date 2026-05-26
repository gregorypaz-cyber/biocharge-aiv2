import { motion } from 'framer-motion';
import { Moon } from 'lucide-react';

/**
 * buildRecoveryProtocol
 * Gera ações práticas de recuperação baseadas nos dados do checkin + análise.
 */
function buildRecoveryProtocol(checkin, analysis) {
  const actions = [];

  // ── Dívida de sono ───────────────────────────────────────────────────────
  const sleepDebt = analysis?.sleepDebt?.debt ?? 0;
  const sleepHours = checkin?.sleep_hours ?? checkin?.sleep_need_tonight ?? null;
  if (sleepDebt > 3) {
    const targetHours = Math.min(9, Math.round((sleepHours ?? 7) + Math.min(2, sleepDebt * 0.4)));
    // Calcular horário ideal de dormir para acordar às 6h com targetHours de sono
    const wakeHour = 6;
    const bedHour = wakeHour - targetHours;
    const bedTime = bedHour < 0 ? `${24 + bedHour}h` : `${bedHour}h`;
    actions.push({
      icon: '🌙',
      text: `Durma antes das ${bedTime}. Meta: ${targetHours}h. Você tem ${sleepDebt.toFixed(1)}h de dívida de sono acumulada.`,
    });
  }

  // ── Dor muscular ─────────────────────────────────────────────────────────
  const soreness = checkin?.muscle_soreness ?? checkin?.muscle_soreness_level ?? 0;
  if (soreness > 2) {
    actions.push({
      icon: '🧘',
      text: 'Mobilidade leve: 10 min de alongamento antes de dormir. Foca em quadríceps, isquiotibiais e ombros.',
    });
  }

  // ── HRV delta negativo ───────────────────────────────────────────────────
  const hrvDelta = analysis?.baselineInsights?.find(i => i.label === 'HRV')?.delta ?? null;
  if (hrvDelta != null && hrvDelta < -8) {
    actions.push({
      icon: '📵',
      text: 'Evite álcool e telas após 21h. Impacto direto no HRV — cada hora de tela atrasa o sono em ~45 min.',
    });
  }

  // ── Stress elevado ───────────────────────────────────────────────────────
  const stress = checkin?.stress ?? checkin?.stress_level ?? 0;
  if (stress > 3) {
    actions.push({
      icon: '🧠',
      text: '20 min sem tela após o jantar. Stress alto suprime o HRV — respiração 4-4-4-4 por 5 min ajuda.',
    });
  }

  // Fallback se nenhum dado condicional disparar
  if (actions.length === 0) {
    actions.push(
      { icon: '💧', text: 'Hidratação: 2–3L ao longo do dia. Dehidratação reduz recuperação muscular em até 20%.' },
      { icon: '🧘', text: 'Caminhada leve de 20 min ativa a circulação sem adicionar carga ao sistema nervoso.' }
    );
  }

  return actions.slice(0, 3);
}

/**
 * Estima quantos pontos a prontidão pode subir se o protocolo for seguido.
 */
function estimateReadinessGain(checkin, analysis) {
  const sleepDebt = analysis?.sleepDebt?.debt ?? 0;
  const stress = checkin?.stress ?? checkin?.stress_level ?? 0;
  const hrvDelta = analysis?.baselineInsights?.find(i => i.label === 'HRV')?.delta ?? null;
  let gain = 0;
  if (sleepDebt > 3) gain += 6;
  else if (sleepDebt > 1) gain += 3;
  if (stress > 3) gain += 4;
  if (hrvDelta != null && hrvDelta < -8) gain += 5;
  if (gain === 0) gain = 3; // mínimo esperado
  return Math.min(gain, 15);
}

export default function RecoveryProtocolCard({ checkin, analysis }) {
  const actions = buildRecoveryProtocol(checkin, analysis);
  const gain = estimateReadinessGain(checkin, analysis);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Protocolo de hoje
          </span>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400">
          Dia de descanso
        </span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Seu corpo está em modo de absorção. O ganho de hoje não vem do treino — vem do que você faz <em>fora</em> da academia.
      </p>

      <div className="h-px bg-border/40" />

      {/* Actions */}
      <ul className="space-y-3">
        {actions.map((action, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="text-lg shrink-0 leading-none mt-0.5">{action.icon}</span>
            <p className="text-sm text-foreground/85 leading-snug">{action.text}</p>
          </li>
        ))}
      </ul>

      <div className="h-px bg-border/40" />

      {/* Expectativa de amanhã */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <span className="text-base shrink-0">⬆️</span>
        <p className="text-xs text-blue-300 leading-snug">
          Se você seguir isso, sua prontidão amanhã tem chance de subir <span className="font-bold">+{gain} pts</span>.
        </p>
      </div>
    </motion.div>
  );
}
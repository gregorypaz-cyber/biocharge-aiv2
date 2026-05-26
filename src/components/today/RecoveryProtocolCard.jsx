import { motion } from 'framer-motion';import { motion } fromimport { Moon } from 'lucide-react';

function buildRecoveryProtocol(checkin, analysis) {
  const actions = [];

  const sleepDebt = analysis?.sleepDebt?.debt ?? 0;
  const sleepHours = checkin?.sleep_hours ?? checkin?.sleep_need_tonight ?? null;

  if (sleepDebt > 3) {
    const targetHours = Math.min(9, Math.round((sleepHours ?? 7) + Math.min(2, sleepDebt * 0.4)));
    const wakeHour = 6;
    const bedHour = wakeHour - targetHours;
    const normalizedBedHour = bedHour < 0 ? 24 + bedHour : bedHour;
    const bedTime = `${normalizedBedHour}h`;

    actions.push({
      icon: '🌙',
      text: `Hoje à noite, tente dormir antes das ${bedTime}. Meta: ${targetHours}h. Você está com ${sleepDebt.toFixed(1)}h de dívida de sono acumulada.`,
    });
  }

  const soreness = checkin?.muscle_soreness ?? checkin?.muscle_soreness_level ?? 0;
  if (soreness > 2) {
    actions.push({
      icon: '🧘',
      text: 'Hoje: 10 min de mobilidade leve ou alongamento antes de dormir. Foque em quadríceps, posteriores e ombros.',
    });
  }

  const hrvDelta = analysis?.baselineInsights?.find((i) => i.label === 'HRV')?.delta ?? null;
  if (hrvDelta != null && hrvDelta < -8) {
    actions.push({
      icon: '📵',
      text: 'Hoje à noite, evite telas e álcool perto do horário de dormir. Isso pesa diretamente na recuperação de amanhã.',
    });
  }

  const stress = checkin?.stress ?? checkin?.stress_level ?? 0;
  if (stress > 3) {
    actions.push({
      icon: '🧠',
      text: 'Hoje: faça 5 min de respiração 4-4-4-4 ou fique 20 min sem tela no fim do dia para baixar o estresse do sistema.',
    });
  }

  if (actions.length === 0) {
    actions.push(
      { icon: '💧', text: 'Hoje: mantenha boa hidratação ao longo do dia.' },
      { icon: '🚶', text: 'Se quiser se mover, escolha uma caminhada leve de 15–20 min.' },
      { icon: '🌙', text: 'Hoje à noite, priorize um horário de sono consistente.' }
    );
  }

  return actions.slice(0, 3);
}

function estimateReadinessGain(checkin, analysis) {
  const sleepDebt = analysis?.sleepDebt?.debt ?? 0;
  const stress = checkin?.stress ?? checkin?.stress_level ?? 0;
  const hrvDelta = analysis?.baselineInsights?.find((i) => i.label === 'HRV')?.delta ?? null;

  let gain = 0;
  if (sleepDebt > 3) gain += 6;
  else if (sleepDebt > 1) gain += 3;

  if (stress > 3) gain += 4;
  if (hrvDelta != null && hrvDelta < -8) gain += 5;

  if (gain === 0) gain = 3;
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Protocolo de recuperação
          </span>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400">
          Hoje
        </span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Hoje o ganho não vem de adicionar carga. Hoje o ganho vem de baixar estresse, recuperar energia
        e preparar melhor a manhã de amanhã.
      </p>

      <div className="h-px bg-border/40" />

      <ul className="space-y-3">
        {actions.map((action, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="text-lg shrink-0 leading-none mt-0.5">{action.icon}</span>
            <p className="text-sm text-foreground/85 leading-snug">{action.text}</p>
          </li>
        ))}
      </ul>

      <div className="h-px bg-border/40" />

      <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <span className="text-base shrink-0">⬆️</span>
        <p className="text-xs text-blue-300 leading-snug">
          <span className="font-semibold">Amanhã cedo (projeção):</span>{' '}
          se você seguir isso hoje, sua prontidão pode subir cerca de <span className="font-bold">+{gain} pts</span>.
        </p>
      </div>
    </motion.div>
  );
}


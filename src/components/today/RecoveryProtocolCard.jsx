import { motion } from 'framer-motion';
import { Moon, ArrowUpRight, ShieldCheck } from 'lucide-react';

function buildRecoveryProtocol(checkin, analysis) {
  const actions = [];

  const sleepDebt = analysis?.sleepDebt?.debt ?? 0;
  const sleepNeed = checkin?.sleep_need_tonight ?? null;
  const sleepHours = checkin?.sleep_hours ?? null;

  if (sleepDebt > 3) {
    const targetHours =
      sleepNeed ??
      Math.min(
        9,
        Math.round((sleepHours ?? 7) + Math.min(2, sleepDebt * 0.4))
      );

    actions.push({
      icon: '🌙',
      title: 'Recuperar sono',
      text: `Meta de hoje: dormir cerca de ${targetHours}h. Tente começar sua rotina de sono 30–45min mais cedo que o normal. Você está com ${sleepDebt.toFixed(1)}h de dívida de sono acumulada.`,
    });
  } else if (sleepNeed != null) {
    actions.push({
      icon: '🌙',
      title: 'Proteger o sono',
      text: `Meta de hoje: dormir cerca de ${sleepNeed}h. O objetivo é preservar a recuperação de amanhã, não apenas compensar cansaço.`,
    });
  }

  const soreness = checkin?.muscle_soreness ?? checkin?.muscle_soreness_level ?? 0;

  if (soreness > 2) {
    actions.push({
      icon: '🧘',
      title: 'Baixar tensão muscular',
      text: 'Faça 8–12 min de mobilidade leve ou alongamento antes de dormir. Foque nas regiões mais carregadas do treino.',
    });
  }

  const hrvDelta =
    analysis?.baselineInsights?.find((item) => item.label === 'HRV')?.delta ?? null;

  if (hrvDelta != null && hrvDelta < -8) {
    actions.push({
      icon: '📵',
      title: 'Reduzir estímulo à noite',
      text: 'Evite telas, álcool e refeições pesadas perto do horário de dormir. Seu HRV está abaixo do normal e precisa de uma noite mais limpa.',
    });
  }

  const stress = checkin?.stress ?? checkin?.stress_level ?? 0;

  if (stress > 3) {
    actions.push({
      icon: '🧠',
      title: 'Desligar o sistema',
      text: 'Faça 5 min de respiração 4-4-4-4 ou fique 20 min sem tela no fim do dia para reduzir o stress fisiológico.',
    });
  }

  const hydration = checkin?.hydration ?? checkin?.hydration_level ?? null;

  if (hydration != null && hydration <= 2) {
    actions.push({
      icon: '💧',
      title: 'Repor hidratação',
      text: 'Mantenha hidratação constante até o fim do dia. Baixa hidratação pode piorar percepção de fadiga e recuperação.',
    });
  }

  if (actions.length === 0) {
    actions.push(
      {
        icon: '💧',
        title: 'Hidratação simples',
        text: 'Mantenha boa hidratação ao longo do dia, sem exagerar perto da hora de dormir.',
      },
      {
        icon: '🚶',
        title: 'Movimento leve',
        text: 'Se quiser se mover, escolha caminhada leve de 15–20 min ou mobilidade. O objetivo é circulação, não treino.',
      },
      {
        icon: '🌙',
        title: 'Sono consistente',
        text: 'Priorize um horário de sono consistente. Hoje o ganho vem de recuperar, não de adicionar carga.',
      }
    );
  }

  return actions.slice(0, 3);
}

function estimateReadinessGain(checkin, analysis) {
  const sleepDebt = analysis?.sleepDebt?.debt ?? 0;
  const stress = checkin?.stress ?? checkin?.stress_level ?? 0;
  const hrvDelta =
    analysis?.baselineInsights?.find((item) => item.label === 'HRV')?.delta ?? null;
  const soreness = checkin?.muscle_soreness ?? checkin?.muscle_soreness_level ?? 0;

  let gain = 0;

  if (sleepDebt > 3) gain += 6;
  else if (sleepDebt > 1) gain += 3;

  if (stress > 3) gain += 4;

  if (hrvDelta != null && hrvDelta < -8) gain += 5;

  if (soreness > 2) gain += 2;

  if (gain === 0) gain = 3;

  return Math.min(gain, 15);
}

function getRecoveryReason(checkin, analysis) {
  const sleepDebt = analysis?.sleepDebt?.debt ?? 0;
  const stress = checkin?.stress ?? checkin?.stress_level ?? 0;
  const soreness = checkin?.muscle_soreness ?? checkin?.muscle_soreness_level ?? 0;
  const hrvDelta =
    analysis?.baselineInsights?.find((item) => item.label === 'HRV')?.delta ?? null;

  const reasons = [];

  if (sleepDebt > 3) reasons.push('dívida de sono');
  if (stress > 3) reasons.push('stress elevado');
  if (soreness > 2) reasons.push('dor muscular');
  if (hrvDelta != null && hrvDelta < -8) reasons.push('HRV abaixo do normal');

  if (!reasons.length) {
    return 'A melhor escolha agora é preservar adaptação e chegar melhor amanhã.';
  }

  return `O foco de recuperação vem principalmente de: ${reasons.join(', ')}.`;
}

export default function RecoveryProtocolCard({ checkin, analysis }) {
  const actions = buildRecoveryProtocol(checkin, analysis);
  const gain = estimateReadinessGain(checkin, analysis);
  const reason = getRecoveryReason(checkin, analysis);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-blue-400" />

          <span className="text-xs font-semibold uppercase tracking-wider text-blue-300">
            Protocolo de recuperação
          </span>
        </div>

        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
          Hoje
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-base font-black leading-tight">
          Hoje o objetivo é baixar carga do sistema
        </p>

        <p className="text-sm text-muted-foreground leading-relaxed">
          O ganho não vem de adicionar mais treino. O ganho vem de reduzir stress, recuperar energia e proteger a leitura de amanhã.
        </p>

        <p className="text-[11px] text-blue-200/80 leading-relaxed">
          {reason}
        </p>
      </div>

      <div className="h-px bg-border/40" />

      <ul className="space-y-3">
        {actions.map((action, index) => (
          <li key={`${action.title}-${index}`} className="flex items-start gap-3">
            <span className="text-lg shrink-0 leading-none mt-0.5">
              {action.icon}
            </span>

            <div>
              <p className="text-sm font-semibold text-foreground/90 leading-snug">
                {action.title}
              </p>

              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                {action.text}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="h-px bg-border/40" />

      <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-3 py-3">
        <div className="flex items-start gap-2">
          <ArrowUpRight className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />

          <div>
            <p className="text-[10px] uppercase tracking-wider text-blue-300 font-bold mb-1">
              Amanhã cedo
            </p>

            <p className="text-xs text-blue-200 leading-relaxed">
              Se você seguir esse protocolo hoje, sua prontidão pode melhorar cerca de{' '}
              <span className="font-bold">+{gain} pts</span>. Isso é uma estimativa, não uma garantia.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-black/15 border border-white/5 px-3 py-2.5">
        <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Use este protocolo como guia de recuperação. Se houver dor forte, tontura ou sintomas incomuns, reduza o esforço e procure orientação adequada.
        </p>
      </div>
    </motion.div>
  );
}
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useMotionSafe } from '@/hooks/use-motion-safe';

const milestones = [3, 7, 14, 30, 60, 100];

export default function StreakCard({ streak }) {
  const { initial, transition: reducedTransition } = useMotionSafe();

  if (!streak || streak < 1) return null;

  const nextMilestone = milestones.find(m => m > streak) || null;
  const prevMilestone = [...milestones].reverse().find(m => m <= streak) || 1;
  const progress = nextMilestone
    ? ((streak - prevMilestone) / (nextMilestone - prevMilestone)) * 100
    : 100;

  const label =
    streak >= 100 ? '🏆 Lendário!' :
    streak >= 60  ? '🌟 Incrível!'  :
    streak >= 30  ? '💪 Mês inteiro!' :
    streak >= 14  ? '⚡ Duas semanas!' :
    streak >= 7   ? '🎯 Uma semana!' :
    streak >= 3   ? '🔥 Em chamas!'  :
    'Continue assim!';

  return (
    <motion.div
      initial={initial ?? { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedTransition ?? { delay: 0.1 }}
      className="rounded-2xl border border-orange-500/25 bg-orange-500/5 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          <span className="text-sm font-semibold text-orange-300">Sequência de Check-ins</span>
        </div>
        <span className="text-xs text-orange-400/70">{label}</span>
      </div>

      <div className="flex items-end gap-3">
        <span className="text-4xl font-black font-mono text-orange-400">{streak}</span>
        <span className="text-sm text-muted-foreground mb-1">dias seguidos</span>
      </div>

      {nextMilestone && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Progresso para {nextMilestone} dias</span>
            <span>{streak}/{nextMilestone}</span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-orange-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {streak < 7
              ? `Faltam ${7 - streak} dia${7 - streak !== 1 ? 's' : ''} para completar a semana`
              : streak < 14
              ? `Faltam ${14 - streak} dia${14 - streak !== 1 ? 's' : ''} para 2 semanas`
              : streak < 30
              ? `Faltam ${30 - streak} dia${30 - streak !== 1 ? 's' : ''} para 1 mês`
              : `Incrível — ${streak} dias de consistência! 🏆`}
          </p>
        </div>
      )}
    </motion.div>
  );
}
import { motion } from 'framer-motion';
import { Moon } from 'lucide-react';

/**
 * Exibe alerta de dívida de sono acumulada quando > 3h nos últimos 7 dias.
 * Props:
 *   checkins: array dos últimos checkins (mais recente primeiro)
 *   todayCheckin: enrichedCheckin de hoje
 */
export default function SleepDebtCard({ checkins = [], todayCheckin }) {
  // Calcular dívida: soma dos déficits positivos dos últimos 7 dias
  const last7 = checkins.slice(0, 7);

  const { totalDebt, daysWithDebt } = last7.reduce((acc, c) => {
    const need = c.sleep_need_tonight;
    const slept = c.sleep_hours;
    if (need != null && slept != null) {
      const deficit = need - slept;
      if (deficit > 0) {
        acc.totalDebt += deficit;
        acc.daysWithDebt += 1;
      }
    }
    return acc;
  }, { totalDebt: 0, daysWithDebt: 0 });

  const debtRounded = Math.round(totalDebt * 10) / 10;

  if (debtRounded <= 3) return null;

  // Meta esta noite
  const sleepTarget = todayCheckin?.sleep_need_tonight ?? 8;
  // Horário sugerido para desligar telas: 30min antes de dormir (assumindo acordar às 6:30)
  const wakeHour = 6.5;
  const sleepHour = wakeHour + 24 - sleepTarget; // inverso: hora de deitar
  const lightsOutHour = sleepHour - 0.5;
  const formatHour = (h) => {
    const hh = Math.floor(h % 24);
    const mm = Math.round((h % 1) * 60);
    return `${String(hh).padStart(2, '0')}h${mm > 0 ? String(mm).padStart(2, '0') : ''}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-blue-500/30 bg-blue-500/6 p-4 space-y-2.5"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Moon className="w-4 h-4 text-blue-400 shrink-0" />
        <p className="text-sm font-bold text-blue-200">
          Dívida de sono acumulada: {debtRounded}h
        </p>
      </div>

      {/* Subtítulo */}
      <p className="text-xs text-blue-200/70 leading-relaxed">
        Seu corpo está operando abaixo do ideal há {daysWithDebt} {daysWithDebt === 1 ? 'dia' : 'dias'}.
        Deficit cumulativo reduz recuperação, HRV e desempenho cognitivo.
      </p>

      {/* Ação */}
      <div className="flex items-start gap-2 pt-1 border-t border-blue-500/15">
        <span className="text-base shrink-0">🎯</span>
        <p className="text-xs text-blue-100/90 leading-relaxed">
          <span className="font-semibold">Meta desta noite:</span> dormir {sleepTarget}h.{' '}
          Desligue as telas às {formatHour(lightsOutHour)}.
        </p>
      </div>
    </motion.div>
  );
}
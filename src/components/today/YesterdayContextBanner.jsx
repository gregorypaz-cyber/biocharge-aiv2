import { motion } from 'framer-motion';
import { TrendingUp, AlertTriangle, Info } from 'lucide-react';

const LEVEL_STYLES = {
  positive: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/8',
    text: 'text-emerald-400',
    Icon: TrendingUp,
  },
  caution: {
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/8',
    text: 'text-orange-400',
    Icon: AlertTriangle,
  },
  info: {
    border: 'border-blue-500/25',
    bg: 'bg-blue-500/6',
    text: 'text-blue-300',
    Icon: Info,
  },
};

export default function YesterdayContextBanner({ lookback }) {
  if (!lookback?.note) return null;

  const style = LEVEL_STYLES[lookback.noteLevel] || LEVEL_STYLES.info;
  const { Icon } = style;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${style.border} ${style.bg} px-3.5 py-3 flex gap-2.5`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${style.text}`} />
      <p className="text-xs text-foreground/80 leading-snug">{lookback.note}</p>
    </motion.div>
  );
}
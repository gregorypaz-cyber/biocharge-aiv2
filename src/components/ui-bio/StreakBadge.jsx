import { Flame } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StreakBadge({ streak }) {
  if (!streak || streak < 2) return null;
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', bounce: 0.5 }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/25 text-orange-400 text-sm font-semibold"
    >
      <Flame className="w-4 h-4" />
      {streak} dias seguidos
    </motion.div>
  );
}
import { motion } from 'framer-motion';
import { BedDouble } from 'lucide-react';

export default function RestDayToggle({ value, onChange }) {
  return (
    <motion.button
      type="button"
      onClick={() => onChange(!value)}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
        value
          ? 'border-blue-500/50 bg-blue-500/10'
          : 'border-border/60 bg-card hover:border-border'
      }`}
    >
      {/* Custom toggle */}
      <div
        className={`relative w-12 h-6 rounded-full transition-all shrink-0 ${
          value ? 'bg-blue-500' : 'bg-secondary'
        }`}
      >
        <motion.div
          animate={{ x: value ? 24 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
        />
      </div>

      <div className="flex items-center gap-2 flex-1 text-left">
        <BedDouble className={`w-5 h-5 shrink-0 ${value ? 'text-blue-400' : 'text-muted-foreground'}`} />
        <div>
          <p className={`text-sm font-semibold ${value ? 'text-blue-300' : 'text-foreground'}`}>
            Não treinei hoje
          </p>
          <p className="text-xs text-muted-foreground">Dia de descanso — mantém o streak 🔥</p>
        </div>
      </div>

      {value && (
        <span className="text-xl shrink-0">🛌</span>
      )}
    </motion.button>
  );
}
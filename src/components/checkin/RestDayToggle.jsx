import { motion } from 'framer-motion';
import { BedDouble, CheckCircle2 } from 'lucide-react';

export default function RestDayToggle({ value, onChange }) {
  return (
    <div className="space-y-2">
      <motion.button
        type="button"
        onClick={() => onChange(!value)}
        whileTap={{ scale: 0.98 }}
        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
          value
            ? 'border-blue-500 bg-blue-500/15 shadow-[0_0_0_1px_hsl(217,91%,60%,0.2)]'
            : 'border-dashed border-border/60 bg-card hover:border-border hover:bg-secondary/40'
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
            <p className={`text-sm font-semibold ${value ? 'text-blue-300' : 'text-foreground/80'}`}>
              {value ? 'Dia de descanso ativado ✓' : 'Marcar como dia de descanso'}
            </p>
            <p className="text-xs text-muted-foreground">
              {value ? 'Recuperação também é treino.' : 'Decida após ver seus dados de recuperação'}
            </p>
          </div>
        </div>

        {value
          ? <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
          : <span className="text-base shrink-0 opacity-40">🛌</span>
        }
      </motion.button>

      {value && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-blue-300 text-center py-2"
        >
          🛌 Ótima escolha — recuperação também é treino.
        </motion.p>
      )}
    </div>
  );
}
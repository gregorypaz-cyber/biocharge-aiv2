import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Undo2, Lock } from 'lucide-react';
import { useDayContext } from '@/lib/dayContext';

const UNDO_TIMEOUT = 5000;

export default function QuickIntentEdit() {
  const { intent, locked, lockRestDay, unlockRestDay } = useDayContext();
  const [undoVisible, setUndoVisible] = useState(false);
  const undoTimerRef = useRef(null);
  const prevIntentRef = useRef('undecided');

  const isRestDay = intent === 'recovery' && locked;

  function handleActivate() {
    if (isRestDay) return;
    prevIntentRef.current = intent;
    lockRestDay();
    setUndoVisible(true);
    clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoVisible(false), UNDO_TIMEOUT);
  }

  function handleUndo() {
    clearTimeout(undoTimerRef.current);
    setUndoVisible(false);
    unlockRestDay(prevIntentRef.current);
  }

  function handleDeactivate() {
    unlockRestDay('undecided');
    setUndoVisible(false);
    clearTimeout(undoTimerRef.current);
  }

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence mode="wait">
        {isRestDay ? (
          <motion.button
            key="rest-active"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            onClick={handleDeactivate}
            aria-label="Cancelar dia de descanso"
            className="flex items-center gap-2 self-start px-3 py-1.5 rounded-xl border border-blue-500/40 bg-blue-500/10 text-blue-300 text-xs font-semibold hover:bg-blue-500/20 transition-colors"
          >
            <Lock className="w-3 h-3" />
            <Moon className="w-3.5 h-3.5" />
            Dia de descanso ativo
            <span className="text-blue-400/60 font-normal ml-0.5">· toque para cancelar</span>
          </motion.button>
        ) : (
          <motion.button
            key="rest-inactive"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            onClick={handleActivate}
            aria-label="Declarar hoje como dia de descanso"
            className="flex items-center gap-1.5 self-start px-3 py-1.5 rounded-xl border border-border/60 bg-secondary/60 text-muted-foreground text-xs font-medium hover:border-blue-500/40 hover:text-blue-300 hover:bg-blue-500/8 transition-all"
          >
            <Moon className="w-3.5 h-3.5" />
            Marcar como dia de descanso
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {undoVisible && (
          <motion.div
            key="undo-toast"
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-blue-500/25 bg-blue-500/8">
              <span className="text-xs text-blue-200/80">
                🌙 Dia de descanso declarado. As recomendações do dia foram ajustadas para recuperação.
              </span>
              <button
                onClick={handleUndo}
                aria-label="Desfazer declaração de dia de descanso"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold hover:bg-blue-500/25 transition-colors shrink-0"
              >
                <Undo2 className="w-3 h-3" />
                Desfazer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

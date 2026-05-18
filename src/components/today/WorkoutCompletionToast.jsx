import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Gera frase prospectiva com base nos dados disponíveis.
 * Máx 2 linhas (~100 chars).
 */
export function buildProspectiveMessage({ analysis, checkin, recentFeedback, strainTarget, currentStrain }) {
  const hrvDelta = analysis?.baselineInsights?.find(i => i.label === 'HRV')?.delta ?? null;
  const ratio = analysis?.trainingLoad?.ratio ?? null;
  const state = checkin?.current_body_state;

  // Volta após dias de descanso
  if (recentFeedback && recentFeedback.length >= 2) {
    const lastTwo = recentFeedback.slice(0, 2);
    const bothRest = lastTwo.every(r => !r.completed);
    if (bothRest) {
      return 'De volta. Seu corpo pediu pausa e você respeitou. Amanhã mostre o resultado.';
    }
  }

  // HRV delta negativo → HRV deve subir
  if (hrvDelta != null && hrvDelta < -5) {
    return 'Registrado. Seu HRV deve subir amanhã se você dormir bem. Verifique no check-in.';
  }

  // Dentro do strain alvo
  if (strainTarget != null && currentStrain != null && currentStrain <= strainTarget) {
    return 'Dentro da zona. Perfeito para manter consistência sem acumular fadiga.';
  }

  // Carga acima do recomendado
  if (ratio != null && ratio > 1.3) {
    return 'Feito. Carga acumulada alta — priorize sono esta noite para recuperar bem.';
  }

  // Estado excelente
  if (state === 'Recovered' || state === 'Activated') {
    return 'Excelente execução. Recupere bem hoje e você estará ainda mais forte amanhã.';
  }

  // Treino leve / fadiga
  if (state === 'Fatigued' || state === 'Overreached') {
    return 'Movimento feito. Agora o trabalho é recuperar — durma cedo e hidrate-se bem.';
  }

  // Fallback
  return 'Treino registrado. Consistência é o que constrói resultados. Até amanhã.';
}

/**
 * Toast de celebração após registro de treino.
 * Auto-fecha em 5s, ou o usuário fecha manualmente.
 */
export default function WorkoutCompletionToast({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ duration: 0.22 }}
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-4 flex items-start gap-3"
        >
          <span className="text-xl shrink-0">✅</span>
          <p className="text-sm font-medium text-emerald-200 leading-snug flex-1">{message}</p>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-emerald-400/50 hover:text-emerald-300 transition-colors shrink-0 mt-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
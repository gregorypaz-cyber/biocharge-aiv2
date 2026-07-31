import { motion } from 'framer-motion';
import { ArrowRight, Moon } from 'lucide-react';
import RecoveryField from '@/components/today/RecoveryField';
import { getZone, getZoneColor } from '@/lib/biocharge-utils';
import { useGemMorph } from '@/components/checkin/CheckinSuccessOverlay';

/* ═══ FECHAR O DIA ════════════════════════════════════════════════════════════
   O bookend da tarde. A manhã abre a leitura (SALTO: a gema nasce e a Today
   revela o plano); aqui a gema REAPARECE, assenta de leve e voa de volta pro
   herói da Today (mesmo layoutId="reck-hero"). É deliberadamente MAIS LEVE que
   a manhã — sem contagem regressiva, sem pilha de cartões: só a gema, uma frase
   que recompensa a PRÁTICA (você se leu de manhã e voltou depois do treino) e a
   meta da noite. A recompensa é ter fechado o ciclo, não um número novo — o
   pós-treino não recalcula o recovery do dia. */

const BIRTH_COLOR = 'hsl(215, 14%, 42%)';
const ZONE_FAIXA = { green: 'Alta', yellow: 'Moderada', red: 'Baixa' };

export default function PostWorkoutCloseOverlay({ recovery, sleepNeed, onContinue }) {
  const rec = recovery != null ? Math.round(recovery) : null;
  const hasRec = rec != null;
  const toColor = hasRec ? getZoneColor(getZone(rec)) : BIRTH_COLOR;
  const fromVal = hasRec ? Math.max(0, rec - 12) : 0;

  // Assenta de leve (echo do SALTO, mais curto): sobe do slate pro valor/cor do
  // dia. Sem "dia anterior" — é a mesma leitura da manhã reaparecendo pra fechar.
  const gem = useGemMorph({
    fromVal,
    toVal: hasRec ? rec : 0,
    fromColor: BIRTH_COLOR,
    toColor,
    delay: 200,
    dur: 720,
  });
  const faixa = hasRec ? (ZONE_FAIXA[getZone(rec)] || 'Moderada') : '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-background/95 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm mx-auto min-h-full flex flex-col justify-center py-8 px-6"
      >
        <div className="flex flex-col items-center text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Dia fechado
          </p>

          {/* Mesmo layoutId do herói da Today: ao continuar, a gema VOA pro Hoje. */}
          <motion.div
            layoutId="reck-hero"
            transition={{ type: 'spring', stiffness: 230, damping: 28 }}
            className="-mt-1"
          >
            <RecoveryField
              value={gem.value}
              max={100}
              color={gem.color}
              label="Recovery"
              caption={faixa}
              size={176}
              live
            />
          </motion.div>

          <div className="-mt-1">
            <h1 className="text-2xl font-semibold leading-snug tracking-tight">
              Você fechou o dia
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Você se leu de manhã e voltou depois do treino — é assim que a leitura fica boa.
            </p>
          </div>

          {sleepNeed != null && (
            <div className="mt-5 w-full rounded-xl bg-blue-500/5 border border-blue-500/15 px-3 py-2.5">
              <div className="flex items-center justify-center gap-2">
                <Moon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <p className="text-sm leading-snug font-medium">
                  Meta de sono desta noite: <span className="font-semibold">{sleepNeed}h</span>
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onContinue}
          className="mt-6 w-full flex items-center justify-center gap-2 h-13 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all"
        >
          Ir para Hoje
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </motion.div>
  );
}

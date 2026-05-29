import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const MICRO_INTERPRETATIONS = {
  energy: {
    1: '⚠️ Energia baixa — considere treino leve hoje',
    2: '⚠️ Energia baixa — considere treino leve hoje',
    3: 'Energia dentro do padrão',
    4: '✅ Boa energia — favorável para treino mais forte',
    5: '✅ Boa energia — favorável para treino mais forte',
  },
  stress: {
    1: '✅ Baixo stress favorece recuperação',
    2: '✅ Baixo stress favorece recuperação',
    3: 'Stress dentro do esperado',
    4: '⚠️ Stress elevado reduz qualidade do sono',
    5: '⚠️ Stress elevado reduz qualidade do sono',
  },
  soreness: {
    1: '✅ Musculatura recuperada',
    2: 'Dor leve',
    3: 'Dor moderada',
    4: '🔴 Dor intensa — evite sobrecarga muscular',
    5: '🔴 Dor intensa — evite sobrecarga muscular',
  },
  mood: {
    1: 'Humor baixo pode indicar fadiga acumulada',
    2: 'Humor abaixo do normal',
    3: 'Humor dentro do padrão',
    4: 'Humor elevado — bom sinal de recuperação mental',
    5: 'Humor elevado — bom sinal de recuperação mental',
  },
  hydration: {
    1: '⚠️ Hidratação insuficiente',
    2: 'Hidratação abaixo do ideal',
    3: 'Hidratação adequada',
    4: '✅ Boa hidratação',
    5: '✅ Excelente hidratação',
  },
};

const emojiSets = {
  mood: {
    emojis: ['😤', '😔', '😐', '🙂', '😄'],
    labels: ['Muito ruim', 'Baixo', 'Normal', 'Bom', 'Excelente'],
  },
  stress: {
    emojis: ['😌', '🙂', '😐', '😰', '🤯'],
    labels: ['Muito baixo', 'Leve', 'Moderado', 'Alto', 'Muito alto'],
  },
  energy: {
    emojis: ['🪫', '🔋', '⚡', '🔥', '🚀'],
    labels: ['Muito baixa', 'Baixa', 'Moderada', 'Alta', 'Excelente'],
  },
  hydration: {
    emojis: ['🌵', '💧', '💦', '🌊', '🐋'],
    labels: ['Muito baixa', 'Baixa', 'Adequada', 'Boa', 'Excelente'],
  },
  soreness: {
    emojis: ['✅', '😬', '💪', '🔥', '🆘'],
    labels: ['Nenhuma', 'Leve', 'Moderada', 'Alta', 'Intensa'],
  },
};

export default function EmojiSelector({ label, type, value, onChange }) {
  const set = emojiSets[type] || emojiSets.mood;
  const { emojis, labels } = set;
  const selectedLabel = value ? labels[value - 1] : null;
  const selectedInterpretation = value ? MICRO_INTERPRETATIONS[type]?.[value] : null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>

        {selectedLabel && (
          <span className="text-[11px] text-primary font-semibold">
            {selectedLabel}
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2" role="group" aria-label={label}>
        {emojis.map((emoji, i) => {
          const level = i + 1;
          const isSelected = value === level;

          return (
            <button
              key={i}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${label}: ${labels[i]}`}
              onClick={() => onChange(level)}
              className={cn(
                'min-h-[58px] flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-base transition-all border-2',
                isSelected
                  ? 'bg-primary/20 border-primary scale-[1.02]'
                  : 'bg-secondary border-transparent hover:bg-secondary/80'
              )}
            >
              <span className="leading-none">{emoji}</span>
              <span className="text-[9px] text-muted-foreground leading-tight text-center px-1">
                {labels[i]}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {selectedInterpretation && (
          <motion.p
            key={`${type}-${value}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-[11px] text-muted-foreground mt-1 pl-0.5"
          >
            {selectedInterpretation}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
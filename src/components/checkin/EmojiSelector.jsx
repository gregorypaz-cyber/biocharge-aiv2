import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const MICRO_INTERPRETATIONS = {
  energy: {
    1: '⚠️ Energia baixa — considere treino leve hoje',
    2: '⚠️ Energia baixa — considere treino leve hoje',
    3: 'Energia dentro do padrão',
    4: '✅ Boa energia — favorável para treino intenso',
    5: '✅ Boa energia — favorável para treino intenso',
  },
  stress: {
    1: '✅ Baixo stress favorece recuperação',
    2: '✅ Baixo stress favorece recuperação',
    3: null,
    4: '⚠️ Stress elevado reduz qualidade do sono',
    5: '⚠️ Stress elevado reduz qualidade do sono',
  },
  soreness: {
    1: '✅ Musculatura recuperada',
    2: null,
    3: null,
    4: '🔴 Dor intensa — evite sobrecarga muscular',
    5: '🔴 Dor intensa — evite sobrecarga muscular',
  },
  mood: {
    1: 'Humor baixo pode indicar fadiga acumulada',
    2: 'Humor baixo pode indicar fadiga acumulada',
    3: null,
    4: 'Humor elevado — bom sinal de recuperação mental',
    5: 'Humor elevado — bom sinal de recuperação mental',
  },
};

const emojiSets = {
  mood:      { emojis: ['😤', '😔', '😐', '🙂', '😄'],   labels: ['Muito ruim', 'Baixo', 'Normal', 'Bom', 'Excelente'] },
  stress:    { emojis: ['😌', '🙂', '😐', '😰', '🤯'],   labels: ['Muito baixo', 'Leve', 'Moderado', 'Alto', 'Muito alto'] },
  energy:    { emojis: ['🪫', '🔋', '⚡', '🔥', '🚀'],   labels: ['Muito baixa', 'Baixa', 'Moderada', 'Alta', 'Excelente'] },
  hydration: { emojis: ['🌵', '💧', '💦', '🌊', '🐋'],   labels: ['Muito baixa', 'Baixa', 'Adequada', 'Boa', 'Excelente'] },
  soreness:  { emojis: ['✅', '😬', '💪', '🔥', '🆘'],   labels: ['Nenhuma', 'Leve', 'Moderada', 'Alta', 'Intensa'] },
};

export default function EmojiSelector({ label, type, value, onChange }) {
  const set = emojiSets[type] || emojiSets.mood;
  const { emojis, labels } = set;

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex gap-2">
        {emojis.map((emoji, i) => {
          const level = i + 1;
          const isSelected = value === level;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(level)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl text-lg transition-all',
                isSelected
                  ? 'bg-primary/20 border-2 border-primary scale-105'
                  : 'bg-secondary border-2 border-transparent hover:bg-secondary/80'
              )}
            >
              <span>{emoji}</span>
              <span className="text-[9px] text-muted-foreground leading-tight text-center px-0.5">{labels[i]}</span>
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        {value && MICRO_INTERPRETATIONS[type]?.[value] && (
          <motion.p
            key={`${type}-${value}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-[11px] text-muted-foreground mt-1 pl-0.5"
          >
            {MICRO_INTERPRETATIONS[type][value]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
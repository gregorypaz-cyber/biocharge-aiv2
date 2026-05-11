import { cn } from '@/lib/utils';

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
    </div>
  );
}
import { cn } from '@/lib/utils';

const emojiSets = {
  mood: ['😫', '😔', '😐', '🙂', '😄'],
  stress: ['😌', '😊', '😐', '😰', '🤯'],
  energy: ['🔋', '🪫', '⚡', '🔥', '💥'],
  hydration: ['🏜️', '💧', '💦', '🌊', '🐳'],
  soreness: ['✅', '😬', '💪', '🔥', '🚨'],
};

export default function EmojiSelector({ label, type, value, onChange }) {
  const emojis = emojiSets[type] || emojiSets.mood;
  
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
                'flex-1 aspect-square flex items-center justify-center rounded-xl text-lg transition-all',
                isSelected
                  ? 'bg-primary/20 border-2 border-primary scale-110'
                  : 'bg-secondary border-2 border-transparent hover:bg-secondary/80'
              )}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
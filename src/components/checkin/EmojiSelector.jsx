import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

// Emoji nunca em chrome (BRAND §5): as dicas traziam ⚠️/✅/🔴 no texto. Trocamos
// o glifo por um ícone Lucide equivalente, sem mexer na copy nem na cor (muted).
function toneOf(s) {
  const m = s.match(/^([\p{Extended_Pictographic}️]+)\s*/u);
  if (!m) return { Icon: null, text: s };
  const g = m[1];
  const Icon = g.includes('✅') ? CheckCircle2 : g.includes('🔴') ? AlertCircle : AlertTriangle;
  return { Icon, text: s.slice(m[0].length) };
}

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

// ART §7: a opção escolhida acende como uma BRASA na cor do estado. Este é o
// único ponto onde o app é input do humano, não output do sensor — então é o
// único lugar quente num instrumento frio. A cor carrega a valência (§2): pra
// disposição/energia/hidratação, alto = bom = verde; pra stress/dor, invertido.
const GOOD_HIGH = new Set(['mood', 'energy', 'hydration']);
function emberColor(type, level) {
  const good = GOOD_HIGH.has(type) ? level : 6 - level; // normaliza: maior = melhor
  if (good >= 4) return 'hsl(142,70%,50%)';
  if (good === 3) return 'hsl(45,93%,58%)';
  if (good === 2) return 'hsl(25,90%,55%)';
  return 'hsl(0,72%,55%)';
}
const withA = (hsl, a) => hsl.replace('hsl(', 'hsla(').replace(')', `, ${a})`);

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
          <span className="t-micro font-semibold" style={{ color: emberColor(type, value) }}>
            {selectedLabel}
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2" role="group" aria-label={label}>
        {emojis.map((emoji, i) => {
          const level = i + 1;
          const isSelected = value === level;
          const ember = isSelected ? emberColor(type, level) : null;

          return (
            <button
              key={i}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${label}: ${labels[i]}`}
              onClick={() => onChange(level)}
              className={cn(
                'min-h-[58px] flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-base transition-all border-2',
                isSelected ? 'scale-[1.03]' : 'bg-secondary border-transparent hover:bg-secondary/80'
              )}
              style={isSelected ? {
                borderColor: ember,
                background: `radial-gradient(circle at 50% 38%, ${withA(ember, 0.30)}, ${withA(ember, 0.06)})`,
                boxShadow: `0 0 18px -3px ${withA(ember, 0.55)}, inset 0 0 14px -5px ${withA(ember, 0.7)}`,
              } : undefined}
            >
              <span className="leading-none">{emoji}</span>
              <span
                className={cn('t-micro leading-tight text-center px-1', !isSelected && 'text-muted-foreground')}
                style={isSelected ? { color: withA(ember, 0.95) } : undefined}
              >
                {labels[i]}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {selectedInterpretation && (() => {
          const { Icon, text } = toneOf(selectedInterpretation);
          return (
            <motion.p
              key={`${type}-${value}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="t-micro text-muted-foreground mt-1 pl-0.5 flex items-center gap-1"
            >
              {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
              <span>{text}</span>
            </motion.p>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
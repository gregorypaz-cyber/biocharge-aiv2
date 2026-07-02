/**
 * Motion tokens — única fonte de verdade para durações e easings.
 * Regra: zero durações hardcoded em componentes (exceto cerimônia do Gauge).
 */

export const duration = {
  fast:   150,  // feedback, ripple, toggle
  base:   260,  // transições de rota, cards aparecendo
  reveal: 1100, // cerimônia do Gauge herói
};

export const easing = {
  out:        [0, 0, 0.4, 1],          // ease-out padrão
  expressive: [0.32, 0.72, 0, 1],      // entradas de cards — mais presença
};

export const spring = {
  default: { type: 'spring', bounce: 0.15, duration: 0.5 }, // layoutId animations
};

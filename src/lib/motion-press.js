/* ═══ FÍSICA DE TOQUE (reutilizável) ═══════════════════════════════════════
   A mesma linguagem da gema da nav — um corpo que CEDE ao toque e volta com
   mola — destilada em props espalháveis pra qualquer superfície tocável. Não
   é o :active seco do CSS: é mola de verdade, com peso, que devolve.

   PRESS_TAB  → alvos pequenos (abas, ícones): cedem bastante, mola rápida.
   PRESS_CTRL → controles médios (chips, botões, toggles): cedem sutil.

   reduce-motion é respeitado sozinho pelo <MotionConfig reducedMotion="user">
   global — o whileTap de transform é desligado quando o SO pede. */

export const PRESS_TAB = {
  whileTap: { scale: 0.88 },
  transition: { type: 'spring', stiffness: 520, damping: 16, mass: 0.7 },
};

export const PRESS_CTRL = {
  whileTap: { scale: 0.94 },
  transition: { type: 'spring', stiffness: 480, damping: 20, mass: 0.8 },
};

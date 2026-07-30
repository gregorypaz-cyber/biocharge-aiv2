import { useEffect, useRef } from 'react';

/* ═══ O TRAÇO QUE SE DESENHA ══════════════════════════════════════════════
   O gráfico não aparece pronto: a linha se DESENHA da esquerda pra direita,
   como uma caneta traçando o sinal, e o preenchimento sobe atrás dela. É a
   diferença entre um dado que "estava lá" e um dado sendo revelado agora.

   COMO (a parte que exige cuidado):
   O Recharts anima sozinho no mount (um clip que varre a área) — se deixarmos
   ligado, briga com o nosso traço. Então desligamos o dele (isAnimationActive
   false) e desenhamos nós: stroke-dashoffset na curva (.recharts-*-curve) via
   getTotalLength(), e opacidade na área (.recharts-area-area). O Recharts
   renderiza async e o ResponsiveContainer só mede depois do mount, então
   sondamos por rAF até a curva existir e TER comprimento (>0) — sem isso o
   dasharray sai 0 e a linha some.

   Dispara quando ENTRA em vista (IntersectionObserver), não no mount: os
   gráficos abaixo da dobra se desenham quando você chega neles. reduce-motion
   pula tudo — a linha nasce inteira, sem traço. */

const DUR = 1150;     // duração do traço, ms
const FILL_DELAY = 260; // preenchimento começa a subir com a linha já a caminho

/* opts.curve: seletor das curvas que TRAÇAM (default: todas). Scope aqui pra
   NÃO transformar em sólida uma linha tracejada de referência (a média móvel):
   passe uma classe (ex.: '.draw-line .recharts-area-curve') pra só a linha-herói
   se desenhar. opts.fill: seletor dos preenchimentos que sobem (default: todos). */
export function useDrawOnView(deps = [], opts = {}) {
  const curveSel = opts.curve || '.recharts-area-curve, .recharts-line-curve';
  const fillSel = opts.fill || '.recharts-area-area';
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let done = false;
    let raf = 0;
    let io = null;

    const paint = () => {
      const curves = root.querySelectorAll(curveSel);
      const fills = root.querySelectorAll(fillSel);
      if (!curves.length) return false;

      // Todas as curvas precisam ter comprimento medível antes de traçar.
      const lens = [];
      for (const c of curves) {
        const len = typeof c.getTotalLength === 'function' ? c.getTotalLength() : 0;
        if (!len) return false;
        lens.push(len);
      }

      curves.forEach((c, i) => {
        const len = lens[i];
        c.style.transition = 'none';
        c.style.strokeDasharray = `${len}`;
        c.style.strokeDashoffset = `${len}`;
        void c.getBoundingClientRect(); // força reflow: fixa o estado inicial
        c.style.transition = `stroke-dashoffset ${DUR}ms cubic-bezier(0.33, 0, 0.15, 1)`;
        c.style.strokeDashoffset = '0';
      });

      fills.forEach((f) => {
        f.style.transition = 'none';
        f.style.opacity = '0';
        void f.getBoundingClientRect();
        f.style.transition = `opacity ${DUR - FILL_DELAY}ms ease-out ${FILL_DELAY}ms`;
        f.style.opacity = '1';
      });

      return true;
    };

    const run = () => {
      if (done) return;
      if (reduce) { done = true; return; } // nasce inteira
      // sonda até a curva existir e ter comprimento
      const tick = () => {
        if (done) return;
        if (paint()) { done = true; return; }
        raf = requestAnimationFrame(tick);
      };
      tick();
    };

    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { run(); break; }
      }
    }, { threshold: 0.25 });
    io.observe(root);

    return () => {
      done = true;
      if (raf) cancelAnimationFrame(raf);
      if (io) io.disconnect();
    };
  }, deps);

  return ref;
}

import { useEffect, useRef, useState } from 'react';

/* ═══ O NÚMERO QUE CONTA ═══════════════════════════════════════════════════
   O herói já conta (a gema). Os satélites — strain, médias, deltas — apareciam
   chapados. Aqui eles CONTAM até o valor quando entram em vista, o mesmo gesto
   de "o dado sendo revelado agora" do resto do app.

   Regras honestas:
   - conta quando ENTRA em vista (IntersectionObserver), inclusive dentro de um
     card que só abre depois (SecondaryMetrics) — só anima quando você vê;
   - quando o valor MUDA depois (refresh de dado), reconta do antigo pro novo;
   - valor não-numérico (ex.: '—' de ausência §8) é renderizado cru, sem truque;
   - reduce-motion: nasce no valor final, sem contagem.

   Use font-mono/tabular no CALLER pra a largura não tremer enquanto conta. */

const prefersReduce = () =>
  typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function CountUp({ value, from = 0, duration = 900, decimals = 0, format, className }) {
  const isNum = typeof value === 'number' && Number.isFinite(value);
  const safeFrom = Number.isFinite(from) ? from : 0;
  const ref = useRef(null);
  const fromRef = useRef(safeFrom);
  const startedRef = useRef(false);
  const [disp, setDisp] = useState(() => (isNum && !prefersReduce() ? safeFrom : value));

  useEffect(() => {
    if (!isNum || prefersReduce()) { setDisp(value); fromRef.current = value; return; }
    const el = ref.current;
    if (!el) { setDisp(value); fromRef.current = value; return; }

    let raf = 0;
    let io = null;
    let cancelled = false;

    const animate = () => {
      const t0 = performance.now();
      const a = fromRef.current;
      const b = value;
      const tick = (now) => {
        if (cancelled) return;
        const p = Math.min(1, (now - t0) / duration);
        const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
        setDisp(a + (b - a) * e);
        if (p < 1) raf = requestAnimationFrame(tick);
        else fromRef.current = b;
      };
      raf = requestAnimationFrame(tick);
    };

    if (startedRef.current) {
      animate(); // valor mudou depois da 1ª vez: reconta do antigo pro novo
    } else {
      io = new IntersectionObserver((entries) => {
        for (const en of entries) {
          if (en.isIntersecting) { startedRef.current = true; animate(); break; }
        }
      }, { threshold: 0.4 });
      io.observe(el);
    }

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (io) io.disconnect();
    };
  }, [value, isNum, duration]);

  if (!isNum) return <span ref={ref} className={className}>{value}</span>;
  const d = Number.isFinite(disp) ? disp : value;
  const text = format ? format(d) : d.toFixed(decimals);
  return <span ref={ref} className={className}>{text}</span>;
}
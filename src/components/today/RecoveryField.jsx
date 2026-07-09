import React, { useEffect, useRef, useState } from 'react';

/*
 * RecoveryField — "Ponto de Equilíbrio": campo de luz orgânico e vivo que substitui
 * o anel do herói. AGNÓSTICO DE COR por design: renderiza o campo na cor que recebe
 * (`color`), então a semântica de cor continua vivendo no Today (recovery = zona,
 * sono = azul do sono, strain = vs-meta). Nunca reinterpreta o significado da cor.
 *
 * Honestidade:
 *  - value == null  → estado "Calibrando": campo neutro slate, respiração lenta, "—".
 *    Nenhuma cor nem número fabricado.
 *  - Reduce-motion / live=false → campo posado estático (sem respiração/morfismo/poeira).
 *    Só o herói (live) anima; satélites entram estáticos (Fase 2).
 */

// hsl(142,70%,50%) OU hsl(142 70% 50%) → {h,s,l}
function parseHsl(str) {
  if (typeof str !== 'string') return null;
  const m = str.match(/hsl\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/i);
  if (!m) return null;
  return { h: +m[1], s: +m[2], l: +m[3] };
}
const CALIB = { h: 215, s: 14, l: 52 };
const css = ({ h, s, l }, a) => `hsl(${h} ${s}% ${l}%${a != null ? ` / ${a}` : ''})`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// blob orgânico: catmull-rom fechado sobre K âncoras moduladas por senos lentos
const K = 8, CX = 200, CY = 200, R = 132;

function makeAnchors() {
  return Array.from({ length: K }, (_, i) => ({
    a: (i / K) * Math.PI * 2,
    ph1: Math.random() * Math.PI * 2, ph2: Math.random() * Math.PI * 2,
    w1: 0.42 + Math.random() * 0.2, w2: 0.7 + Math.random() * 0.3,
  }));
}
function pointsAt(anchors, t, breath) {
  return anchors.map((an) => {
    const r = R * (1 + 0.055 * Math.sin(an.w1 * t + an.ph1) + 0.03 * Math.sin(an.w2 * t + an.ph2)) * breath;
    return [CX + r * Math.cos(an.a), CY + r * Math.sin(an.a)];
  });
}
function spline(pts) {
  const n = pts.length;
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)} `;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)} `;
  }
  return d + 'Z';
}

export default function RecoveryField({
  value = null,
  max = 100,
  color = 'hsl(215,20%,50%)',
  label = 'Recovery',
  caption = '',
  captionColor = 'text-muted-foreground',
  size = 288,
  live = true,
  animateCount = false,
}) {
  const isCalibrating = value == null;
  const c = isCalibrating ? CALIB : (parseHsl(color) || CALIB);
  const frac = isCalibrating ? 0 : clamp(value / max, 0, 1);

  // peso da fonte atrelado ao score (fino = frágil → robusto)
  const weight = isCalibrating ? 220 : Math.round(200 + frac * 600);
  // respiração mais lenta em score baixo
  const period = isCalibrating ? 5.2 : (4.4 - frac * 1.1);

  const svgRef = useRef(null);
  const blobRef = useRef(null);
  const glowRef = useRef(null);
  const hiRef = useRef(null);
  const cvRef = useRef(null);
  const anchorsRef = useRef(makeAnchors());
  const [display, setDisplay] = useState(isCalibrating ? null : Math.round(value));

  // reduce-motion (media query + mudança em runtime)
  const [reduce, setReduce] = useState(
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onCh = (e) => setReduce(e.matches);
    mq.addEventListener?.('change', onCh);
    return () => mq.removeEventListener?.('change', onCh);
  }, []);

  const animate = live && !reduce;

  // count-up do número
  useEffect(() => {
    if (isCalibrating) { setDisplay(null); return; }
    const target = Math.round(value);
    if (!animateCount || reduce) { setDisplay(target); return; }
    let raf; const from = typeof display === 'number' ? display : 0;
    const t0 = performance.now(); const dur = 650;
    const step = (now) => {
      const k = clamp((now - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isCalibrating, animateCount, reduce]);

  // loop do campo (morfismo + respiração) + poeira
  useEffect(() => {
    const anchors = anchorsRef.current;
    const setPath = (d) => {
      blobRef.current?.setAttribute('d', d);
      glowRef.current?.setAttribute('d', d);
      hiRef.current?.setAttribute('d', d);
    };
    // poeira estelar (só quando anima)
    const cv = cvRef.current;
    const ctx = cv?.getContext?.('2d');
    let parts = [];
    let W = 0, H = 0, DPR = 1;
    const initDust = () => {
      if (!cv || !ctx) return;
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = size; H = size; cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const count = clamp(Math.round(size / 7), 16, 40);
      parts = Array.from({ length: count }, () => {
        const bx = Math.random() < 0.6 ? 0.55 + Math.random() * 0.42 : Math.random();
        const by = Math.random() < 0.6 ? 0.52 + Math.random() * 0.45 : Math.random();
        return {
          x: bx * W, y: by * H, r: 0.4 + Math.random() * 1.2,
          vx: (Math.random() - 0.5) * 0.05, vy: (Math.random() - 0.5) * 0.05,
          a: 0.12 + Math.random() * 0.45, tw: Math.random() * Math.PI * 2,
        };
      });
    };
    const drawDust = (moving) => {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      const tint = { h: c.h, s: Math.min(c.s, 60), l: 82 };
      for (const p of parts) {
        if (moving) {
          p.x += p.vx; p.y += p.vy; p.tw += 0.01;
          if (p.x < 0) p.x += W; if (p.x > W) p.x -= W;
          if (p.y < 0) p.y += H; if (p.y > H) p.y -= H;
        }
        const al = moving ? p.a * (0.6 + 0.4 * Math.sin(p.tw)) : p.a * 0.7;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = css(tint, al.toFixed(2)); ctx.fill();
      }
    };

    initDust();

    let raf; const start = performance.now();
    const frame = (now) => {
      const t = (now - start) / 1000;
      const breath = animate ? 1 + 0.035 * Math.sin((t * 2 * Math.PI) / period) : 1;
      const morphT = animate ? t : 0.6;
      setPath(spline(pointsAt(anchors, morphT, breath)));
      drawDust(animate);
      if (animate) raf = requestAnimationFrame(frame);
    };
    if (animate) raf = requestAnimationFrame(frame);
    else frame(performance.now()); // pose única

    return () => { if (raf) cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, period, size, c.h, c.s, c.l]);

  // cores derivadas
  const core0 = css({ h: c.h, s: Math.min(c.s + 8, 95), l: Math.min(c.l + 22, 86) }, 0.9);
  const core1 = css({ h: c.h, s: c.s, l: c.l }, 0.62);
  const core2 = css({ h: c.h, s: Math.max(c.s - 8, 10), l: Math.max(c.l - 12, 14) }, 0.4);
  const glowCol = css({ h: c.h, s: c.s, l: c.l }, 0.5);
  const textCol = isCalibrating ? 'hsl(215 12% 62%)' : css({ h: c.h, s: Math.min(c.s, 72), l: 82 });
  const gid = React.useId ? React.useId().replace(/:/g, '') : Math.random().toString(36).slice(2);

  const numSize = Math.round(size * 0.30);
  const shown = isCalibrating ? '—' : (display ?? Math.round(value));

  return (
    <div className="flex flex-col items-center" style={{ width: size, maxWidth: '100%' }}>
      <div className="relative" style={{ width: size, height: size, maxWidth: '100%' }}>
        {animate && (
          <canvas
            ref={cvRef}
            className="absolute inset-0 pointer-events-none"
            style={{ width: size, height: size }}
            aria-hidden="true"
          />
        )}
        <svg
          ref={svgRef}
          viewBox="0 0 400 400"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0"
          style={{ width: '100%', height: '100%' }}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`core-${gid}`} cx="42%" cy="36%" r="72%">
              <stop offset="0%" stopColor={core0} />
              <stop offset="46%" stopColor={core1} />
              <stop offset="100%" stopColor={core2} />
            </radialGradient>
            <radialGradient id={`spec-${gid}`} cx="40%" cy="32%" r="40%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <filter id={`soft-${gid}`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="17" />
            </filter>
          </defs>
          <path ref={glowRef} d="" fill={glowCol} filter={`url(#soft-${gid})`} />
          <path ref={blobRef} d="" fill={`url(#core-${gid})`} />
          <path ref={hiRef} d="" fill={`url(#spec-${gid})`} />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <span
            style={{
              fontWeight: weight,
              fontSize: numSize,
              lineHeight: 0.9,
              letterSpacing: '-0.03em',
              color: textCol,
              fontVariantNumeric: 'tabular-nums',
              textShadow: isCalibrating ? 'none' : `0 0 34px ${css(c, '.28')}`,
              transition: 'font-weight .5s ease, color .6s ease, text-shadow .6s ease',
            }}
          >
            {shown}
          </span>
        </div>
      </div>

      <p className="text-[11px] font-bold uppercase tracking-wider text-foreground mt-2">{label}</p>
      {caption ? (
        <p className={`text-[10px] mt-0.5 text-center leading-tight ${captionColor}`}>{caption}</p>
      ) : null}
    </div>
  );
}

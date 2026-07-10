import React, { useEffect, useRef, useState } from 'react';

/*
 * RecoveryField v3 — "Ponto de Equilíbrio", física de vidro translúcido.
 * Camadas (trás → frente): halo difuso · corpo (núcleo luminoso deslocado →
 * borda escura) · vinheta Fresnel · sheen largo no topo · specular nítido ·
 * rim light na base · faíscas internas clipadas (com twinkle no herói).
 *
 * AGNÓSTICO DE COR: renderiza na cor recebida — a semântica (zona/sono/vs-meta)
 * vive no Today. Honestidade: value == null → "Calibrando" (slate, "—").
 * live=false → satélite posado e atenuado. Reduce-motion congela tudo.
 * onClick opcional → gema vira botão com spring de toque (escala 0.97).
 */

function parseHsl(str) {
  if (typeof str !== 'string') return null;
  const m = str.match(/hsl\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/i);
  if (!m) return null;
  return { h: +m[1], s: +m[2], l: +m[3] };
}
const CALIB = { h: 215, s: 14, l: 52 };
const css = ({ h, s, l }, a) => `hsl(${h} ${s}% ${l}%${a != null ? ` / ${a}` : ''})`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// blob orgânico: catmull-rom fechado; K=10 e amplitudes menores = forma suave,
// sem harmônicos de "losango"
const K = 10, CX = 200, CY = 200, R = 146;

function makeAnchors() {
  return Array.from({ length: K }, (_, i) => ({
    a: (i / K) * Math.PI * 2,
    ph1: Math.random() * Math.PI * 2, ph2: Math.random() * Math.PI * 2,
    w1: 0.42 + Math.random() * 0.2, w2: 0.7 + Math.random() * 0.3,
  }));
}
function makeSparks() {
  return Array.from({ length: 16 }, () => {
    const a = Math.random() * Math.PI * 2, d = Math.random() * 74;
    return {
      x: 248 + Math.cos(a) * d * 0.9,
      y: 244 + Math.sin(a) * d * 0.62,
      r: 0.5 + Math.random() * 1.4,
      o: 0.12 + Math.random() * 0.45,
      dur: (3 + Math.random() * 3).toFixed(1),
    };
  });
}
function pointsAt(anchors, t, breath) {
  return anchors.map((an) => {
    const r = R * (1 + 0.05 * Math.sin(an.w1 * t + an.ph1) + 0.028 * Math.sin(an.w2 * t + an.ph2)) * breath;
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
  onClick = null,
}) {
  const isCalibrating = value == null;
  const c = isCalibrating ? CALIB : (parseHsl(color) || CALIB);
  const frac = isCalibrating ? 0 : clamp(value / max, 0, 1);

  // peso da fonte atrelado ao score (fino = frágil → robusto)
  const weight = isCalibrating ? 220 : Math.round(200 + frac * 600);
  const period = isCalibrating ? 5.2 : (4.4 - frac * 1.1);

  const bodyRef = useRef(null);
  const glowRef = useRef(null);
  const vigRef = useRef(null);
  const sheenRef = useRef(null);
  const hiRef = useRef(null);
  const rimRef = useRef(null);
  const clipRef = useRef(null);
  const cvRef = useRef(null);
  const anchorsRef = useRef(makeAnchors());
  const sparksRef = useRef(makeSparks());
  const [display, setDisplay] = useState(isCalibrating ? null : Math.round(value));
  const [pressed, setPressed] = useState(false);

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

  // loop do campo (morfismo + respiração) + poeira externa
  useEffect(() => {
    const anchors = anchorsRef.current;
    const setPath = (d) => {
      for (const r of [bodyRef, glowRef, vigRef, sheenRef, hiRef, rimRef, clipRef]) {
        r.current?.setAttribute('d', d);
      }
    };
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

  // ── física de luz do vidro ──
  const mute = live ? 1 : 0.72;
  // corpo translúcido: núcleo luminoso pequeno → corpo rico → borda escura saturada
  const body0 = css({ h: c.h, s: Math.min(c.s + 2, 95), l: Math.min(c.l + 24, 86) }, 0.98 * mute);
  const body1 = css({ h: c.h, s: c.s, l: c.l }, 0.97 * mute);
  const body2 = css({ h: c.h, s: Math.min(c.s + 8, 95), l: Math.max(c.l - 14, 9) }, 0.97 * mute);
  const body3 = css({ h: c.h, s: Math.min(c.s + 10, 95), l: Math.max(c.l - 26, 7) }, 0.98 * mute);
  const body4 = css({ h: c.h, s: Math.min(c.s + 12, 95), l: Math.max(c.l - 32, 5) }, 0.98 * mute);
  const glowCol = css({ h: c.h, s: c.s, l: c.l }, 0.38 * mute);
  const rimA = css({ h: c.h, s: c.s, l: Math.min(c.l + 24, 88) }, 0.35 * mute);
  const rimB = css({ h: c.h, s: c.s, l: Math.min(c.l + 30, 92) }, 0.65 * mute);

  const textCol = isCalibrating ? 'hsl(215 12% 62%)' : css({ h: c.h, s: Math.min(c.s, 70), l: 86 });
  const gid = React.useId ? React.useId().replace(/:/g, '') : Math.random().toString(36).slice(2);

  const numSize = Math.round(size * 0.30);
  const shown = isCalibrating ? '—' : (display ?? Math.round(value));
  const showSparks = size >= 140;
  const tappable = typeof onClick === 'function';

  return (
    <div
      className={`flex flex-col items-center select-none ${tappable ? 'cursor-pointer' : ''}`}
      style={{
        width: size,
        maxWidth: '100%',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform .18s cubic-bezier(.2,.8,.2,1)',
        WebkitTapHighlightColor: 'transparent',
      }}
      role={tappable ? 'button' : undefined}
      tabIndex={tappable ? 0 : undefined}
      onClick={tappable ? onClick : undefined}
      onKeyDown={tappable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      onPointerDown={tappable ? () => setPressed(true) : undefined}
      onPointerUp={tappable ? () => setPressed(false) : undefined}
      onPointerLeave={tappable ? () => setPressed(false) : undefined}
      onPointerCancel={tappable ? () => setPressed(false) : undefined}
    >
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
          viewBox="0 0 400 400"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0"
          style={{ width: '100%', height: '100%' }}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`body-${gid}`} cx="44%" cy="32%" r="85%">
              <stop offset="0%" stopColor={body0} />
              <stop offset="32%" stopColor={body1} />
              <stop offset="62%" stopColor={body2} />
              <stop offset="86%" stopColor={body3} />
              <stop offset="100%" stopColor={body4} />
            </radialGradient>
            <radialGradient id={`vig-${gid}`} cx="50%" cy="50%" r="52%">
              <stop offset="0%" stopColor="#000" stopOpacity="0" />
              <stop offset="68%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.38" />
            </radialGradient>
            <radialGradient id={`sheen-${gid}`} cx="48%" cy="16%" r="45%">
              <stop offset="0%" stopColor="#fff" stopOpacity={0.13 * mute} />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`spec-${gid}`} cx="34%" cy="22%" r="14%">
              <stop offset="0%" stopColor="#fff" stopOpacity={0.6 * mute} />
              <stop offset="55%" stopColor="#fff" stopOpacity={0.18 * mute} />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`rim-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0" />
              <stop offset="55%" stopColor="#fff" stopOpacity="0" />
              <stop offset="82%" stopColor={rimA} />
              <stop offset="100%" stopColor={rimB} />
            </linearGradient>
            <filter id={`soft-${gid}`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="22" />
            </filter>
            <filter id={`fine-${gid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.4" />
            </filter>
            <clipPath id={`clip-${gid}`}>
              <path ref={clipRef} d="" />
            </clipPath>
          </defs>

          <path ref={glowRef} d="" fill={glowCol} filter={`url(#soft-${gid})`} />
          <path ref={bodyRef} d="" fill={`url(#body-${gid})`} />
          <path ref={vigRef} d="" fill={`url(#vig-${gid})`} />
          <path ref={sheenRef} d="" fill={`url(#sheen-${gid})`} />
          <path ref={hiRef} d="" fill={`url(#spec-${gid})`} />
          <path
            ref={rimRef}
            d=""
            fill="none"
            stroke={`url(#rim-${gid})`}
            strokeWidth="3"
            filter={`url(#fine-${gid})`}
          />
          {showSparks && (
            <g clipPath={`url(#clip-${gid})`}>
              {sparksRef.current.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={p.r}
                  fill="#fff"
                  opacity={(p.o * mute).toFixed(2)}
                >
                  {animate && (
                    <animate
                      attributeName="opacity"
                      values={`${p.o.toFixed(2)};${(p.o * 0.25).toFixed(2)};${p.o.toFixed(2)}`}
                      dur={`${p.dur}s`}
                      repeatCount="indefinite"
                    />
                  )}
                </circle>
              ))}
            </g>
          )}
        </svg>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: weight,
              fontVariationSettings: `'wght' ${weight}`,
              fontSize: numSize,
              lineHeight: 0.9,
              letterSpacing: '-0.03em',
              color: textCol,
              opacity: 0.96,
              mixBlendMode: isCalibrating ? 'normal' : 'screen',
              fontVariantNumeric: 'tabular-nums',
              textShadow: isCalibrating ? 'none' : `0 0 32px ${css(c, '.4')}`,
              transition:
                'font-weight .5s ease, font-variation-settings .5s ease, color .6s ease, text-shadow .6s ease',
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

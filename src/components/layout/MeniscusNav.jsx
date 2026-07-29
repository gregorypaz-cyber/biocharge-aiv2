import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Brain, Clock, Plus, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTodayZone } from '@/hooks/useTodayZone';

/* ═══ O MENISCO ═══════════════════════════════════════════════════════════
   A superfície da nav cede sob a gema, como líquido sob um corpo denso e
   luminoso. A gema não paira: repousa, e a superfície sobe pra encontrá-la.

   COMO O VIDRO SEGUE A CURVA (a parte que quase não deu certo):
   `clip-path` e `overflow:clip` NÃO servem — o recorte roda ANTES do filtro,
   então o blur sai cortado ou some. `mask-image` roda DEPOIS do filtro, em
   todos os motores; o WebKit inclusive mantém layout test pra combinação
   (css3/filters/backdrop/backdrop-filter-with-mask.html). Por isso a máscara
   é um data-URI de SVG regerado por ResizeObserver — largura real, sem
   preserveAspectRatio, sem esticar a curva.

   FORMA É IDENTIDADE, LUZ É LEITURA.
   A curva existe sempre. O que muda com a zona é só a luz — aresta especular,
   derrame dentro do vidro e a própria gema. Em calibração tudo apaga pra
   slate: sem dado, não há luz. Morphar a máscara custaria regerar o data-URI
   a 60fps (caro no Safari) e misturaria os dois papéis.                     */

const APEX   = 26;  // altura da crista acima da aresta plana
const HALF   = 82;  // meia-largura da deformação
const GEM    = 54;  // diâmetro da gema
const GEM_CY = 4;   // centro da gema, em y, a partir do topo do <nav>
const BAR    = 64;  // altura útil da barra (sem safe area)

const NAV_ITEMS = [
  { path: '/today',    icon: Activity,   label: 'Hoje' },
  { path: '/insights', icon: Brain,      label: 'Padrões' },
  { path: '/checkin',  icon: Plus,       label: 'Check-in', gem: true },
  { path: '/trends',   icon: TrendingUp, label: 'Tendências' },
  { path: '/history',  icon: Clock,      label: 'Histórico' },
];

/* Rampas da gema por zona. Mesmos cortes de getZone(): green/yellow/red.
   SLATE é o estado de calibração — presente, mas sem leitura. */
const LIGHT = {
  green:  { h: 142, s: 70, l: 50, gem: [[142,60,70],[142,70,44],[148,80,22],[152,82,14]] },
  yellow: { h: 45,  s: 93, l: 58, gem: [[45,90,76], [45,93,52], [38,88,28], [34,86,17]] },
  red:    { h: 0,   s: 72, l: 55, gem: [[0,80,74],  [0,72,50],  [356,74,28],[352,76,17]] },
};
const SLATE = { h: 215, s: 15, l: 50, gem: [[215,14,52],[215,15,34],[218,16,20],[220,18,13]] };

/** Contorno superior aberto. Plano nas pontas, cristado no centro. */
function contour(w) {
  const cx = w / 2;
  return `M0 ${APEX} L${cx - HALF} ${APEX}`
    + ` C${cx - HALF + 34} ${APEX} ${cx - 44} 0 ${cx} 0`
    + ` C${cx + 44} 0 ${cx + HALF - 34} ${APEX} ${cx + HALF} ${APEX}`
    + ` L${w} ${APEX}`;
}

/** Máscara: contorno + fecho no rodapé. Branco opaco = pixel visível. */
function maskImage(w, h) {
  const d = `${contour(w)} L${w} ${h} L0 ${h} Z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"`
    + ` viewBox="0 0 ${w} ${h}"><path d="${d}" fill="#fff"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export default function MeniscusNav() {
  const location = useLocation();
  const zone = useTodayZone();
  const ref = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  /* Largura real inclui a safe area do iOS, que muda em rotação e ao entrar
     em modo standalone. ResizeObserver cobre os dois casos sem listener de
     resize/orientationchange. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = box;
  const lit = Boolean(zone);
  const L = lit ? (LIGHT[zone] ?? SLATE) : SLATE;
  const mask = useMemo(() => (w > 0 && h > 0 ? maskImage(w, h) : 'none'), [w, h]);

  const cx = w / 2;
  /* Paradas da aresta especular, em fração da largura.
     flank = ombros da crista, onde a luz da gema RASPA a superfície.
     O ápice mergulha: é onde o próprio corpo luminoso oculta a
     superfície. Era o pico no ápice que competia com o specular da
     gema logo acima. */
  const edge = w > 0
    ? { start: (cx - HALF) / w, flankL: (cx - 44) / w,
        flankR: (cx + 44) / w, end: (cx + HALF) / w }
    : { start: 0.35, flankL: 0.44, flankR: 0.56, end: 0.65 };

  return (
    <nav
      ref={ref}
      className="meniscus"
      style={{ '--mn-apex': `${APEX}px`, '--mn-bar': `${BAR}px` }}
      aria-label="Navegação principal"
    >
      {/* 1 · Vidro. A máscara recorta tudo acima da curva. */}
      <div
        className="meniscus-glass"
        style={{ WebkitMaskImage: mask, maskImage: mask }}
        aria-hidden="true"
      />

      {/* 2 · Luz. Derrame dentro do vidro + aresta especular. */}
      {w > 0 && (
        <svg
          className="meniscus-light"
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          aria-hidden="true"
        >
          <defs>
            <radialGradient
              id="mn-spill"
              gradientUnits="userSpaceOnUse"
              cx={cx} cy={GEM_CY} r={Math.max(120, HALF * 1.6)}
            >
              <stop offset="0"
                stopColor={`hsl(${L.h} ${L.s}% ${L.l}%)`}
                stopOpacity={lit ? 0.26 : 0} />
              <stop offset="1"
                stopColor={`hsl(${L.h} ${L.s}% ${L.l}%)`}
                stopOpacity="0" />
            </radialGradient>

            <linearGradient
              id="mn-edge"
              gradientUnits="userSpaceOnUse"
              x1="0" y1="0" x2={w} y2="0"
            >
              <stop offset="0"           stopColor="#fff" stopOpacity="0.055" />
              <stop offset={edge.start}  stopColor="#fff" stopOpacity="0.06" />
              <stop offset={edge.flankL}
                stopColor={lit ? `hsl(${L.h} ${L.s}% 64%)` : '#fff'}
                stopOpacity={lit ? 0.3 : 0.1} />
              <stop offset="0.5"
                stopColor={lit ? `hsl(${L.h} ${L.s}% 64%)` : '#fff'}
                stopOpacity={lit ? 0.09 : 0.045} />
              <stop offset={edge.flankR}
                stopColor={lit ? `hsl(${L.h} ${L.s}% 64%)` : '#fff'}
                stopOpacity={lit ? 0.3 : 0.1} />
              <stop offset={edge.end}    stopColor="#fff" stopOpacity="0.06" />
              <stop offset="1"           stopColor="#fff" stopOpacity="0.055" />
            </linearGradient>
          </defs>

          <path d={`${contour(w)} L${w} ${h} L0 ${h} Z`} fill="url(#mn-spill)" />
          <path d={contour(w)} fill="none" stroke="url(#mn-edge)" strokeWidth="1" />
        </svg>
      )}

      {/* 3 · Itens. A coluna central fica vazia — o alvo dela é a gema. */}
      <div className="meniscus-items">
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path;
          if (item.gem) return <span key={item.path} aria-hidden="true" />;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              className={cn('meniscus-item', active && 'is-active')}
              style={active
                ? { color: `hsl(${L.h} ${L.s}% ${lit ? 62 : 66}%)` }
                : undefined}
            >
              <item.icon className="w-5 h-5" strokeWidth={2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* 4 · A gema. Fora do grid: transborda a crista e mantém alvo próprio. */}
      <Link
        to="/checkin"
        className="meniscus-gem"
        aria-label="Check-in"
        aria-current={location.pathname === '/checkin' ? 'page' : undefined}
        style={{
          width: GEM, height: GEM, top: GEM_CY,
          filter: lit
            ? `drop-shadow(0 4px 16px hsl(${L.h} ${L.s}% ${L.l}% / 0.38))`
            : 'none',
        }}
      >
        <svg viewBox="0 0 96 96" aria-hidden="true">
          <defs>
            <radialGradient id="mn-gem" cx="42%" cy="30%" r="85%">
              {L.gem.map(([h2, s2, l2], i) => (
                <stop key={i}
                  offset={['0%', '36%', '80%', '100%'][i]}
                  stopColor={`hsl(${h2} ${s2}% ${l2}%)`} />
              ))}
            </radialGradient>
            <radialGradient id="mn-gem-spec" cx="34%" cy="22%" r="16%">
              <stop offset="0%"   stopColor="#fff" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d="M48 7 C67 6 89 21 89 46 C89 71 71 90 47 89 C24 88 7 72 7 48 C7 23 27 8 48 7 Z" fill="url(#mn-gem)" />
          <path d="M48 7 C67 6 89 21 89 46 C89 71 71 90 47 89 C24 88 7 72 7 48 C7 23 27 8 48 7 Z" fill="url(#mn-gem-spec)" />
          <g transform="translate(48 48)" fill="none" stroke="hsl(143 100% 96%)"
             strokeWidth="6" strokeLinecap="round">
            <path d="M0 -13 V13" />
            <path d="M-13 0 H13" />
          </g>
        </svg>
      </Link>
    </nav>
  );
}

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/* ═══ SEU NORMAL ══════════════════════════════════════════════════════════════
   O app já EXPLICAVA o score em prosa e PERCEBE (Reck notou); aqui ele MOSTRA,
   visceral, onde cada sinal caiu hoje na SUA própria régua — não numa média de
   mercado. Cada driver vira uma faixa: a zona clara é o teu normal (±1σ), o
   marcador é onde hoje caiu, e a direita é sempre "melhor pro recovery".

   Dado 100% já computado por explainRecoveryV3: { z, value, baseline, deltaPoints,
   direction } por driver. z já vem normalizado como "maior = melhor" em todos os
   sinais (inclusive FC de repouso, onde menor é melhor) — então o eixo é
   universal: → melhor. Nada aqui é inventado; é a decomposição do próprio número.

   Ausência honesta (§8): sem baseline utilizável, explainRecoveryV3 devolve null
   e o card não renderiza — durante a calibração não há "teu normal" pra mostrar. */

const Z_SPAN = 2.5; // extremos da régua em σ (marcador clampado a ±Z_SPAN)

function zToPct(z) {
  const clamped = Math.max(-Z_SPAN, Math.min(Z_SPAN, z));
  return ((clamped + Z_SPAN) / (2 * Z_SPAN)) * 100;
}

function DriverBand({ d, i }) {
  const z = Number.isFinite(Number(d.z)) ? Number(d.z) : 0;
  const pos = zToPct(z);
  const flat = d.deltaPoints === 0;
  const up = d.deltaPoints > 0;
  const markColor = flat ? 'hsl(215 15% 58%)' : up ? 'hsl(142 70% 50%)' : 'hsl(0 72% 55%)';
  const unit = d.unit === 'pts' ? '' : ` ${d.unit}`;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{d.label}</span>
        <span className={cn('font-mono text-sm font-semibold num', flat ? 'text-muted-foreground' : up ? 'text-zone-green' : 'text-zone-red')}>
          {flat ? '±0' : `${d.deltaPoints > 0 ? '+' : ''}${d.deltaPoints}`}
        </span>
      </div>

      <div className="flex items-baseline flex-wrap gap-x-1.5 t-micro leading-none">
        <span className="font-mono text-foreground/80 num">{d.value}{unit}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground">teu normal <span className="font-mono num text-foreground/70">{d.baseline}{unit}</span></span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground/70 font-mono num">{Math.abs(z).toFixed(1)}σ</span>
      </div>

      {/* Régua: zona clara = teu normal (±1σ, 30%–70%); tique central = a base;
         marcador assenta na posição de hoje (esquerda pior → direita melhor).
         Dimensões em px inline de propósito: garante a altura mesmo se o utilitário
         de altura do Tailwind não for gerado (filhos absolutos colapsam o pai). */}
      <div style={{ position: 'relative', height: 14, marginTop: 2 }}>
        <div
          className="absolute overflow-hidden"
          style={{ left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: 6, borderRadius: 9999, background: 'hsl(220 14% 18%)' }}
        >
          <div className="absolute inset-y-0" style={{ left: '30%', right: '30%', background: 'hsl(210 28% 60% / 0.40)' }} />
          <div className="absolute inset-y-0" style={{ left: '50%', width: 1, background: 'hsl(210 20% 82% / 0.7)' }} />
        </div>
        <motion.div
          className="absolute"
          style={{ top: '50%', left: `${pos}%`, width: 12, height: 12, borderRadius: 9999, background: markColor, border: '1.5px solid hsl(var(--background))', x: '-50%', y: '-50%', boxShadow: `0 0 8px ${markColor}` }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.15 + i * 0.07 }}
        />
      </div>
    </div>
  );
}

export default function RecoveryDriversCard({ drivers }) {
  const list = drivers?.drivers;
  if (!list || !list.length) return null; // calibrando / sem baseline → silêncio (§8)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-4 space-y-4"
    >
      <div>
        <h3 className="text-sm font-semibold tracking-tight">Seu normal</h3>
        <p className="t-micro text-muted-foreground mt-0.5 leading-relaxed">
          Onde cada sinal caiu hoje na sua própria régua — e quanto puxou o recovery.
        </p>
      </div>

      <div className="space-y-3.5">
        {list.map((d, i) => <DriverBand key={d.id} d={d} i={i} />)}
      </div>

      <p className="t-micro text-muted-foreground/60 leading-snug border-t border-border/40 pt-2.5">
        Faixa clara = seu normal (±1σ) · direita = melhor pro recovery. Os efeitos não somam ao score: a curva e os tetos não são lineares.
      </p>
    </motion.div>
  );
}

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Scale, Shield, Scissors, AlertTriangle, ChevronDown } from 'lucide-react';
import { flSummary, FL } from '@/lib/biocharge-utils';

// Card "Corte" — FatLossEngine v1.
// O herói é o TREND (peso suavizado); a pesagem crua do dia é figurante.
// Fase Proteção (sono 7d < 6h): meta vira MANTER o peso, ETA some.
// Nenhum texto aqui é gerado por IA — tudo vem determinístico do flSummary.

const ZONE_CFG = {
  green: { text: 'text-emerald-400', chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  yellow: { text: 'text-amber-400', chip: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  red: { text: 'text-red-400', chip: 'bg-red-500/10 text-red-300 border-red-500/20' },
  gray: { text: 'text-muted-foreground', chip: 'bg-muted/40 text-muted-foreground border-border' },
};

function fmtKg(v) {
  return v == null ? '—' : v.toFixed(1).replace('.', ',');
}

function rateLabel(rate, phase) {
  if (rate == null) return 'coletando dados';
  const abs = Math.abs(rate).toFixed(2).replace('.', ',');
  const dir = rate < -0.05 ? `▼ ${abs}` : rate > 0.05 ? `▲ ${abs}` : `● ${abs}`;
  if (phase === 'protect') {
    if (rate < FL.BAND_PROTECT[0]) return `${dir} kg/sem · caindo rápido pra fase atual`;
    if (rate > FL.BAND_PROTECT[1]) return `${dir} kg/sem · subindo`;
    return `${dir} kg/sem · peso estável, como deve ser agora`;
  }
  if (rate < FL.FAST_LOSS) return `${dir} kg/sem · rápido demais`;
  if (rate >= FL.BAND_CUT[0] && rate <= FL.BAND_CUT[1]) return `${dir} kg/sem · dentro da meta`;
  if (rate < FL.BAND_CUT[0]) return `${dir} kg/sem · um pouco rápido`;
  return `${dir} kg/sem · abaixo do ritmo`;
}

/** Sparkline compacto do modo fechado: só a linha do trend, 14 dias, h=24. */
function CompactSparkline({ series }) {
  const pts = series.slice(-14);
  if (pts.length < 3) return null;
  const W = 96;
  const H = 24;
  const vals = pts.map((p) => p.trend);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(max - min, 0.5);
  const x = (i) => (i / (pts.length - 1)) * W;
  const y = (v) => H - 3 - ((v - min) / span) * (H - 6);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.trend).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 24 }} preserveAspectRatio="none" aria-hidden="true">
      <path d={path} fill="none" strokeWidth="2" className="stroke-emerald-400/80" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Delta/semana curto pro modo compacto (só direção + ritmo, sem o julgamento). */
function compactRate(rate) {
  if (rate == null) return 'coletando';
  const abs = Math.abs(rate).toFixed(2).replace('.', ',');
  const dir = rate < -0.05 ? '▼' : rate > 0.05 ? '▲' : '●';
  return `${dir} ${abs} kg/sem`;
}

/** Sparkline: linha do trend + pontos das pesagens cruas (últimos ~30 aceitos). */
function TrendSparkline({ series }) {
  const pts = series.slice(-30);
  if (pts.length < 5) return null;
  const W = 280;
  const H = 44;
  const all = pts.flatMap((p) => [p.trend, p.weight]);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = Math.max(max - min, 0.5);
  const x = (i) => (i / (pts.length - 1)) * W;
  const y = (v) => H - 4 - ((v - min) / span) * (H - 8);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.trend).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-11" preserveAspectRatio="none" aria-hidden="true">
      {pts.map((p, i) => (
        <circle key={p.date + i} cx={x(i)} cy={y(p.weight)} r="1.6" className="fill-muted-foreground/30" />
      ))}
      <path d={path} fill="none" strokeWidth="2" className="stroke-emerald-400/80" strokeLinecap="round" />
    </svg>
  );
}

export default function FatLossCard({ checkins }) {
  const s = useMemo(() => flSummary(checkins), [checkins]);
  const [open, setOpen] = useState(false);

  if (!s || s.series.length < 5) return null; // sem histórico de peso suficiente

  const zone = ZONE_CFG[s.zone] || ZONE_CFG.gray;
  const isProtect = s.phase === 'protect';
  const PhaseIcon = isProtect ? Shield : Scissors;

  let etaText = null;
  if (!isProtect && s.etaWeeks != null) {
    if (s.etaWeeks <= 0) {
      etaText = 'Meta atingida — hora de nova bioimpedância.';
    } else {
      const eta = new Date();
      eta.setDate(eta.getDate() + Math.round(s.etaWeeks * 7));
      const mes = eta.toLocaleDateString('pt-BR', { month: 'short' });
      etaText = `~${FL.TARGET_BF_PCT}% de gordura em ~${Math.round(s.etaWeeks)} semanas (${mes}.)`;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      {/* MODO COMPACTO (padrão): uma linha — ícone + Corte + peso + delta/sem +
          sparkline 14d + chevron. Clique expande o card completo. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 text-left tap-target"
      >
        <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-sm font-semibold tracking-tight shrink-0">Corte</span>
        <span className="text-sm font-mono shrink-0">{fmtKg(s.trendNow)} kg</span>
        <span className={`t-micro font-semibold shrink-0 ${zone.text}`}>{compactRate(s.rate)}</span>
        <div className="flex-1 min-w-0">
          <CompactSparkline series={s.series} />
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {!open ? null : (
      <div className="mt-3 space-y-3">
      {/* Fase */}
      <div className="flex items-center justify-end gap-3">
        <span
          className={`inline-flex items-center gap-1 t-micro font-bold px-2 py-0.5 rounded-full border ${
            isProtect
              ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
          }`}
        >
          <PhaseIcon className="w-3 h-3" />
          {isProtect ? `Proteção (sono ${String(s.sleepAvg7).replace('.', ',')}h)` : 'Corte ativo'}
        </span>
      </div>

      {/* Trend em destaque + pesagem crua figurante */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold font-mono">{fmtKg(s.trendNow)}</span>
            <span className="text-sm text-muted-foreground">kg</span>
          </div>
          <p className="t-micro text-muted-foreground mt-0.5">
            tendência real · última pesagem: {fmtKg(s.lastWeighIn)} kg
          </p>
        </div>
        <div className="text-right">
          <p className={`text-xs font-semibold ${zone.text}`}>{rateLabel(s.rate, s.phase)}</p>
          {s.bfEstimate != null && (
            <p className="t-micro text-muted-foreground mt-0.5">
              ~{String(s.bfEstimate).replace('.', ',')}% gordura (estim.) · alvo {fmtKg(s.targetWeight)} kg
            </p>
          )}
        </div>
      </div>

      <TrendSparkline series={s.series} />

      {/* Rodapé: ETA (só no corte) ou missão da fase Proteção */}
      {isProtect ? (
        <p className="text-xs text-blue-200/90 leading-relaxed">
          Meta agora é <span className="font-semibold">manter o peso e segurar a proteína</span> — o
          corte de verdade começa quando o sono normalizar. ETA pausado.
        </p>
      ) : etaText ? (
        <p className="text-xs text-muted-foreground">{etaText}</p>
      ) : null}

      {/* Alertas determinísticos */}
      {s.muscleAlert && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-500/8 border border-red-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300/90 leading-relaxed">
            Perda rápida com sono baixo — risco de perder músculo, não gordura. Segure os ~140 g de
            proteína e não corte mais calorias agora.
          </p>
        </div>
      )}
      {s.plateau && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/15">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/90 leading-relaxed">
            {FL.PLATEAU_WEEKS} semanas sem queda na tendência — hora de revisar as calorias.
          </p>
        </div>
      )}
      </div>
      )}
    </motion.div>
  );
}

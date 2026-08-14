import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Clock, HeartPulse, Activity } from 'lucide-react';
import { getZoneColor } from '@/lib/biocharge-utils';
import { buildSleepArchitecture, sleepStageNormals } from '@/lib/physiological-engine';
import { formatDateFull } from '@/lib/date-utils';
import { useMotionSafe } from '@/hooks/use-motion-safe';

// HhMM a partir de minutos (piso 0). Formato do card da noite.
function hhmm(mins) {
  if (mins == null || Number.isNaN(mins)) return null;
  const t = Math.max(0, Math.round(mins));
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

// ─── Contexto pessoal por métrica (faixa dos últimos dias) ──────────────────
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

function sleepContext(hours, target) {
  if (hours == null) return null;
  const t = target || 7.5;
  if (hours >= t - 0.25) return { text: `na meta (~${t}h)`, tone: 'good' };
  if (hours >= t - 1) return { text: `pouco abaixo da meta (~${t}h)`, tone: 'low' };
  return { text: `abaixo da meta (~${t}h)`, tone: 'low' };
}

function Qualifier({ ctx }) {
  if (!ctx) return null;
  const cls =
    ctx.tone === 'good' ? 'text-emerald-400' :
    ctx.tone === 'low' ? 'text-amber-400' :
    'text-muted-foreground';
  return <p className={`t-micro mt-0.5 leading-tight ${cls}`}>{ctx.text}</p>;
}

// ─── Sparkline 14d com domínio de piso ancorado no baseline pessoal ─────────
// Antes: min-max puro (achatava/estourava com pouca variância). Agora o span
// tem piso proporcional ao baseline e a linha tracejada marca o "seu normal".
function MiniSpark({ data = [], color = 'hsl(215,20%,55%)', baselineValue = null }) {
  const vals = (data || []).filter((v) => v != null && !Number.isNaN(v));
  if (vals.length < 3) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const b = baselineValue != null && !Number.isNaN(baselineValue) ? baselineValue : (min + max) / 2;
  const span = Math.max(max - min, Math.abs(b) * 0.30) || 1;
  const lo = Math.min(min, b - span / 2);
  const hi = Math.max(max, b + span / 2);
  const range = hi - lo || 1;
  const y = (v) => 22 - ((v - lo) / range) * 20; // 2px de folga topo/base em 24
  const pts = vals
    .map((v, i) => `${((i / (vals.length - 1)) * 100).toFixed(1)},${y(v).toFixed(1)}`)
    .join(' ');
  const baseY = y(b).toFixed(1);
  const lastY = y(vals[vals.length - 1]).toFixed(1);
  return (
    <svg width="100%" height="24" viewBox="0 0 100 24" preserveAspectRatio="none" className="mt-1.5" aria-hidden="true">
      <line x1="0" y1={baseY} x2="100" y2={baseY} stroke="hsl(215,14%,34%)" strokeWidth="1" strokeDasharray="3 3" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <circle cx="100" cy={lastY} r="2.6" fill={color} />
    </svg>
  );
}

function DeltaChip({ delta, baseValue = null, goodUp = true, unit = '' }) {
  if (delta == null || Number.isNaN(delta)) return null;
  const r = Math.round(delta);
  const baseTxt = baseValue != null && !Number.isNaN(baseValue) ? ` vs ${Math.round(baseValue)} (base)` : '';
  if (Math.abs(r) <= 1) return <p className="t-micro mt-0.5 text-muted-foreground">no seu normal{baseTxt}</p>;
  const good = goodUp ? r > 0 : r < 0;
  const cls = good ? 'text-emerald-400' : 'text-amber-400';
  return (
    <p className={`t-micro mt-0.5 font-medium ${cls}`}>
      {r > 0 ? '+' : ''}{r}{unit}{baseTxt}
    </p>
  );
}

// ─── Arquitetura da noite — barra 100% + legenda em linhas ───────────────────
// Puramente de APRESENTAÇÃO. Toda a matemática vem de buildSleepArchitecture;
// este componente só desenha. Base alterna entre % da noite (cama) e % do sono.
const SEG_STYLE = {
  deep:  { background: 'hsl(222,55%,42%)' },
  rem:   { background: 'hsl(205,88%,58%)' },
  light: { background: 'hsl(215,35%,52%)' },
  awake: { background: 'repeating-linear-gradient(135deg, hsl(30,12%,52%) 0 3px, hsl(30,10%,34%) 3px 7px)' },
};

function SleepArchitecture({ checkin, normals }) {
  const [base, setBase] = useState('bed');
  const { initial: motionInitial, transition: reducedTransition } = useMotionSafe();

  const arch = buildSleepArchitecture(checkin, { base });
  if (!arch) return null;

  if (arch.valid === false) {
    return (
      <p className="t-micro text-muted-foreground leading-relaxed">
        Estágios inconsistentes com a duração — barra omitida.
      </p>
    );
  }

  const canSwitch = arch.canSwitchBase;
  const baseLabel = arch.base === 'bed' ? 'do tempo na cama' : 'do sono';
  const ariaLabel =
    arch.segments.map((s) => `${s.label} ${s.pct}%`).join(', ') + ` ${baseLabel}`;

  const footerBase = arch.base === 'bed' ? '% do tempo na cama' : '% do sono (como no Zepp)';
  const footerHint = arch.base === 'bed' ? 'toque para ver % do sono' : 'toque para ver % da noite';
  const toggle = () => canSwitch && setBase((b) => (b === 'bed' ? 'sleep' : 'bed'));

  const normalFor = (id) => (normals ? normals[id] : null);

  return (
    <div className="space-y-2.5">
      <p className="t-micro font-semibold uppercase tracking-widest text-muted-foreground">
        Arquitetura da noite
      </p>

      {/* Barra única — sem gap, a soma tem que ler 100% */}
      <div className="flex h-[22px] rounded-lg overflow-hidden" role="img" aria-label={ariaLabel}>
        {arch.segments.map((s) => (
          <motion.div
            key={s.id}
            initial={motionInitial ?? { width: 0 }}
            animate={{ width: `${s.pct}%` }}
            transition={reducedTransition ?? { duration: 0.8, ease: 'easeOut' }}
            style={SEG_STYLE[s.id]}
            className="h-full"
          />
        ))}
      </div>

      {/* Legenda em LINHAS: ponto · label · duração · pct · normal */}
      <div className="space-y-1">
        {arch.segments.map((s) => {
          const norm = normalFor(s.id);
          return (
            <div key={s.id} className="flex items-center gap-2 t-micro">
              <span className="w-2 h-2 rounded-sm shrink-0" style={SEG_STYLE[s.id]} />
              <span className="text-muted-foreground w-16 shrink-0">{s.label}</span>
              <span className="font-mono font-semibold">{hhmm(s.minutes)}</span>
              <span className="text-muted-foreground">{s.pct}%</span>
              {normals && norm != null && (
                <span className="text-muted-foreground ml-auto">normal {hhmm(norm)}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Rodapé tocável — alterna a base de 100% */}
      {canSwitch ? (
        <div
          role="button"
          tabIndex={0}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggle();
            }
          }}
          className="t-micro text-muted-foreground cursor-pointer select-none pt-0.5 leading-tight"
        >
          {footerBase} · <span className="underline underline-offset-2">{footerHint}</span>
        </div>
      ) : (
        <p className="t-micro text-muted-foreground pt-0.5 leading-tight">{footerBase}</p>
      )}
    </div>
  );
}

export default function MorningRecoveryCard({ checkin, delta = null, recentCheckins = [], baseline = null }) {
  // Cold-start: sem recovery confiável, NÃO mostramos "0"/veredito falso.
  const rawScore = checkin?.morning_recovery_score ?? checkin?.recovery_score ?? null;
  const isCalibrating = rawScore == null;
  const score = rawScore;
  const zone = checkin?.zone || 'yellow';

  const { initial, transition: reducedTransition } = useMotionSafe();

  // Valores de hoje
  const hrvVal = checkin?.hrv_manual ?? checkin?.hrv ?? null;
  const rhrVal = checkin?.resting_hr ?? checkin?.resting_heart_rate ?? null;
  const sleepVal = typeof checkin?.sleep_hours === 'number' ? checkin.sleep_hours : null;

  // Amostras 14d (para sparklines e fallback de baseline)
  const hrvSamples = (recentCheckins || [])
    .map((c) => c.hrv_manual ?? c.hrv)
    .filter((v) => typeof v === 'number' && v > 0)
    .slice(0, 14);
  const rhrSamples = (recentCheckins || [])
    .map((c) => c.resting_hr ?? c.resting_heart_rate)
    .filter((v) => typeof v === 'number' && v > 0)
    .slice(0, 14);
  const sleepSamples = (recentCheckins || [])
    .map((c) => (typeof c.sleep_hours === 'number' ? c.sleep_hours : null))
    .filter((v) => v != null)
    .slice(0, 14);

  const sleepCtx = sleepContext(sleepVal, checkin?.sleep_need_tonight ?? 7.5);

  // Séries 14d cronológicas (antigo → recente).
  const sparkHrv = [...hrvSamples].reverse();
  const sparkRhr = [...rhrSamples].reverse();
  const sparkSleep = [...sleepSamples].reverse();

  // BASELINE ÚNICO: d14 → d7 → média local (fallback pra não quebrar sem baseline).
  const hrvBase = baseline?.hrv?.d14 ?? baseline?.hrv?.d7 ?? mean(hrvSamples);
  const rhrBase = baseline?.rhr?.d14 ?? baseline?.rhr?.d7 ?? mean(rhrSamples);
  const sleepBase = mean(sleepSamples);
  const hrvDelta = hrvVal != null && hrvBase != null ? hrvVal - hrvBase : null;
  const rhrDelta = rhrVal != null && rhrBase != null ? rhrVal - rhrBase : null;

  // Arquitetura (base 'cama') para o cabeçalho: tempo na cama, eficiência, despertares.
  // A barra abaixo tem seu próprio toggle; estes números são sempre da noite inteira.
  const bedArch = buildSleepArchitecture(checkin, { base: 'bed' });
  const archValid = bedArch?.valid === true;
  const effPct = archValid && bedArch.efficiency != null ? Math.round(bedArch.efficiency * 100) : null;
  const effTone =
    effPct == null ? null :
    bedArch.efficiency >= 0.85 ? 'green' :
    bedArch.efficiency >= 0.75 ? 'amber' : 'orange';
  const effCls = {
    green: 'text-zone-green bg-zone-green/10',
    amber: 'text-zone-amber bg-zone-amber/10',
    orange: 'text-zone-orange bg-zone-orange/10',
  }[effTone];

  // Normais pessoais por estágio (mediana 14 noites) — alimenta a legenda.
  const normals = sleepStageNormals(recentCheckins);
  let normalEff = null;
  if (normals) {
    const nSleep = (normals.deep ?? 0) + (normals.rem ?? 0) + (normals.light ?? 0);
    const denom = nSleep + (normals.awake ?? 0);
    normalEff = denom > 0 ? nSleep / denom : null;
  }

  // Leitura da noite: só reafirma desvios JÁ mostrados nos tiles/legenda/chip.
  const deviations = [];
  if (sleepCtx?.tone === 'low') deviations.push('duração abaixo da meta');
  if (archValid && bedArch.efficiency != null && normalEff != null && bedArch.efficiency < normalEff - 0.03)
    deviations.push('eficiência abaixo do seu normal');
  if (hrvVal != null && hrvBase != null && (hrvVal - hrvBase) / hrvBase <= -0.08)
    deviations.push('HRV abaixo do seu normal');
  if (rhrDelta != null && rhrDelta >= 3) deviations.push('FC de repouso acima do normal');

  const bedTime = archValid && bedArch.awakeMin != null ? hhmm(bedArch.totalMinutes) : null;

  return (
    <motion.div
      initial={initial ?? { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedTransition}
      className="rounded-2xl bg-card p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Moon className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-semibold tracking-tight">Sua noite</span>
        <span className="ml-auto t-micro text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDateFull(checkin.date)}
        </span>
      </div>

      {/* KPI da noite — duração dormindo + tempo na cama */}
      <div className="space-y-1.5">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[30px] font-semibold leading-none">
            {sleepVal != null ? hhmm(sleepVal * 60) : '—'}
          </span>
          <span className="t-caption text-muted-foreground">
            dormindo{bedTime ? ` · ${bedTime} na cama` : ''}
          </span>
        </div>

        {/* Chip de eficiência — só fora do cold-start e quando há eficiência */}
        {!isCalibrating && effPct != null && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`t-micro font-semibold px-2 py-0.5 rounded-full ${effCls}`}>
              eficiência {effPct}%
            </span>
            {(bedArch.awakeMin != null || bedArch.awakenings != null) && (
              <span className="t-micro text-muted-foreground">
                {[
                  bedArch.awakeMin != null ? `${Math.round(bedArch.awakeMin)} min acordado` : null,
                  bedArch.awakenings != null ? `${bedArch.awakenings} despertares` : null,
                ].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        )}

        {checkin?.delayed_fatigue_alert && (
          <p className="t-micro text-amber-400 leading-relaxed">
            ⚠️ {checkin.delayed_fatigue_alert}
          </p>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-secondary/50 border border-border/40 p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="t-micro uppercase tracking-wider text-muted-foreground">RMSSD</span>
          </div>
          <p className="text-sm font-semibold">
            {hrvVal != null ? <>{hrvVal}<span className="t-micro font-normal text-muted-foreground"> ms</span></> : '—'}
          </p>
          <DeltaChip delta={hrvDelta} baseValue={hrvBase} goodUp unit=" ms" />
          <MiniSpark data={sparkHrv} color="hsl(199,89%,60%)" baselineValue={hrvBase} />
        </div>

        <div className="rounded-xl bg-secondary/50 border border-border/40 p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <HeartPulse className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="t-micro uppercase tracking-wider text-muted-foreground">RHR</span>
          </div>
          <p className="text-sm font-semibold">
            {rhrVal != null ? <>{rhrVal}<span className="t-micro font-normal text-muted-foreground"> bpm</span></> : '—'}
          </p>
          <DeltaChip delta={rhrDelta} baseValue={rhrBase} goodUp={false} unit=" bpm" />
          <MiniSpark data={sparkRhr} color="hsl(215,20%,55%)" baselineValue={rhrBase} />
        </div>

        <div className="rounded-xl bg-secondary/50 border border-border/40 p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Moon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="t-micro uppercase tracking-wider text-muted-foreground">Sono</span>
          </div>
          <p className="text-sm font-semibold">
            {sleepVal != null ? `${sleepVal}h` : '—'}
          </p>
          <Qualifier ctx={sleepCtx} />
          <MiniSpark data={sparkSleep} color="hsl(199,89%,60%)" baselineValue={sleepBase} />
        </div>
      </div>

      {/* Arquitetura da noite */}
      <SleepArchitecture checkin={checkin} normals={normals} />

      {/* Amarração: reafirma desvios já mostrados + zona do Recovery */}
      {!isCalibrating && score != null && (
        <div className="flex items-start justify-between gap-3 pt-1 border-t border-border/40">
          <p className="t-micro text-muted-foreground leading-relaxed pt-2">
            {deviations.length
              ? `Leitura da noite: ${deviations.join(' · ')}`
              : 'Noite dentro do seu padrão.'}
          </p>
          <span
            className="t-micro font-medium whitespace-nowrap pt-2"
            style={{ color: getZoneColor(zone) }}
          >
            entrou no Recovery {score}
          </span>
        </div>
      )}
    </motion.div>
  );
}

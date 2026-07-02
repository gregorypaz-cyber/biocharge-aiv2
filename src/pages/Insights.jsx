import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserCheckins, useUserTrainingSessions } from '@/hooks/useUserData';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  Send,
  ChevronDown,
  BarChart3,
  Activity,
  Moon,
  Clock3,
  Target,
  Minus,
} from 'lucide-react';
import { computeCheckinScores, getSmartMessage } from '@/lib/biocharge-utils';
import {
  runPhysiologicalAnalysisAsync,
  calculateSleepConsistency,
  corrPValue,
} from '@/lib/physiological-engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { buildCoachContext } from '@/lib/coach-context-builder';
import { cn } from '@/lib/utils';
import CorrelationsCard from '@/components/intelligence/CorrelationsCard';
import AnalysisHighlights from '@/components/intelligence/AnalysisHighlights';
import AnalysisBody from '@/components/intelligence/AnalysisBody';
import FitnessAgeCard from '@/components/intelligence/FitnessAgeCard';
import BodyAgeCard from '@/components/intelligence/BodyAgeCard';

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers */
/* ────────────────────────────────────────────────────────────────────────── */

function avg(arr) {
  const valid = arr.filter((v) => v != null && !isNaN(v));
  return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : null;
}

function pearsonR(arrA, arrB) {
  const n = Math.min(arrA.length, arrB.length);
  if (n < 7) return null;

  const meanA = avg(arrA.slice(0, n));
  const meanB = avg(arrB.slice(0, n));
  if (meanA == null || meanB == null) return null;

  let num = 0;
  let dA = 0;
  let dB = 0;

  for (let i = 0; i < n; i++) {
    const a = arrA[i] - meanA;
    const b = arrB[i] - meanB;
    num += a * b;
    dA += a * a;
    dB += b * b;
  }

  if (dA === 0 || dB === 0) return null;
  return num / Math.sqrt(dA * dB);
}

function getConfidence(n) {
  if (n >= 20) return 'Alta';
  if (n >= 12) return 'Média';
  return 'Baixa';
}

function getConfidenceOrder(conf) {
  if (conf === 'Alta') return 3;
  if (conf === 'Média') return 2;
  return 1;
}

function getTodayLocalString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function BottleneckInsight({ bottleneck }) {
  if (!bottleneck) return null;

  if (!bottleneck.ready) {
    const faltam = Math.max(0, bottleneck.daysNeeded - bottleneck.daysHave);
    return (
      <div className="rounded-2xl border border-border/40 bg-card p-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-secondary border border-border/40 flex items-center justify-center shrink-0">
          <Target className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-micro font-black uppercase tracking-widest text-muted-foreground mb-1">Gargalo pessoal</p>
          <p className="text-heading font-black tracking-tight">Descobrindo seu padrão</p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">
            Faltam cerca de {faltam} dias de registro para identificar com confiança
            qual fator mais move sua recuperação.
          </p>
        </div>
      </div>
    );
  }

  if (!bottleneck.hasSignal) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card p-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-secondary border border-border/40 flex items-center justify-center shrink-0">
          <Target className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-micro font-black uppercase tracking-widest text-muted-foreground mb-1">Gargalo pessoal</p>
          <p className="text-heading font-black tracking-tight">Sem um fator dominante</p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">
            Por enquanto nenhum fator isolado domina sua recuperação — seus dados
            estão equilibrados. Isso costuma ser um bom sinal.
          </p>
        </div>
      </div>
    );
  }

  const b = bottleneck.bottleneck;
  const isPositive = b.direction === 'positive';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border p-5',
        isPositive ? 'border-zone-green/25 bg-zone-green/6' : 'border-health-amber/25 bg-health-amber/6'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 text-lg leading-none',
          isPositive ? 'bg-zone-green/12 border-zone-green/20' : 'bg-health-amber/12 border-health-amber/20'
        )}>
          {b.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-micro font-black uppercase tracking-widest text-muted-foreground mb-1">
            Seu gargalo pessoal
          </p>
          <h2 className="text-xl font-black tracking-tight leading-snug">{b.label}</h2>

          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            De tudo que você registra,{' '}
            <span className="text-foreground font-semibold">{b.label.toLowerCase()}</span> tem a{' '}
            <span className="text-foreground font-semibold">{bottleneck.strengthLabel} associação</span>{' '}
            com o seu HRV do dia seguinte.{' '}
            {isPositive
              ? 'Dias em que ele está mais alto tendem a ser seguidos por HRV melhor.'
              : 'Dias em que ele está mais alto tendem a ser seguidos por HRV mais baixo.'}
          </p>

          <div className="flex items-center gap-2 mt-3">
            <span className={cn(
              'inline-flex items-center gap-1 text-support font-semibold px-2 py-0.5 rounded-full border',
              isPositive ? 'bg-zone-green/12 text-zone-green border-zone-green/20' : 'bg-health-amber/12 text-health-amber border-health-amber/20'
            )}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              r = {b.correlation > 0 ? '+' : ''}{b.correlation}
            </span>
            <span className="text-micro text-muted-foreground">{b.samples} dias</span>
          </div>
        </div>
      </div>
      <p className="text-micro text-muted-foreground/70 leading-relaxed mt-4 pt-3.5 border-t border-border/25">
        Associação observada nos seus dados, não relação de causa garantida.
      </p>
    </motion.div>
  );
}

function LongTermTrendsCard({ trends }) {
  if (!trends) return null;

  // Ainda sem dados suficientes em nenhuma métrica
  if (!trends.ready) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary border border-border/40 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">Acompanhando sua evolução</p>
            <p className="text-support text-muted-foreground leading-relaxed mt-1">
              Em cerca de {trends.daysNeeded} dias de registro o app começa a
              mostrar se suas métricas estão melhorando, estáveis ou em queda ao
              longo das semanas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusOf = (m) => {
    if (!m.hasTrend) {
      return { label: 'estável', Icon: Minus, color: 'text-muted-foreground', bg: 'bg-secondary/60' };
    }
    if (m.sentiment === 'positive') {
      return {
        label: m.direction === 'up' ? 'melhorando' : 'melhorando',
        Icon: m.direction === 'up' ? TrendingUp : TrendingDown,
        color: 'text-zone-green',
        bg: 'bg-zone-green/10',
      };
    }
    return {
      label: 'piorando',
      Icon: m.direction === 'up' ? TrendingUp : TrendingDown,
      color: 'text-health-amber',
      bg: 'bg-health-amber/10',
    };
  };

  const formatChange = (m) => {
    if (!m.hasTrend) return null;
    const sign = m.totalChange > 0 ? '+' : '';
    return `${sign}${m.totalChange}${m.unit}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card tint-recovery p-5"
    >
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-4 h-4 text-primary" />
        <p className="text-micro st text-primary">
          Sua evolução
        </p>
      </div>
      <p className="text-support text-muted-foreground leading-relaxed mb-4">
        Tendência das suas métricas ao longo de {trends.metrics[0]?.days || 0} dias.
        O app só chama de tendência o que é estatisticamente claro — o resto é
        normal oscilar.
      </p>

      <div className="space-y-2">
        {trends.metrics.map((m) => {
          const s = statusOf(m);
          const change = formatChange(m);
          return (
            <div
              key={m.key}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-secondary/40 border border-border/30"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base leading-none shrink-0">{m.icon}</span>
                <span className="text-sm font-medium truncate">{m.label}</span>
              </div>
              <div className={`flex items-center gap-1.5 shrink-0 ${s.color}`}>
                {change && <span className="text-support font-mono">{change}</span>}
                <span className={`inline-flex items-center gap-1 text-support font-semibold px-2 py-0.5 rounded-md ${s.bg}`}>
                  <s.Icon className="w-3 h-3" />
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {!trends.hasAnyTrend && (
        <p className="text-support text-muted-foreground/80 leading-relaxed mt-3 border-t border-border/30 pt-2.5">
          Tudo estável no período — suas métricas estão oscilando em torno da sua
          base, sem uma direção clara. Para evolução de longo prazo, isso é um
          sinal saudável de consistência.
        </p>
      )}
    </motion.div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="space-y-0.5">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {subtitle ? (
        <p className="text-support text-muted-foreground leading-relaxed">{subtitle}</p>
      ) : null}
    </div>
  );
}

function InsightChip({ confidence }) {
  const cls =
    confidence === 'Alta'
      ? 'bg-zone-green/15 text-zone-green'
      : confidence === 'Média'
      ? 'bg-zone-yellow/15 text-zone-yellow'
      : 'bg-zinc-500/15 text-zinc-400';

  return (
    <span className={`text-micro font-bold px-2 py-0.5 rounded-full ${cls}`}>
      {confidence}
    </span>
  );
}

// Mapa emoji → domínio → cor do card (verde recovery, azul sono, cinza strain)
const DOMAIN_OF = { '🌙':'sleep','💤':'sleep','🔬':'sleep','⚡':'strain','💪':'strain','🏃':'strain' };
const DOMAIN_CARD = {
  sleep:  'border-domain-sleep/20 bg-domain-sleep/5',
  strain: 'border-border/50 bg-secondary/30',
};
const DOMAIN_DEFAULT = 'border-zone-green/20 bg-zone-green/5'; // recovery (verde)

function DiscoveryCard({ item }) {
  const domainCls = DOMAIN_CARD[DOMAIN_OF[item.icon]] || DOMAIN_DEFAULT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-xl border p-3.5 space-y-2', domainCls)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="text-lg leading-none mt-0.5">{item.icon}</span>
          <div>
            <p className="text-sm font-semibold leading-snug">{item.title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              {item.text}
            </p>
          </div>
        </div>

        <InsightChip confidence={item.confidence} />
      </div>

      <p className="text-micro text-muted-foreground">
        Baseado em {item.days} {item.days === 1 ? 'registro' : 'registros'} úteis.
      </p>
    </motion.div>
  );
}

function SmallInsightCard({ icon: Icon, title, text, tone = 'neutral' }) {
  const cls =
    tone === 'negative'
      ? 'border-zone-red/20 bg-zone-red/5'
      : tone === 'positive'
      ? 'border-zone-green/20 bg-zone-green/5'
      : 'border-border/40 bg-card';

  const iconCls =
    tone === 'negative'
      ? 'text-zone-red'
      : tone === 'positive'
      ? 'text-zone-green'
      : 'text-primary';

  return (
    <div className={`rounded-xl border px-4 py-3 ${cls}`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconCls}`} />
        <div>
          <p className="text-sm font-semibold leading-snug">{title}</p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">{text}</p>
        </div>
      </div>
    </div>
  );
}

function PrimaryInsightCard({ item }) {
  if (!item) return null;

  const toneStyles = {
    negative: { wrap: 'border-zone-red/25 bg-zone-red/6', icon: 'text-zone-red bg-zone-red/12 border-zone-red/20' },
    positive: { wrap: 'border-zone-green/25 bg-zone-green/6', icon: 'text-zone-green bg-zone-green/12 border-zone-green/20' },
    warning: { wrap: 'border-zone-yellow/25 bg-zone-yellow/6', icon: 'text-zone-yellow bg-zone-yellow/12 border-zone-yellow/20' },
    neutral: { wrap: 'border-border/50 bg-card', icon: 'text-muted-foreground bg-secondary border-border/40' },
  };
  const s = toneStyles[item.tone] || toneStyles.neutral;
  const iconIsText = typeof item.icon === 'string';
  const IconComponent = !iconIsText && item.icon ? item.icon : Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-2xl border p-5 space-y-3.5', s.wrap)}
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0', s.icon)}>
          {iconIsText ? (
            <span className="text-lg leading-none">{item.icon}</span>
          ) : (
            <IconComponent className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-micro font-black uppercase tracking-widest text-muted-foreground mb-1">
            {item.eyebrow || 'Leitura principal'}
          </p>
          <h2 className="text-xl font-black tracking-tight leading-snug">
            {item.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">
            {item.text}
          </p>
        </div>

        {item.badge ? (
          <span className="text-micro font-semibold px-2 py-1 rounded-full bg-background/40 border border-border/40 text-muted-foreground shrink-0 mt-0.5">
            {item.badge}
          </span>
        ) : null}
      </div>

      {item.meta ? (
        <p className="text-support text-muted-foreground border-t border-border/25 pt-3.5 leading-relaxed">
          {item.meta}
        </p>
      ) : null}
    </motion.div>
  );
}

function ExpandableSection({ title, subtitle, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors"
      >
        <div>
          <p className="text-sm font-semibold leading-snug">{title}</p>
          {subtitle ? (
            <p className="text-support text-muted-foreground mt-0.5 leading-relaxed">{subtitle}</p>
          ) : null}
        </div>

        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform shrink-0 ml-3',
            open && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/30">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Primitivos Phase 2: EvidenceRow + NoteCard ── */

function EvidenceRow({ item }) {
  const iconIsEmoji = typeof item.icon === 'string';
  const Icon = !iconIsEmoji && item.icon ? item.icon : null;
  const toneColor =
    item.tone === 'negative' ? 'text-zone-red' :
    item.tone === 'positive' ? 'text-zone-green' :
    item.tone === 'warning' ? 'text-zone-yellow' :
    'text-muted-foreground';

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {iconIsEmoji ? (
        <span className="text-base leading-none shrink-0 mt-0.5">{item.icon}</span>
      ) : Icon ? (
        <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', toneColor)} />
      ) : null}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">{item.title}</p>
        {item.text && (
          <p className="text-support text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">{item.text}</p>
        )}
      </div>
      {item.confidence && <InsightChip confidence={item.confidence} />}
    </div>
  );
}

function NoteCard({ title, text }) {
  return (
    <div className="rounded-xl bg-secondary/40 border border-border/30 px-4 py-3.5 space-y-1">
      <p className="text-support font-semibold text-muted-foreground">{title}</p>
      <p className="text-support text-muted-foreground/70 leading-relaxed">{text}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Discoveries Engine — mais rígido e menos "falso insight" */
/* ────────────────────────────────────────────────────────────────────────── */

function calcDiscoveries(checkins, trainingSessions = []) {
  if (!checkins || checkins.length < 12) return [];

  const sorted = [...checkins].sort((a, b) => (a.date > b.date ? 1 : -1));
  const discoveries = [];

  function getPairs(getA, getB, lag = 0) {
    const pairs = [];
    for (let i = 0; i < sorted.length - lag; i++) {
      const a = getA(sorted[i]);
      const b = getB(sorted[i + lag]);
      if (a != null && !isNaN(a) && b != null && !isNaN(b)) {
        pairs.push([a, b]);
      }
    }
    return pairs;
  }

  function tryAdd(pairs, minPairs, threshold, buildDiscovery) {
    if (pairs.length < minPairs) return;
    const arrA = pairs.map((p) => p[0]);
    const arrB = pairs.map((p) => p[1]);

    // Anti falso-positivo de variável quase-binária: se a variável de entrada (A)
    // tem pouca diversidade real — poucos valores distintos OU 2 valores dominando
    // mais de 85% dos dias — qualquer correlação é instável e enganosa (ex.: stress
    // que é quase sempre 1 ou 2). Nesses casos não geramos descoberta.
    const distinctA = new Set(arrA).size;
    const countsA = {};
    for (const v of arrA) countsA[v] = (countsA[v] || 0) + 1;
    const top2A = Object.values(countsA).sort((a, b) => b - a).slice(0, 2).reduce((s, c) => s + c, 0);
    if (distinctA < 3 || top2A / arrA.length > 0.85) return;

    const r = pearsonR(arrA, arrB);
    if (r == null || Math.abs(r) < threshold) return;

    // Gate estatístico (mesmo da engine): além de |r|, exige p <= 0,05.
    // Sem isso, uma correlação com n=12 e r=0,40 (p~0,20) passaria como "descoberta".
    if (corrPValue(r, arrA.length) > 0.05) return;

    const n = pairs.length;
    const meanA = avg(arrA);
    const meanB = avg(arrB);
    if (meanA == null || meanB == null) return;

    const discovery = buildDiscovery(r, n, meanA, meanB, arrA, arrB);
    if (!discovery) return;

    const confidence = getConfidence(n);
    if (confidence === 'Baixa') return; // <- crítico: não mostrar descoberta fraca

    discoveries.push({
      ...discovery,
      confidence,
    });
  }

  // A) Sono -> HRV do dia seguinte
  tryAdd(
    getPairs((c) => c.sleep_hours, (c) => c.hrv, 1),
    8,
    0.40,
    (r, n, meanA, meanB, arrA, arrB) => {
      const higherSleepIdx = arrA.map((v, i) => (v > meanA ? i : -1)).filter((i) => i !== -1);
      const higherSleepHrv = higherSleepIdx.map((i) => arrB[i]).filter((v) => v != null);
      const lowerSleepIdx = arrA.map((v, i) => (v <= meanA ? i : -1)).filter((i) => i !== -1);
      const lowerSleepHrv = lowerSleepIdx.map((i) => arrB[i]).filter((v) => v != null);

      const delta = Math.round(Math.abs((avg(higherSleepHrv) || meanB) - (avg(lowerSleepHrv) || meanB)));
      if (delta < 3) return null;

      return {
        icon: '🌙',
        title: 'Seu HRV responde ao sono',
        text: `Quando você dorme mais do que sua média recente, seu HRV tende a acordar cerca de ${delta}ms melhor no dia seguinte.`,
        sentiment: r > 0 ? 'positive' : 'negative',
        days: n,
      };
    }
  );

  // B) Sono -> Recovery do dia seguinte
  tryAdd(
    getPairs((c) => c.sleep_hours, (c) => c.recovery_score, 1),
    8,
    0.40,
    (r, n, meanA, meanB, arrA, arrB) => {
      const higherSleepIdx = arrA.map((v, i) => (v > meanA ? i : -1)).filter((i) => i !== -1);
      const higherSleepRecovery = higherSleepIdx.map((i) => arrB[i]).filter((v) => v != null);
      const lowerSleepIdx = arrA.map((v, i) => (v <= meanA ? i : -1)).filter((i) => i !== -1);
      const lowerSleepRecovery = lowerSleepIdx.map((i) => arrB[i]).filter((v) => v != null);

      const delta = Math.round(Math.abs((avg(higherSleepRecovery) || meanB) - (avg(lowerSleepRecovery) || meanB)));
      if (delta < 4) return null;

      return {
        icon: '💤',
        title: 'Seu recovery depende bastante do sono',
        text: `Nas semanas recentes, dormir mais está associado a cerca de ${delta} pontos a mais de recuperação no dia seguinte.`,
        sentiment: r > 0 ? 'positive' : 'negative',
        days: n,
      };
    }
  );

  // C) Stress -> sono
  tryAdd(
    getPairs((c) => c.stress ?? c.stress_level ?? null, (c) => c.sleep_score, 0),
    8,
    0.40,
    (r, n, meanA, meanB, arrA, arrB) => {
      const highStressIdx = arrA.map((v, i) => (v >= 4 ? i : -1)).filter((i) => i !== -1);
      if (highStressIdx.length < 4) return null;

      const highStressSleep = highStressIdx.map((i) => arrB[i]).filter((v) => v != null);
      const delta = Math.round(Math.abs(meanB - (avg(highStressSleep) || meanB)));
      if (delta < 4) return null;

      return {
        icon: '😰',
        title: 'Stress está pesando no seu sono',
        text: `Em dias de stress mais alto, sua qualidade de sono costuma cair cerca de ${delta} pontos.`,
        sentiment: 'negative',
        days: n,
      };
    }
  );

  // D) Stress -> HRV do dia seguinte
  tryAdd(
    getPairs((c) => c.stress ?? c.stress_level ?? null, (c) => c.hrv, 1),
    8,
    0.40,
    (r, n, meanA, meanB) => ({
      icon: '📉',
      title: 'Stress e HRV andam em direções opostas',
      text: `Nos seus dados recentes, dias mais estressantes tendem a aparecer com HRV pior no dia seguinte.`,
      sentiment: r < 0 ? 'negative' : 'neutral',
      days: n,
    })
  );

  // E) Hidratação -> energia
  tryAdd(
    getPairs(
      (c) => c.hydration_liters ?? c.hydration ?? null,
      (c) => c.energy ?? c.energy_level ?? null,
      0
    ),
    8,
    0.35,
    (r, n, meanA, meanB, arrA, arrB) => {
      const goodIdx = arrA.map((v, i) => (v > meanA ? i : -1)).filter((i) => i !== -1);
      const goodEnergy = goodIdx.map((i) => arrB[i]).filter((v) => v != null);
      const delta = parseFloat(Math.abs((avg(goodEnergy) || meanB) - meanB).toFixed(1));
      if (delta < 0.3) return null;

      return {
        icon: '💧',
        title: 'Sua energia responde à hidratação',
        text: `Nos dias em que você se hidrata melhor, sua energia tende a ficar cerca de ${delta} ponto acima da média.`,
        sentiment: r > 0 ? 'positive' : 'neutral',
        days: n,
      };
    }
  );

  // F) Strain -> RHR do dia seguinte
  tryAdd(
    getPairs(
      (c) => c.daily_strain_accumulated ?? c.strain_accumulated ?? null,
      (c) => c.resting_hr ?? c.resting_heart_rate ?? null,
      1
    ),
    8,
    0.40,
    (r, n, meanA, meanB, arrA, arrB) => {
      const highStrainIdx = arrA.map((v, i) => (v > meanA ? i : -1)).filter((i) => i !== -1);
      const nextRhr = highStrainIdx.map((i) => arrB[i]).filter((v) => v != null);
      const delta = Math.round(Math.abs((avg(nextRhr) || meanB) - meanB));
      if (delta < 2) return null;

      return {
        icon: '⚡',
        title: 'Carga alta sobe sua FC de repouso',
        text: `Depois de dias mais pesados, sua FC de repouso tende a amanhecer cerca de ${delta} bpm acima do normal.`,
        sentiment: 'negative',
        days: n,
      };
    }
  );

  // G) Dor muscular -> recovery do dia seguinte
  tryAdd(
    getPairs(
      (c) => c.muscle_soreness ?? c.muscle_soreness_level ?? null,
      (c) => c.recovery_score,
      1
    ),
    8,
    0.35,
    (r, n) => ({
      icon: '💪',
      title: 'Dor muscular pesa na recuperação seguinte',
      text: `Quando a dor muscular sobe muito, sua recuperação do dia seguinte costuma cair junto.`,
      sentiment: r < 0 ? 'negative' : 'neutral',
      days: n,
    })
  );

  // H) Horário de treino -> recovery do dia seguinte (agora bem mais rígido)
  const periodRecovery = {};
  sorted.forEach((c, i) => {
    if (i + 1 >= sorted.length) return;

    const sessions = trainingSessions.filter((s) => s.date === c.date);
    sessions.forEach((s) => {
      if (!s.time_of_day) return;
      if (!periodRecovery[s.time_of_day]) periodRecovery[s.time_of_day] = [];

      const nextRecovery = sorted[i + 1]?.recovery_score;
      if (nextRecovery != null) {
        periodRecovery[s.time_of_day].push(nextRecovery);
      }
    });
  });

  const periods = Object.entries(periodRecovery).filter(([, arr]) => arr.length >= 4);
  if (periods.length >= 2) {
    const ranking = periods
      .map(([period, arr]) => ({ period, values: arr, mean: avg(arr), count: arr.length }))
      .sort((a, b) => b.mean - a.mean);

    const best = ranking[0];
    const second = ranking[1];

    if (best && second && best.count >= 4 && second.count >= 4 && Math.abs(best.mean - second.mean) >= 5) {
      const periodLabels = {
        morning: 'manhã',
        afternoon: 'tarde',
        evening: 'noite',
        night: 'madrugada',
      };

      const conf = getConfidence(best.count);
      if (conf !== 'Baixa') {
        discoveries.push({
          icon: '⏰',
          title: 'Seu horário de treino parece importar',
          text: `Treinos de ${periodLabels[best.period] || best.period} vêm gerando recuperação média de ${Math.round(best.mean)} no dia seguinte — melhor do que outros horários nos seus dados recentes.`,
          sentiment: 'positive',
          confidence: conf,
          days: best.count,
        });
      }
    }
  }

  // I) Sono profundo -> HRV
  tryAdd(
    getPairs((c) => c.deep_sleep_pct, (c) => c.hrv, 0),
    8,
    0.35,
    (r, n, meanA, meanB, arrA, arrB) => {
      const highDeepIdx = arrA.map((v, i) => (v > meanA ? i : -1)).filter((i) => i !== -1);
      const highDeepHrv = highDeepIdx.map((i) => arrB[i]).filter((v) => v != null);
      const delta = Math.round(Math.abs((avg(highDeepHrv) || meanB) - meanB));
      if (delta < 3) return null;

      return {
        icon: '🔬',
        title: 'Sono profundo está ligado ao seu HRV',
        text: `Quando sua proporção de sono profundo sobe, seu HRV da manhã tende a vir cerca de ${delta}ms melhor.`,
        sentiment: r > 0 ? 'positive' : 'negative',
        days: n,
      };
    }
  );

  return discoveries.sort((a, b) => getConfidenceOrder(b.confidence) - getConfidenceOrder(a.confidence));
}

function buildRecentShifts(computed, analysis) {
  if (!computed || computed.length < 8) return [];

  const items = [];
  const topics = new Set();

  const pushUnique = (topic, item) => {
    if (topics.has(topic)) return;
    topics.add(topic);
    items.push(item);
  };

  const last7 = computed.slice(0, 7);
  const prev7 = computed.slice(7, 14);

  if (last7.length >= 4) {
    const rec7 = avg(last7.map((c) => c.recovery_score || 0));
    const prevRec7 = prev7.length >= 4 ? avg(prev7.map((c) => c.recovery_score || 0)) : null;

    if (rec7 != null && prevRec7 != null && Math.abs(rec7 - prevRec7) >= 5) {
      pushUnique('recovery', {
        icon: rec7 > prevRec7 ? TrendingUp : TrendingDown,
        title: rec7 > prevRec7 ? 'Recuperação melhorando' : 'Recuperação piorando',
        text: `Sua média de recuperação dos últimos 7 dias ${rec7 > prevRec7 ? 'subiu' : 'caiu'} de ${Math.round(prevRec7)} para ${Math.round(rec7)}.`,
        tone: rec7 > prevRec7 ? 'positive' : 'negative',
      });
    }

    const sleep7 = avg(last7.map((c) => c.sleep_hours || 0));
    if (sleep7 != null && sleep7 < 7) {
      pushUnique('sleep', {
        icon: Moon,
        title: 'Seu sono recente está curto',
        text: `Sua média de sono nos últimos 7 dias está em ${sleep7.toFixed(1)}h. Isso sozinho já pode limitar seu score de recuperação.`,
        tone: 'negative',
      });
    }
  }

  const ratio = analysis?.trainingLoad?.ratio ?? null;
  if (ratio != null) {
    if (ratio > 1.3) {
      pushUnique('load', {
        icon: AlertTriangle,
        title: 'Sua carga recente está acima do ideal',
        text: `O ratio aguda/crônica está em ${ratio.toFixed(2)}. Isso aumenta a chance de fadiga ou necessidade de redução de intensidade.`,
        tone: 'negative',
      });
    } else if (ratio < 0.9) {
      pushUnique('load', {
        icon: Activity,
        title: 'Sua carga recente está controlada',
        text: `O ratio aguda/crônica está em ${ratio.toFixed(2)}. Há boa chance de absorver carga sem excesso, se o resto do contexto acompanhar.`,
        tone: 'positive',
      });
    }
  }

  const sleepDebt = analysis?.sleepDebt?.debt ?? null;
  if (sleepDebt != null && sleepDebt >= 4 && !topics.has('sleep')) {
    pushUnique('sleep', {
      icon: Clock3,
      title: 'Sua dívida de sono já está relevante',
      text: `Você acumulou cerca de ${sleepDebt.toFixed(1)}h de sono abaixo do ideal. Isso provavelmente está pesando mais do que parece no seu dia.`,
      tone: 'negative',
    });
  }

  return items.slice(0, 2);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Main Page */
/* ────────────────────────────────────────────────────────────────────────── */

export default function Insights() {
  const [analysisExpanded, setAnalysisExpanded] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [aiInsight, setAiInsight] = useState('');
  const [aiInsightError, setAiInsightError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisGeneratedAt, setAnalysisGeneratedAt] = useState(null);

  const [coachInput, setCoachInput] = useState('');
  const [coachQuestion, setCoachQuestion] = useState('');
  const [coachResponse, setCoachResponse] = useState('');
  const [isCoachThinking, setIsCoachThinking] = useState(false);

  const { data: rawCheckins = [] } = useUserCheckins(60);
  const { data: rawTrainingSessions = [] } = useUserTrainingSessions(50);

  const todayDate = getTodayLocalString();

  const checkins = useMemo(() => {
    return [...rawCheckins].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [rawCheckins]);

  const trainingSessions = useMemo(() => {
    return [...rawTrainingSessions].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [rawTrainingSessions]);

  const todayCheckin = useMemo(() => {
    return checkins.find((c) => c.date === todayDate) || null;
  }, [checkins, todayDate]);

  const computed = useMemo(() => {
    return checkins.map((c, i) => computeCheckinScores(c, checkins.slice(i + 1), trainingSessions));
  }, [checkins, trainingSessions]);

  const smartMessages = useMemo(() => {
    if (!computed || computed.length === 0) return [];
    return getSmartMessage(computed[0], computed.slice(1));
  }, [computed]);

  const sleepConsistency = useMemo(() => {
    return calculateSleepConsistency(checkins);
  }, [checkins]);

  const computedKey = `${computed.length}:${computed[0]?.date || ''}:${computed[0]?.readiness_score || ''}`;
  const sessionsKey = `${trainingSessions.length}:${trainingSessions[0]?.date || ''}:${trainingSessions[0]?.strain_score || ''}`;

  useEffect(() => {
    if (computed.length === 0) {
      setAnalysis(null);
      return;
    }

    let cancelled = false;
    setAnalysisLoading(true);

    runPhysiologicalAnalysisAsync(computed, trainingSessions, { useWorker: true, cacheTTLMinutes: 15 })
      .then((result) => {
        if (!cancelled) setAnalysis(result);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('Insights analysis failed', err);
          setAnalysis(null);
        }
      })
      .finally(() => {
        if (!cancelled) setAnalysisLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [computedKey, sessionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const discoveries = useMemo(() => {
    const strictDiscoveries = calcDiscoveries(computed, trainingSessions);
    const sleepDiscovery = sleepConsistency?.discovery
      ? [{ ...sleepConsistency.discovery, confidence: sleepConsistency.discovery.confidence || 'Média' }]
      : [];
    return [...strictDiscoveries, ...sleepDiscovery]
      .filter((d) => d.confidence !== 'Baixa')
      .slice(0, 6);
  }, [computedKey, sessionsKey, sleepConsistency]);

  const recentShifts = useMemo(() => {
    return buildRecentShifts(computed, analysis);
  }, [computedKey, analysis]);

const primaryInsight = useMemo(() => {
  const topDiscovery = discoveries?.[0] || null;
  const topShift = recentShifts?.[0] || null;
  const sleepDebt = analysis?.sleepDebt?.debt ?? null;
  const loadRatio = analysis?.trainingLoad?.ratio ?? null;

  if (topDiscovery) {
    return {
      eyebrow: 'Leitura principal',
      icon: topDiscovery.icon || Sparkles,
      title: topDiscovery.title,
      text: topDiscovery.text,
      tone: topDiscovery.sentiment === 'negative' ? 'negative' : 'positive',
      badge: topDiscovery.confidence || null,
      meta: topDiscovery.days
        ? `Baseado em ${topDiscovery.days} registros úteis.`
        : 'Baseado nos seus dados recentes.',
    };
  }

  if (topShift) {
    return {
      eyebrow: 'Mudança mais relevante',
      icon: topShift.icon || TrendingUp,
      title: topShift.title,
      text: topShift.text,
      tone: topShift.tone || 'neutral',
      badge: '7 dias',
      meta: 'Comparação recente para entender o que mudou no seu corpo.',
    };
  }

  if (sleepDebt != null && sleepDebt >= 4) {
    return {
      eyebrow: 'Leitura principal',
      icon: Moon,
      title: 'Sua dívida de sono está virando o principal limitador',
      text: `Você acumulou cerca de ${sleepDebt.toFixed(1)}h abaixo do ideal. Antes de buscar mais carga, o maior ganho agora provavelmente vem de recuperar sono.`,
      tone: 'warning',
      badge: 'Sono',
      meta: 'Sono acumulado pode afetar recovery, energia e resposta ao treino.',
    };
  }

  if (loadRatio != null && loadRatio > 1.3) {
    return {
      eyebrow: 'Leitura principal',
      icon: AlertTriangle,
      title: 'Sua carga recente está acima da zona ideal',
      text: `Seu ratio aguda/crônica está em ${loadRatio.toFixed(2)}. Isso sugere que hoje vale proteger a recuperação e evitar empilhar intensidade.`,
      tone: 'warning',
      badge: 'Carga',
      meta: 'Carga elevada aumenta a chance de fadiga acumulada nos próximos dias.',
    };
  }

  // Com poucos registros, a causa mais provável é mesmo falta de dados.
  // Com muitos registros (≥20) e ainda sem descoberta, o motivo costuma ser
  // baixa variação no seu comportamento (ex.: sono e stress pouco variam) —
  // não falta de consistência. Dizer "continue registrando" nesse caso seria
  // prometer algo que mais dados não resolvem.
  const lowDataCount = computed.length < 20;

  return {
    eyebrow: 'Leitura principal',
    icon: BarChart3,
    title: lowDataCount
      ? 'Ainda calibrando seus padrões individuais'
      : 'Sem padrão forte o suficiente para destacar agora',
    text: lowDataCount
      ? 'Continue registrando check-ins, sono e treinos. O app já consegue orientar o dia, mas precisa de mais consistência para detectar padrões fortes com confiança.'
      : 'Seus registros já são suficientes, mas nenhuma relação passou no critério de confiança do app. Isso costuma acontecer quando sono, stress ou treino variam pouco dia a dia — não é falta de dado, é rotina estável.',
    tone: 'neutral',
    badge: `${computed.length} registros`,
    meta: lowDataCount
      ? 'Quanto mais consistente o registro, melhores ficam as leituras de recovery, carga e sono.'
      : 'Quando algo variar mais (sono, carga, rotina), o app volta a testar e mostra aqui se encontrar um padrão real.',
  };
}, [discoveries, recentShifts, analysis, computed.length]);

  const evidenceItems = useMemo(() => {
    // Skip discoveries[0] when it's the source for primaryInsight (i.e., manchete)
    const mancheteIsDiscovery = !analysis?.personalBottleneck && discoveries.length > 0;
    const items = [];

    discoveries.forEach((d, i) => {
      if (i === 0 && mancheteIsDiscovery) return;
      items.push({
        ...d,
        tone: d.sentiment === 'negative' ? 'negative' : d.sentiment === 'positive' ? 'positive' : 'neutral',
      });
    });

    recentShifts.forEach(s => items.push({ ...s }));

    return items;
  }, [discoveries, recentShifts, analysis?.personalBottleneck]);

  const todayDetailInsights = useMemo(() => {
    const baselineInsights = analysis?.baselineInsights || [];
    const whyScore = analysis?.whyScore || [];
    const nonTrainingActionable =
      (analysis?.actionableRecs || []).filter((r) => r.category !== 'Treino');

    return {
      baselineInsights,
      whyScore,
      nonTrainingActionable,
    };
  }, [analysis]);

  const suggestedQuestions = useMemo(() => {
  const state = analysis?.physioState?.state;
  const sleepDebt = analysis?.sleepDebt?.debt ?? null;
  const ratio = analysis?.trainingLoad?.ratio ?? null;

  const qs = [];

  if (discoveries[0]?.title) {
    qs.push(`O que significa: ${discoveries[0].title}?`);
  }

  if (sleepDebt != null && sleepDebt >= 4) {
    qs.push(`Como recuperar ${Math.round(sleepDebt)}h de dívida de sono?`);
  }

  if (ratio != null && ratio > 1.3) {
    qs.push('Como ajustar minha carga sem perder evolução?');
  }

  if (state === 'Fatigued' || state === 'Overreached') {
    qs.push('Por que minha recuperação está limitada agora?');
  }

  qs.push('Qual é o principal limitador da minha performance?');
  qs.push('O que devo observar nos próximos 7 dias?');
  qs.push('Como melhorar meu recovery sem parar de treinar?');

  return Array.from(new Set(qs)).slice(0, 4);
}, [analysis, discoveries]);

  async function generateInsights() {
    if (computed.length < 5) return;

    setIsGenerating(true);
    setAiInsight('');
    setAiInsightError('');

    const summary = computed.slice(0, 21).map((c) => ({
      date: c.date,
      recovery: c.recovery_score,
      readiness: c.readiness_score,
      sleep: c.sleep_quality,
      sleep_hours: c.sleep_hours,
      fatigue: c.fatigue_score,
      stress: c.stress_score,
      hrv: c.hrv,
      rpe: c.rpe,
      zone: c.zone,
      deep_sleep: c.deep_sleep_pct,
      mood: c.mood,
      energy: c.energy,
      strain: c.daily_strain_accumulated,
    }));

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um analista de performance e recuperação no estilo Whoop. Gere uma leitura útil, direta e honesta em português brasileiro.

Objetivo:
- transformar dados recentes em uma leitura clara
- explicar o que está afetando recovery, sono e carga
- evitar relatório genérico
- não repetir a recomendação operacional do dia
- não usar tom médico
- não prometer causalidade absoluta

Dados dos últimos ${summary.length} dias:
${JSON.stringify(summary, null, 2)}

Estruture exatamente assim:

## Leitura principal
Explique em 2–3 frases o padrão mais importante agora. Seja direto.

## Evidências nos dados
Liste 2–4 evidências com números reais quando existirem.

## O que está limitando
Explique o principal limitador atual: sono, carga, fadiga, stress, HRV ou consistência.

## Ajuste para os próximos 3 dias
Dê 2–3 ações práticas e específicas. Foque em comportamento.

## O que observar
Diga quais sinais o usuário deve acompanhar nos próximos check-ins.

Regras:
- use números reais quando fizer sentido
- trate padrões como tendência, não certeza absoluta
- seja específico e comportamental
- evite frases vagas como "escute seu corpo"
- não diga apenas "treino moderado recomendado"
- não faça diagnóstico médico
- termine com uma frase completa`,
      });

      setAiInsight(result);
      setAnalysisGeneratedAt(new Date());
    } catch (err) {
      console.warn(err);
      setAiInsightError('Não foi possível gerar a análise profunda agora. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function askCoach() {
    const question = coachInput.trim() || coachQuestion.trim();
    if (!question) return;

    setCoachQuestion(question);
    setIsCoachThinking(true);
    setCoachResponse('');

    const systemContext = buildCoachContext({
      checkins: computed,
      sessions: trainingSessions,
      analysis,
      question,
    });

    try {
      const result = await base44.integrations.Core.InvokeLLM({ prompt: systemContext });

      const impossibleSleep =
        /(\d{2,3})\s*h(oras?)?\s*de\s*sono/i.test(result) &&
        (() => {
          const m = result.match(/(\d+(?:\.\d+)?)\s*h(oras?)?\s*de\s*sono/gi) || [];
          return m.some((match) => parseFloat(match) > 12);
        })();

      const impossibleAvgSleep =
        /média\s*(de\s*sono\s*)?de\s*(\d+(?:\.\d+)?)\s*h/i.test(result) &&
        (() => {
          const m = result.match(/média\s*(?:de\s*sono\s*)?de\s*(\d+(?:\.\d+)?)\s*h/gi) || [];
          return m.some((match) => parseFloat(match.replace(/[^\d.]/g, '')) > 10);
        })();

      if (impossibleSleep || impossibleAvgSleep) {
        setCoachResponse(
          'Ainda não tenho segurança suficiente para responder isso com boa precisão. Continue alimentando seus dados para eu te responder melhor.'
        );
      } else {
        setCoachResponse(result);
      }
    } catch (err) {
      console.warn(err);
      setCoachResponse('Não foi possível conectar ao coach agora. Tente novamente.');
    } finally {
      setCoachInput('');
      setCoachQuestion('');
      setIsCoachThinking(false);
    }
  }

 return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">Padrões</h1>
        <p className="text-sm text-muted-foreground mt-1">
          O que está mudando no seu corpo — recovery, sono e carga.
        </p>
      </div>

      {/* Loading */}
      {analysisLoading && (
        <div className="rounded-xl border border-border/40 bg-card p-4 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
          <p className="text-sm text-muted-foreground">Analisando seus dados mais recentes...</p>
        </div>
      )}

      {/* ── 1. MANCHETE ─────────────────────────────────────── */}
      {analysis?.personalBottleneck ? (
        <BottleneckInsight bottleneck={analysis.personalBottleneck} />
      ) : (
        <PrimaryInsightCard item={primaryInsight} />
      )}

      {/* ── 2. EVIDÊNCIAS ───────────────────────────────────── */}
      {evidenceItems.length > 0 && (
        <section className="space-y-2">
          <SectionHeader
            title="Evidências nos seus dados"
            subtitle="Padrões com confiança estatística suficiente para destacar."
          />
          <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/30 overflow-hidden">
            {evidenceItems.map((item, i) => (
              <EvidenceRow key={`${item.title}-${i}`} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* ── 3. SILÊNCIOS HONESTOS ───────────────────────────── */}
      <NoteCard
        title="O que não passou no critério"
        text="O app testou 9 pares de correlação nos seus dados (sono→HRV, stress→sono, carga→RHR, entre outros). Os que não atingiram |r| ≥ 0,35 ou p ≤ 0,05 foram silenciados — isso é rigor estatístico, não ausência de padrão."
      />

      {/* ── Tendências de longo prazo ───────────────────────── */}
      {analysis?.longTermTrends && (
        <LongTermTrendsCard trends={analysis.longTermTrends} />
      )}

      {/* Fitness Age + Body Age */}
      <FitnessAgeCard />
      <BodyAgeCard />

      {/* ── Leitura completa (IA) ───────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border/60 bg-card overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Leitura completa</h2>
          </div>

          {!todayCheckin?.deep_analysis_text && (
            <Button
              onClick={generateInsights}
              disabled={isGenerating || computed.length < 5}
              size="sm"
              className="bg-primary text-primary-foreground h-8 px-4 text-xs"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Gerar análise'}
            </Button>
          )}
        </div>

        <div className="p-4">
          <p className="text-micro text-muted-foreground mb-3">
            Uma leitura mais detalhada dos padrões recentes de recovery, sono, carga e comportamento.
          </p>

          {computed.length < 5 ? (
            <p className="text-sm text-muted-foreground">
              Registre ao menos 5 check-ins para uma análise profunda mais útil.
            </p>
          ) : todayCheckin?.deep_analysis_text ? (
            <>
              <AnalysisHighlights analysisText={todayCheckin.deep_analysis_text} />
              <AnalysisBody
                text={todayCheckin.deep_analysis_text}
                expanded={analysisExpanded}
                onExpand={() => setAnalysisExpanded(true)}
              />
            </>
          ) : aiInsight ? (
            <>
              <AnalysisHighlights analysisText={aiInsight} />
              <AnalysisBody
                text={aiInsight}
                expanded={analysisExpanded}
                onExpand={() => setAnalysisExpanded(true)}
              />
              {analysisGeneratedAt && (
                <p className="text-micro text-muted-foreground mt-3 text-right">
                  Gerado em{' '}
                  {analysisGeneratedAt.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </>
          ) : aiInsightError ? (
            <p className="text-sm text-zone-red/80">{aiInsightError}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              A análise profunda aparece automaticamente após o check-in, quando disponível. Você também pode gerar uma nova leitura agora.
            </p>
          )}
        </div>
      </motion.div>

      {/* ── Coach IA ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border/60 bg-card overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border/40">
          <Brain className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Pergunte ao Coach</h2>
        </div>

        <div className="p-4 space-y-3.5">
          <p className="text-xs text-muted-foreground leading-relaxed">
  Use o Coach para transformar seus dados recentes em decisões práticas: recovery, sono, carga e treino.
</p>

          {coachResponse ? (
            <>
              <p className="text-micro text-muted-foreground mb-2">
                Baseado nos seus check-ins, treinos e sinais fisiológicos recentes.
              </p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-xl bg-primary/5 border border-primary/15 prose prose-invert prose-sm max-w-none [&_strong]:text-foreground [&_p]:text-foreground/85"
              >
                <ReactMarkdown>{coachResponse}</ReactMarkdown>
              </motion.div>
            </>
          ) : null}

          <div className="space-y-2">
            <Input
              placeholder="Digite sua pergunta ou escolha uma sugestão abaixo..."
              value={coachInput}
              onChange={(e) => setCoachInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && askCoach()}
              className="bg-secondary border-border/40 flex-1"
            />

            <div className="grid grid-cols-1 gap-2">
  {suggestedQuestions.map((q) => (
    <button
      key={q}
      type="button"
      onClick={() => setCoachInput(q)}
      className="w-full text-left px-3 py-2.5 rounded-xl bg-secondary/60 border border-border/60 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      {q}
    </button>
  ))}
</div>

            <Button
              onClick={askCoach}
              disabled={isCoachThinking || !coachInput.trim()}
              className="w-full bg-primary text-primary-foreground h-9 text-xs rounded-xl"
            >
              {isCoachThinking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Perguntar ao Coach
                </>
              )}
            </Button>
          </div>

          <p className="text-micro text-muted-foreground">
            As respostas são geradas por IA com base nos seus dados e não substituem orientação médica.
          </p>
        </div>
      </motion.div>

      {/* ── Correlações ──────────────────────────────────── */}
      <ExpandableSection
        title="Correlações nos seus dados"
        subtitle="Relações estatísticas entre seus sinais (só aparecem quando |r| ≥ 0,35)."
      >
        {analysis && (analysis.correlations?.length > 0 || analysis.laggedEffects?.length > 0) ? (
          <CorrelationsCard
            correlations={analysis.correlations}
            laggedEffects={analysis.laggedEffects}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Ainda não há correlação forte o suficiente para destacar. Continue registrando.
          </p>
        )}
      </ExpandableSection>
    </div>
  );
}

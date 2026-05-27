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
} from 'lucide-react';
import { computeCheckinScores } from '@/lib/biocharge-utils';
import {
  runPhysiologicalAnalysisAsync,
  calculateSleepConsistency,
} from '@/lib/physiological-engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { buildCoachContext } from '@/lib/coach-context-builder';
import { cn } from '@/lib/utils';
import PhysioStateCard from '@/components/intelligence/PhysioStateCard';
import TrainingLoadCard from '@/components/intelligence/TrainingLoadCard';
import CorrelationsCard from '@/components/intelligence/CorrelationsCard';
import AnalysisHighlights from '@/components/intelligence/AnalysisHighlights';
import AnalysisBody from '@/components/intelligence/AnalysisBody';

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

function SectionHeader({ title, subtitle }) {
  return (
    <div className="space-y-0.5">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {subtitle ? (
        <p className="text-[11px] text-muted-foreground leading-relaxed">{subtitle}</p>
      ) : null}
    </div>
  );
}

function InsightChip({ confidence }) {
  const cls =
    confidence === 'Alta'
      ? 'bg-emerald-500/15 text-emerald-400'
      : confidence === 'Média'
      ? 'bg-yellow-500/15 text-yellow-400'
      : 'bg-zinc-500/15 text-zinc-400';

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>
      {confidence}
    </span>
  );
}

function DiscoveryCard({ item }) {
  const negative = item.sentiment === 'negative';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border p-3.5 space-y-2',
        negative
          ? 'border-red-500/20 bg-red-500/5'
          : 'border-emerald-500/20 bg-emerald-500/5'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="text-lg leading-none mt-0.5">{item.icon}</span>
          <div>
            <p className="text-sm font-semibold leading-snug">{item.title}</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">
              {item.text}
            </p>
          </div>
        </div>

        <InsightChip confidence={item.confidence} />
      </div>

      <p className="text-[10px] text-muted-foreground">
        Baseado em {item.days} {item.days === 1 ? 'registro' : 'registros'} úteis.
      </p>
    </motion.div>
  );
}

function SmallInsightCard({ icon: Icon, title, text, tone = 'neutral' }) {
  const cls =
    tone === 'negative'
      ? 'border-red-500/20 bg-red-500/5'
      : tone === 'positive'
      ? 'border-emerald-500/20 bg-emerald-500/5'
      : 'border-border/40 bg-card';

  const iconCls =
    tone === 'negative'
      ? 'text-red-400'
      : tone === 'positive'
      ? 'text-emerald-400'
      : 'text-primary';

  return (
    <div className={`rounded-xl border px-4 py-3 ${cls}`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconCls}`} />
        <div>
          <p className="text-sm font-semibold leading-snug">{title}</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">{text}</p>
        </div>
      </div>
    </div>
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
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{subtitle}</p>
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

/* ────────────────────────────────────────────────────────────────────────── */
/* Discoveries Engine — mais rígido e menos “falso insight” */
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
    const r = pearsonR(arrA, arrB);
    if (r == null || Math.abs(r) < threshold) return;

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
    const sleepDebt = analysis?.sleepDebt?.debt;
    const ratio = analysis?.trainingLoad?.ratio ?? null;

    const qs = [];

    if (discoveries[0]?.title) {
      qs.push(`Explique melhor: ${discoveries[0].title}`);
    }

    if (sleepDebt >= 4) {
      qs.push(`Como reduzir ${Math.round(sleepDebt)}h de dívida de sono?`);
    }

    if (ratio != null && ratio > 1.3) {
      qs.push('O que a minha carga recente está fazendo com a recuperação?');
    } else if (state === 'Fatigued' || state === 'Overreached') {
      qs.push('Por que meu corpo está em fadiga agora?');
    } else {
      qs.push('Qual padrão dos meus dados mais merece atenção?');
    }

    return qs.slice(0, 3);
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
        prompt: `Você é um analista de performance e recuperação no estilo Whoop. Sua função é gerar uma análise profunda, útil e honesta. Em português brasileiro.

Objetivo:
- NÃO repetir a tela de hoje
- NÃO virar feed de recomendações do dia
- focar em padrões reais, aprendizados e comportamento
- falar o que realmente importa para o usuário

Dados dos últimos ${summary.length} dias:
${JSON.stringify(summary, null, 2)}

Estruture assim:
1. **Insight principal** — o padrão mais importante agora
2. **O que está melhorando**
3. **O que está limitando a performance**
4. **O que o usuário deveria mudar no comportamento**
5. **O que observar nos próximos 7 dias**

Regras:
- use números reais quando fizer sentido
- trate padrões como tendência, não como certeza absoluta
- evite linguagem vaga
- não repita "treino moderado recomendado" nem frases de dashboard diário
- seja específico, útil e comportamental`,
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
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
<div>
        <h1 className="text-2xl font-black tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Menos dashboard, mais aprendizado: o que realmente está guiando sua recuperação agora.
        </p>
      </div>

      {/* Loading */}
      {analysisLoading && (
        <div className="rounded-2xl border border-border/50 bg-card p-5 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Analisando seus dados mais recentes...
          </p>
        </div>
      )}

      {/* 1. High-value discoveries */}
      <div className="space-y-3">
        <SectionHeader
          title="Achados que realmente importam"
          subtitle="Só entram aqui padrões com sinal suficiente para valer sua atenção."
        />

        {discoveries.length > 0 ? (
          <div className="space-y-3">
            {discoveries.map((item, i) => (
              <DiscoveryCard key={`${item.title}-${i}`} item={item} />
            ))}
          </div>
        ) : (
          <SmallInsightCard
            icon={BarChart3}
            title="Ainda falta evidência suficiente"
            text="Você já tem dados úteis, mas ainda não há descobertas fortes o bastante para aparecer aqui com confiança."
            tone="neutral"
          />
        )}
      </div>

      {/* 2. Recent shifts */}
      <div className="space-y-3">
        <SectionHeader
          title="O que mudou recentemente"
          subtitle="Leituras dos últimos 7–14 dias para te ajudar a perceber tendências, não só o dia de hoje."
        />

        {recentShifts.length > 0 ? (
          <div className="space-y-3">
            {recentShifts.map((item, i) => (
              <SmallInsightCard
                key={`${item.title}-${i}`}
                icon={item.icon}
                title={item.title}
                text={item.text}
                tone={item.tone}
              />
            ))}
          </div>
        ) : (
          <SmallInsightCard
            icon={TrendingUp}
            title="Sem mudança forte recente"
            text="Nos seus dados atuais, não apareceu nenhuma mudança relevante o bastante para destacar nesta seção."
            tone="neutral"
          />
        )}
      </div>

     {/* 3. Deep analysis */}
<motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border/60 bg-card overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Análise profunda</h2>
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
          <p className="text-[10px] text-muted-foreground mb-3">
            Esta seção resume padrões, limitações e ajustes relevantes com mais profundidade.
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
                <p className="text-[10px] text-muted-foreground mt-3 text-right">
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
            <p className="text-sm text-red-400/80">{aiInsightError}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              A análise profunda aparece automaticamente após o check-in, quando disponível. Você também pode gerar uma nova leitura agora.
            </p>
          )}
        </div>
      </motion.div>

      {/* 4. Coach IA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="rounded-2xl border border-border/60 bg-card overflow-hidden"
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border/40">
          <Brain className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Coach IA</h2>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Use o coach para aprofundar padrões e dúvidas. Esta seção funciona melhor depois que você revisar os achados acima.
          </p>

          {coachResponse ? (
            <>
              <p className="text-[10px] text-muted-foreground mb-2">
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
              placeholder="Pergunte algo mais profundo sobre seus padrões..."
              value={coachInput}
              onChange={(e) => setCoachInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && askCoach()}
              className="bg-secondary border-border/40 flex-1"
            />

            <div className="flex gap-2 overflow-x-auto pb-1">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => setCoachInput(q)}
                  className="px-3 py-1.5 rounded-xl bg-secondary border border-border/60 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors whitespace-nowrap shrink-0"
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
                  Enviar
                </>
              )}
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground">
            As respostas são geradas por IA com base nos seus dados e não substituem orientação médica.
          </p>
        </div>
      </motion.div>

      {/* 5. Modo técnico */}
      <ExpandableSection
        title="Modo técnico"
        subtitle="Detalhes do dia e contexto mais analítico. Opcional para quando você quiser aprofundar."
      >
        {todayDetailInsights.baselineInsights?.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Hoje vs seu baseline
            </p>
            <div className="space-y-2">
              {todayDetailInsights.baselineInsights.map((insight, i) => (
                <div
                  key={`${insight.label}-${i}`}
                  className="rounded-xl border border-border/40 bg-secondary/30 px-3 py-2.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium">{insight.label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      {insight.text}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-bold',
                      insight.isPositive ? 'text-emerald-400' : 'text-red-400'
                    )}
                  >
                    {insight.delta > 0 ? '+' : ''}
                    {insight.delta}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {todayDetailInsights.nonTrainingActionable?.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Pontos de atenção hoje
            </p>
            <div className="space-y-2">
              {todayDetailInsights.nonTrainingActionable.map((rec, i) => (
                <div
                  key={`${rec.id}-${i}`}
                  className="rounded-xl border border-border/40 bg-secondary/30 px-3 py-2.5"
                >
                  <p className="text-sm text-foreground/85 leading-relaxed">{rec.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {todayDetailInsights.whyScore?.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Fatores que mais influenciaram hoje
            </p>

            <div className="space-y-2">
              {todayDetailInsights.whyScore.map((item, i) => (
                <div
                  key={`${item.text}-${i}`}
                  className="rounded-xl border border-border/40 bg-secondary/30 px-3 py-2.5 flex items-start gap-2.5"
                >
                  <span
                    className={cn(
                      'text-xs font-bold mt-0.5 shrink-0',
                      item.impact === 'positive' ? 'text-emerald-400' : 'text-red-400'
                    )}
                  >
                    {item.impact === 'positive' ? '↑' : '↓'}
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </ExpandableSection>

      {/* 6. Technical context */}
      <ExpandableSection
        title="Contexto técnico"
        subtitle="Detalhes fisiológicos e métricas avançadas. Útil para quem quer ir além da leitura principal."
      >
        {analysis?.physioState ? <PhysioStateCard physioState={analysis.physioState} /> : null}

        {analysis ? (
          <TrainingLoadCard trainingLoad={analysis.trainingLoad} sleepDebt={analysis.sleepDebt} />
        ) : null}

        {analysis && (analysis.correlations?.length > 0 || analysis.laggedEffects?.length > 0) ? (
          <CorrelationsCard
            correlations={analysis.correlations}
            laggedEffects={analysis.laggedEffects}
          />
        ) : null}
      </ExpandableSection>
    </div>
  );
}

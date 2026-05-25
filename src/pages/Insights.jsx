import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserCheckins } from '@/hooks/useUserData';
import { motion } from 'framer-motion';
import { Brain, Sparkles, TrendingUp, TrendingDown, AlertTriangle, Loader2, Send, Trophy, Zap } from 'lucide-react';
import { computeCheckinScores, calculateStreak, getBadges, getPerformanceLevel } from '@/lib/biocharge-utils';
import { runPhysiologicalAnalysisAsync,calculateSleepConsistency } from '@/lib/physiological-engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { buildCoachContext } from '@/lib/coach-context-builder';
import { cn } from '@/lib/utils';
import PhysioStateCard from '@/components/intelligence/PhysioStateCard';
import TrainingLoadCard from '@/components/intelligence/TrainingLoadCard';
import CorrelationsCard from '@/components/intelligence/CorrelationsCard';
import DiscoveriesCard from '@/components/intelligence/DiscoveriesCard';
import { useUserTrainingSessions } from '@/hooks/useUserData';
import BaselineInsightsRow from '@/components/intelligence/BaselineInsightsRow';
import AnalysisHighlights from '@/components/intelligence/AnalysisHighlights';
import AnalysisBody from '@/components/intelligence/AnalysisBody';

function pearsonR(arrA, arrB) {
  const n = Math.min(arrA.length, arrB.length);
  if (n < 7) return null;
  const meanA = arrA.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanB = arrB.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0, dA = 0, dB = 0;
  for (let i = 0; i < n; i++) {
    const a = arrA[i] - meanA, b = arrB[i] - meanB;
    num += a * b; dA += a * a; dB += b * b;
  }
  if (dA === 0 || dB === 0) return null;
  return num / Math.sqrt(dA * dB);
}

function getConfidence(n) {
  if (n >= 20) return 'Alta';
  if (n >= 12) return 'Média';
  return 'Baixa';
}

function avg(arr) {
  const valid = arr.filter(v => v != null && !isNaN(v));
  return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : null;
}

function calcDiscoveries(checkins, trainingSessions = []) {
  if (checkins.length < 10) return [];
  const sorted = [...checkins].sort((a, b) => a.date > b.date ? 1 : -1);
  const discoveries = [];

  // Helper: get paired arrays (lagged or same day), filtering null values
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

  function tryAdd(pairs, threshold, buildDiscovery) {
    if (pairs.length < 7) return;
    const arrA = pairs.map(p => p[0]);
    const arrB = pairs.map(p => p[1]);
    const r = pearsonR(arrA, arrB);
    if (r == null || Math.abs(r) < threshold) return;
    const n = pairs.length;
    const meanA = avg(arrA);
    const meanB = avg(arrB);
    if (meanA == null || meanB == null) return;
    discoveries.push(buildDiscovery(r, n, meanA, meanB, arrA, arrB));
  }

  // A) sleep_hours[N] → hrv[N+1]
  tryAdd(
    getPairs(c => c.sleep_hours, c => c.hrv, 1), 0.4,
    (r, n, mA, mB, arrA, arrB) => {
      const highIdxs = arrA.reduce((acc, v, i) => { if (v > mA) acc.push(i); return acc; }, []);
      const high = highIdxs.map(i => arrB[i]).filter(v => v != null);
      const lowIdxs = arrA.reduce((acc, v, i) => { if (v <= mA) acc.push(i); return acc; }, []);
      const low = lowIdxs.map(i => arrB[i]).filter(v => v != null);
      const delta = Math.round(Math.abs((avg(high) || mB) - (avg(low) || mB)));
      return {
        icon: '🌙', title: 'Sono impacta seu HRV',
        text: `Noites com mais sono estão associadas a HRV ${delta > 0 ? '+' : ''}${delta}ms maior no dia seguinte.`,
        sentiment: r > 0 ? 'positive' : 'negative', confidence: getConfidence(n), days: n,
      };
    }
  );

  // B) sleep_hours[N] → recovery_score[N+1]
  tryAdd(
    getPairs(c => c.sleep_hours, c => c.recovery_score, 1), 0.4,
    (r, n, mA, mB) => ({
      icon: '💤', title: 'Sono e recuperação',
      text: `Cada hora extra de sono tende a elevar seu score de recuperação no dia seguinte. Média de recuperação: ${Math.round(mB)}.`,
      sentiment: r > 0 ? 'positive' : 'neutral', confidence: getConfidence(n), days: n,
    })
  );

  // C) stress_level[N] → sleep_score[N]
  tryAdd(
    getPairs(c => c.stress ?? c.stress_level ?? null, c => c.sleep_score, 0), 0.4,
    (r, n, mA, mB, arrA, arrB) => {
      const highIdxs = arrA.map((v, i) => v >= 4 ? i : -1).filter(i => i !== -1);
      const highStress = highIdxs.map(i => arrB[i]).filter(v => v != null);
      const delta = Math.round(Math.abs(mB - (avg(highStress) || mB)));
      return {
        icon: '😰', title: 'Stress afeta seu sono',
        text: `Dias com stress elevado reduzem sua qualidade de sono em média ${delta} pontos.`,
        sentiment: 'negative', confidence: getConfidence(n), days: n,
      };
    }
  );

  // D) stress_level[N] → hrv[N+1]
  tryAdd(
    getPairs(c => c.stress ?? c.stress_level ?? null, c => c.hrv, 1), 0.4,
    (r, n, mA, mB) => ({
      icon: '📉', title: 'Stress impacta HRV',
      text: `Dias estressantes tendem a reduzir seu HRV no dia seguinte. HRV médio: ${Math.round(mB)}ms.`,
      sentiment: r < 0 ? 'negative' : 'positive', confidence: getConfidence(n), days: n,
    })
  );

  // E) hydration_liters[N] → energy_level[N]
  tryAdd(
    getPairs(c => c.hydration_liters ?? c.hydration ?? null, c => c.energy ?? c.energy_level ?? null, 0), 0.4,
    (r, n, mA, mB, arrA, arrB) => {
      const highIdxs = arrA.map((v, i) => v > mA ? i : -1).filter(i => i !== -1);
      const goodHydration = highIdxs.map(i => arrB[i]).filter(v => v != null);
      const delta = parseFloat(Math.abs((avg(goodHydration) || mB) - mB).toFixed(1));
      return {
        icon: '💧', title: 'Hidratação e energia',
        text: `Dias com boa hidratação mostram energia ${delta > 0 ? '+' : ''}${delta} pontos acima da sua média.`,
        sentiment: r > 0 ? 'positive' : 'neutral', confidence: getConfidence(n), days: n,
      };
    }
  );

  // F) daily_strain_accumulated[N] → resting_hr[N+1]
  tryAdd(
    getPairs(c => c.daily_strain_accumulated ?? c.strain_accumulated ?? null, c => c.resting_hr ?? c.resting_heart_rate ?? null, 1), 0.4,
    (r, n, mA, mB, arrA, arrB) => {
      const highStrain = arrA.reduce((acc, v, i) => { if (v > mA) acc.push(arrB[i]); return acc; }, []).filter(v => v != null);
      const delta = Math.round(Math.abs((avg(highStrain) || mB) - mB));
      return {
        icon: '⚡', title: 'Treino eleva sua FC',
        text: `Após treinos intensos, sua FC de repouso fica ${delta}bpm acima do normal no dia seguinte.`,
        sentiment: 'negative', confidence: getConfidence(n), days: n,
      };
    }
  );

  // G) muscle_soreness[N] → recovery_score[N+1]
  tryAdd(
    getPairs(c => c.muscle_soreness ?? c.muscle_soreness_level ?? null, c => c.recovery_score, 1), 0.4,
    (r, n, mA, mB) => ({
      icon: '💪', title: 'Dor muscular e recuperação',
      text: `Dias com alta dor muscular impactam o seu score de recuperação no dia seguinte. Média: ${Math.round(mB)}.`,
      sentiment: r < 0 ? 'negative' : 'neutral', confidence: getConfidence(n), days: n,
    })
  );

  // H) time_of_day → recovery_score do dia seguinte
  const periodRecovery = {};
  sorted.forEach((c, i) => {
    if (i + 1 >= sorted.length) return;
    const sessions = trainingSessions.filter(s => s.date === c.date);
    sessions.forEach(s => {
      if (!s.time_of_day) return;
      if (!periodRecovery[s.time_of_day]) periodRecovery[s.time_of_day] = [];
      const nextRecovery = sorted[i + 1]?.recovery_score;
      if (nextRecovery) periodRecovery[s.time_of_day].push(nextRecovery);
    });
  });
  const periods = Object.entries(periodRecovery).filter(([, arr]) => arr.length >= 2);
  if (periods.length >= 2) {
    const best = periods.sort((a, b) => avg(b[1]) - avg(a[1]))[0];
    const periodLabels = { morning: 'manhã', afternoon: 'tarde', evening: 'noite', night: 'madrugada' };
    discoveries.push({
      icon: '⏰', title: 'Seu melhor horário de treino',
      text: `Treinos de ${periodLabels[best[0]] || best[0]} geram recovery médio de ${Math.round(avg(best[1]))} no dia seguinte — seu período mais favorável.`,
      sentiment: 'positive',
      confidence: getConfidence(best[1].length),
      days: best[1].length,
    });
  }

  // I) deep_sleep_pct → hrv (mesmo dia)
  tryAdd(
    getPairs(c => c.deep_sleep_pct, c => c.hrv, 0), 0.35,
    (r, n, mA, mB, arrA, arrB) => {
      const highDeep = arrA.reduce((acc, v, i) => { if (v > mA) acc.push(arrB[i]); return acc; }, []).filter(v => v != null);
      const delta = Math.round(Math.abs((avg(highDeep) || mB) - mB));
      return {
        icon: '🔬', title: 'Sono profundo e HRV',
        text: `Noites com mais sono profundo estão associadas a HRV ${delta}ms maior pela manhã.`,
        sentiment: r > 0 ? 'positive' : 'negative',
        confidence: getConfidence(n), days: n,
      };
    }
  );



  return discoveries;
}

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

  const { data: checkins = [] } = useUserCheckins(60);
  const { data: trainingSessions = [] } = useUserTrainingSessions(50);
  const todayDate = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const todayCheckin = checkins.find(c => c.date === todayDate);

  const computed = useMemo(() => checkins.map((c, i) => computeCheckinScores(c, checkins.slice(i + 1), [])), [checkins]);
  const sleepConsistency = useMemo(() => calculateSleepConsistency(checkins), [checkins.length]);

  const streak = calculateStreak(checkins);
  const badges = getBadges(computed, streak);
  const avgRecovery = computed.length
    ? Math.round(computed.reduce((s, c) => s + (c.recovery_score || 0), 0) / computed.length)
    : 0;
  const perfLevel = getPerformanceLevel(avgRecovery);
  const actionableRecs = analysis?.actionableRecs || [];

  const discoveries = useMemo(() => calcDiscoveries(computed, trainingSessions), [computed.length, trainingSessions.length]);

  // ✅ FIX: computedKey e sessionsKey fora do useMemo
  const computedKey = computed.length + ':' + (computed[0]?.date || '');
  const sessionsKey = trainingSessions.length + ':' + (trainingSessions[0]?.date || '');

  // ✅ FIX: useEffect fora do useMemo
  useEffect(() => {
    if (computed.length === 0) { setAnalysis(null); return; }
    let cancelled = false;
    setAnalysisLoading(true);
    runPhysiologicalAnalysisAsync(computed, trainingSessions, { useWorker: true, cacheTTLMinutes: 15 })
      .then(result => { if (!cancelled) setAnalysis(result); })
      .catch(() => { if (!cancelled) setAnalysis(null); })
      .finally(() => { if (!cancelled) setAnalysisLoading(false); });
    return () => { cancelled = true; };
  }, [computedKey, sessionsKey]);

  const suggestedQuestions = useMemo(() => {
    const state = analysis?.physioState?.state;
    const sleepDebt = analysis?.sleepDebt?.debt;
    const loadRisk = analysis?.trainingLoad?.risk;
    const todayScore = computed[0]?.readiness_score ?? computed[0]?.recovery_score ?? null;
    const hrvDelta = analysis?.baselineInsights?.find(i => i.label === 'HRV')?.delta ?? null;
    const questions = [];

    // Q1 — contexto do estado atual
    if (state === 'Overreached' || state === 'Fatigued') questions.push('Por que estou sobrecarregado?');
    else if (todayScore != null && todayScore >= 75) questions.push('Posso treinar forte hoje?');
    else questions.push('Devo treinar hoje?');

    // Q2 — sono/déficit
    if (sleepDebt > 3) questions.push(`Como recuperar ${Math.round(sleepDebt)}h de déficit de sono?`);
    else questions.push('Como melhorar meu sono?');

    // Q3 — HRV ou carga
    if (hrvDelta != null && hrvDelta < -10) questions.push('Por que meu HRV caiu?');
    else if (loadRisk === 'high' || loadRisk === 'moderate') questions.push('Como reduzir o risco de lesão agora?');
    else questions.push('Por que meu HRV caiu?');

    return questions.slice(0, 3);
  }, [analysis, computed]);

  const generateInsights = async () => {
    if (computed.length < 3) return;
    setIsGenerating(true);
    const summary = computed.slice(0, 14).map(c => ({
      date: c.date,
      recovery: c.recovery_score,
      readiness: c.readiness_score,
      sleep: c.sleep_quality,
      fatigue: c.fatigue_score,
      stress: c.stress_score,
      hrv: c.hrv,
      rpe: c.rpe,
      zone: c.zone,
      deep_sleep: c.deep_sleep_pct,
      mood: c.mood,
      energy: c.energy,
      sleep_hours: c.sleep_hours,
    }));

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é o BioCharge AI Coach, especialista em performance e recuperação física. Analise os dados abaixo em português brasileiro.

Dados dos últimos ${summary.length} dias:
${JSON.stringify(summary, null, 2)}

Forneça uma análise detalhada e personalizada incluindo:
1. **📊 Análise de Tendência** — como os scores evoluíram
2. **🔍 Padrões Detectados** — correlações entre sono, HRV, fadiga, RPE
3. **⚠️ Alertas** — sinais de overtraining, déficit de recuperação
4. **💡 Recomendações Específicas** — baseadas nos dados reais do usuário
5. **📈 Próximos 7 dias** — estratégia sugerida

Seja específico, cite os números reais do usuário. Evite insights genéricos. Use emojis para tornar mais visual.`,
      });
      setAiInsight(result);
      setAnalysisGeneratedAt(new Date());
    } catch {
      setAiInsightError('Não foi possível gerar análise agora. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const askCoach = async () => {
    const question = coachInput.trim() || coachQuestion.trim();
    if (!question) return;
    setCoachQuestion(question);
    setIsCoachThinking(true);

    const systemContext = buildCoachContext({ checkins: computed, sessions: trainingSessions, analysis, question });

    try {
      const result = await base44.integrations.Core.InvokeLLM({ prompt: systemContext });

      // Validate response for impossible numbers
      const impossibleSleep = /(\d{2,3})\s*h(oras?)?\s*de\s*sono/i.test(result) && (() => {
        const m = result.match(/(\d+(?:\.\d+)?)\s*h(oras?)?\s*de\s*sono/gi) || [];
        return m.some(match => parseFloat(match) > 12);
      })();
      const impossibleAvgSleep = /média\s*(de\s*sono\s*)?de\s*(\d+(?:\.\d+)?)\s*h/i.test(result) && (() => {
        const m = result.match(/média\s*(?:de\s*sono\s*)?de\s*(\d+(?:\.\d+)?)\s*h/gi) || [];
        return m.some(match => parseFloat(match.replace(/[^\d.]/g, '')) > 10);
      })();

      if (impossibleSleep || impossibleAvgSleep) {
        setCoachResponse('Não tenho dados suficientes para responder com precisão. Continue fazendo check-ins diários para que eu possa te dar insights personalizados.');
      } else {
        setCoachResponse(result);
      }
    } catch {
      setCoachResponse('Não foi possível conectar ao coach agora. Tente novamente.');
    } finally {
      setCoachInput('');
      setCoachQuestion('');
      setIsCoachThinking(false);
    }
  };

  // Pattern cards
  const patterns = [];
  if (computed.length >= 3) {
    const avg = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
    const recentRecovery = avg(computed.slice(0, 3).map(c => c.recovery_score || 0));
    const recentFatigue = avg(computed.slice(0, 3).map(c => c.fatigue_score || 0));
    const recentSleep = avg(computed.slice(0, 3).map(c => c.sleep_quality || 0));

    if (recentRecovery >= 75) patterns.push({ icon: TrendingUp, color: 'hsl(142,70%,55%)', negative: false, text: `Recovery médio de ${Math.round(recentRecovery)} nos últimos 3 dias — Excelente tendência` });
    else if (recentRecovery < 60) patterns.push({ icon: TrendingDown, color: 'hsl(0,72%,60%)', negative: true, text: `Recovery médio baixo: ${Math.round(recentRecovery)} — Priorize recuperação esta semana` });
    if (recentFatigue > 55) patterns.push({ icon: AlertTriangle, color: 'hsl(45,93%,63%)', negative: true, text: `Fadiga elevada detectada: ${Math.round(recentFatigue)}/100 — Considere reduzir intensidade` });
    if (recentSleep < 60) patterns.push({ icon: TrendingDown, color: 'hsl(0,72%,60%)', negative: true, text: `Sono em queda: ${Math.round(recentSleep)} pts — Impacto direto no Recovery` });
    else if (recentSleep >= 80) patterns.push({ icon: TrendingUp, color: 'hsl(142,70%,55%)', negative: false, text: `Sono de alta qualidade: ${Math.round(recentSleep)} pts — Continue o protocolo atual` });
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Inteligência IA</h1>
        <p className="text-sm text-muted-foreground mt-1">Insights personalizados baseados nos seus dados</p>
      </div>

      {/* ── BLOCO 1 — Por que sua prontidão é X hoje? ───────────────────────── */}
      {analysis?.baselineInsights?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">O que explica seu dia de hoje</h3>
          <BaselineInsightsRow insights={analysis.baselineInsights} />
        </div>
      )}

      {/* AI Smart Messages (insights automáticos contextuais) */}
      {actionableRecs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Insights Automáticos</h3>
          {actionableRecs.map((rec, i) => {
            const categoryMeta = rec.category === 'Treino'
              ? { badge: '🏋️ Treino', badgeClass: 'bg-emerald-500/15 text-emerald-400' }
              : rec.category === 'Sono'
              ? { badge: '🌙 Sono', badgeClass: 'bg-blue-500/15 text-blue-400' }
              : { badge: `${rec.icon || '⚡'} ${rec.category || ''}`, badgeClass: 'bg-primary/10 text-primary' };
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/10"
              >
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${categoryMeta.badgeClass}`}>
                  {categoryMeta.badge}
                </span>
                <p className="text-sm text-foreground/85">{rec.text}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── BLOCO 2 — O BioCharge Descobriu ─────────────────────────────────── */}
      <DiscoveriesCard discoveries={[
        ...discoveries,
        ...(sleepConsistency?.discovery ? [sleepConsistency.discovery] : []),
      ]} />

      {/* ── BLOCO 3 — Coach IA ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border/60 bg-card overflow-hidden"
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border/40">
          <Brain className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Coach IA</h2>
        </div>
        <div className="p-5 space-y-4">
          {coachResponse && (() => {
            const last7 = computed.slice(0, 7);
            const hasHrv = last7.some(c => c.hrv);
            const hasSleep = last7.some(c => c.sleep_hours);
            const hasSession = trainingSessions.length > 0;
            const sources = [
              `${Math.min(last7.length, 7)} dias de dados`,
              hasHrv && 'HRV',
              hasSleep && 'Sono',
              hasSession && 'Treinos',
            ].filter(Boolean).join(' · ');

            return (
              <>
                <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                  Baseado em: {sources}
                </p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 rounded-xl bg-primary/5 border border-primary/15 prose prose-invert prose-sm max-w-none [&_strong]:text-foreground [&_p]:text-foreground/85"
                >
                  <ReactMarkdown>{coachResponse}</ReactMarkdown>
                </motion.div>
              </>
            );
          })()}
          <p className="text-[10px] text-muted-foreground mt-1">
            As respostas são geradas por IA com base nos seus dados e não substituem orientação médica.
          </p>
          <div className="space-y-2">
            <Input
              placeholder="Pergunte ao seu coach..."
              value={coachInput}
              onChange={e => setCoachInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && askCoach()}
              className="bg-secondary border-border/40 flex-1"
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {suggestedQuestions.map(q => (
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
              {isCoachThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1.5" /> Enviar</>}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── BLOCO 4 — Informações secundárias ───────────────────────────────── */}

      {/* Physio State */}
      {analysis?.physioState && <PhysioStateCard physioState={analysis.physioState} />}

      {/* Training Load */}
      {analysis && (
        <TrainingLoadCard trainingLoad={analysis.trainingLoad} sleepDebt={analysis.sleepDebt} />
      )}

      {/* Correlations (engine-detected) */}
      {analysis && (analysis.correlations?.length > 0 || analysis.laggedEffects?.length > 0) && (
        <CorrelationsCard correlations={analysis.correlations} laggedEffects={analysis.laggedEffects} />
      )}

      {/* Pattern Detection */}
      {patterns.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Padrões Detectados</h3>
          {patterns.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`flex items-start gap-3 p-4 rounded-xl border ${p.negative ? 'bg-red-500/6 border-red-500/25' : 'border-border/40'}`}
              style={p.negative ? {} : { backgroundColor: `hsl(142,70%,50%,0.06)` }}
            >
              <p.icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: p.color }} />
              <span className="text-sm">{p.text}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Performance Level + Streak */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 bg-card p-5"
        style={{ boxShadow: `0 0 30px -12px ${perfLevel.color}30` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Nível de Performance</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black" style={{ color: perfLevel.color }}>{perfLevel.label}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className="w-2 h-6 rounded-sm"
                    style={{ backgroundColor: i < perfLevel.level ? perfLevel.color : 'hsl(220,15%,14%)' }}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Recovery médio: <span className="font-mono font-semibold text-foreground">{avgRecovery}</span></p>
          </div>
          {streak >= 2 && (
            <div className="text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Sequência</p>
              <span className="text-2xl">🔥</span>
              <p className="text-xs font-bold text-orange-400 mt-0.5">{streak} dias seguidos</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Conquistas</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {badges.map(b => (
              <motion.div
                key={b.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border/60 text-sm"
              >
                <span className="text-sm leading-none">{b.icon}</span>
                <span className="text-xs font-medium">{b.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* AI Deep Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 bg-card overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Análise Profunda</h2>
          </div>
          {/* Botão de fallback: só aparece se não há análise automática */}
          {!todayCheckin?.deep_analysis_text && (
            <Button
              onClick={generateInsights}
              disabled={isGenerating || computed.length < 3}
              size="sm"
              className="bg-primary text-primary-foreground h-8 px-4 text-xs"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Gerar Análise'}
            </Button>
          )}
        </div>
        <div className="p-5">
          <p className="text-[10px] text-muted-foreground mb-3">Análise gerada automaticamente com base no seu check-in de hoje.</p>
          {computed.length < 3 ? (
            <p className="text-sm text-muted-foreground">Registre ao menos 3 check-ins para gerar análise profunda.</p>
          ) : todayCheckin?.deep_analysis_text ? (
            <>
              <AnalysisHighlights analysisText={todayCheckin.deep_analysis_text} />
              <AnalysisBody text={todayCheckin.deep_analysis_text} expanded={analysisExpanded} onExpand={() => setAnalysisExpanded(true)} />
            </>
          ) : aiInsight ? (
            <>
              <AnalysisHighlights analysisText={aiInsight} />
              <AnalysisBody text={aiInsight} expanded={analysisExpanded} onExpand={() => setAnalysisExpanded(true)} />
              {analysisGeneratedAt && (
                <p className="text-[10px] text-muted-foreground mt-3 text-right">
                  Gerado em {analysisGeneratedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </>
          ) : aiInsightError ? (
            <p className="text-sm text-red-400/80">{aiInsightError}</p>
          ) : (
            <p className="text-sm text-muted-foreground">A análise é gerada automaticamente ao salvar o check-in da manhã. Clique em "Gerar Análise" para obter agora.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserCheckins } from '@/hooks/useUserData';
import { motion } from 'framer-motion';
import { Brain, Sparkles, TrendingUp, TrendingDown, AlertTriangle, Loader2, Send, Trophy, Zap } from 'lucide-react';
import { computeCheckinScores, calculateStreak, getBadges, getPerformanceLevel } from '@/lib/biocharge-utils';
import { runPhysiologicalAnalysis, calculateRunningEconomy } from '@/lib/physiological-engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import PhysioStateCard from '@/components/intelligence/PhysioStateCard';
import TrainingLoadCard from '@/components/intelligence/TrainingLoadCard';
import CorrelationsCard from '@/components/intelligence/CorrelationsCard';
import DiscoveriesCard from '@/components/intelligence/DiscoveriesCard';
import { useUserTrainingSessions } from '@/hooks/useUserData';

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
      const high = arrA.filter((v, i) => v > mA).map((_, i2) => arrB[arrA.findIndex((v, j) => v > mA && j === i2)]).filter(Boolean);
      const low = arrA.filter((v, i) => v <= mA).map((_, i2) => arrB[arrA.findIndex((v, j) => v <= mA && j === i2)]).filter(Boolean);
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
    getPairs(c => c.stress ?? c.stress_level, c => c.sleep_score, 0), 0.4,
    (r, n, mA, mB, arrA, arrB) => {
      const highStress = arrA.filter((v, i) => v >= 4).map((v, i) => arrB[arrA.findIndex((x, j) => x >= 4 && j >= i)]).filter(v => v != null);
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
    getPairs(c => c.stress ?? c.stress_level, c => c.hrv, 1), 0.4,
    (r, n, mA, mB) => ({
      icon: '📉', title: 'Stress impacta HRV',
      text: `Dias estressantes tendem a reduzir seu HRV no dia seguinte. HRV médio: ${Math.round(mB)}ms.`,
      sentiment: r < 0 ? 'negative' : 'positive', confidence: getConfidence(n), days: n,
    })
  );

  // E) hydration_liters[N] → energy_level[N]
  tryAdd(
    getPairs(c => c.hydration_liters ?? c.hydration, c => c.energy ?? c.energy_level, 0), 0.4,
    (r, n, mA, mB, arrA, arrB) => {
      const goodHydration = arrA.filter((v, i) => v > mA).map((_, i2) => arrB[arrA.findIndex((v, j) => v > mA && j === i2)]).filter(Boolean);
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
    getPairs(c => c.daily_strain_accumulated, c => c.resting_hr ?? c.resting_heart_rate, 1), 0.4,
    (r, n, mA, mB, arrA, arrB) => {
      const highStrain = arrA.filter((v, i) => v > mA).map((_, i2) => arrB[arrA.findIndex((v, j) => v > mA && j === i2)]).filter(Boolean);
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
    getPairs(c => c.muscle_soreness ?? c.muscle_soreness_level, c => c.recovery_score, 1), 0.4,
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
      const highDeep = arrA.filter(v => v > mA).map((_, i2) => arrB[arrA.findIndex((v, j) => v > mA && j === i2)]).filter(Boolean);
      const delta = Math.round(Math.abs((avg(highDeep) || mB) - mB));
      return {
        icon: '🔬', title: 'Sono profundo e HRV',
        text: `Noites com mais sono profundo estão associadas a HRV ${delta}ms maior pela manhã.`,
        sentiment: r > 0 ? 'positive' : 'negative',
        confidence: getConfidence(n), days: n,
      };
    }
  );

  // J) Running economy discovery (from engine)
  const runEconomy = calculateRunningEconomy(trainingSessions);
  if (runEconomy?.discovery) discoveries.push(runEconomy.discovery);

  return discoveries;
}

export default function Insights() {
  const [aiInsight, setAiInsight] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [coachQuestion, setCoachQuestion] = useState('');
  const [coachResponse, setCoachResponse] = useState('');
  const [isCoachThinking, setIsCoachThinking] = useState(false);

  const { data: checkins = [] } = useUserCheckins(60);
  const { data: trainingSessions = [] } = useUserTrainingSessions(50);

  const computed = checkins.map((c, i) => computeCheckinScores(c, checkins.slice(i + 1), []));
  const streak = calculateStreak(checkins);
  const badges = getBadges(computed, streak);
  const avgRecovery = computed.length
    ? Math.round(computed.reduce((s, c) => s + (c.recovery_score || 0), 0) / computed.length)
    : 0;
  const perfLevel = getPerformanceLevel(avgRecovery);
  const analysis = computed.length > 0 ? runPhysiologicalAnalysis(computed) : null;
  const messages = analysis?.actionableRecs?.map(r => `${r.icon} [${r.category}] ${r.text}`) || [];

  const discoveries = useMemo(() => calcDiscoveries(computed, trainingSessions), [computed.length, trainingSessions.length]);

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
    setIsGenerating(false);
  };

  const askCoach = async () => {
    if (!coachQuestion.trim()) return;
    setIsCoachThinking(true);

    // Build real context from last 14 checkins
    const last14 = computed.slice(0, 14);
    const last7 = computed.slice(0, 7);

    const validSleep = last7.map(c => c.sleep_hours).filter(v => v != null && v > 0 && v <= 12);
    const validRecovery = last7.map(c => c.recovery_score).filter(v => v != null && v >= 0 && v <= 100);
    const validSleepQuality = last7.map(c => c.sleep_quality ?? c.sleep_score).filter(v => v != null);

    const avgSleep = validSleep.length ? parseFloat((validSleep.reduce((s, v) => s + v, 0) / validSleep.length).toFixed(1)) : null;
    const avgRecovery7d = validRecovery.length ? Math.round(validRecovery.reduce((s, v) => s + v, 0) / validRecovery.length) : null;
    const avgSleepQuality = validSleepQuality.length ? parseFloat((validSleepQuality.reduce((s, v) => s + v, 0) / validSleepQuality.length).toFixed(1)) : null;
    const sleepDeficit = validSleep.length ? parseFloat(((7 * 7.5) - validSleep.reduce((s, v) => s + v, 0)).toFixed(1)) : null;

    const latestCheckin = last14[0] || {};
    const hrvLatest = last14.find(c => c.hrv != null)?.hrv ?? null;
    const rhrLatest = last14.find(c => c.resting_hr != null)?.resting_hr ?? null;
    const energyLatest = latestCheckin.energy ?? latestCheckin.energy_level ?? null;
    const stressLatest = latestCheckin.stress ?? latestCheckin.stress_level ?? null;
    const sorenessLatest = latestCheckin.muscle_soreness ?? latestCheckin.muscle_soreness_level ?? null;

    // Training sessions this week
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekSessions = trainingSessions.filter(s => s.date && new Date(s.date + 'T12:00:00') >= weekAgo);
    const weekStrainTotal = weekSessions.reduce((s, t) => s + (t.strain_score || 0), 0);
    const sessionsList = weekSessions.map(s => `${s.sport} ${s.duration_minutes}min (strain ${s.strain_score || 0})`).join(', ') || 'nenhum registrado';

    const formatList = (arr) => arr.map(v => `${v}h`).join(', ');
    const formatRecovery = (arr) => arr.filter(v => v != null).map(v => String(v)).join(', ');

    const systemContext = `Você é o Coach do BioCharge AI — especialista em fisiologia do exercício, recuperação e performance.

DADOS REAIS DO ATLETA (use APENAS estes números):
━━━━━━━━━━━━━━━━━━━━━━
Sono últimos 7 dias: ${validSleep.length ? formatList(validSleep) : 'sem dados'}
Média de sono: ${avgSleep != null ? `${avgSleep}h/noite` : 'sem dados'}
Qualidade do sono (média): ${avgSleepQuality != null ? `${avgSleepQuality}/100` : 'sem dados'}

Recovery Score últimos 7 dias: ${validRecovery.length ? formatRecovery(validRecovery) : 'sem dados'}
Média de Recovery: ${avgRecovery7d != null ? String(avgRecovery7d) : 'sem dados'}

HRV mais recente: ${hrvLatest != null ? `${hrvLatest}ms` : 'sem dados'}
FC de Repouso mais recente: ${rhrLatest != null ? `${rhrLatest}bpm` : 'sem dados'}
Energia hoje: ${energyLatest != null ? `${energyLatest}/5` : 'sem dados'}
Stress hoje: ${stressLatest != null ? `${stressLatest}/5` : 'sem dados'}
Dor muscular: ${sorenessLatest != null ? `${sorenessLatest}/5` : 'sem dados'}

Treinos esta semana: ${weekSessions.length} sessões
Tipos: ${sessionsList}
Strain total da semana: ${weekStrainTotal}
${sleepDeficit != null ? `Déficit de sono acumulado (7 dias): ${sleepDeficit > 0 ? `+${sleepDeficit}h` : `${sleepDeficit}h`}` : ''}

REGRAS OBRIGATÓRIAS:
━━━━━━━━━━━━━━━━━━━━
1. Use SOMENTE os números acima — nunca invente dados
2. Se um dado estiver ausente, diga 'não tenho esse dado'
3. Responda em português, direto e personalizado
4. Máximo 4 parágrafos curtos
5. Sempre baseie recomendações nos dados reais
6. Se os dados mostrarem padrão positivo, reconheça
7. Tom: coach experiente, não médico genérico

Pergunta do atleta: "${coachQuestion}"`;

    const result = await base44.integrations.Core.InvokeLLM({ prompt: systemContext });

    // Validate response for impossible numbers
    const impossibleSleep = /(\d{2,3})\s*h(oras?)?\s*de\s*sono/i.test(result) && (() => {
      const m = result.match(/(\d+(?:\.\d+)?)\s*h(oras?)?\s*de\s*sono/gi) || [];
      return m.some(match => {
        const n = parseFloat(match);
        return n > 12;
      });
    })();
    const impossibleAvgSleep = /média\s*(de\s*sono\s*)?de\s*(\d+(?:\.\d+)?)\s*h/i.test(result) && (() => {
      const m = result.match(/média\s*(?:de\s*sono\s*)?de\s*(\d+(?:\.\d+)?)\s*h/gi) || [];
      return m.some(match => {
        const n = parseFloat(match.replace(/[^\d.]/g, ''));
        return n > 10;
      });
    })();

    if (impossibleSleep || impossibleAvgSleep) {
      setCoachResponse('Não tenho dados suficientes para responder com precisão. Continue fazendo check-ins diários para que eu possa te dar insights personalizados.');
    } else {
      setCoachResponse(result);
    }

    setCoachQuestion('');
    setIsCoachThinking(false);
  };

  // Pattern cards
  const patterns = [];
  if (computed.length >= 3) {
    const avg = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
    const recentRecovery = avg(computed.slice(0, 3).map(c => c.recovery_score || 0));
    const recentFatigue = avg(computed.slice(0, 3).map(c => c.fatigue_score || 0));
    const recentSleep = avg(computed.slice(0, 3).map(c => c.sleep_quality || 0));

    if (recentRecovery >= 75) patterns.push({ icon: TrendingUp, color: 'hsl(142,70%,55%)', bg: 'hsl(142,70%,50%)/8', text: `Recovery médio de ${Math.round(recentRecovery)} nos últimos 3 dias — Excelente tendência` });
    else if (recentRecovery < 60) patterns.push({ icon: TrendingDown, color: 'hsl(0,72%,60%)', bg: 'hsl(0,72%,55%)/8', text: `Recovery médio baixo: ${Math.round(recentRecovery)} — Priorize recuperação esta semana` });
    if (recentFatigue > 55) patterns.push({ icon: AlertTriangle, color: 'hsl(45,93%,63%)', bg: 'hsl(45,93%,58%)/8', text: `Fadiga elevada detectada: ${Math.round(recentFatigue)}/100 — Considere reduzir intensidade` });
    if (recentSleep < 60) patterns.push({ icon: TrendingDown, color: 'hsl(0,72%,60%)', bg: 'hsl(0,72%,55%)/8', text: `Sono em queda: ${Math.round(recentSleep)} pts — Impacto direto no Recovery` });
    else if (recentSleep >= 80) patterns.push({ icon: TrendingUp, color: 'hsl(142,70%,55%)', bg: 'hsl(142,70%,50%)/8', text: `Sono de alta qualidade: ${Math.round(recentSleep)} pts — Continue o protocolo atual` });
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Inteligência IA</h1>
        <p className="text-sm text-muted-foreground mt-1">Insights personalizados baseados nos seus dados</p>
      </div>

      {/* Physio State */}
      {analysis?.physioState && <PhysioStateCard physioState={analysis.physioState} />}

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
              <span className="text-3xl">🔥</span>
              <p className="text-xs font-bold text-orange-400 mt-1">{streak} dias</p>
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
                <span>{b.icon}</span>
                <span className="text-xs font-medium">{b.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* AI Smart Messages */}
      {messages.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Insights Automáticos</h3>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15"
            >
              <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm">{msg}</p>
            </motion.div>
          ))}
        </div>
      )}

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
              className="flex items-start gap-3 p-4 rounded-xl border border-border/40"
              style={{ backgroundColor: p.bg }}
            >
              <p.icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: p.color }} />
              <span className="text-sm">{p.text}</span>
            </motion.div>
          ))}
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
          <Button
            onClick={generateInsights}
            disabled={isGenerating || computed.length < 3}
            size="sm"
            className="bg-primary text-primary-foreground h-8 px-4 text-xs"
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Gerar Análise'}
          </Button>
        </div>
        <div className="p-5">
          {computed.length < 3 ? (
            <p className="text-sm text-muted-foreground">Registre ao menos 3 check-ins para gerar análise profunda.</p>
          ) : aiInsight ? (
            <div className="prose prose-invert prose-sm max-w-none [&_strong]:text-foreground [&_p]:text-foreground/85">
              <ReactMarkdown>{aiInsight}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Clique em "Gerar Análise" para receber insights personalizados baseados nos seus dados reais.</p>
          )}
        </div>
      </motion.div>

      {/* Discoveries */}
      <DiscoveriesCard discoveries={discoveries} />

      {/* AI Coach Chat */}
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
          {coachResponse && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 rounded-xl bg-primary/5 border border-primary/15 prose prose-invert prose-sm max-w-none [&_strong]:text-foreground [&_p]:text-foreground/85"
            >
              <ReactMarkdown>{coachResponse}</ReactMarkdown>
            </motion.div>
          )}
          <p className="text-xs text-muted-foreground">Ex: "Devo treinar hoje?" · "Por que meu HRV caiu?" · "O que melhorar no sono?"</p>
          <div className="flex gap-2">
            <Input
              placeholder="Pergunte ao seu coach..."
              value={coachQuestion}
              onChange={e => setCoachQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && askCoach()}
              className="bg-secondary border-border/40 flex-1"
            />
            <Button
              onClick={askCoach}
              disabled={isCoachThinking || !coachQuestion.trim()}
              size="icon"
              className="bg-primary text-primary-foreground shrink-0 w-10 h-10 rounded-xl"
            >
              {isCoachThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
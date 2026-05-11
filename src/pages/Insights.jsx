import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useUserCheckins } from '@/hooks/useUserData';
import { motion } from 'framer-motion';
import { Brain, Sparkles, TrendingUp, TrendingDown, AlertTriangle, Loader2, Send, Trophy, Zap } from 'lucide-react';
import { computeCheckinScores, calculateStreak, getBadges, getPerformanceLevel } from '@/lib/biocharge-utils';
import { runPhysiologicalAnalysis } from '@/lib/physiological-engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import PhysioStateCard from '@/components/intelligence/PhysioStateCard';
import TrainingLoadCard from '@/components/intelligence/TrainingLoadCard';
import CorrelationsCard from '@/components/intelligence/CorrelationsCard';

export default function Insights() {
  const [aiInsight, setAiInsight] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [coachQuestion, setCoachQuestion] = useState('');
  const [coachResponse, setCoachResponse] = useState('');
  const [isCoachThinking, setIsCoachThinking] = useState(false);

  const { data: checkins = [] } = useUserCheckins(60);

  const computed = checkins.map(computeCheckinScores);
  const streak = calculateStreak(checkins);
  const badges = getBadges(computed, streak);
  const avgRecovery = computed.length
    ? Math.round(computed.reduce((s, c) => s + (c.recovery_score || 0), 0) / computed.length)
    : 0;
  const perfLevel = getPerformanceLevel(avgRecovery);
  const analysis = computed.length > 0 ? runPhysiologicalAnalysis(computed) : null;
  const messages = analysis?.actionableRecs?.map(r => `${r.icon} [${r.category}] ${r.text}`) || [];

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
    const summary = computed.slice(0, 7).map(c => ({
      date: c.date,
      recovery: c.recovery_score,
      readiness: c.readiness_score,
      sleep: c.sleep_quality,
      fatigue: c.fatigue_score,
      hrv: c.hrv,
      zone: c.zone,
      rpe: c.rpe,
      recommendation: c.recommendation,
    }));

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Você é o BioCharge AI Coach, assistente de performance física e recuperação. Responda de forma humana, empática, específica e prática, em português brasileiro.

Dados recentes do usuário (últimos 7 dias):
${JSON.stringify(summary, null, 2)}

Pergunta: "${coachQuestion}"

Regras:
- Cite os dados reais do usuário na resposta
- Seja direto e prático
- Use emojis quando apropriado
- Máximo 3-4 parágrafos
- Nunca seja genérico — personalize baseado nos dados`,
    });

    setCoachResponse(result);
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
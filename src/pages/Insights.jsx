import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Brain, Sparkles, TrendingUp, TrendingDown, AlertTriangle, Loader2, Send, MessageCircle } from 'lucide-react';
import { computeCheckinScores } from '@/lib/biocharge-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';

export default function Insights() {
  const [aiInsight, setAiInsight] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [coachQuestion, setCoachQuestion] = useState('');
  const [coachResponse, setCoachResponse] = useState('');
  const [isCoachThinking, setIsCoachThinking] = useState(false);

  const { data: checkins = [] } = useQuery({
    queryKey: ['checkins'],
    queryFn: () => base44.entities.DailyCheckin.list('-date', 60),
  });

  const computed = checkins.map(computeCheckinScores);

  const generateInsights = async () => {
    if (computed.length < 3) return;
    setIsGenerating(true);
    const summary = computed.slice(0, 14).map(c => ({
      date: c.date,
      recovery: c.recovery_score,
      sleep: c.sleep_score,
      fatigue: c.fatigue,
      hrv: c.hrv,
      rpe: c.rpe,
      zone: c.zone,
      deep_sleep: c.deep_sleep_pct,
      mood: c.mood,
      energy: c.energy,
    }));

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Você é um coach de performance e recuperação. Analise os seguintes dados de check-in de saúde e forneça insights detalhados em português brasileiro.

Dados dos últimos ${summary.length} dias:
${JSON.stringify(summary, null, 2)}

Forneça:
1. **Análise geral** da tendência de recuperação
2. **Padrões detectados** (sono, fadiga, HRV, etc.)
3. **Alertas** se houver sinais de overtraining ou fadiga acumulada
4. **Recomendações específicas** para os próximos dias
5. **Comparação semanal** se houver dados suficientes

Use emojis para tornar mais visual. Seja específico e prático.`,
    });

    setAiInsight(result);
    setIsGenerating(false);
  };

  const askCoach = async () => {
    if (!coachQuestion.trim()) return;
    setIsCoachThinking(true);
    const summary = computed.slice(0, 7).map(c => ({
      date: c.date, recovery: c.recovery_score, sleep: c.sleep_score,
      fatigue: c.fatigue, hrv: c.hrv, zone: c.zone, recommendation: c.recommendation,
    }));

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Você é o Coach IA do BioCharge AI, um assistente de performance física e recuperação. Responda de forma humana, empática e prática, em português brasileiro.

Dados recentes do usuário:
${JSON.stringify(summary, null, 2)}

Pergunta do usuário: "${coachQuestion}"

Responda de forma clara, usando emojis quando apropriado. Se a pergunta for sobre métricas, explique o que significam e como melhorar.`,
    });

    setCoachResponse(result);
    setCoachQuestion('');
    setIsCoachThinking(false);
  };

  // Auto-generated pattern insights
  const patterns = [];
  if (computed.length >= 3) {
    const avg = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
    const recentRecovery = avg(computed.slice(0, 3).map(c => c.recovery_score || 0));
    const recentFatigue = avg(computed.slice(0, 3).map(c => c.fatigue || 0));
    const recentSleep = avg(computed.slice(0, 3).map(c => c.sleep_score || 0));

    if (recentRecovery >= 75) patterns.push({ icon: TrendingUp, color: 'text-[hsl(142,70%,55%)]', text: `Recovery médio dos últimos 3 dias: ${Math.round(recentRecovery)} — Excelente` });
    else if (recentRecovery < 60) patterns.push({ icon: TrendingDown, color: 'text-[hsl(0,72%,60%)]', text: `Recovery médio baixo: ${Math.round(recentRecovery)} — Considere descanso` });

    if (recentFatigue > 50) patterns.push({ icon: AlertTriangle, color: 'text-[hsl(45,93%,63%)]', text: `Fadiga elevada detectada: ${Math.round(recentFatigue)}%` });

    if (recentSleep < 60) patterns.push({ icon: TrendingDown, color: 'text-[hsl(0,72%,60%)]', text: `Qualidade do sono em queda: ${Math.round(recentSleep)} pts` });
    else if (recentSleep >= 80) patterns.push({ icon: TrendingUp, color: 'text-[hsl(142,70%,55%)]', text: `Sono de alta qualidade: ${Math.round(recentSleep)} pts` });
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Insights IA</h1>
        <p className="text-sm text-muted-foreground mt-1">Análises inteligentes da sua performance</p>
      </div>

      {/* Quick Patterns */}
      {patterns.length > 0 && (
        <div className="space-y-2">
          {patterns.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border"
            >
              <p.icon className={`w-5 h-5 ${p.color} mt-0.5 shrink-0`} />
              <span className="text-sm">{p.text}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* AI Deep Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Análise Profunda IA</h2>
          </div>
          <Button
            onClick={generateInsights}
            disabled={isGenerating || computed.length < 3}
            size="sm"
            className="bg-primary text-primary-foreground"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gerar Análise'}
          </Button>
        </div>
        {computed.length < 3 && (
          <p className="text-sm text-muted-foreground">Registre ao menos 3 check-ins para gerar análises.</p>
        )}
        {aiInsight && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{aiInsight}</ReactMarkdown>
          </motion.div>
        )}
      </motion.div>

      {/* AI Coach */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Coach IA</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Pergunte sobre recuperação, treino, sono ou qualquer métrica.</p>
        
        {coachResponse && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-4 rounded-xl bg-secondary prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{coachResponse}</ReactMarkdown>
          </motion.div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Ex: Devo treinar pesado hoje?"
            value={coachQuestion}
            onChange={e => setCoachQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askCoach()}
            className="bg-secondary border-border"
          />
          <Button onClick={askCoach} disabled={isCoachThinking || !coachQuestion.trim()} size="icon" className="bg-primary text-primary-foreground shrink-0">
            {isCoachThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { week_start, checkins, sessions } = await req.json();

  if (!week_start || !checkins?.length) {
    return Response.json({ error: 'Missing week_start or checkins' }, { status: 400 });
  }

  // Check if retrospect already exists for this week
  const existing = await base44.entities.WeeklyRetrospect.filter({ week_start });
  if (existing?.length > 0) {
    return Response.json({ retrospect: existing[0] });
  }

  // Calculate metrics
  const readinessVals = checkins.map(c => c.readiness_score ?? c.recovery_score ?? c.biocharge_morning).filter(v => v != null);
  const sleepVals = checkins.map(c => c.sleep_hours).filter(v => v != null);
  const avg_readiness = readinessVals.length ? Math.round(readinessVals.reduce((s, v) => s + v, 0) / readinessVals.length) : null;
  const avg_sleep_hours = sleepVals.length ? Math.round((sleepVals.reduce((s, v) => s + v, 0) / sleepVals.length) * 10) / 10 : null;
  const training_count = sessions?.length ?? 0;

  // Week end date
  const weekStartDate = new Date(week_start + 'T12:00:00');
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  const week_end = weekEndDate.toISOString().slice(0, 10);

  // Build context for AI
  const checkinSummary = checkins.map(c => {
    const d = new Date((c.date || '') + 'T12:00:00');
    const dayName = d.toLocaleDateString('pt-BR', { weekday: 'long' });
    return `${dayName}: prontidão ${c.readiness_score ?? c.recovery_score ?? c.biocharge_morning ?? '?'}, sono ${c.sleep_hours ?? '?'}h, strain ${c.daily_strain_accumulated ?? 0}, fadiga ${c.fatigue ?? '?'}`;
  }).join('\n');

  const sessionSummary = sessions?.length
    ? sessions.map(s => `${s.sport} ${s.duration_minutes}min strain=${s.strain_score ?? 0}`).join(', ')
    : 'nenhum treino';

  const prompt = `Você é um coach fisiológico. Analise os dados desta semana de um atleta e gere UMA frase curta de aprendizado (máximo 2 linhas) que destaque o padrão mais relevante. A frase deve ser concreta e personalizada, como:
- "Quando você descansou na terça, sua prontidão na quarta foi maior."
- "Sua prontidão caiu sempre após treinos de strain > 14."
- "Semana com melhor recuperação do mês — HRV médio acima do baseline."

Dados da semana (${week_start} a ${week_end}):
${checkinSummary}
Treinos: ${sessionSummary}
Média prontidão: ${avg_readiness ?? '?'}, Média sono: ${avg_sleep_hours ?? '?'}h

Responda APENAS com a frase, sem explicações adicionais, sem aspas.`;

  const llmResult = await base44.integrations.Core.InvokeLLM({ prompt });
  const learning_phrase = typeof llmResult === 'string'
    ? llmResult.trim()
    : llmResult?.text?.trim() ?? 'Semana analisada — continue acompanhando seus padrões.';

  const retrospect = await base44.entities.WeeklyRetrospect.create({
    week_start,
    week_end,
    avg_readiness,
    avg_sleep_hours,
    training_count,
    learning_phrase,
  });

  return Response.json({ retrospect });
});
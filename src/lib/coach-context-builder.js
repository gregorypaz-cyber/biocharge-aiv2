import { SLEEP_HIGH_HOURS } from '@/lib/physio-constants';

export function buildCoachContext({ checkins, sessions, analysis, question }) {
  const safeQuestion = question.replace(/["""]/g, '').slice(0, 300);

  const last14 = checkins.slice(0, 14);
  const last7 = checkins.slice(0, 7);

  const validSleep = last7.map(c => c.sleep_hours).filter(v => v != null && v > 0 && v <= 12);
  const validRecovery = last7.map(c => c.recovery_score).filter(v => v != null && v >= 0 && v <= 100);

  const avgSleep = validSleep.length
    ? parseFloat((validSleep.reduce((s, v) => s + v, 0) / validSleep.length).toFixed(1))
    : null;
  const avgRecovery7d = validRecovery.length
    ? Math.round(validRecovery.reduce((s, v) => s + v, 0) / validRecovery.length)
    : null;
  const sleepDeficit = validSleep.length
    ? parseFloat(((7 * 7.5) - validSleep.reduce((s, v) => s + v, 0)).toFixed(1))
    : null;

  const latestCheckin = last14[0] || {};
  const hrvLatest = last14.find(c => c.hrv != null)?.hrv ?? null;
  const rhrLatest = last14.find(c => c.resting_hr != null)?.resting_hr ?? null;
  const energyLatest = latestCheckin.energy ?? latestCheckin.energy_level ?? null;
  const stressLatest = latestCheckin.stress ?? latestCheckin.stress_level ?? null;
  const sorenessLatest = latestCheckin.muscle_soreness ?? latestCheckin.muscle_soreness_level ?? null;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekSessions = (sessions || []).filter(s => s.date && new Date(s.date + 'T12:00:00') >= weekAgo);
  const weekStrainTotal = weekSessions.reduce((s, t) => s + (t.strain_score || 0), 0);
  const last7Sessions = weekSessions
    .map(s => `${s.sport} ${s.duration_minutes}min strain:${s.strain_score || '?'}`)
    .join(', ') || 'nenhum registrado';

  const formatRecovery = (arr) => arr.filter(v => v != null).map(v => String(v)).join(', ');

  const systemContext = `Você é o Coach do BioCharge AI — especialista em fisiologia do exercício, recuperação e performance esportiva.

DADOS REAIS DO ATLETA (use SOMENTE estes — nunca invente):
━━━━━━━━━━━━━━━━━━━━━━
Sono últimos 7 dias: ${checkins.slice(0, 7).map(c => `${c.sleep_hours || '?'}h`).join(', ')}
Média de sono: ${avgSleep != null ? `${avgSleep}h/noite` : 'sem dados'}

Recovery últimos 7 dias: ${validRecovery.length ? formatRecovery(validRecovery) : 'sem dados'}
Média de recovery: ${avgRecovery7d != null ? String(avgRecovery7d) : 'sem dados'}

HRV mais recente: ${hrvLatest != null ? `${hrvLatest}ms` : 'não informado'}
FC de Repouso: ${rhrLatest != null ? `${rhrLatest}bpm` : 'não informado'}
Energia hoje: ${energyLatest != null ? `${energyLatest}/5` : 'não informado'}
Stress hoje: ${stressLatest != null ? `${stressLatest}/5` : 'não informado'}
Dor muscular: ${sorenessLatest != null ? `${sorenessLatest}/5` : 'não informado'}

Treinos últimos 7 dias: ${last7Sessions}
Strain total da semana: ${weekStrainTotal}
Estado fisiológico: ${analysis?.physioState?.state ?? 'sem dados'}
ACWR (risco de carga): ${analysis?.trainingLoad?.ratio ?? 'sem dados'}
${sleepDeficit != null ? `Déficit de sono acumulado (7 dias): ${sleepDeficit > 0 ? `+${sleepDeficit}h` : `${sleepDeficit}h`}` : ''}

REGRAS OBRIGATÓRIAS:
━━━━━━━━━━━━━━━━━━━━
1. Use SOMENTE os números acima — NUNCA invente dados
2. Se um dado estiver ausente, diga "não tenho esse dado registrado"
3. Responda em português brasileiro, direto e personalizado
4. Máximo 4 parágrafos curtos
5. Tom: coach experiente e humano, não médico genérico
6. Sempre baseie recomendações nos dados reais fornecidos

LIMITE DE SEGURANÇA: Se a pergunta envolver sintomas físicos (dor, tontura, falta de ar, lesões, medicamentos), responda SOMENTE: 'Isso precisa de avaliação médica profissional — consulte um médico antes de treinar.' Não forneça nenhuma orientação médica além dessa frase.

Pergunta do atleta: '${safeQuestion}'`;

  return systemContext;
}
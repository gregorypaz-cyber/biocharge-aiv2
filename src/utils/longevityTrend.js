// longevityTrend.js — Reck (Fase 3)
// Recalcula Vitalidade e Idade Corporal semana a semana, usando janelas móveis
// sobre o histórico que JÁ existe (check-ins, treinos). Sem schema novo.
// Reaproveita o motor da Fase 2 (computeBodyAge) — então a tendência é 100%
// consistente com o número do card atual.

import { computeBodyAge } from './bodyAge';

const DAY = 86400000;
const toTime = (d) => (d ? new Date(d).getTime() : NaN);
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

/**
 * @param {Object} args
 * @param {Object} args.profile   { birth_year, sex, height_cm, waist_cm }
 * @param {number|null} args.maxHrPref
 * @param {number|null} args.vo2maxManual
 * @param {Array} args.checkins   DailyCheckin[]
 * @param {Array} args.trainings  TrainingSession[]
 * @param {Array} args.workouts   WorkoutSession[]
 * @param {number} args.weeks     quantas semanas olhar pra trás (padrão 12)
 * @param {number} args.windowDays  janela móvel por ponto (padrão 21)
 */
export function computeLongevityTrend({
  profile,
  maxHrPref = null,
  vo2maxManual = null,
  checkins = [],
  trainings = [],
  workouts = [],
  weeks = 12,
  windowDays = 21,
}) {
  if (!profile || !profile.birth_year || !profile.sex) return { ok: false, reason: 'profile' };

  const dates = checkins.map((c) => toTime(c.date)).filter((t) => !isNaN(t));
  if (dates.length === 0) return { ok: false, reason: 'data' };
  const maxT = Math.max(...dates);

  const sessions = [...trainings, ...workouts];
  const points = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const anchor = maxT - w * 7 * DAY;       // fim de cada semana (do mais antigo ao atual)
    const start = anchor - windowDays * DAY;
    const act28 = anchor - 28 * DAY;
    const inWin = (d) => { const t = toTime(d); return !isNaN(t) && t <= anchor && t >= start; };

    const winCheckins = checkins.filter((c) => inWin(c.date));
    if (winCheckins.length < 3) continue;    // janela rala -> pula esse ponto

    const restingHRs = [];
    const sleepHours = [];
    const sleepReg = [];
    winCheckins.forEach((c) => {
      const rhr = c.resting_hr ?? c.resting_heart_rate;
      if (typeof rhr === 'number') restingHRs.push(rhr);
      if (typeof c.sleep_hours === 'number' && c.sleep_hours > 0) sleepHours.push(c.sleep_hours);
      if (typeof c.sleep_regularity_pct === 'number' && c.sleep_regularity_pct > 0) sleepReg.push(c.sleep_regularity_pct);
    });

    let observedHRmax = null;
    const activity = { sessions: 0, minutes: 0 };
    // FCmax observada pode vir de qualquer fonte (treino ou workout do device)...
    sessions.forEach((s) => {
      const t = toTime(s.date);
      const hm = s.heart_rate_max ?? s.max_heart_rate;
      if (typeof hm === 'number' && !isNaN(t) && t <= anchor) observedHRmax = Math.max(observedHRmax || 0, hm);
    });
    // ...mas ATIVIDADE conta só do TrainingSession (fonte única -> sem duplicar minutos).
    trainings.forEach((s) => {
      const t = toTime(s.date);
      if (!isNaN(t) && t <= anchor && t >= act28) { activity.sessions += 1; activity.minutes += s.duration_minutes || 0; }
    });
    if (observedHRmax && observedHRmax > 215) observedHRmax = null;

    const sleep = { hours: avg(sleepHours), regularity: avg(sleepReg) };
    const r = computeBodyAge({ profile, restingHRs, observedHRmax, maxHrPref, vo2maxManual, activity, sleep });
    if (r.ok) {
      const dt = new Date(anchor);
      const label = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
      points.push({ label, vitality: r.vitality, bodyAge: r.bodyAge });
    }
  }

  if (points.length < 2) return { ok: false, reason: 'insufficient' };
  return {
    ok: true,
    points,
    current: points[points.length - 1],
    first: points[0],
    deltaVitality: points[points.length - 1].vitality - points[0].vitality,
  };
}

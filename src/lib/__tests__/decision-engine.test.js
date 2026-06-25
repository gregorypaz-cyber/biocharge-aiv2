import { describe, it, expect } from 'vitest';
import { getDailyVerdict, getSleepDebtHours } from '@/lib/decision-engine.js';

// checkin base "saudável" com sinal fisiológico presente
const basePhysio = { hrv: 70, resting_hr: 50, morning_recovery_score: 80 };
const noAnalysis = { trainingLoad: { ratio: 1.0 }, physioState: { state: 'Balanced' }, sleepDebt: { debt: 0 } };

function verdict(over = {}) {
  return getDailyVerdict({
    checkin: basePhysio,
    analysis: noAnalysis,
    phase: 'PLANNING',
    intent: null,
    locked: false,
    displayedScore: 80,
    prescriptionScore: 80,
    deepSleepPct: 22,
    totalStrain: 0,
    todaySessions: [{}], // !=PLANNING-stored path: há sessão → ignora decisão salva
    ...over,
  });
}

describe('getDailyVerdict — cascata de decisão', () => {
  it('usa decisão salva quando há decision_mode + PLANNING + sem sessões', () => {
    const r = getDailyVerdict({
      checkin: { ...basePhysio, decision_mode: 'train_moderate', headline_today: 'X' },
      analysis: noAnalysis, phase: 'PLANNING', intent: null, locked: false,
      displayedScore: 80, prescriptionScore: 80, deepSleepPct: 22, totalStrain: 0,
      todaySessions: [],
    });
    expect(r.mode).toBe('train_moderate');
    expect(r.headline).toBe('X');
  });

  it('força recuperação em RECOVERY_DAY', () => {
    expect(verdict({ phase: 'RECOVERY_DAY' }).mode).toBe('recover');
  });

  it('força recuperação quando demanda > recuperação da manhã', () => {
    const r = verdict({ checkin: { ...basePhysio, recovery_demand: 90, morning_recovery_score: 60 } });
    expect(r.mode).toBe('recover');
  });

  it('libera intensidade alta com score alto, sem limitação e com sinal fisiológico', () => {
    expect(verdict({ prescriptionScore: 80, displayedScore: 80 }).mode).toBe('train_high');
  });

  it('rebaixa high → moderate quando o sono limita (débito >= 4h)', () => {
    const r = verdict({ analysis: { ...noAnalysis, sleepDebt: { debt: 5 } } });
    expect(r.mode).toBe('train_moderate');
  });

  it('NÃO libera high sem sinal fisiológico (anti-placebo)', () => {
    const r = verdict({ checkin: { morning_recovery_score: 80 } }); // sem hrv/rhr
    expect(r.mode).not.toBe('train_high');
  });

  it('moderado na faixa 55–73', () => {
    expect(verdict({ prescriptionScore: 60, displayedScore: 60 }).mode).toBe('train_moderate');
  });

  it('leve na faixa 42–54', () => {
    expect(verdict({ prescriptionScore: 48, displayedScore: 48 }).mode).toBe('train_light');
  });

  it('recuperar abaixo de 42', () => {
    expect(verdict({ prescriptionScore: 30, displayedScore: 30 }).mode).toBe('recover');
  });

  it('todo veredito tem manchete e intensidade definidas', () => {
    const r = verdict();
    expect(r.headline).toBeTruthy();
    expect(['high', 'moderate', 'low']).toContain(r.workoutIntensity);
  });
});

describe('getSleepDebtHours', () => {
  it('lê débito do analysis e cai para 0 quando ausente', () => {
    expect(getSleepDebtHours({ sleepDebt: { debt: 3.2 } })).toBe(3.2);
    expect(getSleepDebtHours({})).toBe(0);
    expect(getSleepDebtHours(null)).toBe(0);
  });
});

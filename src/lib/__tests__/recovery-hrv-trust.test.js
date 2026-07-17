import { describe, it, expect } from 'vitest';
import { calculateRecoveryScore, explainRecoveryV3 } from '@/lib/biocharge-utils.js';

// Baseline determinística: 20 noites idênticas → centro 51ms, spread no floor (5.0).
// Fixtures inline, nunca dados reais.
const base = (o = {}) => ({
  hrv: 51, resting_hr: 58, sleep_hours: 7.5, deep_sleep_pct: 18, rem_sleep_pct: 24,
  sleep_awakenings: 2, sleep_regularity_pct: 80, energy: 3, stress: 2, muscle_soreness: 1, ...o,
});
const HIST = Array.from({ length: 20 }, () => base());
const score = (hrv, sleep_hours) => calculateRecoveryScore(base({ hrv, sleep_hours }), HIST);

describe('Recovery v3 — confiança do HRV por duração de sono (one-way)', () => {
  it('noite curta (5.0h): HRV alto NÃO levanta o score — vale o mesmo que HRV neutro', () => {
    expect(score(70, 5.0)).toBe(score(51, 5.0));
  });

  it('noite curta (5.0h): HRV baixo continua puxando pra baixo (regra one-way)', () => {
    expect(score(35, 5.0)).toBeLessThan(score(51, 5.0));
  });

  it('noite normal (7.5h): HRV alto conta inteiro — o fator é inerte', () => {
    expect(score(70, 7.5)).toBeGreaterThan(score(51, 7.5));
  });

  it('sem sono informado (null): inerte — tester de Apple Watch não é afetado', () => {
    expect(score(70, null)).toBeGreaterThan(score(51, null));
  });

  it('em 6.0h o fator ainda é 1 (fronteira fechada pra cima)', () => {
    expect(score(70, 6.0)).toBeGreaterThan(score(70, 5.9));
  });

  it('fade é contínuo e monotônico de 6.0h a 5.0h (sem degrau)', () => {
    expect(score(70, 6.0)).toBeGreaterThan(score(70, 5.5));
    expect(score(70, 5.5)).toBeGreaterThan(score(70, 5.0));
  });

  it('HRV alto + noite curta nunca dá verde (ZONE_GREEN_MIN = 70)', () => {
    expect(score(70, 4.95)).toBeLessThan(70);
  });

  it('piso por sono segue valendo: <3h → teto 30', () => {
    expect(score(70, 2.0)).toBeLessThanOrEqual(30);
  });
});

describe('explainRecoveryV3 — fonte única restaurada', () => {
  const same = (hrv, sleep_hours) => {
    const c = base({ hrv, sleep_hours });
    expect(explainRecoveryV3(c, HIST).score).toBe(calculateRecoveryScore(c, HIST));
  };
  it('mesmo modelo do score em noite normal', () => same(54, 7.5));
  it('mesmo modelo do score em noite curta', () => same(70, 4.95));
  it('mesmo modelo do score em noite catastrófica', () => same(60, 1.75));
});

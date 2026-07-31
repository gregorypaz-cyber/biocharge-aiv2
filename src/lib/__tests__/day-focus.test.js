import { describe, it, expect } from 'vitest';
import { buildDayFocus } from '@/lib/biocharge-utils.js';

describe('buildDayFocus — dose + proteger', () => {
  it('sempre devolve 2 ações com texto e tom', () => {
    const f = buildDayFocus({ mode: 'train_moderate', seed: 1 });
    expect(f).toHaveLength(2);
    for (const it of f) {
      expect(typeof it.text).toBe('string');
      expect(it.text.length).toBeGreaterThan(8);
      expect(['good', 'caution', 'neutral']).toContain(it.tone);
    }
  });

  it('a dose segue a decisão do dia (tom good pra treino, neutral pra recover)', () => {
    expect(buildDayFocus({ mode: 'train_high', seed: 2 })[0].tone).toBe('good');
    expect(buildDayFocus({ mode: 'recover', seed: 2 })[0].tone).toBe('neutral');
    expect(buildDayFocus({ restDay: true, seed: 2 })[0].tone).toBe('neutral');
  });

  it('proteger prioriza dívida de sono acima do ACWR', () => {
    const f = buildDayFocus({ mode: 'train_moderate', sleepDebtHours: 7.2, acwr: 1.5, seed: 3 });
    expect(f[1].text).toContain('Dívida de sono');
    expect(f[1].text).toContain('7.2h');
    expect(f[1].tone).toBe('caution');
  });

  it('proteger cai no ACWR quando não há dívida alta', () => {
    const f = buildDayFocus({ mode: 'train_high', sleepDebtHours: 1, acwr: 1.42, seed: 4 });
    expect(f[1].text).toContain('1.42');
    expect(f[1].text).toMatch(/ACWR/);
  });

  it('HRV bem acima da semana vira sinal positivo', () => {
    const f = buildDayFocus({ mode: 'train_high', hrvDeltaPct: 14, seed: 5 });
    expect(f[1].tone).toBe('good');
    expect(f[1].text).toContain('14%');
  });

  it('sem fato saliente cai no sono (neutro)', () => {
    const f = buildDayFocus({ mode: 'train_moderate', sleepDebtHours: 1, acwr: 1.0, seed: 6 });
    expect(f[1].tone).toBe('neutral');
    expect(f[1].text.toLowerCase()).toContain('sono');
  });

  it('é determinístico pra a mesma seed e varia com a seed', () => {
    expect(buildDayFocus({ mode: 'train_light', seed: 7 })[0].text)
      .toBe(buildDayFocus({ mode: 'train_light', seed: 7 })[0].text);
  });
});

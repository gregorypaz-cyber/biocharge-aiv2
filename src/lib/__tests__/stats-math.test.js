import { describe, it, expect } from 'vitest';
import { pearson, corrPValue, coefVariation } from '@/lib/physiological-engine.js';

// Valores de referência gerados com scipy (t de Student, df=n-2, bicaudal).
// Travam a base estatística de TODOS os gates anti-placebo do app.
describe('pearson — coeficiente de correlação', () => {
  it('correlação perfeita positiva = 1', () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 6);
  });
  it('correlação perfeita negativa = -1', () => {
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 6);
  });
  it('sem variação em um eixo → null (sem sinal, não 0 enganoso)', () => {
    expect(pearson([5, 5, 5, 5], [1, 2, 3, 4])).toBeNull();
  });
});

describe('corrPValue — p-valor bicaudal (vs scipy)', () => {
  const cases = [
    [0.5, 20, 0.0248],
    [0.35, 30, 0.0580],
    [0.7, 14, 0.0053],
    [0.4, 20, 0.0806],
    [0.6, 30, 0.0005],
    [0.3, 8, 0.4703],
  ];
  for (const [r, n, expected] of cases) {
    it(`r=${r}, n=${n} → p≈${expected}`, () => {
      expect(corrPValue(r, n)).toBeCloseTo(expected, 3);
    });
  }
  it('n<3 → p=1 (não passa o gate, seguro)', () => {
    expect(corrPValue(0.9, 2)).toBe(1);
  });
});

describe('coefVariation — coeficiente de variação', () => {
  it('zero quando todos os valores são iguais', () => {
    expect(coefVariation([7, 7, 7])).toBe(0);
  });
  it('positivo quando há dispersão', () => {
    expect(coefVariation([2, 4, 6, 8])).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import {
  classifyTrainingLoad,
  scatterCrossesRegime,
  scatterSignificant,
  formatTooltipValue,
  REGIME_BREAK,
} from '@/lib/trends-gates';
import { pearson, corrPValue, weightTrend } from '@/lib/physiological-engine';

const round1 = (v) => Math.round(v * 10) / 10;

// Constrói pontos de scatter {x, y, date} com y = 5*x + ruído leve → correlação
// forte e positiva. Datas sequenciais a partir de `start`.
function makePoints(start, n) {
  const pts = [];
  const base = new Date(start + 'T12:00:00');
  for (let i = 0; i < n; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const date = d.toISOString().slice(0, 10);
    const x = 6 + i * 0.4;
    const y = 40 + i * 3; // linear perfeito → r ≈ 1
    pts.push({ x, y, date });
  }
  return pts;
}

describe('classifyTrainingLoad (gate de crônica mínima do ACWR)', () => {
  it('a) crônica < 4 → "Sem base de comparação", muted, risco não-alto', () => {
    const c = classifyTrainingLoad({ ratio: 1.9, chronic: 2, lowConfidence: false });
    expect(c.label).toBe('Sem base de comparação');
    expect(c.tier).toBe('no_base');
    expect(c.muted).toBe(true);
    expect(c.risk).not.toBe('high');
  });

  it('b) lowConfidence → nunca retorna label/risco de carga alta', () => {
    // Mesmo com ratio bem acima do limiar de risco, histórico curto não classifica.
    const c = classifyTrainingLoad({ ratio: 3.0, chronic: 20, lowConfidence: true });
    expect(c.risk).not.toBe('high');
    expect(c.label).not.toBe('Carga muito alta');
    expect(c.muted).toBe(true);
    // ratio > 2 é sinalizado como fora de escala, não saturado silenciosamente.
    expect(c.outOfScale).toBe(true);
  });
});

describe('scatterSignificant (portão do scatter Sono × HRV)', () => {
  it('c) pontos dos dois lados da quebra de regime → significant === false', () => {
    // 4 pontos antes de 11/07 + 4 depois.
    const pre = makePoints('2026-07-04', 4);
    const post = makePoints('2026-07-14', 4);
    const points = [...pre, ...post];
    const crossesRegime = scatterCrossesRegime(points, REGIME_BREAK);
    expect(crossesRegime).toBe(true);

    const r = pearson(points.map((p) => p.x), points.map((p) => p.y));
    const pValue = corrPValue(r, points.length);
    const significant = scatterSignificant({ r, pValue, n: points.length, crossesRegime });
    expect(significant).toBe(false);
  });

  it('d) todos pós-quebra, |r|>=0.35, p<=0.05, n>=8 → significant === true', () => {
    const points = makePoints('2026-07-12', 8);
    const crossesRegime = scatterCrossesRegime(points, REGIME_BREAK);
    expect(crossesRegime).toBe(false);

    const r = pearson(points.map((p) => p.x), points.map((p) => p.y));
    const pValue = corrPValue(r, points.length);
    expect(Math.abs(r)).toBeGreaterThanOrEqual(0.35);
    expect(pValue).toBeLessThanOrEqual(0.05);
    expect(points.length).toBeGreaterThanOrEqual(8);

    const significant = scatterSignificant({ r, pValue, n: points.length, crossesRegime });
    expect(significant).toBe(true);
  });
});

describe('weightTrend (fonte única do peso)', () => {
  it('e) 94 pesagens → current = média móvel de 7, delta com sinal correto', () => {
    const checkins = [];
    const base = new Date('2026-04-01T12:00:00');
    for (let i = 0; i < 94; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      checkins.push({ date: d.toISOString().slice(0, 10), body_weight: round1(80 - i * 0.05) });
    }
    const wt = weightTrend(checkins);
    expect(wt.samples).toBe(94);

    // current == média das 7 pesagens mais recentes.
    const last7 = checkins.slice(-7).map((c) => c.body_weight);
    const expectedCurrent = round1(last7.reduce((s, v) => s + v, 0) / 7);
    expect(wt.current).toBe(expectedCurrent);

    // Peso caindo ao longo da janela → deltas negativos.
    expect(wt.delta100d).toBeLessThan(0);
    expect(wt.delta7).toBeLessThan(0);
  });
});

describe('formatTooltipValue (bug "faixa normal: 63101")', () => {
  it('f) faixa [lo, hi] → "lo–hi"; escalar inalterado', () => {
    expect(formatTooltipValue([63.2, 101.4])).toBe('63–101');
    expect(formatTooltipValue(75)).toBe(75);
    expect(formatTooltipValue(null)).toBe(null);
  });
});

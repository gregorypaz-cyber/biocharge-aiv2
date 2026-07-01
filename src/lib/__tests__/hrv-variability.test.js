import { describe, it, expect } from 'vitest';
import { detectLongTermTrends } from '../physiological-engine.js';

describe('RMSSDmean 7d — Fase C', () => {

  it('exige janela mínima: série < 7 dias não gera tendência pronta', () => {
    // Apenas 5 dias com HRV
    const checkins = [
      { date: '2026-06-05', hrv: 55 },
      { date: '2026-06-04', hrv: 57 },
      { date: '2026-06-03', hrv: 53 },
      { date: '2026-06-02', hrv: 58 },
      { date: '2026-06-01', hrv: 56 },
    ];
    const result = detectLongTermTrends(checkins);
    const rmssd7 = result.metrics.find((m) => m.key === '_rmssd7');
    // Com < 7 dias, a série suavizada fica toda null → _linearTrend devolve ready:false
    // logo a métrica não aparece em results (filtered out) ou hasTrend:false
    if (rmssd7) {
      expect(rmssd7.hasTrend).toBe(false);
    } else {
      expect(rmssd7).toBeUndefined(); // também válido
    }
  });

  it('outlier isolado não vira tendência: 1 dia muito alto em série estável', () => {
    // 14 dias estáveis com 1 pico isolado no meio
    const base = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-06-${String(i + 1).padStart(2, '0')}`,
      hrv: i === 6 ? 95 : 54, // 1 pico no dia 7
    }));
    const result = detectLongTermTrends(base);
    const rmssd7 = result.metrics.find((m) => m.key === '_rmssd7');
    // A média suavizada absorve o pico; o r da tendência fica baixo → hasTrend:false
    if (rmssd7) expect(rmssd7.hasTrend).toBe(false);
  });

});

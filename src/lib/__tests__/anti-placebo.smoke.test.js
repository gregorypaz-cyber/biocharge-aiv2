import { describe, it, expect } from 'vitest';
import {
  detectCorrelations,
  calculateSleepConsistency,
  calculateSleepDebt,
  pctDelta,
} from '@/lib/physiological-engine.js';

// Gera N dias cronológicos a partir de 2026-01-01.
function days(n, fn) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(2026, 0, 1 + i);
    return { date: d.toISOString().slice(0, 10), ...fn(i) };
  });
}

describe('detectCorrelations — gates anti-placebo', () => {
  it('silencia com poucos dados (< mínimo)', () => {
    const cks = days(5, () => ({ sleep_hours: 6 + Math.random(), hrv: 60 }));
    expect(detectCorrelations(cks)).toEqual([]);
  });

  it('silencia variável quase-binária (>85% em 2 valores) mesmo com correlação aparente', () => {
    // sleep_hours só assume 7 ou 8; HRV acompanha → r alto, mas deve ser bloqueado
    const cks = days(20, (i) => {
      const s = i % 10 === 0 ? 6 : (i % 2 ? 8 : 7); // ~90% em {7,8}
      return { sleep_hours: s, hrv: 50 + s * 2 };
    });
    const out = detectCorrelations(cks);
    const sleepHrv = out.find((o) => o.icon === '🌙');
    expect(sleepHrv).toBeUndefined();
  });

  it('emite quando há sinal real, com variação e n suficiente', () => {
    // Lag-1 honesto: o HRV de HOJE depende do sono de ONTEM (sinal[i] → alvo[i+1]).
    const base = days(24, (i) => ({ sleep_hours: 5 + (i % 5) })); // 5..9 → variação alta
    const cks = base.map((c, i) => ({
      ...c,
      hrv: i === 0 ? 65 : 40 + base[i - 1].sleep_hours * 5,
    }));
    const out = detectCorrelations(cks);
    const sleepHrv = out.find((o) => o.icon === '🌙');
    expect(sleepHrv).toBeDefined();
    expect(Math.abs(sleepHrv.r)).toBeGreaterThanOrEqual(0.35);
    expect(sleepHrv.samples).toBeGreaterThanOrEqual(14);
  });

  it('anti-circularidade: nenhuma relação correlaciona um componente do recovery contra o recovery', () => {
    // sleep_hours/hrv/rhr são componentes do recovery; só podem mirar HRV de D+1.
    // Geramos recovery_score perfeitamente colinear com sleep_hours: se houvesse
    // uma relação sleep→recovery, ela dispararia. Não deve existir.
    const cks = days(24, (i) => {
      const s = 5 + (i % 5);
      return { sleep_hours: s, recovery_score: 40 + s * 6, hrv: 60 };
    });
    const out = detectCorrelations(cks);
    const sleepToRecovery = out.find(
      (o) => o.icon === '🌙' && /recovery/i.test(o.text)
    );
    expect(sleepToRecovery).toBeUndefined();
  });
});

describe('calculateSleepConsistency — estatística de meia-noite (§4)', () => {
  it('não explode com horários que cruzam a meia-noite (23h50 vs 00h10 ≈ 20min, não ~1430)', () => {
    // Alterna 23:50 e 00:10 → desvio real ~10min em torno da meia-noite.
    const cks = days(10, (i) => ({
      sleep_start_time: i % 2 === 0 ? '23:50' : '00:10',
    }));
    const r = calculateSleepConsistency(cks);
    expect(r).not.toBeNull();
    expect(r.stdDevMinutes).toBeLessThan(60); // se fosse std linear, daria ~700+
  });

  it('retorna null abaixo do mínimo de noites', () => {
    const cks = days(3, () => ({ sleep_start_time: '23:00' }));
    expect(calculateSleepConsistency(cks)).toBeNull();
  });
});

describe('calculateSleepDebt + pctDelta — utilitários puros', () => {
  it('débito de sono nunca é negativo e usa só os dias registrados', () => {
    const cks = days(7, () => ({ sleep_hours: 8 })); // dorme MAIS que a meta
    const r = calculateSleepDebt(cks, 7.5);
    expect(r.debt).toBe(0);
    expect(r.days).toBe(7);
  });

  it('pctDelta protege contra baseline nulo/zero', () => {
    expect(pctDelta(60, null)).toBeNull();
    expect(pctDelta(60, 0)).toBeNull();
    expect(pctDelta(55, 50)).toBe(10);
  });
});

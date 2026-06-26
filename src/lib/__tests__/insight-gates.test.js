import { describe, it, expect } from 'vitest';
import { detectLaggedEffects, detectPersonalBottleneck, detectHRVAnomaly, detectLongTermTrends } from '@/lib/physiological-engine.js';

function days(n, fn) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(2026, 0, 1 + i);
    return { date: d.toISOString().slice(0, 10), ...fn(i) };
  });
}

describe('detectLaggedEffects — placebo validado, silêncio travado', () => {
  // Dados desenhados para DISPARAR o efeito "treino intenso → queda de recovery 48h
  // depois" SE a função estivesse ativa. Como foi validado como placebo (r≈+0,17,
  // ns), está desativada por design. Este teste trava o silêncio: se alguém
  // reativar (removendo o kill-switch), estes dados quebram o teste.
  const triggering = days(12, (i) => ({
    rpe: i % 3 === 0 ? 9 : 4,
    rest_day: false,
    recovery_score: i % 3 === 2 ? 45 : 85,
    sleep_hours: i % 3 === 1 ? 5 : 8,
  }));

  it('permanece silenciado mesmo com dados suficientes que disparariam o efeito', () => {
    expect(detectLaggedEffects(triggering)).toEqual([]);
  });

  it('também silencia abaixo do mínimo de check-ins', () => {
    expect(detectLaggedEffects(triggering.slice(0, 3))).toEqual([]);
  });
});

describe('detectPersonalBottleneck — gargalo pessoal', () => {
  it('não está pronto abaixo de 14 dias (e informa quanto falta)', () => {
    const r = detectPersonalBottleneck(days(10, () => ({ deep_sleep_pct: 20, hrv: 60 })));
    expect(r.ready).toBe(false);
    expect(r.daysNeeded).toBe(14);
    expect(r.daysHave).toBe(10);
  });

  it('detecta gargalo real: variável → HRV de amanhã com correlação forte', () => {
    // deep_sleep_pct varia (10..30); HRV de D+1 segue de perto.
    const base = days(16, (i) => ({ deep_sleep_pct: 10 + (i % 5) * 5 }));
    const cks = base.map((c, i) => ({
      ...c,
      hrv: i === 0 ? 60 : 40 + base[i - 1].deep_sleep_pct * 1.5,
    }));
    const r = detectPersonalBottleneck(cks);
    expect(r.ready).toBe(true);
    expect(r.hasSignal).toBe(true);
    expect(r.bottleneck.key).toBe('deep_sleep_pct');
    expect(Math.abs(r.bottleneck.correlation)).toBeGreaterThanOrEqual(0.45);
    expect(r.bottleneck.samples).toBeGreaterThanOrEqual(14);
  });

  it('anti-circularidade: variável colinear com recovery mas NÃO com HRV → sem sinal', () => {
    // Se a função correlacionasse contra recovery_score (que contém as subjetivas),
    // isto dispararia. Como ela mira HRV (independente, aqui constante), não dispara.
    const cks = days(16, (i) => {
      const deep = 10 + (i % 5) * 5;
      return { deep_sleep_pct: deep, recovery_score: 40 + deep * 2, hrv: 60 };
    });
    expect(detectPersonalBottleneck(cks).hasSignal).toBe(false);
  });

  it('variável travada (sem variação) → sem sinal', () => {
    const cks = days(16, (i) => ({ deep_sleep_pct: 20, hrv: 40 + i }));
    expect(detectPersonalBottleneck(cks).hasSignal).toBe(false);
  });

  it('correlação fraca (|r| < 0,45) → sem sinal', () => {
    const base = days(16, (i) => ({ deep_sleep_pct: 10 + (i % 5) * 5 }));
    const cks = base.map((c, i) => ({ ...c, hrv: 60 + (i % 2 === 0 ? 6 : -6) }));
    expect(detectPersonalBottleneck(cks).hasSignal).toBe(false);
  });
});

const baseline = { hrv: { d14: 60 }, rhr: { d14: 50 } };

// arr vem em ordem crescente de data; o último é o mais recente ("hoje").
function withToday(arr, patch) {
  const copy = arr.map((c) => ({ ...c }));
  copy[copy.length - 1] = { ...copy[copy.length - 1], ...patch };
  return copy;
}

describe('detectHRVAnomaly — queda abrupta de HRV', () => {
  // 14 dias com HRV estável em torno de 60 (variação pequena, stdDev > 0).
  const stable = days(14, (i) => ({ hrv: 59 + (i % 3), resting_hr: 50 }));

  it('retorna null abaixo do mínimo de check-ins', () => {
    expect(detectHRVAnomaly(days(3, () => ({ hrv: 60, resting_hr: 50 })), baseline)).toBeNull();
  });

  it('sem baseline → null (não inventa anomalia sem referência)', () => {
    expect(detectHRVAnomaly(stable, null)).toBeNull();
  });

  it('sem HRV de hoje → null', () => {
    expect(detectHRVAnomaly(withToday(stable, { hrv: null }), baseline)).toBeNull();
  });

  it('HRV dentro do padrão (z > −1,5) → null (silêncio quando está tudo bem)', () => {
    expect(detectHRVAnomaly(withToday(stable, { hrv: 60 }), baseline)).toBeNull();
  });

  it('queda forte de HRV (z ≤ −1,5) → alerta de aviso', () => {
    const r = detectHRVAnomaly(withToday(stable, { hrv: 45, resting_hr: 50 }), baseline);
    expect(r).not.toBeNull();
    expect(r.zScore).toBeLessThanOrEqual(-1.5);
    expect(r.drop).toBeGreaterThan(0);
    expect(r.alert.type).toBe('warning');
  });

  it('queda de HRV + RHR elevado (>7%) → alerta crítico', () => {
    const r = detectHRVAnomaly(withToday(stable, { hrv: 45, resting_hr: 58 }), baseline);
    expect(r).not.toBeNull();
    expect(r.rhrElevated).toBe(true);
    expect(r.alert.type).toBe('critical');
  });
});

describe('detectLongTermTrends — tendências de longo prazo', () => {
  it('não está pronto abaixo de 14 dias', () => {
    expect(detectLongTermTrends(days(10, () => ({ hrv: 60 }))).ready).toBe(false);
  });

  it('NUNCA analisa recovery_score (régua recalibrada = artefato), mesmo subindo forte', () => {
    const cks = days(20, (i) => ({ hrv: 60 + (i % 3), recovery_score: 40 + i * 2 }));
    const r = detectLongTermTrends(cks);
    expect(r.metrics.some((m) => m.key === 'recovery_score')).toBe(false);
    expect(r.metrics.some((m) => m.key === 'hrv')).toBe(true);
  });

  it('tendência limpa de HRV subindo → hasTrend e sentimento positivo', () => {
    const r = detectLongTermTrends(days(20, (i) => ({ hrv: 50 + i })));
    const hrv = r.metrics.find((m) => m.key === 'hrv');
    expect(hrv.hasTrend).toBe(true);
    expect(hrv.direction).toBe('up');
    expect(hrv.sentiment).toBe('positive');
  });

  it('FC de repouso subindo → sentimento negativo (mais alto é pior)', () => {
    const r = detectLongTermTrends(days(20, (i) => ({ resting_hr: 45 + i * 0.5 })));
    const rhr = r.metrics.find((m) => m.key === 'resting_hr');
    expect(rhr.direction).toBe('up');
    expect(rhr.sentiment).toBe('negative');
  });

  it('oscilação sem direção (|r| < 0,35) → sem tendência, sentimento neutro', () => {
    const r = detectLongTermTrends(days(20, (i) => ({ hrv: 60 + (i % 2 === 0 ? 5 : -5) })));
    const hrv = r.metrics.find((m) => m.key === 'hrv');
    expect(hrv.hasTrend).toBe(false);
    expect(hrv.sentiment).toBe('neutral');
  });
});

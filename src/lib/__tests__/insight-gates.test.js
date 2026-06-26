import { describe, it, expect } from 'vitest';
import { detectLaggedEffects, detectPersonalBottleneck } from '@/lib/physiological-engine.js';

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

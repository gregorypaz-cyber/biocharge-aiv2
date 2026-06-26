import { describe, it, expect } from 'vitest';
import { detectLaggedEffects } from '@/lib/physiological-engine.js';

function days(n, fn) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(2026, 0, 1 + i);
    return { date: d.toISOString().slice(0, 10), ...fn(i) };
  });
}

describe('detectLaggedEffects — placebo validado, silêncio travado', () => {
  // Dados desenhados para DISPARAR o efeito "treino intenso → queda de recovery 48h
  // depois" SE a função estivesse ativa: dias intensos (rpe 9) seguidos de quedas
  // fortes de recovery e de sono. Como o efeito foi validado como placebo (r≈+0,17,
  // ns), a função está desativada por design. Este teste trava esse silêncio:
  // se alguém reativar (removendo o kill-switch), estes dados farão a função
  // devolver efeitos e o teste quebra — forçando uma decisão consciente.
  const triggering = days(12, (i) => ({
    rpe: i % 3 === 0 ? 9 : 4,
    rest_day: false,
    recovery_score: i % 3 === 2 ? 45 : 85, // queda ~48h após dia intenso
    sleep_hours: i % 3 === 1 ? 5 : 8,       // sono curto na noite seguinte
  }));

  it('permanece silenciado mesmo com dados suficientes que disparariam o efeito', () => {
    expect(detectLaggedEffects(triggering)).toEqual([]);
  });

  it('também silencia abaixo do mínimo de check-ins', () => {
    expect(detectLaggedEffects(triggering.slice(0, 3))).toEqual([]);
  });
});

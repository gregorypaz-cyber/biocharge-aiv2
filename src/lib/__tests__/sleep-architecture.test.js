import { describe, it, expect } from 'vitest';
import {
  buildSleepArchitecture,
  sleepStageNormals,
  assessSleepRegime,
} from '../physiological-engine.js';

// ─── Arquitetura da noite (APRESENTACAO) ────────────────────────────────────
// Nao gera score nem entra em formula. So descreve a noite pra exibicao:
// base 'bed' soma 100 incluindo acordado; base 'sleep' soma 100 so o sono.

const sumPct = (arch) => arch.segments.reduce((s, x) => s + x.pct, 0);

describe('buildSleepArchitecture / sleepStageNormals — 8 invariantes', () => {

  // 1. Noite real completa (com tempo acordado): base 'bed', 4 segmentos.
  it('1. checkin com awake_minutes → base bed, 4 segmentos, pcts [15,22,49,14], soma 100', () => {
    const arch = buildSleepArchitecture(
      { sleep_hours: 6.37, awake_minutes: 61, deep_sleep_pct: 18, rem_sleep_pct: 25 },
      { base: 'bed' }
    );
    expect(arch.valid).toBe(true);
    expect(arch.base).toBe('bed');
    expect(arch.segments).toHaveLength(4);
    expect(arch.segments.map((s) => s.pct)).toEqual([15, 22, 49, 14]);
    expect(sumPct(arch)).toBe(100);
    expect(Math.round(arch.totalMinutes)).toBe(443);
  });

  // 2. Mesmo checkin sem awake_minutes → cai pra base 'sleep', 3 segmentos.
  it('2. sem awake_minutes → base sleep, baseFellBack true, 3 segmentos, soma 100', () => {
    const arch = buildSleepArchitecture(
      { sleep_hours: 6.37, deep_sleep_pct: 18, rem_sleep_pct: 25 },
      { base: 'bed' }
    );
    expect(arch.valid).toBe(true);
    expect(arch.base).toBe('sleep');
    expect(arch.baseFellBack).toBe(true);
    expect(arch.canSwitchBase).toBe(false);
    expect(arch.segments).toHaveLength(3);
    expect(sumPct(arch)).toBe(100);
  });

  // 3. Varredura de 6 noites reais → pct SEMPRE soma exatamente 100.
  it('3. 6 noites reais → soma dos pct === 100 em todas', () => {
    const nights = [
      { sleep_hours: 6.75, awake_minutes: 80,  deep_sleep_pct: 10, rem_sleep_pct: 36 },
      { sleep_hours: 5.85, awake_minutes: 93,  deep_sleep_pct: 17, rem_sleep_pct: 30 },
      { sleep_hours: 7.47, awake_minutes: 166, deep_sleep_pct: 14, rem_sleep_pct: 22 },
      { sleep_hours: 7.43, awake_minutes: 6,   deep_sleep_pct: 22, rem_sleep_pct: 22 },
      { sleep_hours: 6.05, awake_minutes: 180, deep_sleep_pct: 15, rem_sleep_pct: 25 },
      { sleep_hours: 6.28, awake_minutes: 60,  deep_sleep_pct: 18, rem_sleep_pct: 24 },
    ];
    for (const c of nights) {
      const arch = buildSleepArchitecture(c, { base: 'bed' });
      expect(arch.valid).toBe(true);
      expect(sumPct(arch)).toBe(100);
    }
  });

  // 4. Estagios inconsistentes (somam > 100) → valid false, sem segmentos.
  it('4. deep 70 + rem 40 → valid false, reason stage_sum_over_100, segments []', () => {
    const arch = buildSleepArchitecture(
      { sleep_hours: 7, deep_sleep_pct: 70, rem_sleep_pct: 40 },
      { base: 'bed' }
    );
    expect(arch.valid).toBe(false);
    expect(arch.reason).toBe('stage_sum_over_100');
    expect(arch.segments).toEqual([]);
  });

  // 5. Sem REM → nao inventa um segmento REM 0%.
  it('5. rem_sleep_pct null → nenhum segmento com id rem', () => {
    const arch = buildSleepArchitecture(
      { sleep_hours: 7, deep_sleep_pct: 18, rem_sleep_pct: null },
      { base: 'bed' }
    );
    expect(arch.valid).toBe(true);
    expect(arch.segments.some((s) => s.id === 'rem')).toBe(false);
  });

  // 6. Sem duracao → nem tenta.
  it('6. sleep_hours null → retorna null', () => {
    const arch = buildSleepArchitecture(
      { sleep_hours: null, deep_sleep_pct: 18, rem_sleep_pct: 25 },
      { base: 'bed' }
    );
    expect(arch).toBeNull();
  });

  // 7. Fonte unica de eficiencia: igual ao assessSleepRegime do mesmo checkin.
  it('7. efficiency === assessSleepRegime(checkin).efficiency', () => {
    const c = { sleep_hours: 6.37, awake_minutes: 61, deep_sleep_pct: 18, rem_sleep_pct: 25 };
    const arch = buildSleepArchitecture(c, { base: 'bed' });
    const regime = assessSleepRegime(c);
    expect(arch.efficiency).toBe(regime.efficiency);
  });

  // 8. Normais pessoais: sob o minimo → null; com noites suficientes → mediana correta.
  it('8. sleepStageNormals — 6 noites null, 8 noites mediana de deep correta', () => {
    const mk = (deepPct) => ({
      sleep_hours: 10,        // 600 min → deep = 6·pct
      awake_minutes: 30,
      deep_sleep_pct: deepPct,
      rem_sleep_pct: 20,
    });
    const six = [10, 10, 10, 20, 20, 20].map(mk);
    expect(sleepStageNormals(six)).toBeNull();

    const eight = [10, 10, 10, 10, 20, 20, 20, 20].map(mk);
    const norm = sleepStageNormals(eight);
    expect(norm).not.toBeNull();
    expect(norm.nights).toBe(8);
    // deep minutos: 60,60,60,60,120,120,120,120 → mediana (4o+5o)/2 = 90
    expect(norm.deep).toBe(90);
  });
});

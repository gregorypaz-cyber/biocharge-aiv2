import { describe, it, expect } from 'vitest';
import { assessHealthSignals } from '@/lib/physiological-engine.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// Generates N chronological days newest-first.
// Uses 2026-06-28 as "today" so dates stay within recent windows.
const TODAY = '2026-06-28';
function makeCheckins(n, fn) {
  const base = new Date(TODAY + 'T00:00:00');
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    return { date: d.toISOString().slice(0, 10), ...fn(i) };
  });
}

// Pre-built baseline so tests don't depend on buildBaseline's date-window behaviour.
const MOCK_BL = {
  hrv: { d7: 60, d14: 60, d30: 60 },
  rhr: { d7: 55, d14: 55, d30: 55 },
  sleep: { d7: 7.5, d14: 7.5, d30: 7.5 },
};

// Healthy day: HRV ~60, RHR normal
function normalDay(i = 0) {
  return { hrv: 58 + (i % 5), resting_hr: 55, sleep_hours: 7.5 };
}

// Deviation day: HRV very low (z ≤ -1.5 against normal window) + RHR elevated
function deviationDay() {
  return { hrv: 30, resting_hr: 65, sleep_hours: 7 };
}

// Only HRV depressed, RHR normal
function onlyHrvDown() {
  return { hrv: 30, resting_hr: 55, sleep_hours: 7 };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('assessHealthSignals — 8 invariantes', () => {

  // 1. Calibrating: < 7 nights with HRV → state calibrating, card must not render
  it('1. calibrating: baseline com <7 noites de HRV → state calibrating', () => {
    // 6 total checkins: index 0 = today, indexes 1-5 = past (only 5 nights with HRV)
    const checkins = makeCheckins(6, normalDay);
    const result = assessHealthSignals(checkins, MOCK_BL);
    expect(result.state).toBe('calibrating');
    expect(result.flagCount).toBe(0);
    expect(result.history).toEqual([]);
  });

  // 2. Gate of 2 flags: only HRV↓, RHR normal → state normal (1 flag ≠ alert)
  it('2. gate de 2 flags: só HRV↓ (RHR normal) → state normal', () => {
    const checkins = makeCheckins(21, (i) => i === 0 ? onlyHrvDown() : normalDay(i));
    const result = assessHealthSignals(checkins, MOCK_BL);
    expect(result.state).toBe('normal');
    expect(result.flagCount).toBeLessThan(2);
  });

  // 3. Acute: HRV↓ + RHR↑ today, yesterday normal → state acute
  it('3. agudo: HRV↓ + RHR↑ hoje, ontem normal → state acute', () => {
    const checkins = makeCheckins(21, (i) => i === 0 ? deviationDay() : normalDay(i));
    const result = assessHealthSignals(checkins, MOCK_BL);
    expect(result.state).toBe('acute');
  });

  // 4. Sustained: HRV↓ + RHR↑ today AND yesterday → state sustained
  it('4. sustentado: HRV↓ + RHR↑ hoje E ontem → state sustained', () => {
    const checkins = makeCheckins(21, (i) => (i === 0 || i === 1) ? deviationDay() : normalDay(i));
    const result = assessHealthSignals(checkins, MOCK_BL);
    expect(result.state).toBe('sustained');
  });

  // 5. Anti-false-positive: isolated deviation with short sleep → acute, never sustained
  //    sleepHoursToday must be present for the benign phrase
  it('5. 27/jun anti-falso-positivo: desvio isolado com noite curta → acute; sleepHoursToday presente', () => {
    const checkins = makeCheckins(21, (i) => {
      if (i === 0) return { hrv: 30, resting_hr: 65, sleep_hours: 5.5 };
      return normalDay(i);
    });
    const result = assessHealthSignals(checkins, MOCK_BL);
    expect(result.state).toBe('acute');
    expect(result.sleepHoursToday).toBeCloseTo(5.5, 1);
  });

  // 6. Baseline excludes today: assessHealthSignals uses the passed-in baseline object,
  //    does not recompute it internally; the output flags reflect the supplied baseline.
  it('6. baseline exclui dia atual: usa o baseline passado sem recalcular internamente', () => {
    const checkins = makeCheckins(21, normalDay);

    const bl60 = { hrv: { d14: 60 }, rhr: { d14: 55 } };
    const bl80 = { hrv: { d14: 80 }, rhr: { d14: 70 } };

    const r60 = assessHealthSignals(checkins, bl60);
    const r80 = assessHealthSignals(checkins, bl80);

    // Both results must be valid
    expect(['normal', 'calibrating', 'acute', 'sustained']).toContain(r60.state);
    expect(['normal', 'calibrating', 'acute', 'sustained']).toContain(r80.state);

    // The hrv flag baseline value in the output reflects the passed-in baseline
    const fHrv60 = r60.flags.find((f) => f.id === 'hrv');
    const fHrv80 = r80.flags.find((f) => f.id === 'hrv');
    expect(typeof fHrv60.baseline).toBe('number');
    expect(typeof fHrv80.baseline).toBe('number');
    // Different baselines must produce different output values
    expect(fHrv60.baseline).not.toBe(fHrv80.baseline);
  });

  // 7. Direction: HRV below baseline → direction 'bad'; RHR below baseline → direction 'good'
  it('7. direção: HRV abaixo → direction bad; RHR abaixo → direction good', () => {
    // Today: HRV 45 (below baseline 60) and RHR 50 (below baseline 55)
    const checkins = makeCheckins(21, (i) => {
      if (i === 0) return { hrv: 45, resting_hr: 50, sleep_hours: 7.5 };
      return normalDay(i);
    });
    const result = assessHealthSignals(checkins, MOCK_BL);
    const fHrv = result.flags.find((f) => f.id === 'hrv');
    const fRhr = result.flags.find((f) => f.id === 'rhr');
    expect(fHrv.direction).toBe('bad');   // HRV↓ = bad
    expect(fRhr.direction).toBe('good');  // RHR↓ = good
  });

  // 8. Honest silence: no historical deviations → history [] and state normal
  it('8. silêncio honesto: sem desvios no histórico → history vazio', () => {
    const checkins = makeCheckins(30, normalDay);
    const result = assessHealthSignals(checkins, MOCK_BL);
    expect(result.state).toBe('normal');
    expect(result.history).toEqual([]);
  });

});

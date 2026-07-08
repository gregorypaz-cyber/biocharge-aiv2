import { describe, it, expect } from 'vitest';
import { assessBaselineFreshness } from '@/lib/physiological-engine.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = new Date('2026-07-08T09:00:00Z');
// datas 'YYYY-MM-DD' explícitas por teste, mais novo primeiro
const mk = (dates) => dates.map((date) => ({ date, hrv: 55, resting_hr: 55, sleep_hours: 7.5 }));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('assessBaselineFreshness — 8 invariantes', () => {

  // 1. Dado insuficiente: [] → null. 1 check-in → gapBeforeLatest null.
  it('1. dado insuficiente: [] → null; 1 check-in → gapBeforeLatest null', () => {
    expect(assessBaselineFreshness([], NOW)).toBeNull();

    const result = assessBaselineFreshness(mk(['2026-07-08']), NOW);
    expect(result).not.toBeNull();
    expect(result.gapBeforeLatest).toBeNull();
  });

  // 2. Fresh: check-in de hoje, ontem presente (gap 1) → fresh, reason null
  it('2. fresh: check-in de hoje + ontem (gap 1) → status fresh, reason null', () => {
    const checkins = mk(['2026-07-08', '2026-07-07']);
    const result = assessBaselineFreshness(checkins, NOW);
    expect(result.status).toBe('fresh');
    expect(result.reason).toBeNull();
    expect(result.daysSinceLastReading).toBe(0);
    expect(result.gapBeforeLatest).toBe(1);
  });

  // 3. Aging por gap: lacuna de 4 dias antes da última
  it('3. aging por gap: lacuna de 4 dias antes da última → status aging, reason baseline_gap', () => {
    const checkins = mk(['2026-07-08', '2026-07-04']);
    const result = assessBaselineFreshness(checkins, NOW);
    expect(result.status).toBe('aging');
    expect(result.reason).toBe('baseline_gap');
    expect(result.gapBeforeLatest).toBe(4);
  });

  // 4. Stale por gap: lacuna de 9 dias antes da última
  it('4. stale por gap: lacuna de 9 dias antes da última → status stale, reason baseline_gap', () => {
    const checkins = mk(['2026-07-08', '2026-06-29']);
    const result = assessBaselineFreshness(checkins, NOW);
    expect(result.status).toBe('stale');
    expect(result.reason).toBe('baseline_gap');
    expect(result.gapBeforeLatest).toBe(9);
  });

  // 5. Stale por idade da leitura: último check-in há 8 dias (mas internamente contíguo)
  it('5. stale por idade da leitura: último check-in há 8 dias (contíguo) → status stale, reason reading_age', () => {
    const checkins = mk(['2026-06-30', '2026-06-29']);
    const result = assessBaselineFreshness(checkins, NOW);
    expect(result.status).toBe('stale');
    expect(result.reason).toBe('reading_age');
    expect(result.daysSinceLastReading).toBe(8);
  });

  // 6. Pior dos dois vence: idade = 1 dia mas gap anterior = 8
  it('6. pior dos dois vence: idade 1 dia, gap anterior 8 → status stale, reason baseline_gap', () => {
    const checkins = mk(['2026-07-07', '2026-06-29']);
    const result = assessBaselineFreshness(checkins, NOW);
    expect(result.status).toBe('stale');
    expect(result.reason).toBe('baseline_gap');
    expect(result.daysSinceLastReading).toBe(1);
    expect(result.gapBeforeLatest).toBe(8);
  });

  // 7. Idade nunca negativa: check-in com data futura vs now
  it('7. idade nunca negativa: check-in com data futura → daysSinceLastReading === 0', () => {
    const checkins = mk(['2026-07-10']);
    const result = assessBaselineFreshness(checkins, NOW);
    expect(result.daysSinceLastReading).toBe(0);
  });

  // 8. Limiares de borda: gap 2 → fresh; gap 3 → aging; gap 6 → aging; gap 7 → stale
  it('8. limiares de borda: gap 2 fresh, gap 3 aging, gap 6 aging, gap 7 stale', () => {
    const gap2 = assessBaselineFreshness(mk(['2026-07-08', '2026-07-06']), NOW);
    expect(gap2.status).toBe('fresh');

    const gap3 = assessBaselineFreshness(mk(['2026-07-08', '2026-07-05']), NOW);
    expect(gap3.status).toBe('aging');

    const gap6 = assessBaselineFreshness(mk(['2026-07-08', '2026-07-02']), NOW);
    expect(gap6.status).toBe('aging');

    const gap7 = assessBaselineFreshness(mk(['2026-07-08', '2026-07-01']), NOW);
    expect(gap7.status).toBe('stale');
  });
});

import { describe, it, expect } from 'vitest';
import { assessSleepRegime } from '../physiological-engine.js';

// ─── Detector de regime de sono ─────────────────────────────────────────────
// Eficiência = tempo dormindo / tempo na cama. NÃO altera o recovery — só marca
// se a noite está dentro do domínio onde HRV/RHR foram validados.

describe('assessSleepRegime — 8 invariantes', () => {

  // 1. Sem awake_minutes → não dá pra medir eficiência: unknown, mas não penaliza.
  it('1. sem awake_minutes → state unknown, efficiency null, inDomain true', () => {
    const r = assessSleepRegime({ sleep_hours: 7.5 });
    expect(r.state).toBe('unknown');
    expect(r.efficiency).toBeNull();
    expect(r.awakeMinutes).toBeNull();
    expect(r.inDomain).toBe(true);
  });

  // 2. Noite perfeita: zero minutos acordado.
  it('2. awake_minutes 0 / sleep_hours 7.5 → efficiency 1, state consolidated, inDomain true', () => {
    const r = assessSleepRegime({ sleep_hours: 7.5, awake_minutes: 0 });
    expect(r.efficiency).toBeCloseTo(1, 5);
    expect(r.state).toBe('consolidated');
    expect(r.inDomain).toBe(true);
  });

  // 3. Regime normal do dono.
  it('3. sleep_hours 7.5 / awake_minutes 15 → efficiency ~0.968, consolidated, inDomain true', () => {
    const r = assessSleepRegime({ sleep_hours: 7.5, awake_minutes: 15 });
    expect(r.efficiency).toBeCloseTo(0.968, 3);
    expect(r.state).toBe('consolidated');
    expect(r.inDomain).toBe(true);
    expect(r.awakeMinutes).toBe(15);
  });

  // 4. Caso real 31/07 — noite severamente fragmentada.
  it('4. sleep_hours 5.85 / awake_minutes 126 → efficiency ~0.736, severely_fragmented, inDomain false', () => {
    const r = assessSleepRegime({ sleep_hours: 5.85, awake_minutes: 126 });
    expect(r.efficiency).toBeCloseTo(0.736, 3);
    expect(r.state).toBe('severely_fragmented');
    expect(r.inDomain).toBe(false);
  });

  // 5. Caso real 28/07 — noite severamente fragmentada.
  it('5. sleep_hours 7.2 / awake_minutes 181 → efficiency ~0.705, severely_fragmented, inDomain false', () => {
    const r = assessSleepRegime({ sleep_hours: 7.2, awake_minutes: 181 });
    expect(r.efficiency).toBeCloseTo(0.705, 3);
    expect(r.state).toBe('severely_fragmented');
    expect(r.inDomain).toBe(false);
  });

  // 6. Caso real 29/07 — noite do regime bebê que fica ACIMA do limiar.
  // Invariante: o detector não marca toda noite do regime bebê como ruim.
  it('6. sleep_hours 6.28 / awake_minutes 60 → efficiency ~0.863, consolidated, inDomain true', () => {
    const r = assessSleepRegime({ sleep_hours: 6.28, awake_minutes: 60 });
    expect(r.efficiency).toBeCloseTo(0.863, 3);
    expect(r.state).toBe('consolidated');
    expect(r.inDomain).toBe(true);
  });

  // 7. Limiar exato: efficiency == 0.85 → inDomain true (comparação é >=).
  it('7. efficiency exatamente 0.85 → inDomain true (comparação >=)', () => {
    // 8.5h = 510 min dormindo; 90 min acordado; bed 600 → 510/600 = 0.85
    const r = assessSleepRegime({ sleep_hours: 8.5, awake_minutes: 90 });
    expect(r.efficiency).toBeCloseTo(0.85, 10);
    expect(r.inDomain).toBe(true);
    expect(r.state).toBe('consolidated');
  });

  // 8. Entradas inválidas → unknown, nunca penaliza.
  it('8. sleep_hours null ou awake_minutes negativo → state unknown, inDomain true', () => {
    const nullHours = assessSleepRegime({ sleep_hours: null, awake_minutes: 30 });
    expect(nullHours.state).toBe('unknown');
    expect(nullHours.inDomain).toBe(true);

    const negAwake = assessSleepRegime({ sleep_hours: 7.5, awake_minutes: -10 });
    expect(negAwake.state).toBe('unknown');
    expect(negAwake.inDomain).toBe(true);
  });
});

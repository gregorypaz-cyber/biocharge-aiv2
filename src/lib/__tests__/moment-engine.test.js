import { describe, it, expect } from 'vitest';
import { detectMoments, pickMoment } from '@/lib/moment-engine.js';

// Helper: gera N dias de check-in terminando em `end` (YYYY-MM-DD), newest não-garantido
// (o motor ordena sozinho). `fn(i)` recebe i=0 (mais antigo) → N-1 (mais recente).
function series(n, end, fn) {
  const endIdx = Math.round(Date.parse(end) / 86400000);
  return Array.from({ length: n }, (_, i) => {
    const dayIdx = endIdx - (n - 1 - i);
    const date = new Date(dayIdx * 86400000).toISOString().slice(0, 10);
    return { date, ...fn(i, n) };
  });
}

const flat = (over = {}) => (i, n) => ({
  hrv: 55, resting_hr: 52, sleep_hours: 7.5, recovery_score: 70, ...over,
});

describe('moment-engine — portão de dado mínimo', () => {
  it('silêncio (vazio) abaixo do histórico mínimo', () => {
    const cks = series(5, '2026-07-30', flat());
    expect(detectMoments(cks)).toEqual([]);
    expect(pickMoment(cks)).toBeNull();
  });

  it('um dia comum e estável não gera momento', () => {
    const cks = series(20, '2026-07-30', flat());
    expect(detectMoments(cks)).toEqual([]);
  });
});

describe('moment-engine — sequência de alta do HRV', () => {
  it('nomeia N altas consecutivas de manhãs adjacentes', () => {
    // últimos 5 dias subindo: 50,52,54,56,58 → 4 altas
    const cks = series(20, '2026-07-30', (i, n) => ({
      hrv: i >= n - 5 ? 50 + (i - (n - 5)) * 2 : 55,
      resting_hr: 52, sleep_hours: 7.5, recovery_score: 70,
    }));
    const m = detectMoments(cks).find((x) => x.id === 'hrv_rising');
    expect(m).toBeTruthy();
    expect(m.text).toContain('4 manhãs seguidas');
    expect(m.evidence.value).toBe('58ms');
  });

  it('não dispara com menos de 3 altas', () => {
    const cks = series(20, '2026-07-30', (i, n) => ({
      hrv: i >= n - 3 ? 50 + (i - (n - 3)) * 2 : 55,
      resting_hr: 52, sleep_hours: 7.5, recovery_score: 70,
    }));
    expect(detectMoments(cks).find((x) => x.id === 'hrv_rising')).toBeUndefined();
  });

  it('quebra a sequência num dia faltante (não são manhãs seguidas)', () => {
    const cks = series(20, '2026-07-30', (i, n) => ({
      hrv: i >= n - 5 ? 50 + (i - (n - 5)) * 2 : 55,
      resting_hr: 52, sleep_hours: 7.5, recovery_score: 70,
    }));
    // remove o penúltimo dia → cria buraco de calendário perto do topo
    const withGap = cks.filter((c) => c.date !== '2026-07-29');
    const m = detectMoments(withGap).find((x) => x.id === 'hrv_rising');
    // a sequência agora não é de dias adjacentes até o topo
    expect(m == null || !m.text.includes('4 manhãs')).toBe(true);
  });
});

describe('moment-engine — recorde de FC de repouso', () => {
  it('reconhece a menor FC de repouso de todo o histórico', () => {
    const cks = series(20, '2026-07-30', (i, n) => ({
      hrv: 55, sleep_hours: 7.5, recovery_score: 70,
      resting_hr: i === n - 1 ? 44 : 52, // hoje é a menor de todas
    }));
    const m = detectMoments(cks).find((x) => x.id === 'rhr_record');
    expect(m).toBeTruthy();
    expect(m.text).toContain('44 bpm');
    expect(m.priority).toBe(100);
  });

  it('não vira recorde se já houve FC igual ou menor antes', () => {
    const cks = series(20, '2026-07-30', (i, n) => ({
      hrv: 55, sleep_hours: 7.5, recovery_score: 70,
      resting_hr: i === n - 1 ? 44 : (i === 3 ? 43 : 52),
    }));
    expect(detectMoments(cks).find((x) => x.id === 'rhr_record')).toBeUndefined();
  });
});

describe('moment-engine — rank de HRV baixo', () => {
  it('"mais baixo em N dias" com profundidade suficiente', () => {
    // 25 dias em 55; hoje 40 (o mais baixo desde o começo)
    const cks = series(25, '2026-07-30', (i, n) => ({
      hrv: i === n - 1 ? 40 : 55,
      resting_hr: 52, sleep_hours: 7.5, recovery_score: 70,
    }));
    const m = detectMoments(cks).find((x) => x.id === 'hrv_low');
    expect(m).toBeTruthy();
    expect(m.text).toMatch(/mais baixo (em \d+ dias|que já registrei)/);
  });
});

describe('moment-engine — travessia da dívida de sono', () => {
  it('dispara quando a dívida cruza 6h de ontem pra hoje', () => {
    // noites na meta (7.5h → dívida 0); hoje 0.5h → janela de 7 noites passa de 6h
    const cks = series(14, '2026-07-30', (i, n) => ({
      hrv: 55, resting_hr: 52, recovery_score: 70,
      sleep_hours: i === n - 1 ? 0.5 : 7.5,
    }));
    const m = detectMoments(cks).find((x) => x.id === 'sleep_debt_cross');
    expect(m).toBeTruthy();
    expect(m.text).toContain('passou de 6h');
  });
});

describe('moment-engine — escolha e não-repetição', () => {
  it('escolhe o de maior prioridade', () => {
    // recorde de FC (100) deve ganhar de um HRV subindo
    const cks = series(20, '2026-07-30', (i, n) => ({
      hrv: i >= n - 5 ? 50 + (i - (n - 5)) * 2 : 55,
      resting_hr: i === n - 1 ? 44 : 52,
      sleep_hours: 7.5, recovery_score: 70,
    }));
    expect(pickMoment(cks).id).toBe('rhr_record');
  });

  it('pula a assinatura já mostrada e cai no próximo candidato', () => {
    const cks = series(20, '2026-07-30', (i, n) => ({
      hrv: i >= n - 5 ? 50 + (i - (n - 5)) * 2 : 55,
      resting_hr: i === n - 1 ? 44 : 52,
      sleep_hours: 7.5, recovery_score: 70,
    }));
    const top = pickMoment(cks);
    const next = pickMoment(cks, top.signature);
    expect(next).toBeTruthy();
    expect(next.signature).not.toBe(top.signature);
  });
});

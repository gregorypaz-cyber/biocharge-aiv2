# Manual Test Checklist — physio-normalize

No test runner detected in this project. Run these cases manually via browser console or a quick `node` script.

---

## Case 1 — Empty / invalid input

```js
import { normalizeCheckins } from '../lib/physio-normalize.js';

normalizeCheckins([]);       // expected: []
normalizeCheckins(null);     // expected: []
normalizeCheckins(undefined);// expected: []
```

**Expected:** returns `[]` without throwing.

---

## Case 2 — Alias resolution (`resting_heart_rate → resting_hr`)

```js
const result = normalizeCheckins([
  { date: '2026-05-10', resting_heart_rate: 58, hrv: 65 },
]);

console.assert(result[0].resting_hr === 58, 'resting_hr should be 58');
console.assert(result._normalized === true, 'should be marked normalized');
```

**Expected:** `resting_hr` is populated from `resting_heart_rate`; `_normalized === true`.

---

## Case 3 — DESC ordering

```js
const result = normalizeCheckins([
  { date: '2026-05-08', hrv: 60 },
  { date: '2026-05-10', hrv: 70 },
  { date: '2026-05-09', hrv: 65 },
], { ensureDesc: true });

console.assert(result[0].date === '2026-05-10', 'first should be most recent');
console.assert(result[2].date === '2026-05-08', 'last should be oldest');
```

**Expected:** array sorted newest → oldest.

---

## Bonus — Invalid date removal (physio-normalize)

```js
const result = normalizeCheckins([
  { date: 'not-a-date', hrv: 50 },
  { date: '2026-05-10', hrv: 70 },
]);
// console.warn should fire once
console.assert(result.length === 1, 'invalid date entry should be removed');
```

---

---

# Manual Test Checklist — calculateTrainingLoad

`fix(physio): correct training load acute/chronic ratio + robust daily load`

---

## Case 1 — Sessions priority (load from strain_score)

```js
import { calculateTrainingLoad } from '../lib/physiological-engine.js';

const checkins = Array.from({ length: 20 }, (_, i) => ({
  date: `2026-04-${String(25 - i).padStart(2, '0')}`,
  rpe: 7,
  daily_strain_accumulated: 10,
  rest_day: false,
}));

const sessions = [
  { date: checkins[0].date, strain_score: 15 },
  { date: checkins[0].date, strain_score: 8 },  // same day — should sum to 23
];

const result = calculateTrainingLoad(checkins, sessions);
// acute should reflect 23 for today + rpe*2 for remaining 6 days of last7
console.assert(typeof result.ratio === 'number', 'ratio should be a number');
console.assert(result.risk !== 'insufficient_data', 'should have enough data');
console.log('sessions priority:', result);
```

---

## Case 2 — daily_strain_accumulated fallback

```js
const checkins = Array.from({ length: 20 }, (_, i) => ({
  date: `2026-04-${String(25 - i).padStart(2, '0')}`,
  daily_strain_accumulated: 12,
  rpe: null,
}));

const result = calculateTrainingLoad(checkins, []);
// Every day load = 12 → uniform distribution → ratio ≈ 1.00
console.assert(result.ratio !== null, 'ratio must not be null');
console.log('daily_strain fallback:', result);
```

---

## Case 3 — RPE proxy fallback (rpe * 2)

```js
const checkins = Array.from({ length: 20 }, (_, i) => ({
  date: `2026-04-${String(25 - i).padStart(2, '0')}`,
  rpe: 8,
  rest_day: false,
  daily_strain_accumulated: 0,
}));

const result = calculateTrainingLoad(checkins, []);
// load per day = rpe * 2 = 16; uniform distribution → ratio ≈ 1.00
console.assert(result.risk === 'low', 'uniform load should be low risk');
console.log('rpe proxy:', result);
```

---

## Case 4 — insufficient_data guard

```js
const checkins = Array.from({ length: 13 }, (_, i) => ({
  date: `2026-05-${String(13 - i).padStart(2, '0')}`,
  rpe: 6,
}));

const result = calculateTrainingLoad(checkins, []);
console.assert(result.risk === 'insufficient_data', 'should return insufficient_data');
console.assert(result.ratio === null, 'ratio should be null');
console.log('insufficient_data:', result);
```

---

## Case 5 — Zero / null robustness

```js
const checkins = Array.from({ length: 20 }, (_, i) => ({
  date: `2026-04-${String(25 - i).padStart(2, '0')}`,
  rpe: null,
  daily_strain_accumulated: null,
  rest_day: true,
}));

const result = calculateTrainingLoad(checkins, []);
// All loads = 0 → chronicWeeklyAvg = 0 → ratio defaults to 1
console.assert(result.ratio === 1, 'all-zero load should yield ratio 1');
console.log('zero robustness:', result);
```

---

---

# Manual Test Checklist — getActionableRecs confidence badges

`feat(ui): confidence badges + CTAs + narrative hooks (non-breaking)`

---

## Case 1 — confidence Alta (load + debt)

```js
import { getActionableRecs } from '../lib/physiological-engine.js';

const today = { recovery_score: 80, hrv: 55 };
const state = { state: 'Recovered' };
const sleepDebt = { debt: 4 };
const trainingLoad = { risk: 'low', ratio: 1.1 };

const recs = getActionableRecs(today, state, sleepDebt, trainingLoad);
console.assert(recs[0].confidence === 'Alta', 'should be Alta');
console.assert(Array.isArray(recs[0].provenance), 'provenance should be array');
```

---

## Case 2 — confidence Média (load only, no debt)

```js
const recs = getActionableRecs(
  { recovery_score: 70 },
  { state: 'Balanced' },
  { debt: 0 },
  { risk: 'low', ratio: 1.0 }
);
console.assert(recs[0].confidence === 'Média', 'should be Média');
```

---

## Case 3 — confidence Baixa (no load data)

```js
const recs = getActionableRecs(
  { recovery_score: 60 },
  { state: 'Balanced' },
  null,
  null
);
console.assert(recs[0].confidence === 'Baixa', 'should be Baixa');
```

---

## Case 4 — insufficient_data trainingLoad → Média, not Alta

```js
const recs = getActionableRecs(
  { recovery_score: 60 },
  { state: 'Balanced' },
  { debt: 5 },
  { risk: 'insufficient_data', ratio: null }
);
// hasLoad = false (risk === 'insufficient_data'), hasDebt = true → Média
console.assert(recs[0].confidence === 'Média', 'insufficient_data should not yield Alta');
```

---

## Case 5 — no recs crash (today/state null)

```js
const recs = getActionableRecs(null, null, null, null);
console.assert(recs.length === 0, 'should return empty array without throwing');
```

---

---

# Manual Test Checklist — runPhysiologicalAnalysisAsync

`perf(physio): async analysis via worker + safe cache (non-breaking)`

Arquivos: `lib/physiological-engine.js`, `lib/physio-worker.js`

---

## Case 1 — happy path, fallback síncrono

```js
import { runPhysiologicalAnalysisAsync } from './physiological-engine.js';
const checkins = /* array com ≥14 registros normalizados */;
const result = await runPhysiologicalAnalysisAsync(checkins, [], { useWorker: false });
console.assert(result !== null, 'deve retornar resultado');
console.assert('physioState' in result, 'deve ter physioState');
console.assert('actionableRecs' in result, 'deve ter actionableRecs');
```

## Case 2 — cache hit acelera segundo call

```js
const t1 = performance.now();
await runPhysiologicalAnalysisAsync(checkins, [], { useWorker: false });
const t2 = performance.now();
await runPhysiologicalAnalysisAsync(checkins, [], { useWorker: false }); // cache hit
const t3 = performance.now();
console.assert((t3 - t2) < (t2 - t1) / 2, 'segundo call deve ser mais rápido (cache)');
```

## Case 3 — retorna null sem throw em dados inválidos

```js
const result = await runPhysiologicalAnalysisAsync(null, null, { useWorker: false });
console.assert(result === null, 'deve retornar null sem lançar exceção');
```

## Case 4 — djb2 hash não usa btoa (safe com emojis)

```js
const c = [{ date: '2026-05-14', notes: 'Treino 🏃‍♂️ incrível!', recovery_score: 72 }];
// Não deve lançar InvalidCharacterError
const r = await runPhysiologicalAnalysisAsync(c, [], { useWorker: false });
console.log('hash emoji safe: ok, result =', r === null ? 'null (< 14 checkins)' : 'object');
```

## Case 5 — TTL 0 sempre recomputa

```js
await runPhysiologicalAnalysisAsync(checkins, [], { useWorker: false, cacheTTLMinutes: 0 });
await new Promise(res => setTimeout(res, 5));
const r = await runPhysiologicalAnalysisAsync(checkins, [], { useWorker: false, cacheTTLMinutes: 0 });
console.assert(r !== null, 'deve recomputar após TTL expirar');
``
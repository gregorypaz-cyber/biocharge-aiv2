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

## Bonus — Invalid date removal

```js
const result = normalizeCheckins([
  { date: 'not-a-date', hrv: 50 },
  { date: '2026-05-10', hrv: 70 },
]);
// console.warn should fire once
console.assert(result.length === 1, 'invalid date entry should be removed');
``
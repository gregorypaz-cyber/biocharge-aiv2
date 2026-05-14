# Manual Test Checklist — BioCharge AI Physiological Engine

Run these tests manually in the browser console or via unit test runner.
Import helpers: `import { runPhysiologicalAnalysis } from '@/lib/physiological-engine'`
Import: `import { prescribeWorkout, formatPrescriptionText } from '@/lib/workout-prescription'`

---

## 1. Data Normalization (physio-normalize)

- [ ] Empty array input → returns `[]` without throwing
- [ ] Alias resolution: `resting_heart_rate` → normalized to `resting_hr`
- [ ] Records sorted descending by `date` (newest first)
- [ ] Records with invalid/null `date` are dropped gracefully

---

## 2. Training Load Engine

- [ ] `< 14` check-ins → returns `{ risk: 'insufficient_data' }`
- [ ] Sessions strain sum takes priority over `daily_strain_accumulated`
- [ ] `daily_strain_accumulated` used as fallback when no sessions
- [ ] RPE proxy (`rpe * 2`) used when both strain and accumulated are zero
- [ ] All-zero / null RPE check-ins → `acute: 0`, no crash
- [ ] `ratio` rounds to 2 decimal places; risk thresholds: `>1.5` high, `>1.3` moderate

---

## 3. Recommendation Confidence

- [ ] `trainingRisk === 'insufficient_data'` → confidence `'Baixa'`
- [ ] `recovery == null` → confidence `'Baixa'`
- [ ] `trainingRisk moderate + fatigue > 50` → confidence `'Alta'`
- [ ] Null `analysis` → `prescribeWorkout(null)` returns `null` without throwing

---

## 4. Async Analysis & Caching

- [ ] `runPhysiologicalAnalysisAsync` returns same shape as sync version
- [ ] Second call with same data returns from cache (no recalculation)
- [ ] Cache TTL expiry: mock `Date.now()` forward 16min → cache miss
- [ ] Worker timeout (8s) → falls back to sync gracefully
- [ ] Invalid data (empty array) → returns `null`, no crash

---

## 5. prescribeWorkout — 6 Scenarios

### 5.1 Cenário Crítico (Sobrecarga)
Input:
```js
const analysis = {
  today: { recovery_score: 35, fatigue_score: 80, resting_hr: 68 },
  trainingLoad: { risk: 'high', ratio: 1.8 },
  physioState: { state: 'Overreached' },
  sleepDebt: { debt: 4 },
  baselineInsights: [],
  runningEconomy: null,
  hrvAnomaly: { alert: { type: 'critical' } },
};
prescribeWorkout(analysis, {});
```
Esperado:
- [ ] `summary.confidence === 'Alta'`
- [ ] Todas as 3 opções são conservadoras (modality: `'Recuperação'` ou `'Mobilidade'`)
- [ ] Nenhuma opção tem `intensity.range[1] > 9` se do tipo `'strain'`
- [ ] `options.length === 3`

---

### 5.2 Recovery Alto (≥ 80) com foco em corrida
Input:
```js
const analysis = {
  today: { recovery_score: 85, fatigue_score: 20, date: '2026-05-14' },
  trainingLoad: { risk: 'low', ratio: 0.9 },
  physioState: { state: 'Recovered' },
  sleepDebt: { debt: 0 },
  baselineInsights: [{ label: 'HRV', delta: 12 }],
  runningEconomy: { sessionsAnalyzed: 6 },
  hrvAnomaly: null,
};
prescribeWorkout(analysis, { preferred_sports: ['Corrida'], level: 'intermediate' });
```
Esperado:
- [ ] `summary.confidence === 'Média'` ou `'Alta'`
- [ ] Opção A: `modality === 'Corrida'`, `intensity.range[1] >= 12`
- [ ] Opção B: `modality === 'Corrida'`, strain range inclui `[8, 12]`
- [ ] `options.length === 3`
- [ ] `evidence.recovery === 85`
- [ ] `safetyWarnings.length === 3`

---

### 5.3 Recovery Moderado (65–79)
Input:
```js
const analysis = {
  today: { recovery_score: 72, fatigue_score: 40 },
  trainingLoad: { risk: 'moderate', ratio: 1.35 },
  physioState: { state: 'Balanced' },
  sleepDebt: { debt: 1.5 },
  baselineInsights: [],
  runningEconomy: null,
  hrvAnomaly: null,
};
prescribeWorkout(analysis, {});
```
Esperado:
- [ ] Opção A: `modality === 'Corrida'`, strain `[8, 12]`
- [ ] Opção B: `modality === 'Força'`, RPE `[5, 7]`
- [ ] Opção C: `modality === 'Misto'` ou `'Mobilidade'`
- [ ] `summary.confidence === 'Alta'` (moderate risk + fatigue > 0 > 50? check logic)

---

### 5.4 Recovery Baixo (50–64) / Dívida de sono ≥ 3
Input:
```js
const analysis = {
  today: { recovery_score: 55, fatigue_score: 60 },
  trainingLoad: { risk: 'low', ratio: 1.0 },
  physioState: { state: 'Fatigued' },
  sleepDebt: { debt: 3.5 },
  baselineInsights: [],
  runningEconomy: null,
  hrvAnomaly: null,
};
prescribeWorkout(analysis, { available_time_minutes: 45 });
```
Esperado:
- [ ] Opção A: `modality === 'Corrida'`, `intensity.range[1] <= 9`
- [ ] Opção B: `modality === 'Mobilidade'`
- [ ] Opção C: `modality === 'Recuperação'`, `intensity === null`
- [ ] `evidence.sleepDebtHours === 3.5`

---

### 5.5 Dados Insuficientes
Input:
```js
prescribeWorkout({ today: {}, trainingLoad: { risk: 'insufficient_data' }, sleepDebt: {}, physioState: {}, baselineInsights: [], runningEconomy: null, hrvAnomaly: null }, {});
```
Esperado:
- [ ] `summary.confidence === 'Baixa'`
- [ ] `options.length === 3`
- [ ] `rationale` de cada opção menciona "poucos dados"
- [ ] `provenance === 'heuristic'`

---

### 5.6 userPrefs com available_time_minutes = 20
Input:
```js
const analysis = {
  today: { recovery_score: 70, fatigue_score: 35 },
  trainingLoad: { risk: 'low', ratio: 1.1 },
  physioState: { state: 'Balanced' },
  sleepDebt: { debt: 0 },
  baselineInsights: [],
  runningEconomy: null,
  hrvAnomaly: null,
};
prescribeWorkout(analysis, { available_time_minutes: 20 });
```
Esperado:
- [ ] Todas as opções com `duration_min != null` devem ter `duration_min <= 20`
- [ ] Nenhuma opção com `duration_min < 15`
- [ ] `id` presente e começa com `'rx_'`
- [ ] `date` no formato `YYYY-MM-DD`

---

## 6. WorkoutSuggestionCard UI

### Renderização com prescrição
- [ ] Ao passar `analysis` válido como prop → bloco "Plano de Treino de Hoje" aparece abaixo do card legado
- [ ] Sem `analysis` (undefined) → apenas card legado é exibido, sem erros
- [ ] `workoutPrescription` prop tem prioridade sobre `analysis` prop

### Interação com opções
- [ ] Clicar em opção B/C muda detalhes da seção inferior (warmup/main/cooldown)
- [ ] Badge de confiança (Alta/Média/Baixa) exibe cor correta (verde/amarelo/cinza)
- [ ] `aria-live` na área de detalhes é detectado por leitores de tela

### CTAs
- [ ] Sem `onScheduleOption` e `onSchedule` → botão "Agendar" não renderiza
- [ ] Com `onScheduleOption` definido → clique em "Agendar" chama callback com objeto da opção
- [ ] Com `onCompleteOption` definido → clique em "Marcar como feito" chama callback
- [ ] Sem callbacks definidos → sem botões CTA, sem erros

### Responsivo mobile
- [ ] Grid de 3 opções não quebra em viewport 375px
- [ ] Textos não transbordam nos cards de opção
- [ ] Disclaimer de segurança visível no scroll

---

## 7. formatPrescriptionText

- [ ] Retorna string não-vazia para prescrição válida
- [ ] Retorna `''` para `null` sem lançar exceção
- [ ] Output contém as chaves `[A]`, `[B]`, `[C]`
- [ ] Output contém a data da prescrição
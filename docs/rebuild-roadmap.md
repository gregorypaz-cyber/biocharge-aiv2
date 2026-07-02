# Rebuild Roadmap — Reck (BioCharge AI v2)

> Análise feita em 02/07/2026 contra o estado real do código. Nenhuma implementação foi feita — apenas diagnóstico e plano.

---

## Estado atual da arquitetura

### Stack
React 18 + Vite + TanStack Query + TailwindCSS + Radix UI. Hospedado no Base44 (React SPA + backend BaaS). Dados inseridos manualmente via check-in diário.

### Problemas estruturais identificados

| Problema | Severidade | Arquivo(s) |
|---|---|---|
| `Today.jsx` é um God Component (1886 linhas) com lógica de negócio, estado, UI e componentes inline | Alta | `src/pages/Today.jsx` |
| Componentes inline não reutilizáveis: `MiniRing`, `ExecutionCard`, `CollapsibleHint`, `TomorrowHookCard` definidos dentro de `Today.jsx` | Alta | `src/pages/Today.jsx` |
| Dependências mortas / não usadas: `three.js`, `react-leaflet`, `react-quill`, `jspdf`, `html2canvas`, `@stripe/*`, `moment` (duplica `date-fns`) | Média | `package.json` |
| Entidades órfãs no schema: `SleepRecord`, `WorkoutSession`, `HRVRecord`, `WeeklyRetrospect` nunca escritas | Média | `base44/entities/` |
| Rebranding incompleto: BRAND.md define "Reck", mas o app ainda usa "BioCharge AI" em vários lugares | Média | múltiplos |
| Mix JS + TS sem strict mode real | Baixa | `src/` |
| Sem lazy loading das rotas | Baixa | `src/App.jsx` |
| Camada de normalização de fonte (`physio-normalize.js`) existe mas incompleta | Média | `src/lib/physio-normalize.js` |
| Monitor de Saúde Fase 1 mapeado mas dormente (slots `skin_temp`, `spo2`, `respiratory`) | Baixa | `src/lib/physiological-engine.js` |

---

## Roadmap de PRs

### Tier 1 — Quick Wins
> Baixo risco, sem mudança de comportamento, retorno imediato.

---

#### PR-01: Extração de componentes inline de `Today.jsx`
**Esforço:** 2–3h | **Risco:** Muito baixo

Extrair para arquivos próprios em `src/components/today/`:
- `MiniRing.jsx` — anel animado com tendência sparkline
- `TomorrowHookCard.jsx` — card de gancho para amanhã
- `CollapsibleHint.jsx` — hint recolhível genérico (útil em outras telas)

Nenhuma mudança de lógica — só relocação. Reduz `Today.jsx` de ~1886 para ~1300 linhas.

**Critério de aceite:** `grep -n "function MiniRing\|function TomorrowHookCard\|function CollapsibleHint" src/pages/Today.jsx` retorna vazio.

---

#### PR-02: Extração de `ExecutionCard` e seus helpers de `Today.jsx`
**Esforço:** 3–4h | **Risco:** Baixo

`ExecutionCard` é o card principal da Today (anéis + decisão do dia). Atualmente definido inline e depende de 15+ variáveis de escopo externo via closure.

- Extrair para `src/components/today/ExecutionCard.jsx`
- Passar as variáveis necessárias como props explícitas (isso documenta o contrato)
- Extrair `dimHsl`, `getHeroDynamicToneClass`, `getHeroDynamicContext`, `getTomorrowHook` para `src/lib/today-helpers.js`

**Critério de aceite:** `Today.jsx` abaixo de 800 linhas; `ExecutionCard` recebe props documentadas.

---

#### PR-03: Remoção de dependências mortas
**Esforço:** 1h | **Risco:** Muito baixo

Remover do `package.json`:
- `three` (Three.js — nenhum import encontrado)
- `react-leaflet` (sem mapas no app)
- `react-quill` (editor rich text — não usado)
- `jspdf` + `html2canvas` (export PDF — não implementado)
- `@stripe/react-stripe-js` + `@stripe/stripe-js` (pagamentos — app pessoal, sem plano de monetização)
- `moment` (duplica `date-fns` já em uso; usar `date-fns` em todo lugar)

Verificar com `grep -rn "from 'three'\|from 'react-leaflet'\|from 'react-quill'\|from 'jspdf'\|from 'html2canvas'\|from '@stripe'\|from 'moment'" src/` antes de remover.

**Impacto:** Bundle final menor (~30–40% de redução estimada no peso total das dependências).

---

#### PR-04: Lazy loading das rotas
**Esforço:** 1h | **Risco:** Muito baixo

Em `src/App.jsx`, converter imports estáticos para `React.lazy()`:
```js
// antes
import Today from '@/pages/Today';
// depois
const Today = React.lazy(() => import('@/pages/Today'));
```

Envolver `<Routes>` em `<Suspense fallback={<LoadingScreen />}>`. Melhora o Time-to-Interactive da primeira carga.

---

#### PR-05: Rebranding para "Reck"
**Esforço:** 2h | **Risco:** Muito baixo

`BRAND.md` define "Reck" como nome definitivo. Varredura e substituição:
- `document.title` / meta tags no `index.html`
- Textos de loading ("Carregando BioCharge..." → "Carregando...")
- Comentários e strings de UI que ainda dizem "BioCharge AI"
- `src/components/layout/AppLayout.jsx` (logo / nome no header)

**Não renomear** o repositório nem variáveis de código — só strings visíveis ao usuário.

---

#### PR-06: Limpeza de entidades órfãs
**Esforço:** 1h | **Risco:** Baixo (confirmar via MCP antes)

Antes de deletar, verificar via MCP Base44 se `SleepRecord`, `WorkoutSession`, `HRVRecord`, `WeeklyRetrospect` têm registros reais. Se vazias, remover do schema. Se `WeeklyRetrospect` tiver lógica em `base44/functions/generateWeeklyRetrospect/entry.ts`, avaliar se a function ainda é chamada ou também é código morto.

Remover também `cadence_spm` do schema de `TrainingSession` (confirmado como nunca preenchido em CONTEXT.md §8).

---

### Tier 2 — Medium Effort Improvements
> Mudanças com impacto real, sem redesign completo.

---

#### PR-07: Camada de normalização de fonte completa
**Esforço:** 4–6h | **Risco:** Baixo

`CONTEXT.md §8` lista como prioridade #1 do backlog. `src/lib/physio-normalize.js` já existe mas precisa ser expandido.

Objetivo: `src/lib/source-normalize.js` — mapeamento de campos de qualquer relógio suportado → formato canônico (`hrv_manual`, `resting_hr`, `sleep_hours`, `deep_sleep_pct`, etc.).

Iniciar com Amazfit/Zepp (hardware atual do dono). Estrutura:
```js
export function normalizeCheckinInput(raw, source = 'zepp') {
  const maps = { zepp: ZEPP_MAP, garmin: GARMIN_MAP };
  return applyMap(raw, maps[source] ?? {});
}
```

**Critério de aceite:** testes unitários cobrindo pelo menos Zepp → canônico.

---

#### PR-08: Extração de lógica de negócio de `Today.jsx` para hooks
**Esforço:** 6–8h | **Risco:** Médio

`Today.jsx` mistura derivação de estado, efeitos colaterais e UI. Criar hooks dedicados:

- `src/hooks/useTodayScores.js` — `engineScores`, `enrichedCheckin`, `displayedScore`, `isCalibrating`, `baselineTier`
- `src/hooks/useTodayStrain.js` — `cappedStrain`, `strainTarget`, `strainVsTarget`, `targetZoneKey`
- `src/hooks/useTodayAnalysis.js` — `useEffect` de `runPhysiologicalAnalysisAsync` com cache e cancelamento

`Today.jsx` passa a consumir os hooks — sem mudar o comportamento, apenas a organização.

**Critério de aceite:** `Today.jsx` < 400 linhas; nenhum `useMemo`/`useEffect` de lógica de negócio inline.

---

#### PR-09: Chrononutrição Fase 2 — correlação jantar→sono
**Esforço:** 4–6h | **Risco:** Médio (depende de dados)

Conforme CONTEXT.md §8: após ~3–4 semanas de `dinner_time` + `sleep_start_time` registrados, implementar:

1. Em `src/lib/physiological-engine.js`: função `calculateDinnerSleepCorrelation(checkins)` com portão |r| ≥ 0,35 / p ≤ 0,05 e gate de variável quase-binária.
2. Surface como card de insight na página `/insights` se gate aprovado.
3. Testes unitários com dados sintéticos de alta e baixa correlação.

**Pré-requisito:** verificar via MCP quantos registros com `dinner_time` existem antes de implementar.

---

#### PR-10: Migração para TypeScript estrito nas libs core
**Esforço:** 8–12h | **Risco:** Médio

Converter para `.ts` os arquivos de lógica pura (sem JSX):
- `src/lib/biocharge-utils.js`
- `src/lib/physiological-engine.js`
- `src/lib/decision-engine.js`
- `src/lib/training-impact-engine.js`
- `src/utils/bodyAge.js`, `fitnessAge.js`, `longevityTrend.js`

`src/utils/priorityEngine.ts` já é TypeScript — serve de modelo.

Ativar `"strict": true` no `jsconfig.json` (renomear para `tsconfig.json`).

**Fazer em sub-PRs por arquivo** — não num PR único.

---

#### PR-11: Redesign da página Hoje (Fase 1 do redesign-master-plan)
**Esforço:** 8–12h | **Risco:** Médio

Conforme `docs/redesign-master-plan.md` Fase 1 + `docs/design-principles.md`:

- Header limpo: nome da página + streak + ícone de configurações
- Hero com anéis como elemento central (já existe, refinar espaçamento)
- Cards com hierarquia tipográfica clara: label pequeno em uppercase → número grande → descrição
- Substituir cards genéricos por layout editorial (mais espaço em branco, menos borda)
- Aplicar paleta Reck: `#26D968` (esmeralda), `#080A0D` (fundo), `#EEF3F8` (texto)

**Pré-requisito:** PR-01 e PR-02 concluídos (componentes extraídos facilitam o redesign).

---

### Tier 3 — High Impact Redesigns
> Mudanças arquiteturais significativas, alto retorno, maior risco de regressão.

---

#### PR-12: Design System completo — tokens e componentes base
**Esforço:** 16–24h | **Risco:** Médio-Alto

Fase 3 do redesign. Criar sistema de design consistente:

1. **Tokens CSS** em `src/index.css`:
   - Escala tipográfica: `--text-caption` (10px), `--text-body` (13px), `--text-title` (16px), `--text-hero` (28px)
   - Espaçamento: escala de 4px (`--space-1` a `--space-8`)
   - Raios: `--radius-card` (16px), `--radius-pill` (999px)

2. **Componente `<MetricRing>`** unificado (substitui `MiniRing` + anéis em outras telas)

3. **Componente `<InsightCard>`** com variantes (`default`, `warning`, `positive`, `protection`)

4. **Auditoria de acessibilidade**: contraste mínimo 4.5:1, `aria-label` nos anéis SVG, navegação por teclado nos modais

**Fazer em sub-PRs por layer** (tokens → componentes base → componentes compostos).

---

#### PR-13: Redesign Timeline e páginas secundárias (Fase 2)
**Esforço:** 12–16h | **Risco:** Médio

Conforme `docs/redesign-master-plan.md` Fase 2:

- **History (`/history`)**: layout de timeline vertical com marcadores de data, cards compactos com trio de métricas
- **Trends (`/trends`)**: gráficos com contexto tipográfico — não só o gráfico, mas o que ele significa
- **Insights (`/insights`)**: portão estatístico já existe na engine; surfacar silêncio honesto ("Dados insuficientes para este insight") como estado de UI, não vazio sem explicação
- **Microinterações**: usar `framer-motion` com `useMotionSafe` (hook já existe em `src/hooks/use-motion-safe.js`)

---

#### PR-14: Monitor de Saúde Fase 1 — integração dados do anel
**Esforço:** 6–10h | **Risco:** Baixo-Médio

CONTEXT.md §7: slots `skin_temp`, `spo2`, `respiratory` já mapeados em `flags[]` com `status:'pending'`. Quando o Amazfit Bip 6 disponibilizar esses dados via Zepp:

1. Adicionar campos ao schema da entidade `DailyCheckin`
2. Adicionar campos ao check-in (opcionais, não obrigatórios)
3. Mudar `status: 'pending'` → `status: 'live'` em `assessHealthSignals`
4. Gate e persistência já existem — não mudar a lógica, só ativar os dados

**Pré-requisito:** confirmar disponibilidade dos campos no app Zepp.

---

#### PR-15: Refactor do check-in — fluxo em steps progressivos
**Esforço:** 12–16h | **Risco:** Alto

`src/pages/DailyCheckin.jsx` (não lido em detalhe, mas a estrutura de `CheckinStep.jsx` sugere steps). Objetivo:

- **Manhã**: HRV + sono (obrigatórios) + sinais opcionais em ordem de relevância para a fórmula
- **Pós-treino**: RPE, energia, dor muscular — só exibido quando há sessão registrada no dia
- **Progress indicator** honesto: mostrar quais campos entram na fórmula vs. quais são opcionais de calibração

Manter o princípio CONTEXT.md §5: gate de save exige só HRV + horas de sono. Nunca travar nos campos de calibração.

---

## Matriz de prioridade

```
                   IMPACTO
               Baixo   Médio    Alto
          ┌──────────┬──────────┬──────────┐
  Fácil   │          │  PR-04   │  PR-01   │
          │  PR-06   │  PR-05   │  PR-02   │
          │          │          │  PR-03   │
          ├──────────┼──────────┼──────────┤
  Médio   │  PR-14   │  PR-07   │  PR-08   │
          │          │  PR-09   │  PR-11   │
          │          │  PR-10   │          │
          ├──────────┼──────────┼──────────┤
  Difícil │          │  PR-13   │  PR-12   │
          │          │          │  PR-15   │
          └──────────┴──────────┴──────────┘
```

---

## Ordem de execução sugerida

```
Semana 1: PR-01 → PR-02 → PR-03 (limpeza estrutural — sem risco)
Semana 2: PR-04 → PR-05 → PR-06 (polish — sem risco)
Semana 3: PR-07 → PR-08 (arquitetura — risco controlado)
Semana 4: PR-11 (visual — depende de PR-01 e PR-02)
Semana 5+: PR-09, PR-10, PR-12, PR-13 em paralelo (esforço maior)
PR-14: quando o Amazfit tiver os dados
PR-15: após PR-08 (hooks extraídos facilitam)
```

---

## Invariantes que NÃO devem mudar

Nenhum PR deve:
- Alterar pesos da fórmula de Recovery sem 10–14 dias de estabilização (CONTEXT.md §3)
- Tornar `fatigue_score`, `stress_score`, `sleep_quality` ou `readiness_score` persistidos no schema (são calculados ao vivo por `computeCheckinScores`)
- Introduzir geração de IA automática no save (gasta crédito de integração — CONTEXT.md §6)
- Remover o portão estatístico |r| ≥ 0,35 / p ≤ 0,05 dos insights (CONTEXT.md §2)
- Tornar `biocharge_morning` ou `sleep_score` (Zepp) obrigatórios para salvar o check-in
- Correlacionar variáveis que já compõem o recovery_score contra o próprio recovery_score

# Relatório de Validação — Redesign BioCharge AI

> Auditoria cruzada: PLANO-Rebuild-Design.md × design-audit.md × design-system-v2.md × rebuild-roadmap.md × codebase real.
> Data: 2026-07-02

---

## 1. O roadmap usou o PLANO como fonte de verdade?

**Veredicto: SIM — com quatro divergências corrigidas.**

A estrutura geral, os 13 itens de prioridade do PLANO §8, os tokens de cor (§3.1), a escala tipográfica (§3.2), os três raios (§3.3), o `motion-tokens.js` (§3.5), o `Gauge` com cerimônia matinal (§4.1), a estrutura editorial do Insights (§4.3) e a limpeza de emojis (§3.4) estão todos corretamente refletidos nos três documentos gerados.

**Quatro divergências encontradas e corrigidas antes deste relatório:**

| # | Onde | Problema | Correção aplicada |
|---|---|---|---|
| 1 | `rebuild-roadmap.md` PR 4.2 | Spacing "Entre seções: `mt-6`" contradiz `design-system-v2.md` que especifica `mt-7` (28px conforme PLANO §3.3) | Corrigido para `mt-7` |
| 2 | `rebuild-roadmap.md` PR 0.3 | Mapeava `🚨 → AlertTriangle` — o PLANO §3.4 explicitamente diz "🚨 → (nenhum ícone — alerta sustentado usa cor e peso tipográfico, não sirene)" | Corrigido: linha removida, nota explicativa adicionada |
| 3 | `rebuild-roadmap.md` PR 3.1 | `easing` tokens com 4 nomes (`default/decelerate/accelerate/overshoot`) divergia de `design-system-v2.md` que define apenas 2 (`out/expressive` conforme PLANO §3.5) | Corrigido para 2 easings alinhados com design-system |
| 4 | `design-system-v2.md` §1.3 | Tailwind color format `'hsl(var(--zone-green))'` sem `/ <alpha-value>` — quebra classes de opacidade como `bg-zone-green/12`, que são requisito da regra de tints do PLANO §3.3 | Corrigido para `'hsl(var(--zone-green) / <alpha-value>)'` |

---

## 2. As fases são pequenas o suficiente para implementar com segurança?

**Veredicto: QUASE — a PR 1.1 está grande demais e deve ser dividida.**

### Avaliação por PR

| PR | Tamanho | Segura? | Observação |
|---|---|---|---|
| 0.1 | Pequena | ✅ | 2 arquivos, zero visual change, pura adição |
| 0.2 | Média | ✅ | Mecânica, mas abrange ~15 arquivos — risco de layout break, testável visualmente |
| 0.3 | Média | ✅ | Mudança de contrato em `CheckinStep` é a parte crítica; restante é busca-e-troca |
| **1.1** | **Grande** | ⚠️ | Ver item 3 abaixo |
| 1.2 | Média | ✅ | Mecânica; `--zone-*` tokens de PR 0.1 devem existir antes |
| 2.1 | Grande | ✅* | Complexidade alta mas escopo bem delimitado (1 tela); *requer cuidado especial — ver item 4 |
| 2.2 | Média | ✅ | Mudanças visuais em 4 arquivos; lógica explicitamente protegida |
| 2.3 | Média | ✅ | `History.jsx` (~400 linhas) é o menor monólito |
| 3.1 | Média | ✅ | `motion-tokens.js` é novo arquivo; mudanças em `AppLayout.jsx` localizadas |
| 3.2 | Pequena | ✅ | Novo arquivo + 2 páginas |
| 3.3 | Pequena | ✅ | `AppLayout.jsx` + CSS |
| 4.1 | Pequena | ✅ | 2 arquivos, breakpoint isolado |
| 4.2 | Pequena | ✅ | Remoção de arquivos não usados — risco de import quebrado verificável |

---

## 3. Alguma tarefa deve ser dividida?

**Sim: PR 1.1 deve ser dividida em duas.**

### PR 1.1 atual contém:
1. Criar `Gauge.tsx` com `showZoneTicks`, `baselineMark`, `trend` (Sparkline), cerimônia matinal animada — complexidade média-alta sozinha
2. Substituir o herói da Today (hierarquia hero + 2 satélites) — requer entender o contexto de render da Today.jsx (1885 linhas)
3. Extrair 3 componentes inline: `ExecutionCard`, `CollapsibleHint`, `TomorrowHookCard`

**Proposta de divisão:**

**PR 1.1a — `Gauge.tsx` + `Sparkline.tsx`** (componentes isolados, sem alterar nenhuma página)
- Criar `src/components/ui-bio/Gauge.tsx` com as props completas mas sem aplicar em nenhuma tela
- Criar `src/components/ui-bio/Sparkline.tsx` extraído do MiniRing atual
- Escrever um uso de teste em algum componente não-crítico para validar
- Critério de aceite: `Gauge` renderiza corretamente em isolamento

**PR 1.1b — Herói da Today + extração de componentes inline**
- Depende de PR 1.1a (Gauge deve existir)
- Substituir MiniRing → Gauge no herói da Today
- Extrair ExecutionCard, CollapsibleHint, TomorrowHookCard para arquivos próprios
- Remover starfield

Isso transforma a PR de risco médio-alto em dois passos sequenciais de risco médio.

---

## 4. Alguma recomendação pode acidentalmente alterar lógica de negócio?

**Veredicto: Não diretamente — mas PR 2.1 requer aviso explícito.**

### Lógica protegida (verificada no código)
- `src/utils/priorityEngine.ts` — intocado em todos os PRs ✅
- `src/lib/biocharge-utils.js` (`computeCheckinScores`) — PR 2.2 preserva explicitamente ✅
- `src/lib/physiological-engine.js` (`runPhysiologicalAnalysisAsync`) — não referenciado em nenhum PR ✅
- `src/lib/physio-worker.js` — não referenciado ✅
- `src/lib/decision-engine.js` — não referenciado ✅

### Risco específico: PR 2.1 — Insights editorial

A PR 2.1 reestrutura `Insights.jsx` (1451 linhas) em três camadas (Manchete / Evidências / Silêncios). O risco não é alterar lógica de análise — é **omitir acidentalmente uma condição de renderização condicional** ao reorganizar o JSX. A Insights.jsx tem gates de dados (`hasAnalysis`, `hasCorrelations`, `hasNarrative`) que determinam o que aparece. A reestruturação deve preservar **exatamente** essas condições.

**Mitigação:** a PR 2.1 deve ser implementada como re-organização de blocos JSX existentes, não como reescrita. Os componentes de `src/components/intelligence/` (PhysioStateCard, CorrelationsCard, etc.) não devem ter sua lógica interna alterada — apenas sua posição na hierarquia editorial.

### Risco específico: PR 0.3 — EmojiSelector.jsx

O arquivo `src/components/checkin/EmojiSelector.jsx` é um componente de seleção de emoji (usado como dado de check-in, não como ícone de UI). **Não deve ser migrado** na PR 0.3. A troca de emoji → lucide se aplica apenas a emojis usados como ícones decorativos/funcionais de interface, não a dados selecionados pelo usuário.

---

## 5. Os arquivos/componentes afetados são realistas?

**Veredicto: SIM — verificado no codebase.**

### Componentes confirmados existentes

| Item do Roadmap | Status no código | Localização |
|---|---|---|
| `MiniRing` inline na Today | ✅ confirmado | `Today.jsx:191` |
| `ExecutionCard` inline na Today | ✅ confirmado | `Today.jsx:1298` |
| `CollapsibleHint` inline na Today | ✅ confirmado | `Today.jsx:1266` |
| `TomorrowHookCard` inline na Today | ✅ confirmado | `Today.jsx:142` |
| `CheckinStep` com prop `emoji` | ✅ confirmado | `CheckinStep.jsx:3` |
| `layoutId="mobileActiveTab"` na nav | ✅ confirmado | `AppLayout.jsx:255` |
| `DayDetailSheet` inline em History | ✅ confirmado | `History.jsx:40` |
| `SectionHeader` em Health.jsx | ✅ confirmado | `Health.jsx:51` |
| `EmojiSelector.jsx` em checkin | ✅ existe — **excluir do PR 0.3** | `src/components/checkin/` |
| `useMotionSafe` | ✅ confirmado | `src/hooks/use-motion-safe.js` |
| `ui-bio/` directory | ✅ existe | `src/components/ui-bio/BodyStateBadge.jsx` |
| `src/lib/` para novos arquivos | ✅ existe | 17 arquivos de lógica |
| 49 componentes shadcn em `ui/` | ✅ confirmado | `ls -1 src/components/ui/ | wc -l = 49` |

### Uma contagem que precisa de ajuste menor

O roadmap menciona "11 componentes em `intelligence/`" — o diretório tem na verdade **11 arquivos** (PhysioStateCard, TrainingLoadCard, CorrelationsCard, AnalysisHighlights, AnalysisBody, NarrativeCard, WhyScoreCard, BodyAgeCard, FitnessAgeCard, LongevityTrendCard, LongevityOnboardingCard). O número no design-audit.md diz "10 componentes" — a discrepância é que `LongevityOnboardingCard` foi contado ou não. Sem impacto prático: a instrução `src/components/intelligence/*.jsx` cobre todos.

---

## 6. A Fase 0 está pronta para implementar?

**Veredicto: SIM — PR 0.1 pode começar hoje.**

### PR 0.1 — Readiness checklist

- [ → ✅] **`src/index.css` existe e tem tokens** — o arquivo de tokens atual tem `--primary: 142 70% 50%`, `--background: 220 20% 4%`, `--card`, `--muted-foreground: 215 15% 50%`. Os tokens novos (`--zone-*`, `--domain-*`, `--gauge-*`, `--radius-card/control/inner`) são **adicionados**, nada removido.
- [ → ✅] **`tailwind.config.js` existe com `theme.extend.colors`** — a estrutura está correta para adicionar as entradas de `zone-green` etc.
- [ → ✅] **`--font-inter` e `--font-mono` já existem** em `index.css` (linhas 9–10) — as classes tipográficas `@layer components` podem referenciar `var(--font-inter)` imediatamente.
- [ → ✅] **`.bg-card` com hairline já existe** — preservar sem alterar.
- [ → ⚠️] **`font-weight: 650`** — Inter deve estar carregada como variable font para suportar pesos intermediários (650 é um peso não-padrão). Verificar se `@import` do Inter inclui o range variável antes de implementar PR 0.2.

### PR 0.2 — Pré-requisito de PR 0.1 completa

A varredura tipográfica substitui classes Tailwind por `.text-micro` etc. Essas classes só funcionam após PR 0.1 ter adicionado o `@layer components` em `index.css`.

### PR 0.3 — Pré-requisito de PR 0.1 completa (para `ZoneDot`)

`ZoneDot` usa `--zone-green` etc. que são adicionados na PR 0.1. A prop `emoji → icon` em `CheckinStep` pode ser feita em paralelo à PR 0.1 (não depende dos tokens).

---

## 7. O que deve ser implementado primeiro?

**Sequência de arranque recomendada:**

### Passo 1 — PR 0.1 (token sweep)
É o único pré-requisito bloqueante para todo o resto. Risco zero: apenas adiciona CSS vars e entradas no Tailwind config. O app fica visualmente idêntico.

**Antes de implementar:** confirmar que Inter é carregada como variable font (para suportar `font-weight: 650`). Se não for, usar `font-weight: 600` como substituto em `text-heading` até confirmar.

### Passo 2 — PR 0.3 (emojis → lucide), parcial em paralelo
A troca `emoji → icon` em `CheckinStep` e no OnboardingWizard não depende dos tokens. Pode ir em paralelo com PR 0.1. `ZoneDot` deve aguardar PR 0.1.

### Passo 3 — PR 0.2 (varredura tipográfica)
Após PR 0.1 estar publicada. É o maior salto de qualidade percebida isolado. Fazer arquivo por arquivo, tela por tela — não em um único commit gigante.

### Passo 4 — PR 1.1a (Gauge.tsx em isolamento)
Após PR 0.1. O Gauge usa `--zone-*`, `--gauge-track`, `--gauge-bloom` que vêm da PR 0.1.

**Por que esta ordem:** cada passo deixa o app publicável e melhor que o anterior. PR 0.1 + PR 0.3 juntas já eliminam o maior "cheiro de protótipo" (emojis) sem nenhum risco. PR 0.2 adicionada entrega o maior salto de qualidade em três PRs seguras.

---

## Resumo executivo

| Pergunta | Resposta |
|---|---|
| Docs alinhados com PLANO? | Sim — 4 divergências encontradas e corrigidas |
| Fases seguras? | Sim — exceto PR 1.1 que deve ser dividida em 1.1a e 1.1b |
| Tarefas muito amplas? | PR 1.1 — dividir conforme §3 deste relatório |
| Risco de alterar lógica? | Baixo — PR 2.1 e EmojiSelector são os únicos pontos de atenção |
| Arquivos realistas? | Sim — verificados no codebase |
| Fase 0 pronta? | Sim — PR 0.1 pode começar imediatamente |
| Por onde começar? | PR 0.1 (tokens) → PR 0.3 parcial (CheckinStep) → PR 0.2 (tipografia) → PR 1.1a (Gauge) |

# Rebuild Roadmap — Reck

> Fonte de verdade para implementação do redesign.
> Baseado em: `docs/redesign-master-plan.md`, `docs/design-principles.md`, `BRAND.md`, `docs/design-audit.md`, `docs/design-system-v2.md` e análise direta do código.
>
> **Regras invioláveis:**
> - Não alterar lógica de negócio nem fórmulas fisiológicas
> - Não remover features existentes
> - Não introduzir dependências desnecessárias
> - Preservar identidade de marca (BRAND.md)
> - Não implementar até os três docs de planejamento estarem completos ✅

---

## Phase 0 — Design Foundation
> Tokens, escala, primitivos. Tudo o que as fases seguintes dependem. Sem estas bases, qualquer melhoria visual será inconsistente.

---

### PR-F0.1 — CSS tokens e escala de espaçamento
**Prioridade:** P0
**Complexidade:** Baixa
**Risco:** Muito baixo (só adiciona, não quebra nada)

**O que fazer:**
Atualizar `src/index.css` com os tokens definidos em `docs/design-system-v2.md §1 e §3`:
- Adicionar `--color-ink-0` a `--color-ink-7` (aliases dos valores já existentes)
- Adicionar `--color-signal-*` (aliases dos `--bio-*` existentes)
- Adicionar `--surface-*`, `--border-*`, `--text-*` semânticos
- Documentar a escala de espaçamento como comentário (não precisa de variáveis CSS)

**Arquivos afetados:** `src/index.css`
**Componentes afetados:** nenhum (apenas adiciona tokens, não muda valores)

**Impacto de design:** Nenhum visível. Cria a fundação.

**Critério de aceite:**
- `grep --color-ink` retorna os 8 tokens
- Nenhum componente quebrou (sem mudança de valor)

---

### PR-F0.2 — Escala tipográfica como classes compostas
**Prioridade:** P0
**Complexidade:** Baixa
**Risco:** Baixo

**O que fazer:**
Adicionar em `src/index.css` no `@layer components` as classes `.label-section`, `.label-ring`, `.body-card`, `.body-muted`, `.headline-day`, `.metric-value` conforme `docs/design-system-v2.md §2.3`.

**Arquivos afetados:** `src/index.css`
**Componentes afetados:** nenhum ainda (classes criadas, não aplicadas)

**Impacto de design:** Nenhum visível ainda. Mas a partir daqui, cada PR pode migrar inline classes para estas.

**Critério de aceite:**
- Classes existem e são testáveis inspecionando o DOM
- Nenhum estilo quebrou

---

### PR-F0.3 — Padronização de opacidades e borders
**Prioridade:** P0
**Complexidade:** Baixa
**Risco:** Baixo

**O que fazer:**
Adicionar em `src/index.css` as classes de card de sinal com opacidades padronizadas:
`.card-signal-positive`, `.card-signal-caution`, `.card-signal-alert`, `.card-signal-info`.

Criar `src/components/ui-bio/StateIndicator.jsx` — substituto para emojis `🟢🟡🔴` (ver `docs/design-system-v2.md §11.1`).

**Arquivos afetados:**
- `src/index.css`
- `src/components/ui-bio/StateIndicator.jsx` (novo)

**Componentes afetados:** nenhum ainda (criação, não migração)

**Impacto de design:** Pequeno — `StateIndicator` fica disponível para uso progressivo.

**Critério de aceite:**
- `StateIndicator` recebe `state: 'positive' | 'caution' | 'alert' | 'neutral'`
- Renderiza um `span` com cor correta em CSS (não emoji)
- Funciona com `aria-hidden="true"`

---

### PR-F0.4 — Bottom nav safe-area (iOS)
**Prioridade:** P0
**Complexidade:** Muito baixa
**Risco:** Muito baixo

**O que fazer:**
Em `src/components/layout/AppLayout.jsx`, adicionar `padding-bottom: env(safe-area-inset-bottom)` ao bottom nav e ajustar o `pb-32` do `<main>` para considerar o safe-area dinamicamente.

```jsx
// nav
style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}

// main — aumentar de pb-32 para pb-36 ou usar CSS var
className="... pb-[calc(theme(spacing.20)+env(safe-area-inset-bottom))]"
```

**Arquivos afetados:** `src/components/layout/AppLayout.jsx`
**Componentes afetados:** `AppLayout`

**Impacto de UX:** Alto em iPhone com home indicator — elimina conteúdo cortado.

**Critério de aceite:**
- Em iPhone 14 (simulado), o último item de nav não fica cortado
- Não afeta o layout em Android ou desktop

---

### PR-F0.5 — Componentes base: `EmptyState` e `SkeletonCard`
**Prioridade:** P0
**Complexidade:** Baixa
**Risco:** Muito baixo

**O que fazer:**
Criar dois novos componentes que **ainda não existem** no projeto:

`src/components/ui-bio/EmptyState.jsx`:
```jsx
// Props: icon, title, description, action (opcional)
// Uso: silêncio honesto do Reck — "Ainda sem dados para este insight"
```

`src/components/ui-bio/SkeletonCard.jsx`:
```jsx
// Props: lines (número de linhas skeleton), hasHeader
// Usa classes do Radix UI Skeleton já instalado
```

**Arquivos afetados:**
- `src/components/ui-bio/EmptyState.jsx` (novo)
- `src/components/ui-bio/SkeletonCard.jsx` (novo)

**Impacto de design:** Médio — resolve os estados vazios genéricos assim que forem integrados.

**Critério de aceite:**
- `EmptyState` renderiza ícone + título + descrição com identidade Reck
- `SkeletonCard` tem animação pulse via `animate-pulse`
- Ambos seguem a escala tipográfica e de cores definidas

---

## Phase 1 — High-Impact Visual Improvements
> Melhorias visuais com maior ROI. Cada PR é independente e pode ser deployado separadamente.

---

### PR-V1.1 — Extração de `MiniRing` para componente próprio
**Prioridade:** P0
**Complexidade:** Baixa
**Risco:** Baixo

**O que fazer:**
Extrair a função `MiniRing` de `src/pages/Today.jsx` (linhas ~191–279) para `src/components/ui-bio/MiniRing.jsx`.
Extrair também `dimHsl` (helper inline) para junto com o componente ou para `src/lib/utils.js`.

Props do componente:
```tsx
interface MiniRingProps {
  value: number | null;
  displayValue?: number | string;
  max?: number;
  color: string;
  label: string;
  caption?: string;
  captionColor?: string;
  size?: number;
  trend?: (number | null)[];
}
```

**Arquivos afetados:**
- `src/pages/Today.jsx` (remove definição inline, adiciona import)
- `src/components/ui-bio/MiniRing.jsx` (novo)

**Componentes afetados:** `Today` (renderiza igual, só muda o local da definição)

**Impacto de design:** Neutro visualmente. Alto estruturalmente — desbloqueia reutilização em Trends e History.

**Critério de aceite:**
- `grep "function MiniRing" src/pages/Today.jsx` retorna vazio
- Visual idêntico antes e depois
- `MiniRing` importável de `@/components/ui-bio/MiniRing`

---

### PR-V1.2 — Extração de `ExecutionCard`, `TomorrowHookCard`, `CollapsibleHint`
**Prioridade:** P0
**Complexidade:** Baixa
**Risco:** Baixo

**O que fazer:**
Mover três componentes inline de `Today.jsx` para arquivos próprios:
- `src/components/today/ExecutionCard.jsx`
- `src/components/today/TomorrowHookCard.jsx`
- `src/components/ui/CollapsibleHint.jsx` (genérico, reutilizável)

Extrair helpers de UI de Today.jsx:
- `getHeroDynamicContext`, `getTomorrowHook`, `getHeroDynamicToneClass` → `src/lib/today-helpers.js`

**Arquivos afetados:**
- `src/pages/Today.jsx`
- `src/components/today/ExecutionCard.jsx` (novo)
- `src/components/today/TomorrowHookCard.jsx` (novo)
- `src/components/ui/CollapsibleHint.jsx` (novo)
- `src/lib/today-helpers.js` (novo)

**Impacto de design:** Neutro visualmente. `Today.jsx` cai de ~1886 para ~900 linhas.

**Critério de aceite:**
- Visual idêntico em Today antes e depois
- Cada componente extraído tem props explícitas documentadas
- `Today.jsx` < 950 linhas

---

### PR-V1.3 — Header: adicionar streak e tornar o logo clicável com identidade
**Prioridade:** P1
**Complexidade:** Baixa
**Risco:** Muito baixo

**O que fazer:**
Em `AppLayout.jsx`, melhorar o header:
1. Adicionar o streak atual (usar `useStreak`) como badge ao lado do logo, se ≥ 2 dias
2. Adicionar `title` no link do logo para acessibilidade
3. Ajustar tamanho do ícone SVG para `w-8 h-8` (mais presença)
4. Adicionar transição suave no ícone de configurações

**Arquivos afetados:** `src/components/layout/AppLayout.jsx`

**Impacto de UX:** Médio — streak no header dá contexto sem abrir a Today.

**Critério de aceite:**
- Streak aparece como `N 🔥` ou badge verde ao lado do logo quando ≥ 2 dias
- Logo tem `title="Reck — Início"`
- Não aumenta altura do header (continua `h-14`)

---

### PR-V1.4 — Aplicar classes tipográficas padronizadas nos cards da Today
**Prioridade:** P1
**Complexidade:** Baixa
**Risco:** Baixo

**O que fazer:**
Em todos os componentes de `src/components/today/`, substituir as classes inline `text-[10px] font-bold uppercase tracking-widest` etc. pelas classes compostas criadas em F0.2:
- `text-[10px] font-bold uppercase tracking-widest` → `label-section`
- `text-[11px] leading-relaxed` → `body-muted`
- etc.

**Arquivos afetados:**
- `src/components/today/MorningRecoveryCard.jsx`
- `src/components/today/SleepForecastCard.jsx`
- `src/components/today/CurrentStateCard.jsx`
- `src/components/today/WorkoutLoggedState.jsx`
- `src/components/today/HealthStatusCard.jsx`
- `src/components/today/SecondaryMetrics.jsx`

**Impacto de design:** Pequeno visualmente (valores são os mesmos), alto em consistência.

**Critério de aceite:**
- Nenhuma variação ad hoc de `text-[10px]` / `text-[9px]` / `text-xs` para labels de seção
- Visual idêntico antes e depois (os valores numéricos são os mesmos)

---

### PR-V1.5 — Cards de inteligência: adicionar área hero
**Prioridade:** P1
**Complexidade:** Média
**Risco:** Baixo

**O que fazer:**
Reformular `PhysioStateCard`, `TrainingLoadCard`, `CorrelationsCard` para seguir a anatomia de card definida em `docs/design-system-v2.md §7.4`:
- Área de herói clara: o estado (`Recovered`, `Balanced`) em `text-2xl font-black` com `StateIndicator`
- Substituir emojis por `StateIndicator` (do F0.3)
- Separação visual entre header (categoria) → herói (número/estado) → corpo (explicação)

**Arquivos afetados:**
- `src/components/intelligence/PhysioStateCard.jsx`
- `src/components/intelligence/TrainingLoadCard.jsx`
- `src/components/intelligence/CorrelationsCard.jsx`

**Impacto de design:** Alto — estes cards passam de "blocos de texto" para cards com hierarquia visual clara.

**Critério de aceite:**
- Cada card tem uma área de herói visualmente dominante
- Nenhum emoji `🟢🔴🟡` nos três componentes
- Lógica de dados inalterada

---

### PR-V1.6 — Botões: microinteração de press e padronização de variantes
**Prioridade:** P1
**Complexidade:** Baixa
**Risco:** Baixo

**O que fazer:**
Em `src/components/ui/button.jsx`, adicionar:
- `:active` → `scale-[0.97] transition-transform duration-100`
- Garantir que todas as variantes usem as cores dos tokens (já usam via `shadcn`, mas verificar)
- Adicionar variante `ghost-primary` para CTAs de low-emphasis mas com cor de marca

**Arquivos afetados:** `src/components/ui/button.jsx`

**Impacto de UX:** Médio — resposta tátil imediata ao toque.

**Critério de aceite:**
- Todos os `<Button>` têm `scale-[0.97]` no active state
- Nenhum botão de CTA principal usa variant="ghost" sem cor de marca

---

### PR-V1.7 — Loading screen com identidade Reck
**Prioridade:** P1
**Complexidade:** Baixa
**Risco:** Muito baixo

**O que fazer:**
Substituir o spinner genérico em `src/App.jsx` por uma tela de loading com:
- Logo SVG do Reck centralizado (`w-12 h-12`)
- Anel animado ao redor do logo (usando o próprio `MiniRing` em modo indeterminado, ou um spinner baseado no SVG do logo)
- Texto "Carregando…" em `body-muted`

**Arquivos afetados:** `src/App.jsx`

**Impacto de design:** Médio — primeira impressão do produto.

**Critério de aceite:**
- Nenhum `border-t-transparent animate-spin` genérico no código
- O logo Reck aparece durante o carregamento

---

### PR-V1.8 — Empty states com design para silêncio honesto
**Prioridade:** P1
**Complexidade:** Baixa
**Risco:** Muito baixo

**O que fazer:**
Integrar `EmptyState` (criado em F0.5) nos lugares onde hoje há ausência de conteúdo:
1. Insights sem dados suficientes → "Ainda calibrando — volte após mais check-ins"
2. Trends sem dados no período → "Sem dados para este período"
3. History sem registros → "Nenhum registro ainda — faça seu primeiro check-in"

**Arquivos afetados:**
- `src/pages/Insights.jsx`
- `src/pages/Trends.jsx`
- `src/pages/History.jsx`

**Impacto de design:** Alto — o "silêncio honesto" do Reck precisa ter design, não ausência de design.

**Critério de aceite:**
- Nenhuma tela com conteúdo vazio sem um `EmptyState` ou mensagem de calibração
- Textos seguem o tom do Reck (direto, honesto, sem hype)

---

## Phase 2 — Page and Layout Rebuild
> Redesign tela a tela. Cada PR é uma tela completa.

---

### PR-P2.1 — Today: hierarquia visual e editorial layout
**Prioridade:** P0
**Complexidade:** Alta
**Risco:** Médio

**O que fazer:**
Redesign da organização visual da Today sem mudar lógica:

1. **Header da página** (dentro do conteúdo, não o header global):
   - Data em `label-section`
   - Saudação personalizada se for manhã ("Bom dia, [nome]") em `body-muted`
   - Streak badge se ≥ 3 dias

2. **ExecutionCard**:
   - Manter o fundo atmosférico (starfield + bloom) — é o diferencial visual
   - Aumentar o espaço branco interno (de `p-5` para `p-6`)
   - Headline da decisão em `headline-day` (`text-xl font-black`)
   - Subheadline em `body-muted`
   - Trio de anéis: aumentar `size` de 104 para 112 em mobile ≥ 390px
   - Baseline tier badge: consolidar em uma linha com o score badge

3. **Cards secundários**:
   - Aplicar `.card-default` uniforme
   - Garantir `space-y-3` consistente entre todos
   - Skeleton loaders para cards que dependem de análise assíncrona

4. **Transição de entrada**:
   - Cards entram com stagger: `delay: index * 0.06`

**Arquivos afetados:**
- `src/pages/Today.jsx`
- `src/components/today/ExecutionCard.jsx`
- Todos os componentes `src/components/today/*`

**Impacto de design:** Alto — a tela principal do app.

**Critério de aceite:**
- Visual editorial, não de SaaS dashboard
- Hierarquia clara: decisão principal > contexto > suporte
- Nenhuma mudança de comportamento ou dados exibidos

---

### PR-P2.2 — History: timeline editorial
**Prioridade:** P1
**Complexidade:** Média
**Risco:** Baixo

**O que fazer:**
Redesign de `History.jsx`:

1. **Cabeçalho de semana** como separador editorial:
   - Linha horizontal com a data da semana centralizada
   - `text-xs font-semibold text-muted-foreground` + `uppercase tracking-widest`

2. **Item de dia** como card compacto:
   - Score em `metric-value` com cor do estado
   - Trio de métricas pequenas (HRV / Sono / Strain) em linha
   - `BodyStateBadge` à direita
   - Tap para expandir (já existe `DayDetailSheet` — manter)

3. **DayDetailSheet**:
   - Usar `Vaul` (já instalado) como bottom sheet nativo
   - Aumentar o espaçamento interno
   - Melhorar hierarquia de título de data → score → métricas → sessões

**Arquivos afetados:**
- `src/pages/History.jsx`
- `src/components/history/WeeklyRetrospectCard.jsx`

**Impacto de design:** Alto — o Histórico é a segunda tela mais consultada.

**Critério de aceite:**
- Layout de timeline vertical legível e distinto de uma lista genérica
- `DayDetailSheet` usa Vaul com animação de bottom sheet
- Nenhuma mudança de dados ou lógica de agrupamento

---

### PR-P2.3 — Insights: hierarquia de análise e estado de silêncio
**Prioridade:** P1
**Complexidade:** Média
**Risco:** Baixo

**O que fazer:**
Redesign de `Insights.jsx`:

1. **Seção de estado fisiológico** como herói da tela:
   - `PhysioStateCard` com área hero (do V1.5)
   - Score / estado em destaque, não enterrado entre texto

2. **Correlações com portão visual**:
   - Quando o portão estatístico não dispara, mostrar `EmptyState` com texto honesto ("Dados insuficientes para esta correlação — o silêncio aqui é certo, não um bug")
   - Não mostrar card com resultado vazio

3. **Chat de IA** (já existente):
   - Mover para seção própria com label "Perguntar ao coach"
   - Aplicar identidade visual no input e nas respostas

**Arquivos afetados:**
- `src/pages/Insights.jsx`
- `src/components/intelligence/CorrelationsCard.jsx`
- `src/components/intelligence/PhysioStateCard.jsx`

**Impacto de design:** Alto — a tela de Padrões é onde a análise fisiológica vive.

**Critério de aceite:**
- Portões estatísticos sem sinal mostram `EmptyState` com texto honesto
- `PhysioStateCard` é o elemento mais proeminente da página
- Nenhum card com dados vazio sem explicação

---

### PR-P2.4 — Trends: charts com estilo premium
**Prioridade:** P1
**Complexidade:** Média
**Risco:** Baixo

**O que fazer:**
Redesign de `Trends.jsx`:

1. **Filtros de tempo** como tabs com pill indicator:
   - Usar o padrão `TabsFilter` de `docs/design-system-v2.md §9.4`

2. **Charts do Recharts**:
   - Remover `CartesianGrid` genérica ou torná-la ultra-sutil (`stroke: hsl(220 15% 12%)`)
   - Eixos sem label de grid excessivo — apenas valores de âncora (min/max + média)
   - Tooltip customizado com identidade Reck (já existe parcialmente — refinar)
   - Área sob a curva com gradiente de opacidade (já usa `AreaChart` — ajustar o `fill`)

3. **Seletor de métrica**:
   - Chips de métrica em scrollable row horizontal

4. **Contexto acima do gráfico**:
   - Uma linha de texto interpretativa acima do gráfico ("Tendência de alta nos últimos 7 dias")

**Arquivos afetados:** `src/pages/Trends.jsx`

**Impacto de design:** Médio-alto — os charts são a parte mais técnica e mais distante do premium.

**Critério de aceite:**
- `CartesianGrid` não dominante visualmente
- Tooltip com identidade Reck (cores, raio, fonte)
- Nenhuma mudança nos cálculos de tendência

---

### PR-P2.5 — Check-in: progresso e campos com identidade visual
**Prioridade:** P1
**Complexidade:** Média
**Risco:** Médio (tela crítica — erro aqui impede o registro diário)

**O que fazer:**
Redesign de `DailyCheckin.jsx` e componentes de check-in:

1. **Indicador de progresso no topo**:
   - Barra de progresso de steps (`h-1 rounded-full`) com animação de preenchimento
   - Número de step atual / total em `body-muted`

2. **`CheckinStep` com identidade**:
   - Header com emoji + título usando `label-section` (não `text-sm font-semibold`)
   - Border top colorida conforme o domínio (verde para sono, azul para HRV)

3. **`SliderField`**:
   - Thumb com cor dinâmica (verde/amarelo/vermelho conforme o valor)
   - Label de valor atual em `metric-value` próximo ao thumb

4. **LivePreview**:
   - Card de preview com os três anéis em tempo real usando `MiniRing` (reutilizado do F0)

5. **CheckinSuccessOverlay**:
   - Animação de conclusão com o anel do Reck, não genérica

**Arquivos afetados:**
- `src/pages/DailyCheckin.jsx`
- `src/components/checkin/CheckinStep.jsx`
- `src/components/checkin/SliderField.jsx`
- `src/components/checkin/LivePreview.jsx`
- `src/components/checkin/CheckinSuccessOverlay.jsx`

**Impacto de UX:** Alto — check-in é o ritual diário principal.

**Critério de aceite:**
- Indicador de progresso visível no topo
- `MiniRing` (reutilizado) no LivePreview
- Nenhuma mudança de lógica de validação ou campos obrigatórios

---

### PR-P2.6 — Settings: layout mais limpo e identidade
**Prioridade:** P2
**Complexidade:** Média
**Risco:** Baixo

**O que fazer:**
Redesign de `AppSettings.jsx`:
1. Agrupar configurações em seções com `SectionHeader`
2. Cards de opção (wearable, goal) com seleção visual clara via `ring-2 ring-primary`
3. Seção de perfil físico com campos agrupados em grid
4. Botão de logout em vermelho ao final com confirmação via dialog

**Arquivos afetados:** `src/pages/AppSettings.jsx`

**Impacto de design:** Baixo-médio (tela pouco visitada).

**Critério de aceite:**
- Seções claramente separadas visualmente
- Logout requer confirmação

---

### PR-P2.7 — Onboarding: identidade editorial
**Prioridade:** P2
**Complexidade:** Média
**Risco:** Baixo (só visto uma vez por usuário)

**O que fazer:**
Redesign do `OnboardingWizard` em `AppLayout.jsx`:
1. Cada step tem um ícone grande (não `w-12 h-12 rounded-2xl`) — usar ícone SVG ou ilustração minimalista
2. Tipografia `headline-day` para títulos de step
3. Animação de transição entre steps com `AnimatePresence` (já existe — refinar o easing)
4. Step de wearable com cards visuais mais distintos

**Arquivos afetados:** `src/components/layout/AppLayout.jsx`

**Impacto de design:** Alto para novos usuários — primeira impressão.

**Critério de aceite:**
- Visual editorial, não de wizard de SaaS
- Animações de transição suaves

---

## Phase 3 — Motion and Polish

---

### PR-M3.1 — Transições de rota com `AnimatePresence`
**Prioridade:** P1
**Complexidade:** Baixa
**Risco:** Baixo

**O que fazer:**
Em `AppLayout.jsx`, envolver o `<Outlet />` em um wrapper de transição:
```jsx
<AnimatePresence mode="wait">
  <motion.div key={location.pathname}
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
  >
    <Outlet />
  </motion.div>
</AnimatePresence>
```

Verificar `useMotionSafe()` — se `false`, usar apenas `opacity` sem translate.

**Arquivos afetados:** `src/components/layout/AppLayout.jsx`

**Impacto de UX:** Médio — troca de tabs deixa de ser corte seco.

**Critério de aceite:**
- Transição de fade+slide entre rotas ≤ 200ms
- Com `prefers-reduced-motion`, apenas fade (sem translate)

---

### PR-M3.2 — Contagem animada do score no anel
**Prioridade:** P2
**Complexidade:** Média
**Risco:** Baixo

**O que fazer:**
Em `MiniRing.jsx` (extraído em V1.1), animar o número central do 0 até o valor atual:
```jsx
const count = useMotionValue(0);
const displayCount = useTransform(count, Math.round);
useEffect(() => {
  animate(count, value ?? 0, { duration: 0.8, ease: 'easeOut' });
}, [value]);
```

Respeitar `useMotionSafe()` — se false, mostrar o número diretamente.

**Arquivos afetados:** `src/components/ui-bio/MiniRing.jsx`

**Impacto de UX:** Alto — o número chegando ao valor final é o momento mais impactante da Today.

**Critério de aceite:**
- Número anima de 0 até o valor em ~800ms, junto com o arco
- Com `prefers-reduced-motion`, número aparece diretamente

---

### PR-M3.3 — Skeleton loaders por card
**Prioridade:** P1
**Complexidade:** Baixa
**Risco:** Muito baixo

**O que fazer:**
Integrar `SkeletonCard` (criado em F0.5) nos cards que dependem de `runPhysiologicalAnalysisAsync`:
- `WhyScoreCard` — enquanto `analysis === null && analysisLoading === true`
- `NarrativeCard` — idem
- `PhysioStateCard` — idem

Hoje estes cards retornam `null` enquanto carregam — trocar por `<SkeletonCard />` com o número de linhas do card real.

**Arquivos afetados:**
- `src/components/intelligence/WhyScoreCard.jsx`
- `src/components/intelligence/NarrativeCard.jsx`
- `src/components/intelligence/PhysioStateCard.jsx`

**Impacto de UX:** Médio — elimina o "aparecimento abrupto" de cards após a análise.

**Critério de aceite:**
- Cards mostram skeleton durante `analysisLoading === true`
- Transição do skeleton para o conteúdo real com `AnimatePresence`

---

### PR-M3.4 — Hover states e scroll-driven reveals
**Prioridade:** P2
**Complexidade:** Baixa
**Risco:** Muito baixo

**O que fazer:**
1. Adicionar `whileHover={{ scale: 1.01 }}` em cards clicáveis (link cards, CTAs de card inteiro)
2. Adicionar `whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }}` nos cards secundários da Today (abaixo da dobra)

**Arquivos afetados:**
- `src/pages/Today.jsx`
- `src/pages/History.jsx`

**Impacto de UX:** Pequeno mas refinado.

**Critério de aceite:**
- Hover suave em cards clicáveis (apenas desktop/cursor)
- Scroll reveal apenas em cards abaixo do primeiro viewport

---

## Phase 4 — QA and Cleanup

---

### PR-Q4.1 — Remoção de dependências mortas
**Prioridade:** P0
**Complexidade:** Baixa
**Risco:** Baixo

**O que fazer:**
Confirmar com `grep` e remover:
- `three` — `grep -rn "from 'three'" src/`
- `react-leaflet` — `grep -rn "from 'react-leaflet'" src/`
- `react-quill` — `grep -rn "from 'react-quill'" src/`
- `jspdf` + `html2canvas` — `grep -rn "from 'jspdf'\|from 'html2canvas'" src/`
- `@stripe/*` — `grep -rn "from '@stripe" src/`
- `moment` — `grep -rn "from 'moment'" src/` (substituir pelo `date-fns` já em uso)

**Arquivos afetados:** `package.json`, `package-lock.json`

**Impacto:** Bundle ~30–40% menor.

**Critério de aceite:**
- Build não quebra após remoção
- Nenhum `import` de pacote removido no código

---

### PR-Q4.2 — Auditoria de acessibilidade
**Prioridade:** P1
**Complexidade:** Média
**Risco:** Baixo

**O que fazer:**
1. Verificar contraste de todos os textos muted contra o fundo (`text-muted-foreground` = `hsl(215 15% 50%)` sobre `hsl(220 20% 4%)` = ~5:1, ok)
2. Adicionar `aria-label` em todos os anéis SVG (já tem `role="img" aria-label="Reck"` no logo — verificar nos `MiniRing`)
3. Garantir `aria-expanded` em todos os collapsibles
4. Garantir que o bottom nav tem `role="navigation"` e `aria-label`
5. Verificar que modais têm `aria-modal="true"` e foco preso

**Arquivos afetados:** múltiplos

**Critério de aceite:**
- Nenhum anel SVG sem `aria-label`
- Bottom nav com `role="navigation"`
- Collapsibles com `aria-expanded`

---

### PR-Q4.3 — Responsive review para desktop
**Prioridade:** P2
**Complexidade:** Média
**Risco:** Baixo

**O que fazer:**
Adicionar breakpoints em `AppLayout.jsx` para melhorar a experiência em telas largas:
- Em `md:` (768px+): aumentar a largura máxima para `max-w-2xl` (já está)
- Em `lg:` (1024px+): considerar layout de duas colunas para Today (anéis à esquerda, cards à direita) — **apenas se não quebrar a hierarquia editorial**
- Garantir que nenhuma tela tem scroll horizontal em 320px (iPhone SE)

**Arquivos afetados:** `src/components/layout/AppLayout.jsx`, `src/pages/Today.jsx`

**Critério de aceite:**
- Sem scroll horizontal em 320px
- Layout usável em 1200px sem espaço morto excessivo

---

### PR-Q4.4 — Consistência final: varredura de tokens e classes
**Prioridade:** P2
**Complexidade:** Baixa
**Risco:** Muito baixo

**O que fazer:**
Varredura final de `grep`:
1. `grep -rn "text-\[9px\]\|text-\[11px\]" src/components/` → migrar para classes compostas
2. `grep -rn "bg-emerald-500/8\|bg-primary/8" src/` → migrar para `/6` ou `/10`
3. `grep -rn "border-.*\/25\|border-.*\/35" src/` → migrar para `/20` ou `/30`
4. `grep -rn "🟢\|🔴\|🟡\|🟠" src/` → substituir por `StateIndicator`

**Critério de aceite:**
- Nenhuma opacidade não-padrão em borders ou backgrounds
- Nenhum emoji de estado de cor nos componentes

---

## Dependências entre fases

```
F0.1 ──► F0.2 ──► V1.4
F0.3 ──► V1.5
F0.5 ──► P2.3, M3.3
V1.1 ──► P2.1, P2.5 (LivePreview usa MiniRing)
V1.2 ──► P2.1
F0.4 ──► (qualquer fase, pode ser deployado a qualquer momento)
Q4.1 ──► (qualquer momento, não bloqueia nada)
```

## Ordem de execução sugerida

```
Sprint 1: F0.1 → F0.2 → F0.3 → F0.4 → F0.5
Sprint 2: V1.1 → V1.2 → Q4.1
Sprint 3: V1.3 → V1.4 → V1.5 → V1.6 → V1.7 → V1.8
Sprint 4: P2.1 → P2.2
Sprint 5: P2.3 → P2.4 → P2.5
Sprint 6: M3.1 → M3.2 → M3.3
Sprint 7: M3.4 → P2.6 → P2.7
Sprint 8: Q4.2 → Q4.3 → Q4.4
```

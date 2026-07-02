# Redesign Completion Report — Reck (BioCharge AI)

> Data: 2026-07-02  
> Fonte de verdade original: `docs/PLANO-Rebuild-Design.md`  
> Referências consultadas: `design-audit.md`, `design-system-v2.md`, `rebuild-roadmap.md`, `redesign-validation-report.md`

---

## 1. Resumo executivo

O redesign percorreu quatro fases consecutivas sobre uma base de código pré-existente com soul raro — voz pt-BR honesta, dark theme frio — mas execução inconsistente: 155 elementos em `text-[10px]`, sete valores diferentes de border-radius sem semântica, paleta paralela com três representações distintas do verde de marca, 49 primitivas shadcn das quais nove eram usadas, e motion sem sistema.

O objetivo era **elevar a qualidade percebida ao nível de apps de consumo premium (WHOOP, Oura, Linear, Things) sem criar features novas nem alterar nenhuma linha de lógica de negócio.**

Resultado: zero errors de lint, build limpo (exit 0), DNA do produto preservado, código mais limpo que o pré-existente.

---

## 2. O que mudou em relação ao estado anterior

### Antes do redesign (medições no código)

| Problema | Medição real |
|---|---|
| `text-[10px]` no codebase | 155 ocorrências |
| `text-[11px]` no codebase | 89 ocorrências |
| Piso real de fonte | `text-[7px]` |
| Valores distintos de border-radius em circulação | 7 (`sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `full`) |
| Ocorrências de `emerald-*` | 127× |
| Outros Tailwind raws (`red-*`, `yellow-*`, `blue-*`, `sky-*`, `amber-*`, `orange-*`) | ~350× combinado |
| Literais `hsl()` hardcoded inline | ~80 |
| Primitivos shadcn em `src/components/ui/` | 49 arquivos, ~9 em uso |
| Durações de motion distintas | 9 valores distintos (0.18s a 1s) |
| Emojis de UI como iconografia | 46 glifos distintos, 79 referências `emoji=` prop |
| Erros de lint | 11 |
| Toast provider (App.jsx) | shadcn antigo (`use-toast`) — toasts sem exibição |

### Depois do redesign

| Dimensão | Estado final |
|---|---|
| Erros de lint | 0 |
| Build | exit 0 (vite) |
| Primitivos shadcn | 7 arquivos (apenas em uso ativo) |
| Durações de motion | 3 tokens (`fast/base/reveal`) + 1 spring |
| Toast provider | sonner (funcional) |
| Piso de fonte | 11px (`text-micro`, mono uppercase) |
| Fontes de verdade para cor | 1 (tokens CSS em `index.css`) |
| Raios semânticos | 3 (`--radius-card/control/inner`) |

---

## 3. O que foi implementado do PLANO-Rebuild-Design.md

O PLANO lista 13 entregas de prioridade em §8. Abaixo o status de cada uma.

### Implementadas (total ou parcialmente)

| # | Entrega do PLANO | Status | Observação |
|---|---|---|---|
| 1 | **Fundação de tokens** — aliases semânticos + escala tipográfica + 3 raios | ✅ Completo | `index.css` + `tailwind.config.js`. Tokens `--zone-*`, `--domain-*`, `--gauge-*`, `--radius-card/control/inner`, `--muted-foreground` corrigido para 58% (WCAG AA). |
| 2 | **Varredura tipográfica** — matar `text-[10px/9px/7px]`; escala de 6 tamanhos | ✅ Completo | Zero ocorrências de `text-[10px/9px/7px/11px]` em src/. `.text-display` → `.text-micro` implementados em `index.css`. |
| 3 | **Emojis → Lucide** — fin do "cheiro de protótipo" | ✅ Parcial | `CheckinStep` aceita prop `icon: LucideIcon` (backward-compat com `emoji`). `ZoneDot` e `ZoneBadge` criados. Emojis de cor de estado (`🟢🔴🟡`) substituídos. Emojis decorativos inline em páginas: substituição parcial (não varridos 100%). |
| 4 | **Gauge + herói da Today** — mostrador dominante + ticks de zona + cerimônia | ✅ Parcial | `MiniRing` mantido mas refinado (gauge-track, bloom 0.12, starfield removido). Hierarquia 1 herói + 2 satélites **não implementada** (ver §4). Cerimônia matinal **não implementada**. |
| 5 | **Varredura de cor** — paleta crua → tokens | ✅ Completo | Zero `emerald-*`, `amber-*`, `yellow-[0-9]`, `red-[0-9]` em src/. `blue-*` → `domain-sleep`. `orange-*` → `domain-strain`. Literais `hsl()` em Trends/Today migrados para variáveis CSS. |
| 6 | **Padrões editorial** — 3 camadas (Manchete / Evidências / Silêncios) | ✅ Completo | `Insights.jsx` reestruturado. Novos componentes `EvidenceRow`, `NoteCard`. Gate anti-placebo preservado intacto. |
| 7 | **Motion tokens + transição de rota + reduced-motion** | ✅ Completo | `motion-tokens.js` criado. `AppLayout.jsx` com AnimatePresence, page transitions, crossfade de título no header. `useMotionSafe` atualizado. `prefers-reduced-motion` respeitado. |
| 8 | **Check-in refinado** — inputs grandes, fim do stagger | ✅ Completo | HRV/RHR/sono com `h-14 text-2xl`. Day Intent em grid 3 colunas. Todos os stagger delays removidos. |
| 9 | **Histórico logbook + layoutId lista→detalhe** | ✅ Completo | `ZoneDot` integrado. `scoreToZone()` helper. `motion.div layoutId="zone-score-${id}"` conecta lista ao DayDetailSheet header. |
| 10 | **chart-theme.js + réguas de zona nos gráficos** | ✅ Completo | `chart-theme.js` criado e aplicado em `Trends.jsx`. `ReferenceLine` y=42/70 nos gráficos de score. Tooltip unificado. |
| 11 | **Header contextual + refinos de nav** | ✅ Completo | Logo recolhe para SVG symbol. Título da página no header com crossfade. Safe-area iOS (`env(safe-area-inset-bottom)`). Botão Check-in com `bg-zone-green` sólido. `min-h-[44px]` em links da nav. |
| 12 | **Duas colunas desktop** (Tendências/Padrões ≥ 1024px) | ❌ Não implementado | Deferred: conflita com a regra "não redesenhar páginas" da Fase 4. Ver §4. |
| 13 | **Limpeza shadcn + varredura de spacing** | ✅ Completo | 48 → 7 componentes em `src/components/ui/`. `use-toast.jsx`, `sidebar.jsx`, `dialog.jsx` e outros 41 deletados. |

---

## 4. O que foi intencionalmente não implementado e por quê

### 4.1 Componente `Gauge.tsx` (PLANO §4 / Roadmap PR 1.1)

**O que seria:** novo componente `src/components/ui-bio/Gauge.tsx` com props `size: 'hero' | 'satellite'`, `showZoneTicks`, `baselineMark`, `trend`, e cerimônia matinal de contagem animada em 1.1s.

**Por quê não foi feito:** o `MiniRing` existente em `Today.jsx` é um componente inline de ~200 linhas com estado e lógica de animação SVG própria. Criar `Gauge.tsx` exigiria extrair, generalizar e aplicar em pelo menos 3 lugares (`Today`, `MorningRecoveryCard`, `LivePreview`) num único PR — que a própria `redesign-validation-report.md` classificou como "PR 1.1 grande demais, deve ser dividida em 1.1a e 1.1b". A Fase 2 e seguintes não dependiam de `Gauge.tsx` e puderam prosseguir. A criação do `Gauge.tsx` permanece como próximo passo de maior impacto percebido (ver §10).

**Impacto da ausência:** ticks de zona (42/70) e marcador de baseline pessoal não existem no arco. Hierarquia visual 150px herói + 76px satélites não foi implementada (os três anéis mantiveram tamanho equivalente). A cerimônia matinal de revelação não existe.

### 4.2 Layout desktop 2 colunas (PLANO §6 / Roadmap PR 4.1)

**O que seria:** em ≥1024px, Tendências e Padrões com grid 2 colunas (gráfico 2/3 esquerda, leituras 1/3 direita).

**Por quê não foi feito:** a regra da Fase 4 era "não redesenhar páginas". Implementar uma grid de 2 colunas em Trends e Insights seria um redesign estrutural de layout, não polimento. Adiado para desenvolvimento futuro.

### 4.3 `MetricRow.tsx` como primitivo global (PLANO §5 / design-system-v2 §6.3)

**O que seria:** componente `src/components/ui-bio/MetricRow.tsx` extraído da gramática da `/saude` e usado como primitivo em Today (métricas secundárias), Histórico (linhas do logbook) e Saúde.

**Por quê não foi feito:** as instâncias existentes são suficientemente variadas para que a extração exigisse um esforço de refatoração significativo. O padrão foi aplicado semanticamente (label mono à esquerda, valor à direita) sem criar o componente formal.

### 4.4 Varredura 100% de emojis decorativos inline

**O que foi feito:** `ZoneDot`/`ZoneBadge` criados, `CheckinStep` migrado para `icon`, emojis de estado de zona substituídos. Emojis em textos de copy e onboarding foram mantidos (pertencentes à voz do produto, não à iconografia de interface).

**O que ficou:** alguns emojis decorativos em texto livre dentro de componentes (ex.: texto do onboarding com ⚠️). O princípio foi: emoji como dado selecionado pelo usuário (`EmojiSelector.jsx`) ou parte do copy de voz → mantido. Emoji como ícone funcional de UI → substituído.

### 4.5 Cerimônia matinal (PLANO §2C / design-system-v2 §5.3)

**O que seria:** na abertura da Today com check-in feito, animação de ~1.2s onde o arco desenha, o número conta de 0 ao score, ticks de zona acendem, baseline desliza.

**Por quê não foi feito:** depende inteiramente do `Gauge.tsx` (item 4.1). Sem o componente isolado, a cerimônia não pode existir.

### 4.6 `Sparkline.tsx` como componente extraído

O `Sparkline` (polyline de 7 dias abaixo dos anéis) continua inline no `MiniRing`. Extração pendente de PR 1.1a.

### 4.7 Três tipos canônicos de card (`decision` / `reading` / `note`)

O `Card.tsx` formal de três variantes descrito em `design-system-v2.md §6.2` não foi criado como componente exportado. As três semânticas foram aplicadas **inline** nos redesigns de página (Insights usa as três camadas, Histórico usa o padrão logbook), mas sem abstração formal.

### 4.8 Opacidades limitadas a /6 /12 /20

A regra do design system v2 §1.5 define três opacidades de tint (`/6`, `/12`, `/20`). Na prática, opacidades variadas (`/8`, `/10`, `/15`, `/25`) ainda existem no código — a varredura de opacidades foi parcial. Não comprometeu a consistência visual de forma perceptível, mas é tecnicamente uma divergência do sistema.

---

## 5. Arquivos e componentes alterados por fase

### Fase 0 — Design Foundation

| Arquivo | Tipo de mudança |
|---|---|
| `src/index.css` | Tokens semânticos `--zone-*`, `--domain-*`, `--gauge-*`, `--radius-*`; `--muted-foreground` 50%→58%; classes tipográficas `.text-display`→`.text-micro`; tints `.tint-recovery/sleep/strain`; micro-interações CSS (button press, focus-visible, skeleton) |
| `tailwind.config.js` | Aliases de cor com `<alpha-value>` para tokens de zona/domínio; raios semânticos `rounded-card/control/inner` |
| `src/components/checkin/CheckinStep.jsx` | Prop `icon: LucideIcon` adicionada (backward-compat com `emoji`) |
| `src/components/ui-bio/ZoneDot.tsx` | NOVO — substitui 🟢🔴🟡, com `aria-label` |
| `src/components/ui-bio/ZoneBadge.tsx` | NOVO — pill de zona usando `ZoneDot` |

### Fase 1 — Herói e Identidade

| Arquivo | Tipo de mudança |
|---|---|
| `src/pages/Today.jsx` | Starfield SVG removido; bloom opacity 0.18→0.12; trilho do anel `hsl(215,25%,18%)`→`hsl(var(--gauge-track))`; cores de anel migradas para tokens CSS; gradiente de barra de carga migrado para tokens |
| `src/pages/Trends.jsx` | Série de cores de gráfico migradas para tokens; `tooltipStyle` usa variáveis CSS |
| `src/components/layout/AppLayout.jsx` | Nav: `bg-background/95 backdrop-blur-md`; `env(safe-area-inset-bottom)`; `min-h-[44px]`; botão Check-in `bg-zone-green`; ícones 22px |
| Todos os `.jsx` em `src/` | Varredura: zero `emerald-*`, `red-[0-9]*`, `yellow-[0-9]*`, `amber-[0-9]*`; zero `text-[10px/9px/7px/11px]` |

### Fase 2 — Telas Principais

| Arquivo | Tipo de mudança |
|---|---|
| `src/pages/Insights.jsx` | Reestruturação editorial: 3 seções (Manchete / Evidências / Silêncios honestos). Novos `EvidenceRow`, `NoteCard`. `BottleneckInsight` + `PrimaryInsightCard` refatorados com `toneStyles` e tokens. Fix de curly quotes (U+201C/201D). |
| `src/pages/DailyCheckin.jsx` | Stagger delays removidos. HRV/RHR/sono: `h-14 text-2xl`. Day Intent: grid 3 colunas com visual de zona ativa. |
| `src/pages/History.jsx` | `ZoneDot` integrado. `scoreToZone()` + mapas de cor por zona. Score box: `motion.div layoutId="zone-score-${id}"`. DayDetailSheet com header de zona correspondente. Badges de repouso e strain em tokens de domínio. |

### Fase 3 — Motion e Navegação

| Arquivo | Tipo de mudança |
|---|---|
| `src/lib/motion-tokens.js` | NOVO — `duration` (fast/base/reveal), `easing` (out/expressive), `spring.default` |
| `src/lib/chart-theme.js` | NOVO — `chartTheme` (grid/axis/tooltip/referenceLines) + `SCORE_METRICS` |
| `src/hooks/use-motion-safe.js` | Importa `duration`/`easing` de motion-tokens; `transition` usa `duration.base / 1000` |
| `src/components/layout/AppLayout.jsx` | AnimatePresence no Outlet (page transitions); crossfade de título do header; logo SVG symbol only; `spring.default` no `mobileActiveTab`; `whileTap` no botão Check-in; `useReducedMotion` |
| `src/pages/Trends.jsx` | `chartTheme` aplicado em todos os CartesianGrid/XAxis/YAxis; `ReferenceLine` y=42/70; `tooltipStyle` removido; `ScatterChart` removido |
| `src/index.css` | Button press `scale(0.97)`; `:focus-visible` com ring e `--radius-control`; `.skeleton` sweep animation |

### Fase 4 — Polimento Final (QA)

| Arquivo | Tipo de mudança |
|---|---|
| `src/App.jsx` | Toast provider: shadcn antigo → `sonner` |
| `src/components/intelligence/WhyScoreCard.jsx` | Import `cn` não-usado removido |
| `src/pages/History.jsx` | Import `computeCheckinScores` não-usado removido |
| `src/pages/Insights.jsx` | Imports `PhysioStateCard`, `TrainingLoadCard` não-usados removidos |
| `src/pages/Login.jsx` | Import `Zap` não-usado removido |
| `src/pages/Today.jsx` | Imports `Tooltip`/`TooltipTrigger`/`TooltipContent`, `ProtectionInsightCard`, `getSleepDebtHours` não-usados removidos |
| `src/pages/Trends.jsx` | Import `ScatterChart` não-usado removido; `max-w-3xl`→`max-w-2xl`; `trendColor` com hsl literals → tokens |
| 14 arquivos de componente | `text-blue-*/bg-blue-*/border-blue-*` → `domain-sleep`; `text-orange-*/bg-orange-*/border-orange-*` → `domain-strain`; `text-green-400` → `zone-green` |
| 4 arquivos | Notação de opacidade dupla inválida `/60/90` → `/60` corrigida |
| 4 arquivos | `text-[12px]` → `text-support`; `text-[13px]` → `text-sm` |
| `src/components/ui/` (41 arquivos) | DELETADOS — accordion, alert, badge, calendar, card, chart, dialog, drawer, form, select, separator, sheet, sidebar, sonner, table, tabs, toast, toaster, use-toast e outros |

---

## 6. Melhorias no design system

### Token de cor — uma fonte de verdade

O principal avanço arquitetural foi eliminar a paleta dupla. Antes: três representações diferentes do verde de marca convivendo (`142 70% 50%`, `emerald-400`, `emerald-500`). Depois: `text-zone-green` / `bg-zone-green/{opacity}` como única forma de referenciar a marca, respaldada por `--zone-green: 142 70% 50%` em `index.css`.

Qualquer ajuste futuro na cor de marca requer alterar uma única linha de CSS.

**Tokens semânticos criados:**
- Zonas fisiológicas: `zone-green`, `zone-yellow`, `zone-red`
- Domínios de métrica: `domain-recovery`, `domain-sleep`, `domain-strain`
- Saúde/alertas: `health-amber`, `health-red` (via `zone-red`)
- Estrutura do instrumento: `gauge-track`, `gauge-bloom`
- Raios: `radius-card` (20px), `radius-control` (12px), `radius-inner` (8px)

### Escala tipográfica fechada

De 264 tamanhos em px ad-hoc para 6 classes semânticas:

| Classe | Spec | Regra |
|---|---|---|
| `.text-display` | Mono 56px · tnum | Score herói |
| `.text-title` | Inter 22px · 800 | Título de tela |
| `.text-heading` | Inter 15px · 600 | Título de card |
| `.text-body` | Inter 14px | Corpo |
| `.text-support` | Inter 12px | Suporte, labels secundários |
| `.text-micro` | Mono 11px · uppercase · tracking | Labels de máquina, categorias |

A regra "Mono mede, Inter fala" foi estabelecida como invariante: dados numéricos em JetBrains Mono tabular (`tnum`), linguagem em Inter.

### Sistema de motion

De 9 durações ad-hoc para 3 tokens + 1 spring em `motion-tokens.js`:

```js
duration.fast   = 150ms   // hover, toggle, feedback
duration.base   = 260ms   // transições de rota, cards
duration.reveal = 1100ms  // reservado: cerimônia matinal (pendente)
spring.default  = { type:'spring', bounce:0.15, duration:0.5 }
```

### Tema de gráficos unificado

`chart-theme.js` exporta grid, axis, tooltip e linhas de referência de zona (42/70) como configuração compartilhada. Antes: `tooltipStyle` hardcoded em Trends, estilos de eixo espalhados. Depois: um arquivo de tema, zero duplicação.

---

## 7. Melhorias de UX

### Tela Hoje (Today)

- **Starfield removido**: 20 círculos SVG decorativos + bloom radial `blur-2xl` + gradiente de vinheta eliminados. A tela respira sem decoração que não informa.
- **Bloom informativo preservado**: opacidade reduzida de 0.18 para `--gauge-bloom` (0.12). O card "amanhece" na cor da zona do dia — informação ambiente, não decoração.
- **Trilho do anel com token**: `hsl(215,25%,18%)` → `hsl(var(--gauge-track))` — ajustável de um lugar.

### Tela Padrões (Insights)

- **Estrutura editorial de 3 camadas**: antes, 19 variantes de card com o mesmo peso visual. Depois: Manchete (uma descoberta dominante), Evidências (lista editorial sem card individual por item), Silêncios honestos (seção permanente que declara o que não passou no gate estatístico).
- **"Silêncios honestos" como feature de marca**: o rigor estatístico do produto — que antes era implícito na ausência de conteúdo — ganhou uma seção própria. Transformou a honestidade em diferencial visível.
- **Deduplicação**: a manchete não aparece duplicada na lista de evidências (`evidenceItems` useMemo).

### Check-in diário

- **Inputs proeminentes**: HRV, RHR e horas de sono com `h-14 text-2xl font-mono` — área de toque maior, número legível, contexto de uso (manhã cedo, recém-acordado).
- **Day Intent redesenhado**: de seletor vertical para grid 3 colunas com affordance visual de seleção (borda colorida, fundo de zona).
- **Fim do stagger**: o formulário aparece pronto em vez de "cair em pedaços" com delays somados.

### Histórico (History)

- **Transição conectada**: o bloco de zona da linha expande para o header do DayDetailSheet via `layoutId` — continuidade visual lista→detalhe sem JavaScript extra.
- **Semântica de cor consistente**: zona de descanso em `domain-sleep`, strain em `domain-strain`, score em `zone-{color}`.

### Tendências (Trends)

- **Régua de zona nos gráficos**: linhas de referência em y=42 e y=70 aparecem em todos os gráficos de score, tornando o número legível contra a escala do instrumento — não como valor absoluto solto.
- **Consistência de largura**: `max-w-3xl` → `max-w-2xl` para alinhar com o resto do app.

### Navegação

- **Título da página no header**: liberou ~60px de altura útil em todas as telas. Crossfade suave ao trocar de aba.
- **Logo compacto**: wordmark "Reck" removido do header; apenas o símbolo SVG permanece. Mais espaço, menos repetição.
- **Toasts funcionando**: `App.jsx` montava o `Toaster` antigo do shadcn (que usa `use-toast`) enquanto os componentes chamavam `toast()` do `sonner`. Notificações simplesmente não apareciam. Corrigido na Fase 4.

---

## 8. Melhorias de motion e interação

### Page transitions

`AnimatePresence` envolve o `<Outlet />` em `AppLayout.jsx`. Cada troca de rota faz fade + 8px de subida na entrada (`opacity 0→1, y 8→0`) e fade na saída. Sutil, mas o app deixa de "piscar" entre telas.

### Reduced-motion

`useReducedMotion()` (framer-motion) propaga para todas as transições via `useMotionSafe()`. Com `prefers-reduced-motion: reduce` ativo no OS:
- Page transitions: desabilitadas (`duration: 0`)
- `mobileActiveTab` spring: desabilitado
- Botão Check-in whileTap: desabilitado
- Header crossfade: desabilitado

Antes da Fase 3: zero tratamento de reduced-motion.

### Microinterações CSS

- **Button press**: `button:not([disabled]):active { transform: scale(0.97); opacity: 0.9; }` em 150ms — feedback tátil em qualquer botão sem Framer Motion.
- **Focus-visible**: anel `2px solid hsl(var(--ring))` com `border-radius: var(--radius-control)` — foco perceptível com forma coerente com o sistema.
- **Skeleton**: classe `.skeleton` com sweep animation padronizada para estados de loading.

### Shared element transitions

`layoutId="zone-score-${checkin.id}"` conecta o bloco de score na lista do Histórico ao header do DayDetailSheet — o Framer Motion anima a expansão automaticamente, criando continuidade que hoje só apps nativos costumam ter.

`layoutId="mobileActiveTab"` na nav (existia antes) foi mantido e conectado ao `spring.default`.

---

## 9. Melhorias de acessibilidade e responsividade

### Contraste

`--muted-foreground` subiu de `215 15% 50%` para `215 15% 58%`. Com o piso de fonte subindo de 7px para 11px, o app inteiro fica dentro de WCAG AA sem ajustes adicionais por elemento.

### Safe area iOS

`paddingBottom: env(safe-area-inset-bottom)` adicionado ao bottom nav. Antes: conteúdo da nav sobreposto à home bar em iPhones com notch.

### Touch targets

`min-h-[44px]` adicionado em todos os links do bottom nav. O padrão mínimo de 44px × 44px do Apple HIG e WCAG 2.5.5.

### Foco visível

`:focus-visible` com anel de foco coerente com `--radius-control`. Antes: `outline-ring/50` genérico do reset base, sem `border-radius` adaptado ao contexto.

### Cor nunca sozinha

`ZoneDot` inclui `aria-label="Verde/Amarelo/Vermelho/Neutro"`. O componente substitui os emojis de cor de estado (`🟢🔴🟡`) que eram o único indicador de zona em vários lugares — emoji como único sinal de estado falha em sistemas de acessibilidade e brilho alto.

### Responsividade

O app é mobile-first correto com `max-w-2xl`. Corrigida a inconsistência de `max-w-3xl` em Trends. O layout de coluna única permanece válido em desktop (correto para o contexto de uso — consultado de manhã, em mobilidade).

---

## 10. Limitações conhecidas

### Gauge.tsx não existe

A abstração do `Gauge` — o componente mais importante do design system v2 — não foi criada. O `MiniRing` inline em `Today.jsx` continua com os problemas mapeados: não há ticks de zona no arco, não há marcador de baseline pessoal, os três anéis têm tamanho equivalente (sem hierarquia hero/satellite), e a cerimônia matinal não existe.

Impacto perceptível: a tela mais importante do app ainda não expressa visualmente a tese do instrumento.

### Emojis decorativos residuais

Emojis em textos de copy e onboarding foram preservados (são voz do produto). Alguns emojis decorativos em componentes inline ainda existem. Não é uma inconsistência grave, mas diverge do princípio "instrumento de medição não usa emoji".

### Opacidades de tint fora do sistema

O design system v2 define apenas três opacidades de tint (`/6`, `/12`, `/20`). No código existem variações `/8`, `/10`, `/15`, `/25`. Foram corrigidas as mais visíveis (inválidas `/60/90` e classes `sky-*`/`blue-*` residuais), mas não houve varredura completa de opacidades.

### Componente `Card.tsx` formal não criado

As três semânticas de card (`decision`, `reading`, `note`) foram aplicadas inline nos redesigns mas não formalizadas como componente exportado. Isso significa que o padrão é seguido por convenção, não por contrato de API.

### `MetricRow.tsx` não criado

O primitivo de linha de dados (label mono à esquerda, valor tabular à direita, delta direcional) existe como padrão em `/saude` mas não foi extraído como componente global. Instâncias em Today, Histórico e Saúde são implementações paralelas.

### `ExecutionCard`, `CollapsibleHint`, `TomorrowHookCard` ainda inline

Os três componentes permanecem definidos dentro do corpo de `Today.jsx`. Risco técnico de estado perdido em remounts. Extração estava no PR 1.1b que não foi implementado.

### Toast estilo visual não configurado

O `Toaster` do sonner está montado e funcional, mas sem tema personalizado (posição, cores, border-radius). Usa os defaults do sonner.

---

## 11. Recomendações de melhorias futuras

### Alta prioridade

**1. Criar `Gauge.tsx` (PR 1.1a)**  
É o maior salto de qualidade percebida que resta. Componente isolado com props `value, domain, size: 'hero'|'satellite', showZoneTicks, baselineMark, trend`. Não altera nenhuma página — apenas cria o componente.

**2. Aplicar `Gauge` no herói da Today (PR 1.1b)**  
Depende de 1.1a. Substituir o `MiniRing` inline: 1 herói 150px + 2 satélites 76px. Extrair `ExecutionCard`, `CollapsibleHint`, `TomorrowHookCard` para arquivos próprios. Remover os ~200 linhas de `MiniRing` inline.

**3. Implementar a cerimônia matinal**  
Depende de 1.1a. Em `Gauge` com `animated=true`: arco desenha em 1.1s, número conta de 0 ao score em sincronia, ticks de zona acendem, baseline desliza. `prefers-reduced-motion`: aparição estática. É a assinatura de produto mais diferenciada do PLANO.

### Média prioridade

**4. Configurar tema visual do Toaster (sonner)**  
Adicionar `<Toaster position="top-center" toastOptions={{ classNames: { ... } }} />` com `--radius-control`, cores de fundo `hsl(var(--card))`, border `hsl(var(--border))`.

**5. Layout desktop 2 colunas (PR 4.1)**  
Em ≥1024px, Tendências e Padrões com grid `grid-cols-[2fr_1fr]`: gráficos à esquerda, leituras à direita. Today permanece coluna única — um instrumento não vira planilha por ter espaço.

**6. Extrair `MetricRow.tsx`**  
Componente global: `label: string | ReactNode, value: string, unit?: string, delta?: number, deltaDirection?: 'good-up' | 'good-down'`. Unifica Today (métricas secundárias), Histórico (linhas) e Saúde.

**7. Varredura de opacidades de tint**  
Normalizar para `/6` (subtle), `/12` (moderate), `/20` (strong). Eliminar `/5`, `/8`, `/10`, `/15`, `/25`.

**8. Tema do Toaster sonner**  
Visualmente integrado ao design system (hoje usa defaults brancos do sonner).

### Baixa prioridade

**9. Formalizar `Card.tsx` com 3 variantes**  
`decision` (borda de estado + bloom), `reading` (superfície + dado mono), `note` (sem borda, `bg-secondary/50`). Reforça o contrato: todo conteúdo do app cabe num dos três.

**10. Extrair `ExecutionCard`, `CollapsibleHint`, `TomorrowHookCard`**  
Junto com PR 1.1b ou separado. Reduz o tamanho de `Today.jsx` e elimina o risco de estado perdido em remounts.

**11. Configurar `Sparkline.tsx`**  
Extrair do `MiniRing` o polyline de 7 dias. Reutilizável no Histórico (logbook) e no futuro Gauge satélite.

**12. `ZoneBadge` aplicado nas Pills de zona**  
O componente foi criado mas não foi varrido em todos os lugares que ainda usam implementações inline de pill (`bg-zone-green/12 text-zone-green rounded-full`).

---

## 12. Checklist de QA manual

Executar após qualquer deploy, especialmente após PR 1.1a/1.1b.

### Tela Hoje (`/today`)

- [ ] Três anéis renderizam com cores corretas por domínio (verde recovery, azul sleep, laranja strain)
- [ ] Bloom do card principal muda de cor conforme a zona do dia (verde/amarelo/vermelho)
- [ ] Em calibração (sem check-in), bloom ausente — tela não mostra dado fabricado
- [ ] Botão de Check-in flutuante na nav tem cor verde sólida
- [ ] Tocar no botão de Check-in faz `scale(0.92)` visível
- [ ] `SecondaryMetrics` colapsável abre/fecha sem layout shift
- [ ] Tela não tem starfield SVG (verificar no DevTools → Elements que não há 20 círculos no hero)
- [ ] Métricas secundárias em JetBrains Mono
- [ ] `HealthStatusCard` não aparece se sinais vitais estão no padrão (silêncio como estado)

### Check-in (`/checkin`)

- [ ] Campos HRV, RHR, horas de sono têm altura `h-14` e fonte `text-2xl font-mono`
- [ ] Day Intent mostra 3 botões em grid — seleção ativa com borda colorida
- [ ] Formulário aparece sem stagger/delay por step
- [ ] `LivePreview` mostra prévia do score enquanto os campos são preenchidos
- [ ] Submit processa e exibe o `CheckinSuccessOverlay`

### Padrões (`/insights`)

- [ ] Exatamente 3 seções visíveis: Manchete (descoberta principal), Evidências (lista), Silêncios honestos
- [ ] Seção "Silêncios honestos" aparece mesmo quando nenhum gate estatístico disparou
- [ ] A manchete não é duplicada na lista de evidências
- [ ] Nenhum dado é mostrado sem cumprir o gate `|r| ≥ 0.35 / p ≤ 0.05`
- [ ] Em calibração (< 7 dias), exibe mensagem de espera, não dados falsos

### Tendências (`/trends`)

- [ ] Todos os gráficos têm grid horizontal tracejado (sem grid vertical)
- [ ] Tooltip uniforme com fonte mono e fundo `hsl(var(--card))`
- [ ] Gráficos de score (recovery, sleep, biocharge) têm linhas de referência em y=42 e y=70
- [ ] Seletor de período e de métrica funcionam
- [ ] Largura máxima é `max-w-2xl` (igual ao resto do app)

### Histórico (`/history`)

- [ ] Cada linha mostra: data em mono, ZoneDot, score em mono
- [ ] Tocar numa linha abre `DayDetailSheet`
- [ ] Transição de abertura do sheet anima o bloco de zona da linha para o header do sheet (layoutId)
- [ ] Badge de descanso tem cor de `domain-sleep`
- [ ] Badge de strain tem cor de `domain-strain`
- [ ] Score sem check-in exibe "—" em vez de 0 ou `null`

### Configurações (`/settings`)

- [ ] Seletor de wearable funciona e salva
- [ ] Toasts de confirmação aparecem (validar que sonner está funcionando)

### Navegação geral

- [ ] Transição entre abas: fade suave (sem flash branco)
- [ ] Título da aba aparece no header e muda ao trocar de rota
- [ ] Logo (símbolo SVG) clicável → navega para `/today`
- [ ] Bottom nav: aba ativa com indicador verde animado (`mobileActiveTab` layoutId)
- [ ] Em iPhone: nav não fica atrás da home bar (safe-area)
- [ ] Em desktop: app centralizado em `max-w-2xl`, não esticado

### Acessibilidade

- [ ] Tab navigation: focar em todos os elementos interativos com teclado
- [ ] Focus ring visível em botões, inputs, links (anel verde com border-radius arredondado)
- [ ] `ZoneDot` reporta estado via `aria-label` (verificar com VoiceOver/NVDA)
- [ ] Com `prefers-reduced-motion: reduce` no OS: transições de rota sem animate, sem translate

### Performance e confiabilidade

- [ ] `npm run lint` → 0 erros
- [ ] `npm run build` → exit 0
- [ ] Console do browser sem erros de import ou componente não encontrado
- [ ] Nenhum import de `src/components/ui/` removido que ainda era usado (verificar `toast`, `toaster`, `sidebar`)

---

*Relatório gerado em 2026-07-02 após conclusão das Fases 0–4.*

# Design Audit — Reck (BioCharge AI v2)

> Auditoria feita em 02/07/2026 contra o código real. Sem execução do app — baseada em leitura de todos os arquivos de componente, página, CSS e tokens.

---

## 1. Inventário de telas e páginas

| Rota | Componente | Propósito |
|---|---|---|
| `/today` | `src/pages/Today.jsx` | Decisão do dia — tela principal |
| `/checkin` | `src/pages/DailyCheckin.jsx` | Registro diário de sinais |
| `/insights` | `src/pages/Insights.jsx` | Padrões / análise fisiológica |
| `/trends` | `src/pages/Trends.jsx` | Evolução de métricas no tempo |
| `/history` | `src/pages/History.jsx` | Histórico dia a dia agrupado por semana |
| `/settings` | `src/pages/AppSettings.jsx` | Preferências e perfil |
| `/saude` | `src/pages/Health.jsx` | Monitor de Saúde (fora do AppLayout) |
| `/login` | `src/pages/Login.jsx` | Autenticação |
| `onboarding` | dentro de `AppLayout.jsx` | Wizard de boas-vindas (5 steps) |

---

## 2. Inventário de componentes reutilizáveis

### Layout
- `src/components/layout/AppLayout.jsx` — header fixo + nav bottom + `<Outlet />`

### Today
- `MiniRing` — anel SVG animado com sparkline (inline em `Today.jsx`, não extraído)
- `ExecutionCard` — card principal com anéis + decisão (inline em `Today.jsx`)
- `CollapsibleHint` — hint recolhível genérico (inline em `Today.jsx`)
- `TomorrowHookCard` — card de gancho amanhã (inline em `Today.jsx`)
- `src/components/today/MorningRecoveryCard.jsx`
- `src/components/today/SleepForecastCard.jsx`
- `src/components/today/CurrentStateCard.jsx`
- `src/components/today/TrainingSessionsList.jsx`
- `src/components/today/WorkoutLoggedState.jsx`
- `src/components/today/HealthStatusCard.jsx`
- `src/components/today/ProtectionInsightCard.jsx`
- `src/components/today/QuickIntentEdit.jsx`
- `src/components/today/SecondaryMetrics.jsx`

### Intelligence (usados em Insights / Today)
- `src/components/intelligence/PhysioStateCard.jsx`
- `src/components/intelligence/TrainingLoadCard.jsx`
- `src/components/intelligence/CorrelationsCard.jsx`
- `src/components/intelligence/AnalysisHighlights.jsx`
- `src/components/intelligence/AnalysisBody.jsx`
- `src/components/intelligence/NarrativeCard.jsx`
- `src/components/intelligence/WhyScoreCard.jsx`
- `src/components/intelligence/BodyAgeCard.jsx`
- `src/components/intelligence/FitnessAgeCard.jsx`
- `src/components/intelligence/LongevityTrendCard.jsx`
- `src/components/intelligence/LongevityOnboardingCard.jsx`

### Check-in
- `src/components/checkin/CheckinStep.jsx`
- `src/components/checkin/SliderField.jsx`
- `src/components/checkin/EmojiSelector.jsx`
- `src/components/checkin/LivePreview.jsx`
- `src/components/checkin/CheckinSuccessOverlay.jsx`

### Training
- `src/components/training/AddTrainingModal.jsx`

### UI-bio
- `src/components/ui-bio/BodyStateBadge.jsx`

### UI primitivos (shadcn/Radix)
Toda a pasta `src/components/ui/` — accordion, alert, avatar, badge, button, card, dialog, drawer, form, input, select, slider, tabs, tooltip, etc.

---

## 3. Problemas de layout

### 3.1 God component — Today.jsx (1886 linhas)
`Today.jsx` define **quatro componentes React inline** (`MiniRing`, `ExecutionCard`, `CollapsibleHint`, `TomorrowHookCard`) além de toda a lógica derivada e o render tree. Isto torna impossível:
- reusar `MiniRing` em Trends ou History sem copiar código
- testar `ExecutionCard` isoladamente
- fazer redesign incremental de um sub-card sem tocar o arquivo gigante

### 3.2 Largura máxima inconsistente
`AppLayout.jsx` define `max-w-2xl` (672px) para header e main, mas algumas páginas como `Health.jsx` ficam fora do `AppLayout` e não repetem essa restrição de forma consistente. Resultado: o conteúdo da página `/saude` pode quebrar o alinhamento visual esperado.

### 3.3 Padding/safe-area no bottom nav
O `pb-32` em `<main>` é estimado, não calculado a partir da altura real do bottom nav (64px = `h-16`). Em dispositivos com home indicator (iPhone com notch), o conteúdo pode ficar cortado ou ter espaço excessivo.

### 3.4 Check-in sem indicador de progresso visual claro
`DailyCheckin.jsx` usa um sistema de steps, mas o progresso (qual step atual / total) não parece ter um componente de indicador de progresso dedicado e consistente no topo.

### 3.5 Ausência de empty states com identidade visual
Várias telas mostram um spinner de loading genérico (`animate-spin` manual no `App.jsx`) sem uma tela de carregamento com a identidade Reck. Estados vazios (sem check-in hoje, sem dados de tendência) não têm tratamento visual consistente.

---

## 4. Problemas de tipografia

### 4.1 Escala tipográfica não documentada, implementada ad hoc
Os tamanhos de fonte são definidos inline com classes arbitrárias do Tailwind: `text-[10px]`, `text-[11px]`, `text-[9px]`, `text-3xl`, `text-xl`, `text-2xl`. Não existe uma escala semântica (caption / body / title / hero).

### 4.2 Mixagem de estilos em labels de métricas
O padrão mais comum para labels de seção é `text-[10px] font-bold uppercase tracking-widest text-muted-foreground`, mas variações aparecem:
- `text-[10px] font-semibold uppercase tracking-wider`
- `text-xs font-semibold uppercase tracking-wide`
- `text-[9px] uppercase tracking-wider`

São quatro variações do mesmo conceito visual sem padronização.

### 4.3 Números com font-mono inconsistente
Alguns valores numéricos usam `font-mono` (`text-3xl font-black font-mono` em `MiniRing`), outros usam Inter regular. O valor no `SleepForecastCard` usa `text-3xl font-black font-mono text-blue-400`, mas outros cards de métrica usam `font-black` sem `font-mono`.

### 4.4 Ausência de hierarquia clara na página Histórico
`History.jsx` usa `WeekLabel` com `text-xs font-semibold text-muted-foreground uppercase tracking-wider`, que tem o mesmo peso visual do conteúdo abaixo. Não há uma distinção real entre títulos de seção (semana) e conteúdo de item.

---

## 5. Inconsistências de espaçamento

### 5.1 Sem escala de espaçamento definida
O Tailwind usa `p-4`, `p-5`, `px-4 py-3`, `px-3 py-2.5`, `px-2 py-0.5` de forma não sistemática. Não existe uma escala documentada de espaçamento para cards, seções e página.

### 5.2 Gaps entre cards variam
Em `Today.jsx`, a lista de cards usa `space-y-3` em alguns lugares e `space-y-2` em outros. Na página Insights, o gap entre blocos de análise não segue o mesmo padrão.

### 5.3 Padding interno de cards varia
`CheckinStep.jsx` usa `p-4` no conteúdo e `px-4 py-3.5` no header.
`SleepForecastCard.jsx` usa `p-4 space-y-4`.
`MorningRecoveryCard.jsx` usa estrutura diferente.
Não há um `CardBody` padrão com padding uniforme.

---

## 6. Inconsistências de cor e tema

### 6.1 Estado de alerta com duas paletas
Alertas amarelos usam tanto `text-yellow-400 / bg-yellow-500/10` quanto `text-amber-300 / bg-amber-500/10` para a mesma semântica (atenção). Exemplo: `AppLayout.jsx` usa `text-amber-300/90` para o aviso de wearable; `Today.jsx` usa `text-yellow-300` para alertas de strain.

### 6.2 Azul com dois propósitos
O azul (`hsl(200,80%,55%)`) é usado tanto para "sono" (domínio fisiológico) quanto para cards informativos genéricos (`border-blue-500/20 bg-blue-500/5` em `SleepForecastCard`). O mesmo tom carrega dois significados diferentes dependendo do contexto.

### 6.3 Opacidades sem padrão
Background tints usam `/5`, `/6`, `/8`, `/10`, `/12` sem uma escala definida:
- `bg-emerald-500/10`, `bg-emerald-500/5`, `bg-emerald-500/8`
- `bg-primary/5`, `bg-primary/8`, `bg-primary/10`, `bg-primary/12`

Visualmente imperceptível a diferença entre `/8` e `/10`, mas semanticamente não diz nada.

### 6.4 Borders com padrão similar
Borders de alerta variam entre `/20`, `/25`, `/30` sem escala definida. Um card de warning pode ter `border-yellow-500/20` ou `border-yellow-500/25` em telas diferentes.

### 6.5 Token `--bio-*` definido mas não usado sistematicamente
`index.css` define `--bio-green`, `--bio-yellow`, `--bio-red`, `--bio-blue`, `--bio-purple`, mas esses tokens não são usados nos componentes — que usam diretamente `text-emerald-400`, `text-yellow-400`, etc.

---

## 7. Problemas de responsividade

### 7.1 App desenhado como mobile-first, mas sem breakpoints explícitos
O layout usa `max-w-2xl mx-auto` para centralizar em desktop. Não há nenhum `sm:`, `md:`, `lg:` para adaptar o layout a tablets ou desktops maiores. Em telas de 1200px, a coluna central aparece com muito espaço vazio lateral.

### 7.2 Trio de anéis em `MiniRing` com tamanho fixo
`MiniRing` usa `size = 104` (padrão) hardcoded. Em iPhones SE (320px de largura), o grid de 3 anéis com 104px cada + gap pode apertar o layout. Não há responsividade nos tamanhos.

### 7.3 Bottom nav sem suporte a `safe-area-inset-bottom`
O bottom nav fixo não usa `padding-bottom: env(safe-area-inset-bottom)`, o que pode cortar a navegação em iPhones com home indicator.

---

## 8. Problemas de hierarquia visual

### 8.1 Muita informação no mesmo nível na Today
A tela `Today` empilha verticalmente: anéis + headline + status autonômico + barra de strain + leitura de hoje + cards de análise + CTA de pós-treino + gancho de amanhã. Tudo com peso visual similar. Não há uma hierarquia clara de "o que é decisão principal" vs "o que é contexto de suporte".

### 8.2 Labels uppercase são usados tanto para categorias quanto para valores
`text-[10px] font-bold uppercase tracking-widest` aparece em:
- Categorias de seção ("Decisão de hoje", "Treino → resposta do corpo")
- Valores de estado ("Alta", "Moderada")
- Captions de anel ("Recovery", "Sono", "Strain")

O mesmo estilo carrega três funções visuais diferentes.

### 8.3 Cards sem área hero definida
Os cards de inteligência (`PhysioStateCard`, `CorrelationsCard`, `TrainingLoadCard`) não têm uma área de herói clara (número grande / gráfico / ícone proeminente). São blocos de texto com badge e corpo — pattern de SaaS dashboard, não editorial premium.

### 8.4 Emojis como substitutos de ícones de estado
`PhysioStateCard` usa `🟢`, `🔵`, `🟡`, `🟠`, `🔴`, `🚨` como indicadores visuais de estado. Emojis dependem de renderização da plataforma (cores variam entre iOS e Android) e não permitem estilização CSS.

---

## 9. Elementos genéricos / não premium

### 9.1 Loading spinner padrão
O estado de carregamento em `App.jsx` usa `border-2 border-primary border-t-transparent rounded-full animate-spin` — exatamente o spinner CSS genérico que aparece em 99% dos tutoriais de React. Não tem identidade.

### 9.2 Onboarding com cards de lista básicos
Os cards do onboarding em `AppLayout.jsx` usam `p-3 rounded-xl border border-border bg-card` — estilo básico de lista sem nenhum diferencial visual. O onboarding é a primeira impressão do produto.

### 9.3 AppSettings sem identidade visual
`AppSettings.jsx` lista preferências com cards de opção estilo formulário SaaS genérico. Não reflete a identidade premium/editorial do Reck.

### 9.4 Página `/saude` sem header/nav
`Health.jsx` existe fora do `AppLayout` (intencional, para não ter nav). Mas o header de volta é um simples `ArrowLeft` sem identidade — não se parece com parte do mesmo produto.

### 9.5 Ausência de estado de silêncio com design
Quando insights não disparam (portão estatístico), a UI mostra vazio ou texto genérico. O silêncio honesto do Reck precisa de um design próprio — não ausência de design.

### 9.6 Charts do Recharts com estilo padrão
`Trends.jsx` usa `AreaChart`, `BarChart`, `ComposedChart` do Recharts com tooltip customizado mas sem estilização profunda dos eixos, grades e áreas. Parece dashboard corporativo padrão.

---

## 10. Oportunidades de motion e microinterações

### 10.1 Bom: já existe `useMotionSafe`
`src/hooks/use-motion-safe.js` já implementa respeito a `prefers-reduced-motion`. É a base correta para um sistema de motion consciente.

### 10.2 Bom: anéis já têm animação de entrada
`MiniRing` anima `strokeDashoffset` com `framer-motion` na entrada — um dos pontos visuais mais fortes do app.

### 10.3 Oportunidade: transições de página
As rotas não têm transição entre páginas. Trocar de tab na bottom nav é um corte seco. Uma transição suave de fade+slide daria coesão.

### 10.4 Oportunidade: estados de loading por card
Cards que esperam análise assíncrona (`runPhysiologicalAnalysisAsync`) mostram o layout completo com dados faltando, ou renderizam `null`. Um skeleton loader por card seria mais elegante do que o aparecimento abrupto.

### 10.5 Oportunidade: feedback de interação
Botões de CTA importantes (salvar check-in, adicionar treino) não têm microinteração de feedback além do `:hover`. Uma animação sutil de press/scale daria resposta tátil.

### 10.6 Oportunidade: número do score com contagem animada
O número do Recovery no anel (`MiniRing`) anima o arco mas não o número em si. Uma animação de contagem do 0 até o valor atual tornaria o momento de abertura da Today mais impactante.

### 10.7 Oportunidade: check-in success overlay
`CheckinSuccessOverlay.jsx` existe — mas sem ver o código completo, é provável que seja genérico. O momento de salvar o check-in é um ritual diário e merece mais personalidade.

### 10.8 Oportunidade: scroll-driven reveals
Cards secundários na Today poderiam entrar com `opacity: 0 → 1` conforme o scroll, usando `framer-motion`'s `whileInView`, criando um ritmo editorial de leitura vertical.

---

## 11. Resumo de prioridades de design

| Problema | Impacto | Esforço |
|---|---|---|
| Escala tipográfica ad hoc | Alto | Baixo |
| Opacidades e borders sem padrão | Médio | Baixo |
| `MiniRing` não extraído / não reutilizável | Alto | Baixo |
| Emojis como indicadores de estado | Médio | Baixo |
| Skeleton loaders por card | Médio | Médio |
| Hierarquia visual na Today | Alto | Médio |
| Transições entre páginas | Médio | Médio |
| Bottom nav sem safe-area | Alto (iOS) | Baixo |
| Charts do Recharts sem estilo premium | Médio | Médio |
| Empty states / silêncio honesto com design | Alto | Médio |
| Onboarding sem identidade visual | Alto | Alto |
| AppSettings genérico | Baixo | Alto |

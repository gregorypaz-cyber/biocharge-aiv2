# Design Audit — Reck

> Auditoria baseada no PLANO-Rebuild-Design.md (fonte de verdade) cruzado com leitura direta do código.
> Todos os números abaixo são medições reais no repositório — não estimativas.

---

## 1. Inventário de telas

| Rota | Arquivo | Linhas | Papel |
|---|---|---|---|
| `/today` | `src/pages/Today.jsx` | **1.885** | Decisão do dia — tela principal |
| `/insights` | `src/pages/Insights.jsx` | **1.451** | Padrões / análise fisiológica |
| `/trends` | `src/pages/Trends.jsx` | **1.271** | Evolução de métricas |
| `/checkin` | `src/pages/DailyCheckin.jsx` | **1.261** | Registro diário |
| `/history` | `src/pages/History.jsx` | ~400 | Histórico agrupado por semana |
| `/settings` | `src/pages/AppSettings.jsx` | ~300 | Preferências e perfil |
| `/saude` | `src/pages/Health.jsx` | ~250 | Monitor de Saúde (fora do AppLayout) |
| onboarding | dentro de `AppLayout.jsx` | — | Wizard de boas-vindas (5 steps) |

---

## 2. Inventário de componentes

### Layout
- `AppLayout.jsx` — header sticky + `<Outlet>` + bottom nav 5 abas + OnboardingWizard inline

### Today (3 componentes definidos inline — problema mapeado)
- `MiniRing` — anel SVG animado (**inline em Today.jsx**, não exportado)
- `ExecutionCard` — card principal (**inline em Today.jsx**)
- `CollapsibleHint` — hint recolhível (**inline em Today.jsx**)
- `TomorrowHookCard` — gancho amanhã (**inline em Today.jsx**)
- `src/components/today/` — 9 cards extraídos (MorningRecoveryCard, SleepForecastCard, CurrentStateCard, TrainingSessionsList, WorkoutLoggedState, HealthStatusCard, ProtectionInsightCard, QuickIntentEdit, SecondaryMetrics)

### Intelligence
- `src/components/intelligence/` — 10 componentes (PhysioStateCard, TrainingLoadCard, CorrelationsCard, AnalysisHighlights, AnalysisBody, NarrativeCard, WhyScoreCard, BodyAgeCard, FitnessAgeCard, LongevityTrendCard, LongevityOnboardingCard)

### Check-in
- `src/components/checkin/` — CheckinStep, SliderField, EmojiSelector, LivePreview, CheckinSuccessOverlay

### UI-bio
- `src/components/ui-bio/BodyStateBadge.jsx`

### UI primitivos (shadcn/Radix)
- `src/components/ui/` — **49 arquivos**; o app usa ativamente ~9

---

## 3. Diagnóstico — evidências medidas no código

### 3.1 Epidemia de micro-texto

| Ocorrência | Contagem |
|---|---|
| `text-[10px]` | **155×** |
| `text-[11px]` | **89×** |
| `text-[7px]` | existe (piso atual) |

**Diagnóstico:** quando tudo é minúsculo, nada é secundário. Hierarquia fraca — o olho não sabe onde pousar. É também o "cheiro de IA/protótipo" mais visível: labels uppercase de 10px em todo card é o padrão genérico de dashboards SaaS gerados automaticamente.

### 3.2 Caos de raio (border-radius)

7 valores distintos em circulação sem regra de quando usar qual:

| Valor | Contagem |
|---|---|
| `rounded-sm` | 21× |
| `rounded-md` | 41× |
| `rounded-lg` | 24× |
| `rounded-xl` | 128× |
| `rounded-2xl` | 86× |
| `rounded-3xl` | 7× |
| `rounded-full` | 70× |

**Diagnóstico:** o olho percebe "quase igual, mas não" em cada tela. Sem regra declarada, cada patch futuro introduz mais variação.

### 3.3 Paleta paralela — duas fontes de verdade

Os tokens CSS existem em `index.css` mas as páginas usam a paleta crua do Tailwind:

| Cor Tailwind | Contagem | Problema |
|---|---|---|
| `emerald-*` | **127×** | Verde do token (`142 70% 50%`) convive com `emerald-400` ≈ 152/76/64 — são *verdes diferentes* |
| `red-*` | 90× | — |
| `yellow-*` | 71× | — |
| `blue-*` | 58× | — |
| `amber-*` | 46× | — |
| `orange-*` | 37× | — |
| `sky-*` | 19× | — |

Além disso: **~80 literais `hsl()` hardcoded** espalhados (ex.: `hsl(215,25%,18%)` no trilho do anel em `Today.jsx`, `tooltipStyle` em `Trends.jsx` com valores inline).

**Diagnóstico:** impossível ajustar a marca num lugar só. O verde da marca tem pelo menos três representações diferentes significando "bom".

### 3.4 Emojis como iconografia de produto

| Medição | Valor |
|---|---|
| Glifos emoji distintos na UI | **46** (`🔥 ⚡ 🌙 🧠 📝 🏋️ 🚨 🟢 🔴 🟡`…) |
| Referências a `emoji` como prop | **79** (incluindo o contrato de `CheckinStep`) |

**Diagnóstico:** emoji renderiza diferente por OS (iOS vs. Android vs. desktop), tem paleta própria que briga com a da marca, e é a assinatura visual mais forte de protótipo/IA. Um app que se apresenta como instrumento de precisão não decora alertas de saúde com 🚨.

### 3.5 Motion sem sistema

- **9 durações distintas** em uso (de 0.18s a 1s)
- Easings ad-hoc em cada componente
- `layoutId` usado em **1 único lugar** (tab da nav) — o padrão correto que deveria ser generalizado

**Diagnóstico:** cada card anima com física própria. O app parece montado, não projetado.

### 3.6 Monólitos de página com componentes inline

Os 4 maiores arquivos definem componentes dentro do próprio corpo — além do risco técnico de remount/estado perdido, impede consistência: o mesmo padrão visual é reimplementado à mão em cada arquivo.

### 3.7 Decoração sem informação

- **Starfield da Today** (20 círculos SVG + bloom radial `blur-2xl` + gradiente de vinheta): não codifica nenhum dado — decoração pura, contra o princípio anti-placebo do produto.
- **Bloom colorido pelo estado**: informa (o card "respira" a cor do veredito) — merece ficar, mas com opacidade mais tímida (~0.12).
- **Hairline de luz nos cards** (`.bg-card` em `index.css`): boa técnica, vira a única forma de elevação.

### 3.8 49 primitivos shadcn, ~9 em uso

`src/components/ui/` tem 49 arquivos. O app usa ativamente cerca de 9. Peso morto e tentação constante de introduzir padrões visuais alheios ao sistema.

---

## 4. O que já está certo — preservar sem mexer

- **Voz e copy em pt-BR.** "Você vai ver vermelho quando for vermelho", "não vou inventar um número antes disso" — melhor que 95% dos apps comerciais de recovery. Maior ativo de marca.
- **Arquitetura de 5 abas com papéis distintos** (Hoje / Padrões / Check-in / Tendências / Histórico) — estrutura de informação correta, sem redundância.
- **`layoutId="mobileActiveTab"`** na nav: único momento de motion compartilhado — é exatamente o padrão a generalizar.
- **Trio de anéis com sparkline de 7 dias**: ideia forte; execução precisa de refino.
- **Dark theme frio** (`220 20% 4%`) com verde 142: identidade sólida, reconhecível.
- **`/saude` como referência canônica**: a tela mais disciplinada do app. Blocos A–E, rodapé de honestidade, slots dormentes cinza. Sua gramática (SectionHeader, MetricRow, seta direcional) é o padrão que o resto deve adotar.
- **Silêncio como estado de design**: `HealthStatusCard` retornando `null` em calibração, a linha "✓ Sinais vitais no padrão" discreta. Design de elite disfarçado — amplificar, não remover.
- **`useMotionSafe`** já existe em `src/hooks/use-motion-safe.js` — base correta para motion responsável.

---

## 5. Problemas por categoria

### 5.1 Tipografia
- Sem escala semântica definida — 264 tamanhos arbitrários em px
- Piso real é `text-[7px]` — ilegível, especialmente em iPhone recém-acordado
- Labels uppercase em `text-[10px] font-bold` (155 ocorrências) são o principal "cheiro de IA" do app
- Inter e JetBrains Mono usados sem regra clara: alguns números em mono, outros não

### 5.2 Hierarquia visual na Today
- Três anéis de Recovery / Sono / Strain com **mesmo tamanho** (104px) na mesma linha: três leituras competindo em igualdade. Recovery é A decisão; sono e strain são contexto — mas visualmente não há essa distinção.
- O anel mostra o número 68 sobre um arco, mas 68 é bom? O usuário precisa lembrar os limiares (42/70). Faltam ticks de zona e marcador de baseline no arco — a régua do instrumento.
- Starfield decorativo ocupa atenção sem dar informação.

### 5.3 Cards sem arquitetura
- 19+ variantes de card na página Insights, criadas ad hoc
- Não há 3 tipos canônicos que cubram todos os casos
- A anatomia "label de categoria → dado dominante → explicação → ação" não é seguida sistematicamente

### 5.4 Espaçamento
- Gap entre cards: `space-y-2`, `space-y-3`, `space-y-4` sem regra de quando usar qual
- Padding interno: `p-3`, `p-4`, `p-5` misturados
- Entre seções (título → grupo): sem valor padronizado

### 5.5 Responsividade
- Safe-area iOS não implementada no bottom nav (`env(safe-area-inset-bottom)` ausente)
- Em desktop, `max-w-2xl` centrado funciona mas a coluna é estreita para Trends/Insights (gráficos poderiam aproveitar mais espaço)
- Áreas de toque: vários chips de 24–28px de altura, abaixo do mínimo de 44px

### 5.6 Acessibilidade
- `--muted-foreground` a 50% de luminância sobre fundo 4% passa AA para texto grande mas raspa em 11–12px (resolve com o fim do texto de 10px)
- `prefers-reduced-motion`: sem tratamento hoje
- Emojis de cor (`🟢🔴`) são o único indicador de estado em vários componentes — cor não pode ser o único sinal

### 5.7 Check-in
- Inputs numéricos (HRV, RHR, horas) não são os mais proeminentes visualmente, mas são os mais críticos
- LivePreview existe mas está enterrado no fluxo — não é uma barra fixa reativa em tempo real
- Stagger de entrada nos steps (`delay={0.05/0.1/0.15/0.2}`) faz o formulário parecer que está "caindo em pedaços" em vez de aparecer pronto

### 5.8 Insights
- 1.451 linhas, 19 variantes de card, maior densidade de `text-[10px]` do app
- Tudo tem o mesmo peso visual — não há manchete, evidências e silêncios como camadas distintas
- Estado de "silêncio estatístico" (gate não disparado) não tem design próprio — é ausência de elemento, não presença de honestidade declarada

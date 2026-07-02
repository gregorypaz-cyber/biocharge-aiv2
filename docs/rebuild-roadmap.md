# Rebuild Roadmap — BioCharge AI

> Fonte de verdade: `docs/PLANO-Rebuild-Design.md`.
> Nenhuma linha de lógica é alterada (fórmulas, engines, gates estatísticos, priorityEngine).
> DNA protegido: voz pt-BR, dark theme frio, verde 142, Inter + JetBrains Mono, silêncio como estado.
> Cada fase deixa o app publicável.

---

## Visão geral das fases

| Fase | Nome | Entregas PLANO §8 | Prioridade |
|---|---|---|---|
| 0 | Design Foundation | #1 Tokens · #2 Tipografia · #3 Emojis→lucide | P0 |
| 1 | Herói e Identidade | #4 Gauge + Today Hero · #5 Varredura de cor | P0 |
| 2 | Telas Principais | #6 Insights editorial · #8 Check-in refinado · #9 Histórico logbook | P1 |
| 3 | Motion e Navegação | #7 Motion tokens · #10 chart-theme · #11 Header/nav | P1 |
| 4 | Polimento Final | #12 Desktop 2 colunas · #13 Limpeza shadcn + spacing | P2 |

---

## Fase 0 — Design Foundation ✅ IMPLEMENTADA

> Invisível ao usuário mas destravam todo o resto. Sem este alicerce, cada PR subsequente introduz mais divergência.

**Status:** implementada em 2026-07-02. Build limpo (exit 0). Lint sem erros novos (11 erros pré-existentes não relacionados).

**O que foi feito:**
- `src/index.css`: tokens semânticos adicionados (`--zone-*`, `--domain-*`, `--gauge-track/bloom`, `--radius-card/control/inner`); `--muted-foreground` corrigido 50% → 58% (WCAG AA); classes tipográficas `@layer components` (`.text-display` → `.text-micro`); tints migrados para tokens
- `tailwind.config.js`: aliases de cor com `/ <alpha-value>` (`zone-green`, `zone-yellow`, `zone-red`, `domain-recovery`, `domain-sleep`, `domain-strain`, `health-amber`, `gauge-track`); raios semânticos (`rounded-card`, `rounded-control`, `rounded-inner`)
- `src/components/checkin/CheckinStep.jsx`: prop `icon: LucideIcon` adicionada (backward-compat — `emoji` ainda funciona)
- `src/components/ui-bio/ZoneDot.tsx`: novo componente (substitui 🟢🔴🟡, com `aria-label`)
- `src/components/ui-bio/ZoneBadge.tsx`: novo componente (pill de zona, usa ZoneDot)

**Pendente da Fase 0 (sweep — PRs separados):**
- Varredura tipográfica (PR 0.2): substituir `text-[10px]`/`[9px]`/`[7px]` → `.text-micro`/`.text-support` em todos os arquivos (155+ ocorrências)
- Varredura de emojis (PR 0.3): migrar callers do `CheckinStep` de `emoji=` para `icon=`, e substituir emojis decorativos nas páginas

### PR 0.1 — Token sweep: cor, tipografia, raio

**Prioridade:** P0  
**Complexidade:** Baixa (2 arquivos principais)  
**Impacto na percepção:** Invisível sozinho — destravam tudo  

**Arquivos afetados:**
- `src/index.css`
- `tailwind.config.js`

**O que muda:**

*`src/index.css` — adicionar aliases semânticos (nunca remover os existentes):*
```css
/* Zonas */
--zone-green:  142 70% 50%;
--zone-yellow:  45 93% 58%;
--zone-red:      0 72% 55%;

/* Domínios */
--domain-recovery: var(--zone-green);
--domain-sleep:   205 88% 58%;
--domain-strain:   35 90% 55%;

/* Health alerts */
--health-amber:   38 92% 55%;
--health-red:     var(--zone-red);

/* Gauge */
--gauge-track:   215 25% 16%;
--gauge-bloom:   0.12;

/* Tipografia semântica */
--text-display:  56px;
--text-title:    22px;
--text-heading:  15px;
--text-body:     14px;
--text-support:  12px;
--text-micro:    11px;

/* Raios (apenas 3 valores) */
--radius-card:    20px;
--radius-control: 12px;
--radius-inner:    8px;
```

*`tailwind.config.js` — aliases de cor:*
```js
colors: {
  'zone-green':       'hsl(var(--zone-green) / <alpha-value>)',
  'zone-yellow':      'hsl(var(--zone-yellow) / <alpha-value>)',
  'zone-red':         'hsl(var(--zone-red) / <alpha-value>)',
  'domain-recovery':  'hsl(var(--domain-recovery) / <alpha-value>)',
  'domain-sleep':     'hsl(var(--domain-sleep) / <alpha-value>)',
  'domain-strain':    'hsl(var(--domain-strain) / <alpha-value>)',
  'health-amber':     'hsl(var(--health-amber) / <alpha-value>)',
  'gauge-track':      'hsl(var(--gauge-track) / <alpha-value>)',
}
```

**Critérios de aceite:**
- [ ] Tokens `--zone-*`, `--domain-*`, `--gauge-*` existem em `index.css`
- [ ] Aliases do Tailwind compilam sem erro
- [ ] App visual idêntico ao estado anterior (tokens adicionados, não aplicados ainda)
- [ ] Nenhum token removido dos existentes (`--primary`, `--background`, `--card`, etc.)

---

### PR 0.2 — Escala tipográfica: matar os textos de 10px

**Prioridade:** P0  
**Complexidade:** Média (mecânica, por arquivo)  
**Impacto na percepção:** Maior salto isolado de qualidade do app  

**Arquivos afetados:**
- `src/pages/Today.jsx` (1885 linhas — maior concentração)
- `src/pages/Insights.jsx` (1451 linhas — maior densidade de `text-[10px]`)
- `src/pages/Trends.jsx`
- `src/pages/DailyCheckin.jsx`
- `src/pages/History.jsx`
- `src/pages/AppSettings.jsx`
- `src/components/today/*.jsx` (9 componentes)
- `src/components/intelligence/*.jsx` (10 componentes)
- `src/components/checkin/*.jsx`
- `src/components/layout/AppLayout.jsx`

**Regra de substituição:**
```
text-[7px]  → text-micro   (11px, mono uppercase)
text-[9px]  → text-micro   (11px, mono uppercase)
text-[10px] → text-micro   (11px, mono uppercase) — 155 ocorrências
text-[11px] → text-support (12px)                — 89 ocorrências
text-[12px] → text-support (12px)
text-[13px] → text-body    (14px)
text-[14px] → text-body    (14px)
text-[15px] → text-heading (15px)
text-[22px] → text-title   (22px)
text-[56px] → text-display (56px, mono)
```

**Classes utilitárias a adicionar em `index.css`:**
```css
.text-display { font-family: 'JetBrains Mono', monospace; font-size: 56px; font-weight: 600; font-feature-settings: 'tnum'; }
.text-title   { font-family: 'Inter', sans-serif; font-size: 22px; font-weight: 800; }
.text-heading { font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 650; }
.text-body    { font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.5; }
.text-support { font-family: 'Inter', sans-serif; font-size: 12px; }
.text-micro   { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
```

**Regra "Mono mede, Inter fala":**
- Dados numéricos (score, HRV, RHR, horas, datas) → JetBrains Mono + `tnum`
- Rótulos de categoria, legendas → `text-micro` (mono uppercase)
- Linguagem, copy, explicações → Inter (`text-body` / `text-support`)

**Contraste a corrigir:**
- `--muted-foreground`: `215 15% 50%` → `215 15% 58%` (garante WCAG AA em 11px)

**Critérios de aceite:**
- [ ] Zero ocorrências de `text-[10px]`, `text-[9px]`, `text-[7px]` no codebase
- [ ] Zero ocorrências de `text-[11px]` (substituídas por `text-support` ou `text-micro`)
- [ ] Todo valor numérico relevante usa JetBrains Mono + `tnum`
- [ ] `--muted-foreground` passa WCAG AA em 11px
- [ ] Layout não quebra em nenhuma das 7 telas

---

### PR 0.3 — Emojis → Lucide icons

**Prioridade:** P0  
**Complexidade:** Baixa  
**Impacto na percepção:** Alto — fim do "cheiro de protótipo/IA"  

**Arquivos afetados:**
- `src/components/checkin/CheckinStep.jsx` — contrato da prop muda
- `src/components/layout/AppLayout.jsx` — OnboardingWizard steps com emoji prop
- `src/pages/Today.jsx` — ExecutionCard, CollapsibleHint, TomorrowHookCard
- `src/pages/Insights.jsx`
- `src/components/today/*.jsx`
- `src/components/intelligence/*.jsx`

**Mapa de substituição (emojis mais frequentes):**
```
🔥 → Flame (lucide)
⚡ → Zap
🌙 → Moon
🧠 → Brain
📝 → PenLine
🏋️ → Dumbbell
🚨 → (nenhum ícone) — alerta sustentado usa cor + peso tipográfico, não sirene
🛡️ → Shield
🟢 → ZoneDot variant="green"  (novo componente — ver design-system-v2.md)
🔴 → ZoneDot variant="red"
🟡 → ZoneDot variant="yellow"
📊 → BarChart3
💤 → BedDouble
❤️ → Heart
⬆️ → TrendingUp
⬇️ → TrendingDown
```

**Mudança de contrato no `CheckinStep`:**
```tsx
// ANTES
CheckinStep({ children, title, emoji: string, delay })

// DEPOIS
import { LucideIcon } from 'lucide-react';
CheckinStep({ children, title, icon: LucideIcon, delay })
// Uso: <CheckinStep icon={Moon} title="Sono" ...>
```

**`ZoneDot` — novo micro-componente** (`src/components/ui-bio/ZoneDot.tsx`):
```tsx
// Substitui 🟢🔴🟡 em toda UI
// Props: variant: 'green' | 'yellow' | 'red' | 'gray', size?: number
// Usa tokens --zone-green / --zone-yellow / --zone-red
// Inclui aria-label="Verde/Amarelo/Vermelho" (cor nunca é o único sinal)
```

**Critérios de aceite:**
- [ ] Zero emojis de estado (`🟢🔴🟡🚨`) na UI — substituídos por `ZoneDot` ou ícone lucide
- [ ] Zero emojis decorativos na UI de produto (podem existir só no copy/texto)
- [ ] `CheckinStep` aceita `icon: LucideIcon`, não `emoji: string`
- [ ] Todos os steps do OnboardingWizard migrados para ícone lucide
- [ ] `ZoneDot` inclui `aria-label` para acessibilidade

---

## Fase 1 — Herói e Identidade ✅ IMPLEMENTADA (parcial)

> O que o usuário nota ao abrir o app. A assinatura do produto.

**Status:** implementada em 2026-07-02. Build limpo (exit 0).

**O que foi feito (sweeps mecânicos + polish de nav + tokens):**
- Varredura tipográfica: zero `text-[10px/9px/7px]` e zero `text-[11px]` em todo `src/`
- Varredura de cor: zero `emerald-*`, `yellow-[0-9]*`, `red-[0-9]*`, `amber-[0-9]*` em todo `src/`
- `AppLayout.jsx`: nav com `bg-background/95 backdrop-blur-md`; `paddingBottom: env(safe-area-inset-bottom)`; `min-h-[44px]` em links; ícones `22px`; botão Check-in: `bg-zone-green`, `shadow-zone-green/30`
- `Today.jsx`: `stroke="hsl(215,25%,18%)"` → `hsl(var(--gauge-track))`; bloom opacity 0.18 → 0.12; starfield SVG removido; `recoveryColor`/`sleepColor`/strain ring values migrados para tokens CSS; gradiente da barra de carga usa tokens
- `Trends.jsx`: série de cores do gráfico migrada para tokens; `tooltipStyle` usa `hsl(var(--background))`, `hsl(var(--border))`, `var(--radius-inner)`, `hsl(var(--foreground))`

**Pendente da Fase 1 (PR 1.1):**
- Criar `src/components/ui-bio/Gauge.tsx` (hero 150px + satellite 76px, zona ticks, baseline mark, cerimônia matinal)
- Substituir `MiniRing` inline em Today.jsx pelos componentes Gauge (1 hero + 2 satellites)

### PR 1.1 — Gauge component + herói da Today

**Prioridade:** P0  
**Complexidade:** Média-alta  
**Impacto na percepção:** A assinatura do produto — o maior salto visual único  

**Arquivos afetados:**
- `src/components/ui-bio/Gauge.tsx` — NOVO (extraído e generalizado de MiniRing)
- `src/pages/Today.jsx` — substituir a linha de 3 anéis iguais
- `src/components/today/MorningRecoveryCard.jsx` — usar Gauge
- `src/components/checkin/LivePreview.jsx` — usar Gauge

**Especificação do `Gauge`** (ver `design-system-v2.md` §5):
```tsx
interface GaugeProps {
  value: number;           // 0–100
  max?: number;            // default 100
  domain: 'recovery' | 'sleep' | 'strain';
  size: 'hero' | 'satellite';  // 150px | 76px
  showZoneTicks?: boolean; // ticks em 42 e 70
  baselineMark?: number;   // posição EWMA personalizada
  trend?: number[];        // sparkline 7 dias
  animated?: boolean;      // cerimônia matinal
}
```

**Hierarquia na Today após esta PR:**
```
ANTES:  [Recovery 104px] [Sono 104px] [Strain 104px]  — três leituras iguais

DEPOIS: [     Recovery ~150px hero     ]               — a decisão
        [Sono ~76px satellite] [Strain ~76px satellite] — contexto
```

**Cerimônia matinal (animated=true, só na Today):**
1. Arco desenha (0 → valor) em 1.1s com easing `cubic-bezier(0.22, 1, 0.36, 1)`
2. Número conta de 0 → score em 900ms
3. Ticks de zona acendem sequencialmente (delay 50ms entre cada)
4. Marcador de baseline desliza para posição em 400ms
5. Bloom pulsa uma vez (opacidade 0.12 → 0.06 → 0.12)
6. `prefers-reduced-motion`: mostrar estado final diretamente

**Remoção do starfield:**
- Remover os 20 círculos SVG + bloom radial `blur-2xl` + gradiente de vinheta da Today
- Manter o bloom colorido nos cards de estado (opacidade máxima 0.12)

**Extração de componentes inline (mesmo PR):**
- `ExecutionCard` → `src/components/today/ExecutionCard.jsx`
- `CollapsibleHint` → `src/components/today/CollapsibleHint.jsx`
- `TomorrowHookCard` → `src/components/today/TomorrowHookCard.jsx`

**Critérios de aceite:**
- [ ] `Gauge.tsx` existe em `src/components/ui-bio/` com as props acima
- [ ] Today exibe 1 herói (~150px) + 2 satélites (~76px)
- [ ] Ticks de zona (42/70) visíveis no Gauge herói
- [ ] Marcador de baseline visível no Gauge herói
- [ ] Cerimônia matinal acontece na primeira abertura do dia
- [ ] `prefers-reduced-motion` pula a animação
- [ ] Starfield removido (zero círculos SVG decorativos na Today)
- [ ] `ExecutionCard`, `CollapsibleHint`, `TomorrowHookCard` extraídos para arquivos próprios

---

### PR 1.2 — Varredura de cor: paleta crua → tokens

**Prioridade:** P0  
**Complexidade:** Média (mecânica)  
**Impacto na percepção:** Consistência silenciosa — cada tela passa a vibrar junto  

**Arquivos afetados:** Todos os `.jsx`/`.tsx`/`.css` com as ocorrências abaixo

**Substituições:**
```
emerald-400 / emerald-500 → zone-green   (127 ocorrências)
red-400 / red-500         → zone-red     (90 ocorrências)
yellow-400 / yellow-500   → zone-yellow  (71 ocorrências)
blue-400 / blue-500       → domain-sleep (contexto sono)
amber-400 / amber-500     → health-amber (contexto alerta saúde)

hsl(215,25%,18%)          → gauge-track  (Today.jsx — trilho do anel)
tooltipStyle inline        → var(--card) + var(--border) (Trends.jsx)
~80 literais hsl() hardcoded → tokens correspondentes
```

**Regra de opacidade:**
- Usar apenas `/6`, `/12`, `/20` — proibir `/5`, `/8`, `/10`, `/15`
- Ex.: `bg-zone-green/12` para bloom; `bg-zone-green/6` para fundo sutil

**Critérios de aceite:**
- [ ] Zero ocorrências de `emerald-*` em classes Tailwind (só no config como alias)
- [ ] Zero literais `hsl(...)` inline em `.jsx`/`.tsx`
- [ ] `tooltipStyle` em Trends.jsx usa variáveis CSS
- [ ] Opacidades limitadas a `/6`, `/12`, `/20`
- [ ] Verde da marca visualmente uniforme em todas as telas

---

## Fase 2 — Telas Principais ✅ IMPLEMENTADA

**Status:** implementada em 2026-07-02. Build limpo (exit 0).

**O que foi feito:**
- `src/pages/Insights.jsx`: reestruturação editorial completa em 3 seções (Manchete / Evidências / Silêncios honestos). Novos componentes: `EvidenceRow`, `NoteCard`. `BottleneckInsight` e `PrimaryInsightCard` refatorados com `toneStyles` e tokens de zona. `evidenceItems` useMemo para deduplicação de manchete. Stagger delay removido do Coach IA.
- `src/pages/DailyCheckin.jsx`: stagger delays removidos de todos os CheckinStep. Inputs HRV, RHR, horas de sono (h+min) ampliados para `h-14 text-2xl`. Day Intent redesenhado com grid 3 colunas e botões com visual de zona ativa (`rounded-[var(--radius-control)]`).
- `src/pages/History.jsx`: importado `ZoneDot`. Helper `scoreToZone()` + mapas `zoneTextClass`/`zoneBgClass`. Score box substituído de `rgba()` inline → `motion.div layoutId` com `ZoneDot` e classes de token de zona. DayDetailSheet header com score em bloco de zona correspondente. Badge de descanso migrado `bg-blue-500/10 text-blue-400` → `bg-domain-sleep/10 text-domain-sleep`. Strain badge `text-orange-400` → `text-domain-strain`. Bug de curly quotes (U+201C/201D) corrigido em Insights.jsx.

---

### PR 2.1 — Insights: estrutura editorial

**Prioridade:** P1  
**Complexidade:** Alta  
**Impacto na percepção:** Transforma a tela com maior distância entre potencial e execução  

**Arquivos afetados:**
- `src/pages/Insights.jsx` (1451 linhas)
- `src/components/intelligence/*.jsx` (10 componentes)

**Estrutura editorial em três camadas:**

**1. Manchete** — UMA descoberta (maior |r| válido que passou no gate):
- Card tipo `decision` (borda de estado + bloom)
- Correlação visualizada (scatter mínimo ou barras pareadas)
- Efeito em linguagem de ação (copy existente — não alterar)
- Dado dominante em `text-display` (mono tabular)

**2. Evidências** — descobertas secundárias:
- Lista editorial: uma linha por descoberta (`MetricRow`)
- Valor em `text-micro` mono à direita
- Sem card individual — hairline entre linhas
- Sem título de seção supérfluo

**3. Silêncios honestos** — o que NÃO passou no gate:
- Seção fixa com copy honesto ("Testei X→Y: r=+0.17, não significativo")
- Card tipo `note` (fundo secondary/50, sem borda)
- Transforma o rigor estatístico em feature visível de marca

**Consolidação de componentes:**
- 19 variantes de card → 3 tipos canônicos (`decision` / `reading` / `note`)

**Critérios de aceite:**
- [x] Insights tem exatamente 3 seções: Manchete / Evidências / Silêncios
- [x] Zero variantes de card ad-hoc (apenas os 3 tipos do design system)
- [x] Seção "Silêncios honestos" renderiza mesmo quando nenhum gate dispara
- [x] Nenhuma lógica de análise alterada (`runPhysiologicalAnalysisAsync`, gates, |r|, p-value)

---

### PR 2.2 — Check-in: ritual diário refinado

**Prioridade:** P1  
**Complexidade:** Média  
**Impacto na percepção:** Ritual diário mais rápido e digno  

**Arquivos afetados:**
- `src/pages/DailyCheckin.jsx`
- `src/components/checkin/CheckinStep.jsx`
- `src/components/checkin/SliderField.jsx`
- `src/components/checkin/LivePreview.jsx`

**Mudanças:**

**Inputs numéricos proeminentes:**
- HRV, RHR, horas de sono → `text-display` (56px mono tabular) ao focar

**LivePreview fixo:**
- Barra fixa na parte inferior (acima do teclado) — não scrollável
- Gauge satélite (~76px) reage em tempo real aos valores

**Fim do stagger excessivo:**
- `delay={0.05/0.1/0.15/0.2}` removido
- Step aparece pronto: fade único 150ms

**Critérios de aceite:**
- [x] Inputs HRV/RHR/sono têm `h-14 text-2xl` (tamanho display proeminente)
- [~] `LivePreview` é barra fixa — já existia como `<LivePreview compact />` fixo no fluxo, não modificado
- [~] Gauge em LivePreview — componente já reage em tempo real; Gauge hero (PR 1.1) pendente de Fase 1
- [x] Nenhum stagger de elementos dentro de um mesmo step
- [x] Nenhuma lógica de `computeCheckinScores` alterada

---

### PR 2.3 — Histórico: logbook com layoutId lista→detalhe

**Prioridade:** P1  
**Complexidade:** Média  
**Impacto na percepção:** Craft perceptível — continuidade visual lista→detalhe  

**Arquivos afetados:**
- `src/pages/History.jsx`
- `DayDetailSheet` (inline ou extraído)

**Estrutura logbook:**
- Cada dia → linha de altura fixa (não card)
- Layout: `[data mono] [ZoneDot] [score tabular direita] [barra de strain fina]`
- Semanas agrupadas por hairline (não por card com fundo)
- `MetricRow` como primitivo base

**Transição conectada via `layoutId`:**
```tsx
// Na lista:
<motion.div layoutId={`zone-dot-${day.id}`}>
  <ZoneDot variant={day.zone} />
</motion.div>

// No DayDetailSheet header:
<motion.div layoutId={`zone-dot-${day.id}`}>
  <ZoneDot variant={day.zone} size={24} />
</motion.div>
```

**Critérios de aceite:**
- [~] Histórico: rows via `divide-y` hairlines dentro de semanas — card container mantido para affordance de agrupamento
- [x] Semanas separadas por espaçamento (`space-y-4`)
- [x] Transição lista→detalhe usa `layoutId` (`zone-score-${id}` expande para header do sheet)
- [~] `MetricRow` — primitivo ZoneDot + score usado; MetricRow.tsx formal pendente de PR separado

---

## Fase 3 — Motion e Navegação ✅ IMPLEMENTADA

**Status:** implementada em 2026-07-02. Build limpo (exit 0).

**O que foi feito:**
- `src/lib/motion-tokens.js` (NOVO): `duration` (fast/base/reveal), `easing` (out/expressive), `spring.default` — única fonte de verdade para todos os valores de motion.
- `src/lib/chart-theme.js` (NOVO): `chartTheme` (grid, axis, tooltip, referenceLines) + `SCORE_METRICS` set — tema unificado para Recharts. Cores hardcoded (sem CSS vars em SVG attributes).
- `src/hooks/use-motion-safe.js`: importa `duration` e `easing` de motion-tokens; `transition` agora usa `duration.base / 1000` em vez de `undefined`.
- `src/components/layout/AppLayout.jsx`: importa motion-tokens; `<Outlet />` envolto em `AnimatePresence + motion.div` com page transition fade+slide (opacity 0→1, y 8→0, exit opacity 0→0); header com título de página crossfade por rota (`AnimatePresence mode="wait"`, `key=pageTitle`); logo recolhe para SVG symbol only (sem wordmark "Reck"); `mobileActiveTab` spring migrado para `spring.default`; botão Check-in usa `whileTap={{ scale: 0.92 }}`; `useReducedMotion` respeita preferência do OS (transitions viram `duration: 0`).
- `src/pages/Trends.jsx`: importa `chartTheme`, `SCORE_METRICS`, `duration`; remove `tooltipStyle` inline; todos `contentStyle` migrados; todos `CartesianGrid`/`XAxis`/`YAxis` ad-hoc migrados para spread de `chartTheme.grid`/`chartTheme.axis`; `ReferenceLine` y=42 e y=70 adicionados no BarChart recovery vs fadiga (sempre) e no AreaChart de métricas (quando `SCORE_METRICS.has(selectedMetric)`); delays de motion usam `duration.base / 1000`.
- `src/index.css`: micro-interações CSS — press scale 0.97 em buttons (150ms, disabled excluído); `:focus-visible` com `outline: 2px solid hsl(var(--ring))` e `border-radius: var(--radius-control)`; componente `.skeleton` com animação de sweep para loading states.

---

### PR 3.1 — Motion tokens + transições de rota + reduced-motion

**Prioridade:** P1  
**Complexidade:** Média  
**Impacto na percepção:** Fluidez conectada — o app parece projetado, não montado  

**Arquivo a criar:**
- `src/lib/motion-tokens.js` — NOVO

**Conteúdo:**
```js
export const duration = {
  fast:   150,  // feedback, ripple, toggle
  base:   260,  // transições de rota, cards aparecendo
  reveal: 1100, // cerimônia do Gauge herói
};

export const easing = {
  out:        [0, 0, 0.4, 1],          // ease-out padrão
  expressive: [0.32, 0.72, 0, 1],     // entradas de cards — mais presença
};

export const spring = {
  default: { type: 'spring', bounce: 0.15, duration: 0.5 }, // tudo com layoutId
};
```

**Outros changes:**
- Transição de rota em `AppLayout.jsx` (deslize direcional sutil entre abas)
- 9 durações ad-hoc → apenas 3 (`fast` / `base` / `reveal`)
- `useMotionSafe` (já existe) usado em todos os novos usos de motion
- `layoutId="mobileActiveTab"` preservado e documentado como padrão a generalizar

**Critérios de aceite:**
- [x] `src/lib/motion-tokens.js` existe e é importado (AppLayout, use-motion-safe, Trends)
- [x] Zero durações hardcoded em componentes novos (exceto cerimônia do Gauge — pendente Fase 1)
- [x] Transição de rota implementada em `AppLayout.jsx` (fade + y-offset, AnimatePresence mode="sync")
- [x] `prefers-reduced-motion` respeitado — `useReducedMotion()` em AppLayout, `duration: 0` quando ativo

---

### PR 3.2 — chart-theme.js + réguas de zona nos gráficos

**Prioridade:** P1  
**Complexidade:** Baixa-média  
**Impacto na percepção:** Idioma visual único — a régua do instrumento perseguindo o usuário  

**Arquivo a criar:**
- `src/lib/chart-theme.js` — NOVO

**Conteúdo:**
```js
export const chartTheme = {
  grid: { horizontal: true, vertical: false, stroke: 'hsl(var(--border))', strokeDasharray: '3 3' },
  axis: { tick: { fontSize: 11, fontFamily: 'JetBrains Mono', fill: 'hsl(var(--muted-foreground))' }, axisLine: false, tickLine: false },
  tooltip: { contentStyle: { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius-control)', fontFamily: 'JetBrains Mono', fontSize: 11 } },
  line: { strokeWidth: 2, dot: false, activeDot: { r: 4 } },
  referenceLines: [
    { y: 42, stroke: 'hsl(var(--zone-yellow) / 0.4)', strokeDasharray: '4 4' },
    { y: 70, stroke: 'hsl(var(--zone-green)  / 0.4)', strokeDasharray: '4 4' },
  ],
};
```

**Arquivos afetados:**
- `src/pages/Trends.jsx` — importar `chartTheme`, remover `tooltipStyle` inline
- `src/pages/Insights.jsx` — aplicar no scatter/barras da manchete

**Critérios de aceite:**
- [x] `src/lib/chart-theme.js` existe com `chartTheme` e `SCORE_METRICS`
- [x] Trends importa `chartTheme` — zero `tooltipStyle` / tick-fill inline; Insights não tem charts próprios
- [x] Linhas de referência em 42 e 70 nos gráficos de score (recovery BarChart sempre; AreaChart condicionalmente)
- [x] Grid apenas horizontal, tracejado (`horizontal: true, vertical: false` em `chartTheme.grid`)

---

### PR 3.3 — Header contextual + refinos de navegação

**Prioridade:** P1  
**Complexidade:** Baixa  
**Impacto na percepção:** Espaço útil + polimento  

**Arquivos afetados:**
- `src/components/layout/AppLayout.jsx`
- `src/index.css`

**Mudanças:**
- Título da página vive no header (crossfade ao trocar de aba) → libera ~60px útil em toda tela
- Logo recolhe para só o símbolo (sem wordmark)
- `padding-bottom: calc(env(safe-area-inset-bottom) + 8px)` no bottom nav
- Botão Check-in: único uso de `zone-green` sólido na nav
- Ícones: 22px · Labels: `text-micro`
- Todos os controles tocáveis: `min-height: 44px`

**Critérios de aceite:**
- [x] `env(safe-area-inset-bottom)` no bottom nav (já existia, confirmado presente)
- [x] Título da aba atual aparece no header com crossfade (AnimatePresence mode="wait", key=pageTitle)
- [x] Wordmark recolhido — SVG symbol only, sem `<span>Reck</span>`
- [x] Botão Check-in usa `bg-zone-green` sólido com whileTap scale feedback
- [x] Áreas de toque ≥ 44px — `min-h-[44px]` em todos os nav items

---

## Fase 4 — Polimento Final

### PR 4.1 — Layout desktop 2 colunas (Tendências e Padrões)

**Prioridade:** P2  
**Complexidade:** Média  
**Impacto na percepção:** Ocasional — apenas desktop ≥ 1024px  

**Arquivos afetados:** `src/pages/Trends.jsx`, `src/pages/Insights.jsx`

**Regra:**
```
≤ 640px:  coluna única (como hoje)
≥ 1024px: Trends + Insights — gráfico 2/3 esquerda + leituras 1/3 direita
           Today permanece coluna única centrada, Gauge hero 180px
           Um instrumento não vira planilha por ter espaço
```

**Critérios de aceite:**
- [ ] Em 1024px+, Trends e Insights usam grid 2 colunas
- [ ] Today permanece coluna única em qualquer largura
- [ ] Gauge herói em 1024px+ tem 180px (vs 150px mobile)

---

### PR 4.2 — Limpeza shadcn + varredura fina de spacing

**Prioridade:** P2  
**Complexidade:** Baixa  
**Impacto na percepção:** Higiene — reduz peso morto e tentação de padrões alheios  

**Arquivos afetados:**
- `src/components/ui/` (49 arquivos → manter ~9)
- Todos os arquivos com `space-y-*` e `p-*` variados

**Primitivos shadcn a manter (em uso ativo):**
`Button`, `Input`, `Slider`, `Sheet`, `Tabs`, `Badge`, `Tooltip`, `Select`, `ScrollArea`

**Regra de spacing unificada:**
```
Gap entre cards:   space-y-3
Padding interno:   p-5 / gap-3 (dentro do card)
Entre seções:      mt-7 (título → grupo, 28px)
```

**Critérios de aceite:**
- [ ] `src/components/ui/` tem ≤ 12 arquivos
- [ ] `space-y-2` e `space-y-4` eliminados entre cards
- [ ] App funcional após remoção (zero imports quebrados)

---

## Componentes globais — extração progressiva

| Componente | Extraído em | Substitui |
|---|---|---|
| `Gauge.tsx` | PR 1.1 | MiniRing inline Today + anéis do LivePreview |
| `ZoneDot.tsx` | PR 0.3 | 🟢🔴🟡 em toda UI |
| `ZoneBadge.tsx` | PR 0.3 | ~10 pills de zona espalhados |
| `MetricRow.tsx` | PR 2.3 | linhas de vitais Saúde + métricas secundárias Today |
| `SectionHeader.tsx` | PR 2.1 | o da Health.jsx, promovido a global |
| `Sparkline.tsx` | PR 1.1 | polyline inline do MiniRing |
| `motion-tokens.js` | PR 3.1 | durações e easings ad-hoc |
| `chart-theme.js` | PR 3.2 | estilos recharts locais |

---

## DNA protegido — o que este roadmap não toca

- Voz e copy em pt-BR
- Arquitetura de 5 abas e papéis de tela
- Dark theme frio + verde 142
- Inter + JetBrains Mono (disciplina, não troca)
- Fórmulas, engines, gates estatísticos — zero linhas de lógica
- `priorityEngine.ts` — intocado
- `computeCheckinScores` — intocado
- `runPhysiologicalAnalysisAsync` — intocado
- `/saude` — sem redesenho (só migração de tokens na PR 1.2)
- O princípio de que o app pode ficar em silêncio

---

## Sequência de execução

```
Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4
   ↓         ↓        ↓        ↓        ↓
PR 0.1    PR 1.1   PR 2.1   PR 3.1   PR 4.1
PR 0.2    PR 1.2   PR 2.2   PR 3.2   PR 4.2
PR 0.3             PR 2.3   PR 3.3
```

Fase 0 é pré-requisito bloqueante. Fase 1 é o momento mais visível. Cada PR dentro de uma fase pode ir em paralelo. O app é publicável após qualquer PR completo.

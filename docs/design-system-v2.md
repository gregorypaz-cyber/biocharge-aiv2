# Design System v2 — Reck

> Fonte de verdade para todos os tokens, escalas e padrões visuais do Reck.
> Preserva a identidade de marca definida em `BRAND.md`.
> Implementar em `src/index.css` (tokens CSS) e `tailwind.config.js` (mapeamento).

---

## 1. Paleta de cores

### 1.1 Tokens base (sem semântica — valores brutos)

```css
/* Neutros */
--color-ink-0:    hsl(220 20%  4%);   /* #080A0D — quase-preto */
--color-ink-1:    hsl(220 18%  7%);   /* #0E1116 — card */
--color-ink-2:    hsl(220 15% 10%);   /* fundo de hover/secondary */
--color-ink-3:    hsl(220 15% 12%);   /* secondary / muted */
--color-ink-4:    hsl(220 15% 14%);   /* border / input */
--color-ink-5:    hsl(215 15% 50%);   /* muted-foreground */
--color-ink-6:    hsl(210 40% 90%);   /* secondary-foreground */
--color-ink-7:    hsl(210 40% 96%);   /* #EEF3F8 — branco-gelo, texto principal */

/* Verde-esmeralda — cor primária da marca */
--color-emerald:  hsl(142 70% 50%);   /* #26D968 — anel, destaque, "siga" */

/* Sinais fisiológicos */
--color-signal-green:   hsl(142 70% 50%);  /* recovery alto / bom */
--color-signal-yellow:  hsl(45  93% 58%);  /* recovery moderado / atenção */
--color-signal-red:     hsl(0   72% 55%);  /* recovery baixo / alerta */
--color-signal-blue:    hsl(200 80% 55%);  /* sono */
--color-signal-purple:  hsl(280 65% 60%);  /* estresse */
--color-signal-orange:  hsl(25  95% 58%);  /* strain acima da meta */
```

### 1.2 Tokens semânticos (o que usar no código)

```css
/* Superfícies */
--surface-page:       var(--color-ink-0);   /* fundo da página */
--surface-card:       var(--color-ink-1);   /* cards principais */
--surface-raised:     var(--color-ink-2);   /* cards elevados / hover */
--surface-muted:      var(--color-ink-3);   /* elementos secundários */

/* Bordas */
--border-subtle:      hsl(220 15% 14% / 1);  /* bordas padrão */
--border-moderate:    hsl(220 15% 20% / 1);  /* bordas de destaque */

/* Texto */
--text-primary:       var(--color-ink-7);   /* texto principal */
--text-secondary:     var(--color-ink-6);   /* texto secundário */
--text-muted:         var(--color-ink-5);   /* texto auxiliar, labels */

/* Ação / Marca */
--action-primary:     var(--color-emerald);
--action-primary-fg:  var(--color-ink-0);

/* Estados de sinal */
--signal-positive:    var(--color-signal-green);
--signal-caution:     var(--color-signal-yellow);
--signal-alert:       var(--color-signal-red);
--signal-sleep:       var(--color-signal-blue);
--signal-stress:      var(--color-signal-purple);
--signal-strain:      var(--color-signal-orange);
```

### 1.3 Tints de estado (backgrounds de alerta)

Os tints seguem uma escala única de opacidade por intensidade:

| Intensidade | Uso | Opacidade |
|---|---|---|
| `subtle` | Background informativo | `/6` |
| `mild` | Background de atenção suave | `/10` |
| `moderate` | Background de alerta | `/15` |

Exemplos:
```css
/* Recovery alto → verde */
bg: hsl(142 70% 50% / 0.06)   /* --tint-subtle */
bg: hsl(142 70% 50% / 0.10)   /* --tint-mild */
bg: hsl(142 70% 50% / 0.15)   /* --tint-moderate */

/* Alerta → vermelho */
bg: hsl(0 72% 55% / 0.06)
bg: hsl(0 72% 55% / 0.10)
```

Regra: **usar sempre `/8` é proibido** — adotar a escala `/6`, `/10`, `/15` sem variações intermediárias.

### 1.4 Borders de estado (opacidade padronizada)

| Uso | Opacidade |
|---|---|
| Borda sutil (informativa) | `/20` |
| Borda de atenção | `/30` |
| Borda de alerta forte | `/50` |

---

## 2. Escala tipográfica

### 2.1 Fontes

```css
--font-display: 'Inter', sans-serif;    /* headlines, números, UI */
--font-mono:    'JetBrains Mono', monospace;  /* valores numéricos de métricas */
```

### 2.2 Escala semântica

| Token | Tailwind | px | Uso |
|---|---|---|---|
| `--text-micro` | `text-[9px]` | 9px | Rótulos internos de anel, badges minúsculos |
| `--text-caption` | `text-[10px]` | 10px | Labels de seção (uppercase+tracking), legenda de gráfico |
| `--text-footnote` | `text-[11px]` | 11px | Texto explicativo secundário, hints |
| `--text-body-sm` | `text-xs` | 12px | Corpo de texto compacto, metadados |
| `--text-body` | `text-sm` | 14px | Corpo principal de cards e descrições |
| `--text-title-sm` | `text-base` | 16px | Títulos de card |
| `--text-title` | `text-lg` | 18px | Títulos de seção de página |
| `--text-headline` | `text-xl` | 20px | Headline da decisão do dia |
| `--text-hero` | `text-2xl` | 24px | Hero text (onboarding, telas de estado) |
| `--text-metric` | `text-3xl` | 30px | Valor numérico de métrica principal |
| `--text-metric-lg` | `text-4xl` | 36px | Score central em destaque |

### 2.3 Estilos de texto padronizados (classes compostas)

Definir como `@layer components` em `index.css`:

```css
/* Label de seção — o padrão mais usado no app */
.label-section {
  @apply text-[10px] font-bold uppercase tracking-widest text-muted-foreground;
}

/* Caption de anel / métrica */
.label-ring {
  @apply text-[11px] font-bold uppercase tracking-wider text-foreground;
}

/* Corpo de card */
.body-card {
  @apply text-sm leading-relaxed text-foreground;
}

/* Descrição muted */
.body-muted {
  @apply text-[11px] leading-relaxed text-muted-foreground;
}

/* Headline principal */
.headline-day {
  @apply text-xl font-black tracking-tight text-foreground;
}

/* Valor numérico mono */
.metric-value {
  @apply text-3xl font-black font-mono leading-none tracking-tight;
}
```

### 2.4 Pesos padronizados

| Contexto | Peso |
|---|---|
| Labels uppercase | `font-bold` (700) |
| Títulos de card | `font-semibold` (600) |
| Headlines | `font-black` (900) |
| Valores numéricos | `font-black` (900) |
| Corpo de texto | `font-normal` (400) |
| Metadata / muted | `font-medium` (500) |

---

## 3. Escala de espaçamento

O Tailwind já tem uma escala de 4px base. O sistema Reck usa subconjunto fixo:

| Token | Valor | Tailwind | Uso típico |
|---|---|---|---|
| `--space-1` | 4px | `p-1` | Padding de badge, chip |
| `--space-2` | 8px | `p-2` | Padding de ícone, botão compacto |
| `--space-3` | 12px | `p-3` | Padding de item de lista |
| `--space-4` | 16px | `p-4` | Padding padrão de card |
| `--space-5` | 20px | `p-5` | Padding de card destacado (hero card) |
| `--space-6` | 24px | `p-6` | Padding de seção de página |

**Gap entre cards:** sempre `gap-3` (12px) ou `space-y-3` (12px).
**Gap entre seções de página:** sempre `gap-6` (24px) ou `space-y-6` (24px).
**Padding lateral de página:** sempre `px-4` (16px) — nunca `px-5` ou `px-3` no container principal.

---

## 4. Sistema de raios (border-radius)

| Token | Valor | Tailwind | Uso |
|---|---|---|---|
| `--radius-sm` | 8px | `rounded-lg` | Badges, chips, inputs |
| `--radius-md` | 12px | `rounded-xl` | Botões, itens de lista |
| `--radius-lg` | 16px | `rounded-2xl` | Cards padrão |
| `--radius-xl` | 24px | `rounded-3xl` | Card hero (ExecutionCard) |
| `--radius-full` | 9999px | `rounded-full` | Anéis, avatares, chips de estado |

**Regra:** nunca misturar `rounded-2xl` e `rounded-xl` no mesmo card. O hero card usa `rounded-3xl`, os cards filhos usam `rounded-2xl`, os itens internos usam `rounded-xl`.

---

## 5. Sistema de sombra / elevação

| Nível | CSS | Uso |
|---|---|---|
| 0 — flush | `none` | Elementos no mesmo plano (lista flat) |
| 1 — card | `inset 0 1px 0 0 hsl(0 0% 100% / 0.06), 0 1px 3px hsl(0 0% 0% / 0.28)` | Cards padrão (já em `.bg-card`) |
| 2 — raised | `0 4px 12px hsl(0 0% 0% / 0.35)` | Modais, drawers, popovers |
| 3 — floating | `0 8px 24px hsl(0 0% 0% / 0.45), 0 0 0 1px hsl(220 15% 14%)` | Bottom sheet, nav pill |

O nível 1 já está implementado em `index.css` via `.bg-card`. Os outros precisam ser adicionados como utilitários.

---

## 6. Estilos de botão

### 6.1 Variantes

| Variante | Fundo | Texto | Border | Uso |
|---|---|---|---|---|
| `primary` | `bg-primary` | `text-primary-foreground` | nenhuma | CTA principal (salvar check-in) |
| `secondary` | `bg-secondary` | `text-secondary-foreground` | `border-border` | Ação secundária |
| `ghost` | transparente | `text-muted-foreground` | nenhuma | Ação terciária, ícones de nav |
| `outline` | transparente | `text-foreground` | `border-border` | Ação alternativa |
| `destructive` | `bg-destructive/10` | `text-destructive` | `border-destructive/30` | Deletar, ação perigosa |

### 6.2 Tamanhos

| Tamanho | Padding | Font | Radius | Uso |
|---|---|---|---|---|
| `sm` | `px-3 py-1.5` | `text-xs` | `rounded-lg` | Botões compactos, badges com ação |
| `md` | `px-4 py-2.5` | `text-sm` | `rounded-xl` | Padrão |
| `lg` | `px-5 py-3` | `text-sm font-semibold` | `rounded-xl` | CTAs de tela cheia |
| `icon` | `p-2` | — | `rounded-lg` | Ícone isolado |

### 6.3 Estados

- `:hover` → `brightness-110` (não mudar cor, apenas clarear)
- `:active` → `scale-[0.97]` com `transition-transform duration-100`
- `:disabled` → `opacity-40 cursor-not-allowed`
- `:focus-visible` → `ring-2 ring-primary ring-offset-2 ring-offset-background`

---

## 7. Estilos de card

### 7.1 Card padrão

```css
.card-default {
  @apply rounded-2xl border border-border/50 bg-card p-4;
  /* Herda o polish de .bg-card (hairline + sombra sutil) */
}
```

### 7.2 Card hero (ExecutionCard)

```css
.card-hero {
  @apply rounded-3xl border bg-card p-5;
  /* Fundo atmosférico via inline style — não tokenizável facilmente */
}
```

### 7.3 Card de sinal (recovery / alerta)

```css
.card-signal-positive { @apply rounded-2xl border border-emerald-500/20 bg-[hsl(142_70%_50%/0.06)] p-4; }
.card-signal-caution  { @apply rounded-2xl border border-yellow-500/20  bg-[hsl(45_93%_58%/0.06)]  p-4; }
.card-signal-alert    { @apply rounded-2xl border border-red-500/20     bg-[hsl(0_72%_55%/0.06)]   p-4; }
.card-signal-info     { @apply rounded-2xl border border-blue-500/20    bg-[hsl(200_80%_55%/0.06)] p-4; }
```

### 7.4 Anatomia de card

```
┌─────────────────────────────────────┐
│ [label-section em uppercase]        │  ← header (opcional, border-b)
├─────────────────────────────────────┤
│                                     │
│  [metric-value ou elemento hero]    │  ← área hero
│  [body-muted — descrição]           │
│                                     │
│  [informação secundária]            │  ← corpo
│                                     │
│  [ação ou link →]                   │  ← footer (opcional)
└─────────────────────────────────────┘
```

---

## 8. Estilos de formulário / input

### 8.1 Input padrão

```css
.input-default {
  @apply h-10 w-full rounded-lg border border-input bg-secondary px-3 py-2
         text-sm text-foreground placeholder:text-muted-foreground
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
         disabled:opacity-50 disabled:cursor-not-allowed;
}
```

### 8.2 Slider de check-in

- Track: `bg-secondary border border-border/40 rounded-full`
- Thumb: `bg-primary w-5 h-5 rounded-full shadow-sm`
- Fill: cor dinâmica conforme o valor (verde/amarelo/vermelho)

### 8.3 EmojiSelector

Botões de emoji devem usar:
- Estado padrão: `rounded-xl border border-border bg-secondary p-2`
- Estado selecionado: `ring-2 ring-primary border-primary/50 bg-primary/10`
- Tamanho do emoji: `text-xl` (para legibilidade touch)

### 8.4 Labels de campo

```css
.field-label {
  @apply text-xs font-medium text-muted-foreground flex items-center gap-1;
}
```

---

## 9. Padrões de navegação

### 9.1 Bottom nav

- Altura: `h-16` (64px)
- Safe area: `padding-bottom: env(safe-area-inset-bottom)` — **adicionar**
- Item ativo: `text-primary` + indicador de fundo `bg-primary/8 rounded-xl inset-1`
- Item inativo: `text-muted-foreground`
- Botão central (Check-in): `w-12 h-12 -mt-5 rounded-full bg-primary shadow-lg shadow-primary/40 ring-4 ring-background`
- Animação de seleção: `layoutId="mobileActiveTab"` com spring já implementado — manter

### 9.2 Header

- Altura: `h-14` (56px)
- Background: `bg-background/85 backdrop-blur-xl`
- Border bottom: `border-b border-border/40`
- Logo: ícone SVG do Reck `w-7 h-7` + wordmark `font-black text-sm tracking-tight`
- Sticky com `z-50`

### 9.3 Transições de rota

Adicionar wrapper em `AppLayout.jsx`:
```jsx
<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
  >
    <Outlet />
  </motion.div>
</AnimatePresence>
```

### 9.4 Tabs internas de página

Para filtros de tempo em Trends e seções em Insights:
- Container: `flex gap-1 p-1 bg-secondary rounded-xl`
- Item ativo: `bg-background text-foreground rounded-lg px-3 py-1.5 text-sm font-semibold shadow-sm`
- Item inativo: `text-muted-foreground px-3 py-1.5 text-sm`

---

## 10. Princípios de motion

### 10.1 Filosofia

> Motion do Reck é **funcional, não decorativo**. Cada animação deve comunicar algo — uma transição de estado, um resultado chegando, um dado que muda. Nunca animar por animar.

### 10.2 Durações e easings

| Uso | Duração | Easing |
|---|---|---|
| Micro (hover, press) | 100–150ms | `ease-out` |
| Padrão (entrada de card, fade) | 200–250ms | `easeOut` |
| Complexo (anel, contagem de número) | 800–1000ms | `easeOut` |
| Spring (tab ativa, modal) | duração calculada | `spring { bounce: 0.2 }` |

### 10.3 Padrões de entrada

```js
/* Card padrão */
{ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } }

/* Lista de cards com stagger */
{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: index * 0.06 } }

/* Modal / sheet */
{ initial: { y: 60, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: 60, opacity: 0 } }
```

### 10.4 Anel (MiniRing)

A animação atual do anel é o ponto visual mais forte — preservar:
- Bloom difuso: `opacity: 0.12`, `filter: blur(6px)`, entrada com `duration: 1, ease: 'easeOut'`
- Arco principal: mesmo timing que o bloom
- Tip bead: `delay: 0.85, duration: 0.3` — aparece depois do arco completar
- Número: adicionar `animate={{ count: value }}` com `duration: 0.8` (não implementado ainda)

### 10.5 Respeito a `prefers-reduced-motion`

`useMotionSafe()` já existe em `src/hooks/use-motion-safe.js`. Regra: **todo componente que usa `framer-motion` com duração > 200ms deve checar `useMotionSafe()`**. Anéis, contagem de números, transições de página — todos.

### 10.6 O que NÃO animar

- Reordenação de cards por drag (sem DnD no produto atual)
- Animações em loop contínuo (indicadores de "vida" — são placebo visual)
- Qualquer coisa que rode enquanto o usuário está tentando ler um número

---

## 11. Indicadores de estado fisiológico

### 11.1 Substituir emojis por componentes SVG

`PhysioStateCard` e outros cards usam `🟢🟡🔴`. Substituir por:

```jsx
function StateIndicator({ state }) {
  const colors = {
    positive: 'hsl(142 70% 50%)',
    caution:  'hsl(45  93% 58%)',
    alert:    'hsl(0   72% 55%)',
    neutral:  'hsl(215 15% 50%)',
  };
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ background: colors[state] }}
      aria-hidden="true"
    />
  );
}
```

Isso garante consistência de cor entre iOS e Android, e permite animação de pulse para alertas.

### 11.2 Mapeamento semântico de estados

| Estado | Cor | Uso |
|---|---|---|
| `positive` | emerald | Recovery alto, bom sinal |
| `caution` | yellow | Recovery moderado, atenção |
| `alert` | red | Recovery baixo, estado crítico |
| `info` | blue | Sono, informação neutra |
| `neutral` | muted | Calibrando, sem dado |

---

## 12. Componentes a criar / padronizar

| Componente | Status | Prioridade |
|---|---|---|
| `MiniRing` (extraído de Today.jsx) | inline → arquivo próprio | P0 |
| `StateIndicator` (substitui emojis) | novo | P0 |
| `LabelSection` (label uppercase padronizado) | novo | P0 |
| `CardSignal` (card de sinal com variantes) | novo | P1 |
| `SkeletonCard` (loading state) | novo | P1 |
| `EmptyState` (silêncio honesto com design) | novo | P1 |
| `MetricValue` (número grande + label) | novo | P1 |
| `PageTransition` (wrapper de rota) | novo | P1 |
| `BottomSheet` (modal mobile-first) | usar Vaul (já instalado) | P1 |
| `TabsFilter` (filtros de tempo) | novo sobre Radix Tabs | P2 |

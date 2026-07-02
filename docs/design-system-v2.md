# Design System v2 — Reck

> Derivado do PLANO-Rebuild-Design.md (fonte de verdade).
> Tese central: **instrumento de medição, não dashboard**.
> Implementar em `src/index.css` + `tailwind.config.js` + arquivos de componente.

---

## 1. Cor — uma fonte de verdade

### 1.1 O problema atual
A paleta crua do Tailwind (`emerald-*`, `yellow-*`, `red-*`…) convive com os tokens HSL do `index.css` e ~80 `hsl()` literais hardcoded. O verde da marca tem pelo menos 3 representações diferentes no código. Ajustar a cor de marca exige caçar 127 ocorrências de `emerald-*`.

### 1.2 Tokens semânticos (substituem tudo)

```css
/* ─── index.css ─── */

/* Zonas fisiológicas — a régua do instrumento */
--zone-green:  142 70% 50%;   /* = --primary. Verde É a marca */
--zone-yellow:  45 93% 58%;
--zone-red:      0 72% 55%;

/* Domínios — identidade de cada métrica */
--domain-recovery: var(--zone-green);
--domain-sleep:   205 88% 58%;
--domain-strain:   35 90% 55%;

/* Monitor de Saúde */
--health-amber:   38 92% 55%;   /* estado agudo */
--health-red:     var(--zone-red); /* estado sustentado */

/* Estrutura do instrumento */
--gauge-track:   215 25% 16%;  /* trilho dos anéis — hoje é literal hardcoded */
--gauge-bloom:   0.12;         /* opacidade do bloom (var CSS para controle fácil) */
```

### 1.3 Classes utilitárias no Tailwind config

```js
// tailwind.config.js → theme.extend.colors
// Formato com <alpha-value> obrigatório para suportar classes de opacidade (bg-zone-green/12)
colors: {
  'zone-green':  'hsl(var(--zone-green) / <alpha-value>)',
  'zone-yellow': 'hsl(var(--zone-yellow) / <alpha-value>)',
  'zone-red':    'hsl(var(--zone-red) / <alpha-value>)',
  'domain-recovery': 'hsl(var(--domain-recovery) / <alpha-value>)',
  'domain-sleep':    'hsl(var(--domain-sleep) / <alpha-value>)',
  'domain-strain':   'hsl(var(--domain-strain) / <alpha-value>)',
  'health-amber':    'hsl(var(--health-amber) / <alpha-value>)',
  'gauge-track':     'hsl(var(--gauge-track) / <alpha-value>)',
}
```

### 1.4 Regra de disciplina

**Nenhuma página usa cor que não seja token.** `emerald-400` vira `text-zone-green`. `hsl(215,25%,18%)` no trilho do anel vira `hsl(var(--gauge-track))`. Cor literal em componente = bug de design.

### 1.5 Tints de estado (opacidades padronizadas)

| Intensidade | Opacidade | Uso |
|---|---|---|
| `subtle` | `/6` | Background informativo padrão |
| `moderate` | `/12` | Background de estado ativo |
| `strong` | `/20` | Border de estado |

Três valores. Não existem `/5`, `/8`, `/10`, `/15`, `/25` neste sistema.

---

## 2. Tipografia — a régua de 6 tamanhos

### 2.1 Divisão fundamental: Mono mede, Inter fala

- **JetBrains Mono** → todo dado numérico, todo label de máquina, todo output do instrumento
- **Inter** → tudo que o app *diz* (headlines, corpo, copy de orientação)

A divisão é identidade. Não é preferência — é regra inviolável.

```css
font-feature-settings: "tnum"; /* números tabulares em todo uso de JetBrains Mono */
```

Números tabulares garantem que dígitos tenham mesma largura — essencial para colunas do Histórico e para a contagem animada do score não "dançar" lateralmente.

### 2.2 Escala fechada — 6 tamanhos, piso 11px

| Papel | Classe | Spec | Substitui |
|---|---|---|---|
| **Display** | `.text-display` | Mono 56px / lh 1 / peso 600 / tnum | `text-3xl font-black font-mono` no MiniRing (score hero) |
| **Title** | `.text-title` | Inter 22px / peso 800 / tracking-tight | `text-2xl font-black` variados |
| **Heading** | `.text-heading` | Inter 15px / peso 650 | `text-sm`/`text-base font-semibold` variados |
| **Body** | `.text-body` | Inter 14px / lh 1.5 / peso 400 | `text-sm` + `text-[13px]` |
| **Support** | `.text-support` | Inter 12px / lh 1.45 / peso 450 | `text-[11px]`, `text-[12px]` |
| **Micro** | `.text-micro` | **Mono** 11px / peso 500 / uppercase / tracking 0.08em | `text-[10px] font-bold uppercase tracking-wider` (155 ocorrências) e tudo abaixo |

**Piso absoluto: 11px, e só em labels mono uppercase.** Nada de `text-[10px]`, `text-[9px]`, `text-[7px]`. Texto que hoje está em 10px ou sobe para `.text-support`, ou — pergunta honesta — não merecia estar na tela.

### 2.3 Implementação em `index.css`

```css
@layer components {
  .text-display {
    font-family: var(--font-mono);
    font-size: 56px;
    line-height: 1;
    font-weight: 600;
    font-feature-settings: "tnum";
  }
  .text-title {
    font-family: var(--font-inter);
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .text-heading {
    font-family: var(--font-inter);
    font-size: 15px;
    font-weight: 650;
  }
  .text-body {
    font-family: var(--font-inter);
    font-size: 14px;
    line-height: 1.5;
    font-weight: 400;
  }
  .text-support {
    font-family: var(--font-inter);
    font-size: 12px;
    line-height: 1.45;
    font-weight: 450;
  }
  .text-micro {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
}
```

---

## 3. Raio, espaçamento e elevação — três de cada

### 3.1 Raio (3 valores + pill)

```css
--radius-card:    20px;  /* cards e superfícies */
--radius-control: 12px;  /* botões, inputs, chips retangulares */
--radius-inner:    8px;  /* elementos aninhados dentro de cards */
/* rounded-full → só pills de status e dots */
```

**Regra de aninhamento:** raio interno **sempre menor** que o raio do card pai. Um input dentro de um card usa `--radius-inner` (8px), não `--radius-control` (12px).

**O que resolve:** hoje circulam 7 valores (sm, md, lg, xl, 2xl, 3xl, full). Três valores com semântica clara tornam qualquer patch futuro automaticamente consistente.

### 3.2 Espaçamento (grade de 4pt, três ritmos)

| Contexto | Valor | Tailwind |
|---|---|---|
| Dentro do card | `20px` padding / `12px` gap interno | `p-5` / `gap-3` |
| Entre cards | `12px` sempre | `space-y-3` |
| Entre seções (título → grupo) | `28px` | `mt-7` |

O feed da Today passa a ter ritmo constante — não o atual vai-e-vem entre `space-y-2`, `space-y-3` e `space-y-4`.

### 3.3 Elevação (uma técnica só)

A hairline de luz no topo + sombra suave que já existe em `.bg-card` é boa e vira a **única** forma de elevação:

```css
/* Já existe, preservar: */
.bg-card {
  box-shadow: inset 0 1px 0 0 hsl(0 0% 100% / 0.06), 0 1px 3px hsl(0 0% 0% / 0.28);
}
```

**Regra de borda:** superfície = hairline (via `.bg-card`). Destaque de estado = borda colorida do token de zona. **Nunca os dois ao mesmo tempo.** Remover bordas duplicadas (`border-border/40` + `/60` convivendo no mesmo card).

---

## 4. Iconografia — aposentar os emojis

**46 glifos emoji** na UI são substituídos por `lucide-react` (já é dependência), com especificação fixa:
- Tamanho: `16px` (`w-4 h-4`)
- Stroke: `1.75`
- Cor: `text-muted-foreground` em repouso → token de domínio quando ativo

### Mapeamento direto

| Emoji | Lucide | Observação |
|---|---|---|
| 🔥 | `Flame` | streak |
| 🌙 | `Moon` | sono |
| 🧠 | `Brain` | análise/padrões |
| 📝 | `PenLine` | anotações |
| 🏋️ | `Dumbbell` | musculação |
| ⚡ | `Zap` | strain/energia |
| 😴 | `BedDouble` | recuperação de sono |
| 💚 | `Heart` | saúde |
| 📊 | `BarChart3` | tendências |
| 🚨 | *(nenhum)* | alerta sustentado usa cor e peso tipográfico, não sirene |
| 🟢 🟡 🔴 | `ZoneDot` (componente novo) | ver §8 |

**`CheckinStep` troca a prop `emoji: string` por `icon: LucideIcon`.** Isso quebra o contrato atual e precisa ser migrado em todos os usos.

---

## 5. Motion — três durações, duas físicas, uma cerimônia

### 5.1 Tokens (exportar de `src/lib/motion-tokens.js`)

```js
export const duration = {
  fast:   150,   // hover, toggle, chip, rotação de chevron
  base:   260,   // entrada/saída de cards, colapsáveis, sheets
  reveal: 1100,  // EXCLUSIVO: cerimônia matinal do herói
};

export const easing = {
  out:      [0, 0, 0.4, 1],           // ease-out padrão
  expressive: [0.32, 0.72, 0, 1],    // base das entradas — mais presença
};

export const spring = {
  default: { type: 'spring', bounce: 0.15, duration: 0.5 }, // tudo com layoutId
};
```

### 5.2 Regras de uso

1. **Entrada de página: sem stagger por card.** Uma única animação de container (fade + 8px de subida, `duration.base`) — o conteúdo chega junto, como uma tela pronta, não como peças caindo. O stagger atual do check-in (`delay={0.05/0.1/0.15/0.2}`) é removido.

2. **Transição entre abas: deslize direcional.** `AnimatePresence` no `<Outlet>`: crossfade rápido (120ms out / 180ms in) com 6px de deslize na direção da aba (ir para aba à direita = conteúdo entra da direita). Sutil, mas conecta a nav ao conteúdo.

3. **`prefers-reduced-motion`:** cerimônia vira aparição estática; transições viram fade puro sem translate. Hoje não há tratamento nenhum — isso é P0.

### 5.3 A cerimônia matinal (a única concentração de expressividade)

Quando a Today abre com check-in feito, em ~1.2s:
1. O arco do Gauge desenha de 0 ao score (curva `expressive`)
2. O número no centro conta de 0 ao valor em sincronia com o arco (mesma curva — hoje o arco anima e o número simplesmente aparece)
3. Os ticks de zona (42% e 70%) "acendem" sutilmente
4. O marcador de baseline desliza para a posição

Acontece uma vez por abertura. Depois: tela absolutamente estática. É o "acerto de contas" encenado — a assinatura do produto.

`tnum` (números tabulares) garante que a contagem não "dance" lateralmente durante a animação.

---

## 6. Componentes do vocabulário fechado

O rebuild extrai dos monólitos um vocabulário mínimo. Todo conteúdo do app deve caber nestes componentes.

### 6.1 `Gauge` — substitui `MiniRing` e todos os anéis

```tsx
// src/components/ui-bio/Gauge.tsx
interface GaugeProps {
  value: number | null;
  max?: number;                    // default 100
  domain: 'recovery' | 'sleep' | 'strain';
  size: 'hero' | 'satellite';     // hero ~150px, satellite ~76px
  showZoneTicks?: boolean;        // ticks em 42% e 70% do arco (só recovery)
  baselineMark?: number | null;   // posição da média 7d no arco
  trend?: (number | null)[];      // sparkline abaixo do anel
  label: string;
  caption?: string;
}
```

**Diferença crucial do `MiniRing` atual:** o `Gauge` com `showZoneTicks=true` desenha marcas discretas nos pontos 42% e 70% do arco (as fronteiras de zona reais do `getZone`) e um marcador triangular pequeno na posição do `baselineMark`. O usuário pode ler "68, acima da minha base, a 2 pontos do verde" num relance — sem texto. É a materialização visual de "relativo a si mesmo, não à média".

A contagem animada do score (cerimônia matinal) vive aqui, controlada por `duration.reveal`.

### 6.2 Três tipos de card (substituem as 19+ variantes do Insights)

```tsx
// src/components/ui-bio/Card.tsx
type CardVariant = 'decision' | 'reading' | 'note';

// decision: borda de estado + bloom da zona — para ExecutionCard e alertas
// reading:  superfície padrão + dado mono em destaque — para MorningRecoveryCard, PhysioStateCard etc.
// note:     sem borda, fundo secondary/50, texto support — para hints, silêncios, contexto
```

Todo conteúdo do app cabe em um dos três. Precisar de um quarto tipo é sinal de problema mal formulado.

### 6.3 `MetricRow` — padrão da página `/saude`, promovido a global

```tsx
// src/components/ui-bio/MetricRow.tsx
// label mono à esquerda · valor tabular à direita · delta com seta direcional
// Substitui: linhas de vitais da Saúde + métricas secundárias da Today + linhas do Histórico
interface MetricRowProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;        // positivo = bom ou ruim depende do domínio
  deltaDirection?: 'good-up' | 'good-down'; // RHR: bom pra baixo
  baseline?: string;     // "base: 58ms" — a régua
}
```

### 6.4 `ZoneDot` — substitui emojis de cor de estado

```tsx
// src/components/ui-bio/ZoneDot.tsx
// Substitui 🟢🟡🔴 — renderização CSS, não emoji
type Zone = 'green' | 'yellow' | 'red' | 'neutral';
// Dot de 8px, rounded-full, cor via token de zona
// Variante 'pulse': animação de ring expand para alertas sustentados
```

### 6.5 `ZoneBadge` — pill de zona

```tsx
// src/components/ui-bio/ZoneBadge.tsx
// rounded-full, bg zona/12, text zona, border zona/20
// Substitui ~10 implementações de pill espalhadas
```

### 6.6 `SectionHeader` — da Saúde para o app todo

```tsx
// src/components/ui-bio/SectionHeader.tsx
// text-micro mono — já existe em Health.jsx, promovido a componente global
```

### 6.7 `Sparkline` — extraído do Gauge

```tsx
// src/components/ui-bio/Sparkline.tsx
// polyline SVG inline que hoje existe dentro do MiniRing
// Extraído para ser reutilizável no Histórico (logbook)
```

### 6.8 `chart-theme.js` — idioma único para Recharts

```js
// src/lib/chart-theme.js
export const chartTheme = {
  grid: {
    horizontal: true,
    vertical: false,
    stroke: 'hsl(var(--border))',
    strokeDasharray: '3 6',
    opacity: 0.4,
  },
  axis: {
    tick: { className: 'text-micro', fill: 'hsl(var(--muted-foreground))' },
    line: false,
  },
  tooltip: {
    contentStyle: {
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 'var(--radius-control)',
      fontSize: '11px',
      fontFamily: 'var(--font-mono)',
      color: 'hsl(var(--foreground))',
      padding: '8px 12px',
    },
  },
  area: {
    fillOpacity: 0.12,  // gradiente do domínio a 12%→0%
    strokeWidth: 2,
  },
  dot: false,           // dot só no hover
  // Linhas de referência de zona em todo gráfico de score
  zoneLines: [
    { y: 70, label: '70', stroke: 'hsl(var(--zone-green))', opacity: 0.3 },
    { y: 42, label: '42', stroke: 'hsl(var(--zone-yellow))', opacity: 0.3 },
  ],
};
```

---

## 7. Arquitetura de layout — tela a tela

### 7.1 Today — o mostrador do instrumento

**Recovery vira o elemento dominante.** Hoje os três anéis têm o mesmo tamanho — três leituras competindo. Passa a:

```
        ┌──────────────────────────────┐
        │  DECISÃO DE HOJE      [zona] │
        │  "Treinar leve, proteja..."  │
        │                              │
        │         ╭──────╮             │
        │        │   68   │  ← ticks   │
        │        │ ▲base  │    42 e 70 │
        │         ╰──────╯    no arco  │
        │      RECOVERY                │
        │                              │
        │   ╭──╮            ╭──╮       │
        │  │82 │           │ 9 │       │
        │   ╰──╯            ╰──╯       │
        │   SONO           STRAIN      │
        │  ~ sparkline 7d ~            │
        └──────────────────────────────┘
```

- `Gauge size="hero"` (~150px) centralizado para Recovery com `showZoneTicks` e `baselineMark`
- `Gauge size="satellite"` (~76px) para Sono e Strain flanqueando abaixo
- Starfield: **removido** (decoração sem informação)
- Bloom radial: **mantido** a `--gauge-bloom` (0.12) na cor da zona do dia
- Em calibração: sem bloom — a ausência de cor é informação

**Feed abaixo do herói:** gap constante de 12px. O colapsável `SecondaryMetrics` e as informações de suporte formam uma zona visualmente mais quieta: sem cards de borda cheia, separados por hairline — igual ao padrão da página `/saude`.

### 7.2 Check-in — de formulário a ritual rápido

- **Inputs numéricos grandes:** HRV, RHR e horas de sono em `text-display` / mono 22px, `inputmode="decimal"`, agrupados no topo
- **LivePreview fixo no rodapé:** barra fixa durante o preenchimento com os três `Gauge` em tempo real — o instrumento reagindo enquanto o dado é inserido
- **`CheckinStep` troca emoji por icon:** prop `icon: LucideIcon` com ícone lucide 16px
- **Sem stagger de entrada:** o formulário aparece pronto (§5.2 regra 1)
- **Barra de progresso no topo:** `h-1 rounded-full bg-zone-green` com `scaleX` animando

### 7.3 Padrões (Insights) — de mural a editorial

Estrutura em três camadas:

1. **Manchete** — UMA descoberta principal (maior |r| válido que passou no gate). Card `decision` com a correlação visualizada (scatter mínimo ou barras pareadas), efeito em linguagem de ação.
2. **Evidências** — descobertas secundárias como lista editorial: linha por descoberta com `MetricRow`, valor em mono, sem card individual (hairline entre linhas).
3. **Silêncios honestos** — seção fixa que declara o que NÃO passou no gate: "Testei carga→recovery: r=+0,17, sem significância — não vou te mostrar isso como padrão." O rigor estatístico vira feature visível de marca.

### 7.4 Tendências — idioma único de gráfico

`chart-theme.js` exportado (§6.8) aplicado em todos os gráficos:
- Grid só horizontal, tracejado, sutil
- Linhas de referência nas fronteiras de zona (42/70) em todo gráfico de score — a régua do instrumento perseguindo o usuário por todas as telas
- Tooltip único com identidade Reck
- Área com gradiente do domínio a 12%→0%

### 7.5 Histórico — logbook

Cada dia vira uma linha de altura fixa (não um card):
- Data em `text-micro` mono
- `ZoneDot` da zona
- Score em mono tabular alinhado à direita
- Strain como barra fina

Semanas separadas por hairline, não por card.

`DayDetailSheet` usa `layoutId` conectando o `ZoneDot` da linha ao header do sheet — o dot expande para o header (transição lista→detalhe mais barata e elegante do plano).

### 7.6 Saúde — referência canônica, não redesenhada

`/saude` é a tela mais disciplinada do app. **Ação: nenhum redesenho.** Apenas migrar para os tokens novos. Sua gramática (`SectionHeader` mono, `MetricRow`, seta direcional) é a referência que as outras telas devem seguir.

### 7.7 Navegação

- **Header contextual:** título da página vive no header (crossfade ao trocar de aba), liberando ~60px de altura útil em toda tela. Logo recolhe para só o símbolo SVG.
- **Bottom nav:** botão Check-in com `bg-zone-green` sólido (único uso de verde sólido na nav — destino primário do dia); ícones `22px`; labels em `text-micro`.
- **Transição entre abas:** deslize direcional sutil (§5.2 regra 2).
- **Saúde sem menu:** `layoutId` no container do card âmbar/vermelho expandindo para a página `/saude`.

---

## 8. Responsividade

| Breakpoint | Layout |
|---|---|
| ≤ 640px | Coluna única, como hoje |
| ≥ 1024px | Duas colunas **só em Tendências e Padrões** (gráficos 2/3 esquerda, leituras 1/3 direita). Today permanece coluna única centrada com `Gauge hero` maior (180px) — um instrumento não vira planilha por ter espaço. |

- Áreas de toque: mínimo **44px** em todos os controles (chips, steps, sliders)
- `env(safe-area-inset-bottom)` no bottom nav

---

## 9. Acessibilidade

- **Contraste:** `--muted-foreground` sobe de `215 15% 50%` para `215 15% 58%` — resolve o risco em 11–12px. Com o fim do texto de 10px, o app inteiro volta a AA automaticamente.
- **Cor nunca sozinha:** `ZoneDot` sempre acompanhado de texto de zona (`ZoneBadge` ou label). Regra escrita, não só intenção.
- **Foco visível:** anel de foco `--ring` já está nos tokens — garantir que botões custom (chips, steps do check-in) não o suprimem.
- **`prefers-reduced-motion`:** tratado em `motion-tokens.js` e respeitado em todo componente que usa `duration.reveal` ou translate.

---

## 10. Limpeza — o que sai

- **40 primitivos shadcn não usados** de `src/components/ui/` (mapeados no backlog como Bucket B) — componente que não existe não vaza padrão estranho
- **Starfield** (20 círculos SVG + `blur-2xl` em `Today.jsx`)
- **`text-[10px]`**, **`text-[9px]`**, **`text-[7px]`** — zero ocorrências no produto final
- **46 emojis de UI** → lucide (ver §4)
- **~80 `hsl()` literais** → tokens (ver §1)
- **127× `emerald-*`** + 90× `red-*` + 71× `yellow-*` → tokens de zona/domínio

---

## 11. Princípios permanentes

1. **Design anti-placebo.** Todo elemento visual precisa passar no mesmo gate dos insights: *que informação isso adiciona?* Decoração sem resposta é o starfield — corta.
2. **O número nunca sem a régua.** Score, HRV, strain: sempre com zona, baseline ou delta visível. Valor absoluto solto é meia-verdade visual.
3. **Mono mede, Inter fala.** Dados em JetBrains Mono tabular; linguagem em Inter. A divisão é a identidade.
4. **Silêncio é um estado de primeira classe.** Estado normal = presença mínima; calibração = ausência declarada; alerta = raro e portanto crível.
5. **Uma cerimônia por dia.** A expressividade de motion vive na revelação matinal; todo o resto é funcional e discreto.
6. **Três de cada.** 3 raios, 3 durações, 3 tipos de card, 6 tamanhos de tipo. Precisar de um quarto é sinal de problema mal formulado.
7. **Token ou nada.** Cor, tamanho, raio ou duração literal em componente é bug de design.
8. **O padrão-ouro é a página `/saude`.** Em dúvida sobre como apresentar um dado, perguntar: como o bloco B de `/saude` faria?

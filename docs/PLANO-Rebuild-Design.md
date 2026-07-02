# RECK — Plano de Reconstrução de Design
### Documento de direção criativa e estratégia de rebuild visual

**Escopo:** elevar a qualidade percebida do produto inteiro ao nível de apps de consumo premium (WHOOP, Oura, Linear, Things), **sem criar features novas** e **preservando o DNA existente**: dark-first, verde 142 como cor de marca, Inter + JetBrains Mono, voz honesta em pt-BR, silêncio > sinal fabricado.

**Método:** este plano foi escrito depois de auditar o código real do zip (não screenshots, não memória). Todos os diagnósticos abaixo citam números medidos no repositório.

---

## 1 · Diagnóstico — o que o código revela

O Reck já tem uma alma rara: a voz do produto ("Você vai ver vermelho quando for vermelho", "não vou inventar um número antes disso") é melhor que a de 95% dos apps comerciais de recovery. O problema não é conceito — é **disciplina de execução**. O design system existe no papel (tokens HSL no `index.css`) mas é traído em quase toda tela.

### 1.1 Evidências medidas

| Sintoma | Medição no código | Diagnóstico |
|---|---|---|
| **Epidemia de micro-texto** | `text-[10px]` aparece **155×**; `text-[11px]` **89×**; há até `text-[7px]` | Hierarquia fraca: quando tudo é minúsculo, nada é secundário. Também é o principal "cheiro de IA" do app — labels uppercase de 10px em todo card |
| **Caos de raio** | 7 valores em circulação: `sm`(21×), `md`(41×), `lg`(24×), `xl`(128×), `2xl`(86×), `3xl`(7×), `full`(70×) | Sem regra de quando usar qual → o olho percebe "quase igual, mas não" em cada tela |
| **Paleta paralela** | Tokens existem, mas as páginas usam paleta crua do Tailwind: `emerald` **127×**, `red` 90×, `yellow` 71×, `blue` 58×, `amber` 46×, `orange` 37×, `sky` 19× — além de **~80 literais `hsl()`** hardcoded (ex.: `hsl(215,25%,18%)` no anel, `tooltipStyle` no Trends) | Duas fontes de verdade. O verde do token (`142 70% 50%`) convive com `emerald-400/500` que são *outro verde*. Impossível ajustar a marca num lugar só |
| **Emojis como iconografia** | 46 glifos emoji na UI (`🔥 ⚡ 🌙 🧠 📝 🏋️`), 79 referências a `emoji` como prop — o `CheckinStep` recebe emoji por contrato | Emoji renderiza diferente por OS, quebra o tom "instrumento de precisão" e é assinatura visual de protótipo/IA |
| **Motion sem sistema** | 9 durações distintas (0.18 a 1s), easings ad-hoc; `layoutId` usado só no tab da nav | Cada card anima com física própria → o app parece montado, não projetado |
| **Monólitos de página** | `Today.jsx` 1.885 linhas, `Insights.jsx` 1.451, `Trends.jsx` 1.271, `DailyCheckin.jsx` 1.261 — com componentes (`MiniRing`, cards) definidos inline | Além do risco técnico já conhecido (remount/estado), impede consistência: o mesmo padrão visual é reimplementado à mão em cada arquivo |
| **Decoração sem informação** | Herói da Today: starfield de 20 círculos SVG + bloom radial blur-2xl + gradiente de vinheta; cards com "hairline de luz" + tints | O starfield é o exemplo clássico de "efeito visual aleatório": não codifica nenhum dado. O bloom colorido pelo estado, por outro lado, *informa* — merece ficar |
| **49 primitivas shadcn** | `src/components/ui/` tem 49 arquivos; o app usa ~9 | Peso morto (já mapeado no backlog como Bucket B) e tentação constante de introduzir padrões visuais alheios ao sistema |

### 1.2 O que já está certo (preservar)

- **Voz e copy.** O onboarding ("Números honestos, não bonitos") e as microcopys de calibração são o maior ativo de marca. Nenhuma palavra deste plano propõe suavizar isso.
- **Nav de 5 abas com papéis distintos** (Hoje / Padrões / Check-in / Tendências / Histórico) — arquitetura de informação correta, sem redundância. Não mexer na estrutura.
- **Silêncio como estado de design.** `HealthStatusCard` retorna `null` em calibração; a linha "✓ Sinais vitais no padrão" é discreta. Isso é design de elite disfarçado — o plano *amplifica* esse princípio.
- **`layoutId="mobileActiveTab"`** na nav: o único momento de motion compartilhado do app, e é exatamente o padrão a generalizar.
- **Trio de anéis com sparkline de 7 dias** embaixo: a ideia é forte; a execução é que precisa de refino.
- **Dark theme de base fria** (`220 20% 4%`) com verde 142: identidade sólida, reconhecível, apropriada ao contexto (app consultado de manhã cedo e à noite).

---

## 2 · Tese de design: **instrumento, não dashboard**

Todo app de recovery genérico parece um *dashboard*: grade de cards, cada um gritando um número. O Reck tem outra natureza — o nome vem de *reckoning*, acerto de contas. A metáfora certa é **instrumento de medição**: um bom instrumento (relógio de mergulho, altímetro, multímetro de bancada) tem UMA leitura dominante, escala com marcações que dão significado ao número, e zero decoração que não seja informação.

Três consequências práticas dessa tese:

**A. O número nunca aparece sem sua escala.** Hoje o anel de Recovery mostra 68 sobre um arco — mas 68 é bom? O usuário precisa lembrar dos limiares (42/70). Um instrumento grava as marcas no mostrador. → O anel passa a ter **ticks de zona** nos pontos 42 e 70 do arco, e um **marcador de baseline** (a média 7d do próprio usuário) posicionado no arco. O score deixa de ser um número solto e vira uma leitura contra a própria régua — a materialização visual do princípio "relativo ao próprio usuário, não à pessoa média".

**B. Decoração que não informa é ruído (design anti-placebo).** O mesmo gate que mata um insight sem p-valor mata um efeito visual sem função. Starfield: fora. Bloom colorido pelo estado do dia: fica (é informação ambiente — o card "respira" a cor do veredito). Hairline de luz nos cards: fica, mas como única técnica de elevação.

**C. Um momento de cerimônia por dia, quietude no resto.** O gasto de "ousadia" do design inteiro se concentra num único lugar: a **revelação matinal** — quando a Today abre com check-in feito, o arco desenha, o número conta de 0 ao score, os ticks de zona acendem, o marcador de baseline desliza para a posição. Dura ~1,2s, acontece uma vez, e depois a tela fica absolutamente estática. Todo o resto do app anima com discrição funcional. É o "acerto de contas" encenado — a assinatura do produto.

---

## 3 · Sistema de design refinado

### 3.1 Cor — uma fonte de verdade

**O que muda:** a paleta crua do Tailwind (`emerald-*`, `yellow-*`, `red-*`…) e os ~80 `hsl()` literais são substituídos por **aliases semânticos** no `index.css`, e as classes utilitárias passam a referenciar só tokens.

```css
/* Zonas fisiológicas (a régua do instrumento) */
--zone-green:  142 70% 50%;   /* = primary. Verde é A marca */
--zone-yellow:  45 93% 58%;
--zone-red:      0 72% 55%;

/* Domínios (identidade de cada métrica, usada em anel, chart e tint) */
--domain-recovery: var(--zone-green);
--domain-sleep:   205 88% 58%;
--domain-strain:   35 90% 55%;

/* Saúde (monitor) */
--health-amber:   38 92% 55%;   /* agudo */
--health-red:     var(--zone-red); /* sustentado */

/* Estrutura do instrumento */
--gauge-track: 215 25% 16%;    /* trilho dos anéis — hoje é literal hardcoded */
```

**Regra de disciplina:** página nenhuma usa cor que não seja token. `emerald-400` vira `text-[hsl(var(--zone-green))]` — ou melhor, classes utilitárias registradas no Tailwind config (`text-zone-green`), o que mantém o formato Localize/Substitua trivial.

**Por quê:** hoje existem pelo menos três verdes diferentes significando "bom" (token 142/70/50, `emerald-400` ≈ 152/76/64, `emerald-500`). O olho não nomeia isso, mas registra como imprecisão. Uma fonte de verdade também destrava tematização futura (o anel R10 pode ganhar tema próprio sem caçar 400 literais).

**Impacto:** consistência imediata em todas as telas; percepção de "produto de uma mão só". **Prioridade: ALTA** (é a fundação de todo o resto e é 90% find-and-replace mecânico — ideal para o formato de patch do projeto).

### 3.2 Tipografia — a régua de 6 tamanhos

**O que muda:** os 264 tamanhos arbitrários em pixel colapsam numa escala fechada. Inter continua sendo a voz; JetBrains Mono vira lei para **todo dado numérico**, com `font-feature-settings: "tnum"` (números tabulares — dígitos de mesma largura, essencial para colunas de histórico e contadores animados que não "dançam").

| Papel | Classe | Spec | Substitui |
|---|---|---|---|
| Display (score do herói) | `text-display` | Mono 56px/1 · peso 600 · tnum | `text-3xl font-black font-mono` do MiniRing |
| Título de tela | `text-title` | Inter 22px · 800 · tracking-tight | `text-2xl font-black` |
| Título de card | `text-heading` | Inter 15px · 650 | `text-sm/text-base font-semibold` variados |
| Corpo | `text-body` | Inter 14px/1.5 · 400 | `text-sm` + `text-[13px]` |
| Suporte | `text-support` | Inter 12px/1.45 · 450 | `text-[11px]`, `text-[12px]` |
| Label técnico | `text-micro` | Mono 11px · 500 · uppercase · tracking `0.08em` | `text-[10px] font-bold uppercase tracking-wider` (155 ocorrências) e tudo abaixo |

**Piso absoluto: 11px, e só em labels mono uppercase.** Nada de 10, 9, 7px. Texto que hoje está em 10px ou sobe para `text-support`, ou — pergunta honesta — não merecia estar na tela.

**Por quê:** hierarquia nasce de contraste de tamanho. Com 155 elementos em 10px, o app inteiro sussurra e o olho não sabe onde pousar. Passar labels técnicos para *mono uppercase* 11px (em vez de Inter bold 10px) reforça a tese do instrumento: mono para o que a máquina mede, Inter para o que o app *diz*. Essa divisão mono/humanista vira parte da identidade.

**Impacto:** o maior salto isolado de qualidade percebida do plano inteiro. Legibilidade real no iPhone (contexto de uso: de manhã, recém-acordado). **Prioridade: ALTA.**

### 3.3 Raio, espaçamento e elevação — três de cada

**Raio (3 valores + pill):**
- `--radius-card: 20px` — cards e superfícies (substitui a mistura xl/2xl/3xl)
- `--radius-control: 12px` — botões, inputs, chips retangulares
- `--radius-inner: 8px` — elementos aninhados dentro de cards (regra: raio interno < raio externo, sempre)
- `rounded-full` — só pills de status e dots

**Espaçamento (grade de 4pt com três ritmos):**
- Dentro do card: padding fixo `20px` (`p-5`), gap interno `12px`
- Entre cards: `12px` sempre — o feed da Today vira um ritmo constante, não o atual vai-e-vem
- Entre seções (título de grupo → grupo): `28px`

**Elevação (uma técnica só):** a hairline de luz no topo + sombra suave que já existe no `.bg-card` é boa e vira a *única* forma de elevação. Remover bordas duplicadas (`border-border/40` + `/60` variados) — a regra passa a ser: superfície = hairline; destaque de estado = borda colorida do token de estado; nunca os dois.

**Por quê:** o olho humano detecta variação de raio e gap mesmo sem nomear. Três valores decorados = qualquer patch futuro nasce consistente sem esforço.

**Impacto:** médio por tela, enorme no agregado — é o que separa "app bonito" de "app caro". **Prioridade: ALTA** (raio e gap entre cards), **MÉDIA** (varredura fina de paddings internos).

### 3.4 Iconografia — aposentar os emojis

**O que muda:** os 46 emojis da UI são substituídos por lucide-react (já é dependência) em tamanho fixo `16px`, stroke `1.75`, sempre na cor do contexto (`muted-foreground` em repouso, token de domínio quando ativo). O `CheckinStep` troca a prop `emoji` por `icon`.

Mapeamento direto: 🔥→`Flame`, 🌙→`Moon`, 🧠→`Brain`, 📝→`PenLine`, 🏋️→`Dumbbell`, ⚡→`Zap`, 😴→`BedDouble`, 🚨→ (nenhum ícone — alerta sustentado usa cor e peso tipográfico, não sirene).

**Por quê:** emoji tem renderização inconsistente (iOS vs. Android vs. desktop), paleta própria que briga com a da marca, e é talvez o "cheiro de protótipo" mais forte que restou. Um app que se apresenta como instrumento de medição não decora alertas de saúde com 🚨.

**Impacto:** alto na percepção de seriedade, custo baixo (busca-e-troca). **Prioridade: ALTA.**

### 3.5 Motion — três durações, duas físicas, uma cerimônia

**Tokens (CSS vars + constantes JS num `motion-tokens.js` importável):**

| Token | Valor | Uso |
|---|---|---|
| `fast` | 150ms · ease-out | hover, toggle, chip, rotação de chevron |
| `base` | 260ms · cubic-bezier(0.32, 0.72, 0, 1) | entrada/saída de cards, colapsáveis, sheets |
| `reveal` | 1.100ms · ease-out | **só** a cerimônia matinal do herói |
| spring padrão | `{ type:'spring', bounce:0.15, duration:0.5 }` | tudo que usa `layoutId` |

**Regras:**
1. Entrada de página: os cards NÃO fazem mais stagger individual com delays somados (hoje: `delay={0.05/0.1/0.15/0.2}` no check-in). Uma única animação de container (fade + 8px de subida, `base`) — o conteúdo chega junto, como uma tela pronta, não como peças caindo.
2. `AnimatePresence` no nível do `Outlet` para transição entre abas: crossfade rápido (120ms out / 180ms in) com 6px de deslize na direção da aba (ir para a direita na nav = conteúdo entra da direita). Sutil, mas conecta a nav ao conteúdo.
3. **Contagem do score:** o número do herói conta de 0 ao valor em sincronia com o desenho do arco (mesma curva de easing — hoje o arco anima em 1s e o número simplesmente aparece). `tnum` garante que a contagem não trema.
4. `prefers-reduced-motion`: cerimônia vira aparição estática; transições viram fade puro. Hoje não há tratamento nenhum.

**Por quê:** motion hoje existe em quantidade certa mas sem assinatura. Concentrar a expressividade na revelação matinal cria o momento memorável; padronizar o resto elimina a sensação de "montado".

**Impacto:** alto na percepção de fluidez e craft. **Prioridade: MÉDIA** (tokens + herói primeiro; transição de rota depois).

---

## 4 · Arquitetura de layout — tela a tela

### 4.1 Hoje — o mostrador do instrumento

A Today é onde a tese vive ou morre. Redesenho do herói em três movimentos:

**(1) Recovery vira o mostrador dominante.** Hoje os três anéis têm o mesmo tamanho (104px) na mesma linha — três leituras competindo. Passa a: **um anel de Recovery de ~150px centralizado**, com Sono e Strain como **satélites de ~76px** flanqueando abaixo. A hierarquia visual passa a espelhar a hierarquia de decisão (Recovery É a decisão; sono e strain explicam).

```
        ┌──────────────────────────────┐
        │  DECISÃO DE HOJE      [zona] │
        │  "Treino leve, proteja..."   │
        │                              │
        │         ╭──────╮             │
        │        │   68   │  ← ticks de│
        │        │ ▲base  │    zona 42 │
        │         ╰──────╯     e 70 no │
        │      RECOVERY        arco    │
        │                              │
        │   ╭──╮            ╭──╮       │
        │  │82 │           │ 9 │       │
        │   ╰──╯            ╰──╯       │
        │   SONO           STRAIN      │
        │  ~ sparkline 7d ~            │
        └──────────────────────────────┘
```

**(2) O anel ganha a régua.** Ticks discretos nos pontos 42% e 70% do arco (as fronteiras de zona reais do `getZone`) e um marcador triangular pequeno na posição da média 7d do usuário. Ler "68, acima da minha base, a 2 pontos do verde" num relance — sem texto. Nenhum concorrente faz isso; é assinatura visual que nasce direto do princípio "relativo a si mesmo".

**(3) Atmosfera informativa, não decorativa.** Starfield removido. O bloom radial fica, mas mais tímido (opacidade ~0.12) e estritamente na cor da zona do dia — o card inteiro "amanhece" verde, âmbar ou vermelho. Em calibração, sem bloom: a ausência de cor também é informação.

**Feed abaixo do herói:** o `priorityEngine` já ordena bem. O refino é de ritmo: gap constante de 12px, e o colapsável "Seu dia completo" (`SecondaryMetrics`) ganha o mesmo tratamento de linha discreta da "✓ Sinais vitais" — as coisas secundárias formam uma zona visualmente mais quieta (sem cards de borda cheia; linhas divididas por hairline).

**Prioridade: ALTA** (herói), **MÉDIA** (zona quieta do feed).

### 4.2 Check-in — de formulário a ritual rápido

O check-in é a ação mais frequente do app (diária) e hoje é um formulário longo de cards empilhados com cabeçalhos de emoji. Princípios do redesenho:

- **Uma pergunta dominante por vez visualmente** — manter a página única (rolagem é mais rápida que wizard para usuário experiente), mas cada `CheckinStep` vira uma seção com título `text-heading` + ícone lucide, e os campos crescem: sliders com thumb de 28px, área de toque ≥44px, valor corrente em mono grande ao lado do slider.
- **O teclado numérico primeiro.** HRV, RHR e horas de sono são os campos críticos e vêm do Zepp — inputs numéricos grandes (mono, 22px), `inputmode="decimal"`, agrupados no topo. O resto (subjetivo) vem depois.
- **LivePreview promovido:** o preview do score que já existe vira uma barra fixa no rodapé durante o preenchimento — o instrumento reagindo em tempo real ao dado inserido. É o momento mais "vivo" do app e hoje está enterrado.
- Remoção do stagger de entrada (§3.5) — o formulário aparece pronto.

**Prioridade: MÉDIA** (a estrutura funciona; é refino de craft e velocidade).

### 4.3 Padrões (Insights) — de mural a editorial

1.451 linhas, 19 variantes de card, e a maior densidade de `text-[10px]` do app (as 155 ocorrências se concentram aqui). O problema não é conteúdo — é que tudo tem o mesmo peso.

**Estrutura editorial em três camadas:**
1. **Manchete** — UMA descoberta principal (a de maior |r| válido que passou no gate), em card grande com a correlação visualizada (scatter mínimo ou barras pareadas), efeito em linguagem de ação.
2. **Evidências** — descobertas secundárias como lista editorial: linha por descoberta, valor em mono, sem card individual (hairline entre linhas).
3. **Silêncios honestos** — a seção que assume o que NÃO passou no gate ("Testei carga→recovery: r=+0,17, não significativo — não vou te mostrar isso como padrão"). Já existe em espírito no produto; ganhar uma casa fixa transforma o rigor estatístico em feature visível de marca.

**Prioridade: MÉDIA-ALTA** (é a tela com maior distância entre potencial e execução).

### 4.4 Tendências — um idioma de gráfico

Recharts fica, mas com um **theme único exportado** (`chart-theme.js`): grid `hsl(var(--border))` tracejado só horizontal, eixos em `text-micro` mono, tooltip único (o `tooltipStyle` hardcoded vira token), área com gradiente do domínio a 12%→0%, linha 2px, dot só no hover. Linhas de referência nas fronteiras de zona (42/70) em todo gráfico de score — a régua do instrumento perseguindo o usuário por todas as telas.

**Prioridade: MÉDIA.**

### 4.5 Histórico — a coluna de registros

A metáfora certa: **livro de registros** (logbook). Cada dia vira uma linha de altura fixa: data em mono, dot da zona, score em mono tabular alinhado à direita, strain como barra fina. Semana agrupada por hairline, não por card. O `DayDetailSheet` que já existe ganha transição conectada: o dot da zona da linha expande para o header do sheet via `layoutId` — a continuidade lista→detalhe mais barata e mais eficaz do plano.

**Prioridade: MÉDIA.**

### 4.6 Saúde — já é o padrão-ouro; formalizar

A página `/saude` (blocos A–E, rodapé de honestidade, slots dormentes cinza) é a tela mais disciplinada do app. Ação: nenhum redesenho — apenas migrar para os tokens novos e usar sua gramática (SectionHeader, linhas de vitais, direção com seta) como **referência canônica** para refatorar as outras telas. O bloco B (vital · hoje · base · seta) é exatamente o padrão de "leitura contra a própria régua" que o resto do app deve adotar.

**Prioridade: BAIXA** (só varredura de tokens).

### 4.7 Navegação e transições

- Bottom nav mantém as 5 abas. Refinos: o botão primário de Check-in ganha o único uso de `--zone-green` sólido da nav (destino primário do dia); ícones 22px; label em `text-micro`.
- Header: hoje o header mostra "Reck" e cada página repete um `<h1>` próprio. Passa a: o título da página vive no header (crossfade ao trocar de aba), liberando ~60px de altura útil em toda tela. O logo recolhe para só o símbolo.
- Transição entre abas: deslize direcional sutil (§3.5, regra 2).
- Health continua fora do menu, acessível por tap — com a transição do card âmbar/vermelho expandindo para a página (layoutId no container do card).

**Prioridade: MÉDIA.**

---

## 5 · Taxonomia de componentes

O rebuild extrai dos monólitos um vocabulário fechado de componentes (arquivos novos via GitHub — permitido no fluxo atual):

| Componente | Substitui | Regra |
|---|---|---|
| `Gauge` (`ui-bio/`) | `MiniRing` inline da Today + anéis do check-in preview | Único anel do app. Props: `value, max, domain, size, showZoneTicks, baselineMark, trend`. Ticks e marcador de baseline nascem aqui |
| `Card` de 3 tipos | 19 variantes do Insights + cards ad-hoc | **Decisão** (borda de estado + bloom), **Leitura** (superfície padrão + dado mono), **Nota** (sem borda, fundo `secondary/50`, texto `support`) — todo conteúdo do app cabe num dos três |
| `MetricRow` | linhas de vitais da Saúde + métricas secundárias da Today + linhas do Histórico | label mono à esquerda · valor tabular à direita · delta com seta direcional |
| `ZoneBadge` | ~10 implementações de pill de zona espalhadas | pill `rounded-full`, cor por token de zona |
| `SectionHeader` | o da Health.jsx, promovido a global | `text-micro` mono |
| `chart-theme.js` | estilos recharts locais de Trends/Insights | tema único |
| `Sparkline` | polyline inline do MiniRing | extraído, reutilizável no Histórico |

Junto com isso, a limpeza já mapeada no backlog (40 primitivas shadcn não usadas — Bucket B) deixa `ui/` com só o que o sistema referencia. Componente que não existe não vaza padrão estranho.

**Prioridade: ALTA** (Gauge + Card, porque destravam o herói), **MÉDIA** (resto).

---

## 6 · Responsividade

O app é mobile-first com `max-w-2xl` — correto para o uso real (iPhone de manhã). Regras para não degradar em desktop:

- ≤ 640px: coluna única, como hoje.
- ≥ 1024px (uso ocasional em desktop): **não** esticar cards. Duas colunas apenas em Tendências e Padrões (gráficos à esquerda 2/3, leituras à direita 1/3); Hoje permanece coluna única centrada com o herói maior (Gauge 180px) — um instrumento não vira planilha por ter espaço.
- Áreas de toque ≥ 44px em todos os controles (auditoria atual: vários chips de 24–28px de altura).

**Prioridade: BAIXA-MÉDIA.**

---

## 7 · Acessibilidade como qualidade percebida

- **Contraste:** `--muted-foreground` a 50% de luminância sobre fundo 4% passa AA para texto grande mas raspa em 11–12px. Subir para `215 15% 58%`. Com o fim do 10px, o app inteiro volta a AA.
- **`prefers-reduced-motion`** respeitado (§3.5).
- **Foco visível:** anel de foco `--ring` já existe nos tokens; garantir que os botões custom (chips, steps) não o suprimem.
- **Cor nunca sozinha:** as zonas já vêm acompanhadas de texto ("Verde/Amarelo/Vermelho", faixas) — manter como regra escrita.

**Prioridade: ALTA** (contraste — vem de graça com a tipografia), **MÉDIA** (resto).

---

## 8 · Priorização e sequência de execução

Ordenada para o fluxo real do projeto (patches Localize/Substitua via GitHub, Base44 sincroniza, publicação manual). Cada onda deixa o app publicável.

| # | Entrega | Impacto na percepção | Esforço | Prioridade |
|---|---|---|---|---|
| 1 | **Fundação de tokens**: aliases de cor semânticos + escala tipográfica + 3 raios no `index.css`/`tailwind.config` | Não visível sozinho, mas destrava tudo | Baixo (1 arquivo + config) | **ALTA** |
| 2 | **Varredura tipográfica**: matar `text-[10px]`/`[9px]`/`[7px]`, aplicar a escala; labels → mono uppercase | O maior salto isolado de qualidade | Médio (mecânico, por arquivo) | **ALTA** |
| 3 | **Emojis → lucide** (inclui contrato do `CheckinStep`) | Alto — fim do "cheiro de protótipo" | Baixo | **ALTA** |
| 4 | **`Gauge` + herói da Today**: mostrador dominante, ticks de zona, marcador de baseline, cerimônia de contagem, starfield fora | A assinatura do produto | Médio-alto | **ALTA** |
| 5 | **Varredura de cor**: paleta crua → tokens (127 emerald etc.) | Consistência silenciosa | Médio (mecânico) | **ALTA** |
| 6 | **Padrões editorial**: manchete + evidências + silêncios honestos | Transforma a tela mais fraca | Alto | **MÉDIA-ALTA** |
| 7 | **Motion tokens + transição de rota + reduced-motion** | Fluidez conectada | Médio | **MÉDIA** |
| 8 | **Check-in refinado**: inputs grandes, LivePreview fixo, fim do stagger | Ritual diário mais rápido e digno | Médio | **MÉDIA** |
| 9 | **Histórico logbook + layoutId lista→detalhe** | Craft perceptível | Médio | **MÉDIA** |
| 10 | **chart-theme.js + réguas de zona nos gráficos** | Idioma visual único | Baixo-médio | **MÉDIA** |
| 11 | **Header contextual + refinos de nav** | Espaço útil + polimento | Baixo | **MÉDIA** |
| 12 | **Duas colunas desktop (Tendências/Padrões)** | Ocasional | Médio | **BAIXA** |
| 13 | **Limpeza shadcn (Bucket B) + varredura fina de spacing** | Higiene | Baixo | **BAIXA** |

Interação com o backlog técnico existente: a onda 4 é o momento natural de extrair `MiniRing`→`Gauge` e, junto, resolver o problema já mapeado de componentes definidos dentro do corpo da `Today` (`ExecutionCard`, `CollapsibleHint`) — mesmo patch, dois ganhos.

---

## 9 · Princípios permanentes (para todo desenvolvimento futuro)

1. **Design anti-placebo.** Todo elemento visual precisa passar no mesmo gate dos insights: *que informação isso adiciona?* Decoração sem resposta é o starfield — corta.
2. **O número nunca sem a régua.** Score, HRV, strain: sempre com zona, baseline ou delta visível. Valor absoluto solto é meia-verdade visual.
3. **Mono mede, Inter fala.** Dados em JetBrains Mono tabular; linguagem em Inter. A divisão é a identidade.
4. **Silêncio é um estado de primeira classe.** Estado normal = presença mínima; calibração = ausência declarada; alerta = raro e portanto crível. Nunca preencher tela vazia com conteúdo fabricado.
5. **Uma cerimônia por dia.** A expressividade de motion vive na revelação matinal; todo o resto é funcional e discreto.
6. **Três de cada.** 3 raios, 3 durações, 3 tipos de card, 6 tamanhos de tipo. Precisar de um quarto é sinal de que o problema está mal formulado.
7. **Token ou nada.** Cor, tamanho, raio ou duração literal em página é bug de design, mesmo quando "parece igual".
8. **O padrão-ouro é a página Saúde.** Em dúvida sobre como apresentar um dado, perguntar: como o bloco B da /saude faria?

## 10 · O que este plano NÃO muda (DNA protegido)

- Voz e copy em pt-BR — intocadas, são o maior ativo.
- Arquitetura de 5 abas e papéis de tela.
- Dark theme frio + verde 142 como marca.
- Inter + JetBrains Mono (o refino é de disciplina, não de troca).
- Fórmulas, engines, gates estatísticos, priorityEngine — nenhuma linha de lógica.
- Health Monitor Fase 0 — vira referência, não alvo.
- O princípio de que o app pode ficar em silêncio.

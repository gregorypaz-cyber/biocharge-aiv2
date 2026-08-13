# Reck — Identidade de Marca

> Documento-fonte da marca. Toda decisão de nome, logo, cor, tipografia, copy e tom volta aqui.
> Mora ao lado do `CONTEXT.md` (o guardrail técnico). Este é o guardrail da marca.
>
> **Hierarquia de verdade:** `código` > `BRAND.md` > todo o resto. Se este arquivo divergir do
> que está em `src/index.css`, `tailwind.config.js` ou `biocharge-utils.js`, **o código ganha** —
> e este arquivo é que está com defeito. Auditado contra o `main` em 26/07/2026.

---

## O nome

**Reck.** De *reckon* — calcular, avaliar, concluir a partir da leitura.
É o verbo do app: ele lê seus sinais e chega a uma conclusão honesta.
Uma sílaba, consoante seca, sem hype. Fora do léxico bio/charge/vital.

Pronúncia: "réqui". Sempre com R maiúsculo, resto minúsculo: **Reck**.

---

## A essência

- **Frase de uma linha:** "Reck lê seus sinais e te diz a verdade sobre sua recuperação — pra você decidir certo hoje."
- **Promessa:** honestidade sobre prontidão. Só afirma o que os dados sustentam; admite quando não sabe; calibrado em você, não numa média.
- **Inimigo:** o placebo. Número bonito que não muda decisão.
- **Pergunta que responde todo dia:** "O que eu faço hoje?"

## Princípios de marca

1. Só afirmar o que os dados sustentam.
2. Calibrar em você, não na média populacional.
3. Conectar todo número a uma decisão (ou ao silêncio honesto).
4. Admitir incerteza em vez de fabricar certeza.
5. Portabilidade: funciona a partir de sinais crus, não de um número proprietário.

## Personalidade (como Reck fala)

Treinador direto, calmo, preciso. Confiante mas humilde — diz "não sei ainda" quando é verdade.
Anti-hype. Nunca promete energia mística, nunca infla. Fala como um colega experiente que
respeita a inteligência de quem usa.

| Diz | Não diz |
|---|---|
| "Calibrando" · "—" | um score inventado pra preencher a tela |
| "Sinais um pouco fora do teu padrão" | "Alerta! Seu corpo está em perigo!" |
| "Pode ser só a noite curta (4,3h de sono)." | "Você precisa descansar mais!" |
| "Observe hoje — se persistir amanhã, eu aviso." | "Recomendamos consultar um especialista." |
| "Nenhum desvio registrado." | esconder o vazio com um card genérico |

Português do Brasil, segunda pessoa ("você" / "teu"), frase curta. Sem emoji no chrome.
Sem exclamação, salvo em alerta agudo real.

---

# Identidade visual

## 1. Paleta (fonte: `src/index.css`)

Os **tokens HSL são canônicos**. O hex é derivado, para contextos que não aceitam CSS
(manifest, lojas, exportação de arte). Nunca amostrar cor de screenshot.

### Superfícies e texto
| Token | HSL | Hex | Papel |
|---|---|---|---|
| `--background` | `hsl(220 20% 4%)` | `#080A0C` | Fundo · foco e calma |
| `--card` | `hsl(220 18% 7%)` | `#0F1115` | Superfície de card |
| `--secondary` / `--muted` | `hsl(220 15% 12%)` | `#1A1D23` | 3ª camada — elemento interno **sobe**, nunca afunda pro fundo |
| `--border` / `--input` | `hsl(220 15% 14%)` | `#1E2229` | Hairline de separação |
| `--foreground` | `hsl(210 40% 96%)` | `#F1F5F9` | Texto primário (branco-gelo) |
| `--muted-foreground` | `hsl(215 14% 62%)` | `#919CAC` | Texto secundário e todo o chrome |

### Sinal
| Token | HSL | Hex | Papel |
|---|---|---|---|
| `--primary` / `--bio-green` | `hsl(142 70% 50%)` | `#26D968` | **Verde de marca** |
| `--bio-yellow` (`zone-amber`) | `hsl(45 72% 58%)` | `#E1BA47` | Âmbar (dessaturado na T1 — era 93%, vibrava no escuro) |
| `--bio-red` / `--destructive` | `hsl(0 72% 55%)` | `#DF3A3A` | Vermelho |
| `--bio-orange` | `hsl(25 70% 55%)` | `#DD7F3C` | Laranja — alerta **fora** da gramática de zona (dessaturado na T1 — era 90%) |
| `--bio-blue` | `hsl(200 80% 55%)` | `#30ABE8` | Azul — domínio sono |
| `--bio-purple` | `hsl(280 65% 60%)` | `#AF57DB` | Roxo — domínio auxiliar |

> `theme-color` do `index.html` e do manifest usa `#080A0D` — arredondamento de 1/255 sobre
> `--background`. Diferença invisível; mantida por já estar publicada.

**Sintaxe obrigatória:** `hsl(H S% L% / alpha)`. **Nunca `color-mix()`** (quebra no Safari/iOS).
Camada SVG mantém `hsl()` inline — **não** tokenizar em atributo de apresentação (o iOS lê mal
`var()` em atributo SVG).

## 2. Gramática de cor (a regra que mais governa trabalho)

Cor aqui **carrega significado**, não decora. Verde gasto em número neutro rouba o significado
do verde.

| Cor | Significa | Onde é legítimo |
|---|---|---|
| **Verde** | marca · CTA · herói · **zona de recovery ≥ 70** · delta positivo | logo, FAB, botão primário, gema quando ≥70 |
| **Âmbar** | **zona 42–69** · desvio de tendência · linguagem investigativa | gema 42–69, Monitor em estado `acute`, banda ideal de ACWR |
| **Vermelho** | **zona < 42** · alerta agudo sustentado | gema <42, Monitor em `sustained` |
| **Laranja** | alerta que **não** é zona de recovery | banner, faixa de strain |
| **Azul / roxo** | rótulo de domínio (sono, auxiliar) | satélites, gráficos |
| **Cinza** | todo o chrome: label, ícone neutro, eixo | em toda parte |

**Fonte única, inegociável:** cor de zona sai de `getZone()` → `getZoneColor()` (SVG) e
`getZoneClasses()` (classe), em `src/lib/biocharge-utils.js`. Cortes em `ZONE_GREEN_MIN = 70` e
`ZONE_YELLOW_MIN = 42` (`physio-constants.js`). **Nunca reescrever `>=70 / >=42` na tela** — foi
assim que o app chegou a ter 4 definições diferentes das mesmas 3 zonas.

> **Sangramento de zona na membrana (sancionado 29/07/2026).** A cor de zona pode tingir uma
> superfície grande — o bloom no topo da Today que dá "temperatura" ao dia — *desde que*: (1) seja
> a MESMA fonte única (`getZoneColor(getZone(...))`), nunca uma cor escolhida à mão; (2) opacidade
> baixíssima (~0,13), dissolvendo no `--background`; (3) só quando há zona — calibrando = sem tint
> (§8). Não é "verde gasto em decoração": o tint **é** a leitura do dia. Fora disso, a regra de
> não espalhar cor de zona por chrome segue valendo.

Estado de calibração **não tem cor**: slate neutro + `—`. Cor implica leitura; sem dado, não há
leitura.

## 3. Tipografia

| Papel | Fonte | Pesos disponíveis |
|---|---|---|
| Interface | **Inter** variável | `100..900` (eixo `wght` contínuo) |
| Dado / número monoespaçado | **JetBrains Mono** | **`400`, `500`, `600` — e só** |

⚠️ **JetBrains Mono não tem 700+ carregado.** Pedir `font-bold`/`font-black` num elemento
`font-mono` faz o navegador **sintetizar** o negrito e borrar o glifo. Teto: `font-semibold`.

### Escala fechada (`src/index.css`)
| Classe | Tamanho | Uso |
|---|---|---|
| `.t-display` | 40px | número-herói, marco isolado |
| `.t-hero` | 30px | título grande de tela-índice (large title, estilo HIG) |
| `.t-title` | 21px | título de seção grande / subtítulo de página |
| `.t-section` | 17px | título de seção e de card |
| `.t-body` | 15px | texto corrido |
| `.t-caption` | 13px | apoio |
| `.t-micro` | 11px | rótulo, unidade, legenda — **piso absoluto** |

> **`.t-hero` (adicionado 29/07/2026).** Fecha o vão que a escala tinha entre o número-herói
> (`t-display`, 40px, reservado à gema) e o título (`t-title`, 21px): não havia um degrau de
> "large title de página", então os H1 das telas-índice ficavam subdimensionados (ou fugiam pra
> `text-2xl` arbitrário). **Não é abrir a porta pra tamanho livre — é nomear UM degrau que
> faltava.** Uso restrito ao H1 das quatro telas-índice (Hoje, Padrões, Tendências, Histórico),
> em lockup editorial com o kicker de data em `t-micro` caps.

Fora da escala só sobrevivem `text-sm` (14px) e `text-xs` (12px), que já são degraus legítimos
do Tailwind. **Tamanho arbitrário (`text-[13px]`) é dívida** — não introduzir.

**11px é o piso.** Exceção única: rótulo da tab bar, a 10px (é a medida da Apple).

### Regras
- **Hierarquia por tamanho + tracking negativo, nunca por peso 900.** Peso 900 em UI é grito.
- As classes `.t-*` declaram só o mínimo (tamanho; e leading/tracking nos degraus grandes)
  porque vencem utilitário Tailwind na cascata. **Peso é sempre utilitário** (`font-*`).
- Todo número que atualiza leva `.num` (tabular) se for Inter. JetBrains Mono já é tabular.
- Número-herói usa peso variável atrelado ao valor (fino = frágil, robusto = alto) — a
  tipografia carrega significado, igual a cor.

## 4. Material e profundidade

**Profundidade vem de LUZ, não de sombra chapada.** Fundo quase-preto não comporta sombra
projetada: ela vira mancha. O que dá volume é hairline de luz, vidro e gradiente interno.

| Camada | Receita | Onde |
|---|---|---|
| Card | hairline `inset 0 1px 0 hsl(0 0% 100% / 0.06)` + gradiente de topo + `0 1px 3px` mínimo | `.bg-card` |
| Barra (header/nav) | vidro em 3 camadas: `blur(24px) saturate(180%)` → sólido sem `backdrop-filter` → sólido em *Reduzir Transparência* | `.glass-bar`, `.glass-bar-strong` |
| Folha modal | elevação acima de card: `0 24px 60px -12px hsl(0 0% 0% / 0.70)` + grabber 36×5 | `.sheet-surface` |
| Herói / FAB | física de vidro: núcleo luminoso deslocado, borda escura saturada, Fresnel, specular | `RecoveryField`, FAB |

**Proibido:** `drop-shadow` genérico como elevação, borda grossa, relevo skeuomórfico, brilho
saturado chapado. Presença se conquista por **material**, não por saturação.

**Toda camada de vidro precisa de fallback** — sem suporte a `backdrop-filter`, um `/75` vira véu
sem blur e o conteúdo atravessa a barra. Isso é bug de legibilidade, não de estética.

**Respeitar `prefers-reduced-motion` e `prefers-reduced-transparency`.** Sempre.

## 5. Ícones

**Lucide**, exclusivamente. Stroke 2 (2.5 no FAB). Emoji **não** é ícone: onde ele existe nos
dados (`DOMAIN_OF`, seletor de humor) é *input intencional do usuário*, mapeado para Lucide no
render. Emoji nunca aparece em chrome, label ou navegação.

## 6. O símbolo

A marca é a **gema** — o herói do produto (o campo de luz do Recovery) virado ícone. O anel de
progresso foi aposentado com o redesign de 10/07/2026: não existe mais anel no produto, então
não pode existir anel na marca.

**Ícone de app** — tile full-bleed, gradiente verde, R branco-gelo em traço arredondado:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="reckTile" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#3BE785"/>
      <stop offset="0.52" stop-color="#26D968"/>
      <stop offset="1" stop-color="#0C8B4C"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#reckTile)"/>
  <g transform="translate(7 7) scale(0.86)" fill="none" stroke="#ffffff"
     stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
    <path d="M30 22 V78"/>
    <path d="M30 22 H53 A14 14 0 0 1 53 50 H30"/>
    <path d="M44 50 L58 78 L70 55"/>
  </g>
</svg>
```

O R é **forma vetorial**, nunca fonte instalada — regra de ouro de logo.

### Variantes
| Variante | Recorte | Onde |
|---|---|---|
| **Full-bleed** | sem `rx`, glifo a `scale(0.86)` | `apple-touch-icon.png`, `icon-192/512`, loja |
| **Tile arredondado** | `rx="23"`, glifo a `scale(0.78)` | favicon, logo do header |
| **Gema** | blob orgânico com física de vidro | FAB do check-in |
| **Mono branco / mono preto** | glifo sólido, sem gradiente | impressão, fundo de foto |

### Regras de uso
- Ícone de app: **sem cantos arredondados e sem canal alfa.** O iOS aplica o próprio squircle
  (canto arredondado vira canto duplo) e pinta transparência de preto.
- Zona segura `maskable`: o glifo cabe num círculo de **71%** de diâmetro — dentro dos 80%
  exigidos. Não aumentar sem refazer a conta.
- Espaço livre ao redor = metade da altura do R.
- Tamanho mínimo: **24px**. Abaixo disso, tile sem o R.
- Não trocar o verde, não inclinar, não adicionar sombra externa, não ressuscitar o anel.

## 7. Wordmark

"Reck" em **Inter 700**, `letter-spacing: -0.02em`, 15px no header. R maiúsculo, resto minúsculo.
O lockup é **ícone + wordmark**, com o espaço livre da §6.

---

## 8. Honestidade como elemento de marca

A honestidade não é só copy — ela tem forma visual, e a forma é **a ausência**.

- Sem dado maduro: slate neutro + `—` + a palavra "Calibrando". **Nunca** um número.
- Sem desvio no histórico: "Nenhum desvio registrado." O vazio é o resultado, não uma falha
  a esconder com card genérico.
- Nada de UI para dado que não existe: interface para sinal inexistente é exatamente o que a
  tese anti-placebo proíbe.
- Insight só aparece depois do gate (`|r| ≥ 0.35`, `p ≤ 0.05`, `n ≥ 8`). **Silêncio > sinal
  fabricado.**

Toda tela nova responde: *"se eu não tiver dado suficiente, o que aparece aqui?"* Se a resposta
for "um valor padrão", a tela está errada.

---

## 9. Revogações (rastreabilidade)

O que este arquivo **substitui** da versão anterior, e por quê:

| Regra revogada | Substituída por | Motivo |
|---|---|---|
| Símbolo = anel esmeralda com R | Gema / tile (§6) | O anel de progresso saiu do produto em 10/07/2026 |
| Wordmark em Nunito ou Quicksand ExtraBold | Inter 700 (§7) | O app nunca carregou essas fontes; Inter é a única UI |
| "Não adicionar sombra/relevo" | Profundidade por luz (§4) | Regra virou proibição de *sombra chapada*; hairline, vidro e gema são a linguagem desde 10/07 |
| Paleta de 4 cores com hex aproximado | 12 tokens HSL canônicos (§1) | Hex do doc antigo divergia do token real (ex.: `#EEF3F8` vs `#F1F5F9`) |
| Silêncio sobre tipografia | Escala fechada + teto do mono (§3) | Fechado no Bloco 2 (26/07/2026) |
| Silêncio sobre semântica de cor | Gramática de zona (§2) | Origem de 4 definições divergentes das mesmas 3 zonas |

---

## Nota de marca (não é parecer jurídico)

Para uso pessoal, ok. Para compartilhar ou comercializar: busca formal no **INPI** (Brasil) e
registrar o **lockup** (gema + Reck), não a palavra "Reck" nua — existe "Reck Fitness" em
academia, então a distância vem da forma + qualificador, não da palavra isolada.

---

*De BioCharge AI (nome não-registrável, off-brand) para Reck: uma marca que conta a mesma
história honesta que o app passou a contar nas telas.*

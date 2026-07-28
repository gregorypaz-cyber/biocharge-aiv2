# Reck — Design Review (painel)

- **Alvo:** `https://reck.base44.app` · viewport 390×844 @2x, dark, iPhone/touch
- **Data:** 2026-07-28
- **Telas cobertas:** Hoje `/today`, Padrões `/insights`, Tendências `/trends`, Histórico `/history`, Check-in `/checkin`, Saúde `/saude`
- **Base de evidência:** `scripts/design-review/out/` (PNGs por tela + `audit.json`). Este documento é a **avaliação**; o driver só coletou evidência, não julgou nada.

> Nota de execução: a rede alcança `base44.app` (curl → 200). O headless Chromium precisou ser roteado pelo proxy de egress **e** limitado a TLS 1.2 — a camada de inspeção TLS do proxy reseta o handshake TLS 1.3 do Chromium (curl/openssl passam porque mandam um ClientHello diferente). Ajuste aplicado em `panel-driver.mjs`.

---

## Três avaliadores

O review é lido por três lentes. Cada achado tem severidade: **P1** (quebra ou fere o brief), **P2** (atrito claro), **P3** (polimento).

---

## 1) Ergonomia & toque

**P1 — Alvos de toque abaixo de 44px são a regra, não a exceção.** Toda tela reprova o piso de 44px do brief:

| Tela | alvos < 44px | piores exemplos (`audit.json`) |
|---|---|---|
| Hoje | 8 | logo `Reck` 71×**28**, ícone header 32×32, "Marcar como dia de descanso" 219×**30**, "Entender os scores" 167×**17**, "Ver tendência do sono" 324×**17** |
| Padrões | 14 | info "Como a tendência é calculada" **24×24**, "Ver detalhamento" 100×**16**, "Editar meus dados" 105×**16** |
| Tendências | 11 | chips de período 7D **44×28** / 30D **52×28** / 90D, chips de série "Sono" 63×**27**, "HRV" 59×**27** |
| Check-in | 17 | "Voltar" 61×**20**, "Treinar/Recuperar" ~**32**px, dezenas de inputs h=**36** |
| Saúde | 1 | "Voltar" 61×**20** |

Os mais graves são os **links de texto de 16–17px de altura** ("Ver tendência do sono", "Editar meus dados", "Ver detalhamento") e o **"Voltar" de 20px** — abaixo de metade do piso, difíceis de acertar com o polegar. Evidência: `*-01-top.png`, `*-02-full.png`.

**P2 — A FAB verde central tampa conteúdo real.** O botão flutuante "+" fica ancorado no centro, sobre a barra, e cobre conteúdo em qualquer scroll intermediário: em Padrões esconde o número "**29 anos**" do card *Idade de condicionamento*; em Tendências cobre o gráfico *Recovery vs Fadiga*; em Hoje cai sobre o *Resumo da manhã*. Isto é exatamente o "observe o que está atrás da barra" do brief. Evidência: `*-midscroll-behind-nav.png` (ver `today-`, `trends-`, `insights-`).

**P3 — A barra glass deixa o conteúdo vazar.** Os rótulos da nav ficam legíveis, mas o blur é fraco e o texto/gráfico atrás aparece por baixo ("manhã muito boa", "Volume de corrida (semanal)", eixos do gráfico). Legível, mas visualmente ruidoso. Evidência: `*-navbar-crop.png`.

---

## 2) Tipografia & sistema visual

**P1 — Os rótulos da nav estão em 10px, abaixo do piso de 11px.** Em **todas** as telas, "Hoje / Padrões / Tendências / Histórico" renderizam a **10px** (`tinyText` consistente, 4 por tela). É o texto mais persistente do app e está sob o piso.

**P2 — Eixos de gráfico em 10px (Tendências).** 40 rótulos de eixo a 10px: datas (`2026-06-29`, `06/05`, `04/07`), escalas (`0/25/50/75/100`), "Horas de sono", "Horas de sono". Densos e no limite da leitura em tela de celular. Evidência: `trends-02-full.png`, `trends-scroll-*`.

**P2 — `font-mono` acima do teto semibold.** O brief põe teto de peso semibold na mono; encontramos peso **700** em JetBrains Mono:
- Tendências: "6%" (`text-2xl font-mono`, 700).
- Histórico: **40** chips de score (círculos `w-9 h-9` com "90", "79", "59"…) todos em mono **700**. É o padrão dominante da tela e estoura o teto de forma sistemática. Evidência: `history-02-full.png`.

**P2 — Histórico trunca todas as notas.** 40 pré-visualizações de nota cortadas (clientW **160** vs scrollW ~**225–248**): `"Noite difícil… despertares longos e o Lu…"`, `"Meu filho nasceu ontem às 19:22hs…"`. A coluna de 160px não cabe uma frase útil; o usuário só lê reticências. Evidência: `history-scroll-*`.

**P3 — Histórico é muito longo (scrollHeight 7736px, ~9 telas).** Sem paginação/colapso, a varredura fica cansativa. As demais telas estão em faixa saudável (Saúde 844, Padrões 2581, Hoje 2844, Tendências 3478, Check-in 3950).

**Bom:** nenhuma tela tem overflow horizontal (`horizontalOverflow: false` em todas) — a grade de 390px é respeitada.

---

## 3) Design de informação & semântica de sinal

**P2 — O âmbar está saturando o vocabulário de cor.** Contagem de uso de cor de sinal (`signalColorCounts`):

| Tela | amber | green | red |
|---|---:|---:|---:|
| Hoje | 18 | 8 | – |
| Padrões | 24 | 2 | – |
| Tendências | 81 | 8 | – |
| Histórico | 143 | 32 | 15 |
| Check-in | 45 | 11 | – |

O âmbar aparece 3–12× mais que o verde. Quando "atenção" é a cor mais comum na tela, ela para de significar atenção — o olho deixa de priorizar. Vale checar se boa parte desses âmbares não deveria ser neutro/muted (rótulos, escalas, chips inativos) e reservar âmbar para desvio real. Padrões (24 amber : 2 green) é o caso mais desbalanceado.

**P3 — 1 erro de console (401).** Um recurso falhou com **401** (`consoleErrors`). Não quebra a navegação (todas as telas renderizaram 200), provavelmente uma chamada de API auth-gated de fundo. Vale rastrear para não virar dado faltando silencioso.

**Bom — a tela Saúde é o padrão a seguir.** `/saude` é curta (1 viewport), sem texto minúsculo, sem mono-bold, sem truncamento, 1 só alvo pequeno ("Voltar"). Hierarquia clara (status "Normal", sinais vs baseline, histórico de desvios) e um disclaimer médico honesto. É a tela mais bem resolvida do conjunto.

---

## Prioridades sugeridas

1. **P1 — Subir os rótulos da nav de 10→≥11px** e dar aos links de texto ("Voltar", "Ver tendência do sono", "Editar meus dados") uma área de toque de 44px (padding, não fonte).
2. **P1/P2 — Resolver a FAB sobre conteúdo:** recuar o "+" para não cobrir cards/gráficos, ou dar à barra um fundo sólido o suficiente para o conteúdo não vazar.
3. **P2 — Histórico:** ampliar a largura da nota (ou 2 linhas) para as pré-visualizações pararem de virar só "…"; considerar colapsar por semana para cortar os 7736px.
4. **P2 — Baixar o peso da mono** (score chips do Histórico e "6%") para ≤ semibold.
5. **P2 — Auditar o uso de âmbar**, começando por Padrões e Tendências, movendo rótulos/escalas para neutro.
6. **P3 — Investigar o 401** de console.

---

### Como reproduzir
```bash
RECK_EMAIL='…' RECK_PASS='…' node scripts/design-review/panel-driver.mjs
```
Evidência regravada em `scripts/design-review/out/` (git-ignored). Números deste review vêm de `out/audit.json`; as observações visuais, dos PNGs citados.

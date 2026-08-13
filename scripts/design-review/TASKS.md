# Reck — Tarefas da revisão (só as convergentes)

Filtro aplicado: entra **apenas** o que (1) tem impacto real **e** (2) foi apontado
por **≥2 avaliadores independentes** (ou nível-de-tela pelos três). Nitpick de uma
lente só **não entra** — está listado no fim, com o porquê.

Fonte: `PANEL-2026-08-13.md`, `panel.html`, `out/audit.json`. Diagnóstico, não implementado.

---

## T1 — Sistema de cor de sinal: dessaturar + corrigir contraste
**Convergência: TRIPLA.** Design (o amber virou ruído; dourado de marca e amber de
cautela colidem) + Software (contagem 522/128/88 medida) + Auditoria dark mode
(amber **S=93%** = "vibrating on dark"; `muted 4.45:1` e `red 4.32:1` reprovam AA).
É o achado nº1 do painel — o de maior alcance.

- **Evidência:** `audit.json.signalColorCounts` (amber 88/51/128/522); contrastes medidos
  sobre os tokens da marca; `today-top` (a gema dourada e o "MODERE" no mesmo tom).
- **Escopo proposto:**
  1. Dessaturar a paleta de sinal em dark — amber `S 93→~65%`, orange `90→~70%`, e os
     demais proporcional — mantendo a gramática de zona (`getZone`/`getZoneColor`).
  2. Separar o **dourado de marca** (gema, "+", nav ativa) do **amber de cautela** —
     tom e/ou uso distintos, pra "atenção" voltar a significar atenção.
  3. Elevar `--muted-foreground` (`#6C7C93`) e o vermelho de texto (`#DF3A3A`) para
     **≥4.5:1** sobre card.
- **Aceite:** audit re-rodado com `signalColorCounts` muito menor; muted e red de texto
  ≥4.5:1; amber e dourado-de-marca distinguíveis lado a lado nas 5 telas.
- **Nota:** mexe em `src/index.css` (tokens canônicos) → impacto global; regressão visual
  nas 5 telas obrigatória. Reaproveitar `panel-driver.mjs` pra medir antes/depois.

## T2 — Nav inferior deixa de ocultar conteúdo
**Convergência: DUPLA.** UX (rola às cegas nos últimos ~130px) + Design (o glow da gema
bissecta a linha de conteúdo). Afeta **todas** as telas.

- **Evidência:** `trends-midscroll-behind-nav`, `history-navbar-crop`.
- **Escopo proposto:** `padding-bottom` nos containers de scroll = altura da nav +
  safe-area; revisar opacidade do scrim/glow pra nenhuma linha essencial ficar ilegível
  sob a gema; (junto, barato) dar rótulo/`aria-label` à gema "+" — que hoje não tem texto.
- **Aceite:** a última linha de cada tela fica 100% legível acima da nav; nada essencial
  atrás da gema.

## T3 — Histórico: a tela que os três reprovaram
**Convergência: TRIPLA (nível de tela).** Os três, independentemente, apontaram o
Histórico como a tela mais fraca — UX (toque 12px + notas cortadas), Design (setas
ambíguas + 522 amber), Software (11837px sem virtualização). A convergência é o que
justifica priorizar a tela; os sub-itens podem virar tarefas menores.

- **Evidência:** `history-top`, `history-notes`, `audit.json` (40 alvos 12×12, 40 notas
  truncadas, `scrollHeight 11837`).
- **Escopo proposto (sub-itens):**
  - **a.** Alvos de toque do heatmap **≥44px** — hit-area invisível via `::before`
    (utilitário `.tap-target` que o app já usa), sem reflow do layout.
  - **b.** Notas do dia: afordância de **expandir** (tap → leitura completa) no lugar do
    corte cego em ~30 caracteres.
  - **c.** Setas de tendência: **desambiguar** do badge de score (seta monocromática/neutra,
    ou remover a cor que colide com o vermelho do score).
  - **d.** **Virtualizar/paginar** a lista de 94+ registros (parte do amber-522 também cai
    junto com T1).
- **Aceite:** audit do Histórico com **0** alvos <44px no heatmap; nenhuma nota essencial
  truncada sem alternativa; `scrollHeight` não cresce ilimitado com o histórico.

---

## Não entram (uma lente só) — mas dois são bugs de correção
O filtro é convergência; estes ficam de fora dela. Ainda assim, **dois são bugs reais** que
você pode querer corrigir independentemente — decisão sua:

- ⚠️ **Estágios do sono somam 108%** (Software) — `18+36+54`. Bug de dado/arredondamento.
- ⚠️ **401 na carga** (Software) — requisição não-autorizada a cada abertura do app.

Nitpicks de uma lente (ficam no radar, sem virar tarefa agora):
- Estado vazio duplicado no Hoje (UX) · placeholder do Coach cortado (UX)
- Gema "57 vs idade 39" (Design) · metáforas do seletor de energia (Design)
- × de fechar a 14px (Software) · rótulos de gráfico a 10px (Software + dark mode, menor)

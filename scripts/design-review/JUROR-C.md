# JUROR-C — Reck (pesquisa de usabilidade)

**Lente:** comportamento e conclusão de tarefa. Não julgo gosto. Cada achado abaixo tem tela, elemento e a medida que o sustenta.
**Base:** `out/audit.json` (gerado contra `http://localhost:5173`), PNGs em `out/`, e `REVIEW.md` (escrito contra `reck.base44.app`, tratado aqui como trabalho de terceiro a auditar).

---

## Parte 1 — Auditoria do REVIEW.md anterior

### Confirmo (remedi contra o audit de localhost)

- **Rótulos da nav a 10px.** `tinyText` traz `span :: Hoje/Padrões/Tendências/Histórico` a **10px** em Hoje, Padrões, Histórico e Check-in (4 por tela). Abaixo do piso de 11px do brief. Confirmado, e é o texto mais persistente do app. Visível em `today-navbar-crop.png`.
- **Alvos < 44px são a regra.** Contagens do audit batem com o REVIEW: Hoje **8**, Padrões **14**, Tendências **11**, Check-in **17**, Saúde **1**. Os piores são links de texto de altura 16–17px ("Ver tendência do sono" 324×**17**, "Entender os scores" 167×**17**, "Ver detalhamento" 100×**16**, "Editar meus dados" 105×**16**) e o "Voltar" **61×20** em Check-in e Saúde. Confirmado.
- **Mono acima do teto semibold.** `monoOverweight` confirma "6%" (`text-2xl font-mono`, **700**) em Tendências e **40** chips de score `w-9 h-9` a **700** em Histórico (JetBrains Mono). Confirmado — é o padrão dominante da tela de Histórico.
- **Histórico trunca todas as notas.** `truncated` lista **40** pré-visualizações com `clientW 160` vs `scrollW 216–248`. A coluna de 160px não cabe uma frase útil. Confirmado e agravado no meu Achado 1.
- **Saturação de âmbar.** `signalColorCounts` confirma Hoje 18:8, Padrões **24:2**, Tendências **81:8**, Histórico 143:32:15, Check-in 45:11. Confirmado.
- **Sangramento da barra glass.** `today-navbar-crop.png` mostra "manhã muito boa", "Seu corpo acordou com ótima recuperação" e o "90" vazando por baixo da nav. Confirmado.

### NÃO consigo reproduzir

- **"A FAB esconde o número '29 anos' em Padrões."** Em `insights-01-top.png` o **"29"** está totalmente visível (à esquerda); a FAB fica no centro e cobre o subtítulo "…que idade real (34)", não o número. Em `insights-midscroll-behind-nav.png` o "29 anos" nem está no quadro — a FAB ali cobre o corpo do card "Leitura completa". A oclusão pela FAB é real (ver meu Achado 3), mas essa instância específica citada pelo REVIEW não se reproduz.
- **"A FAB cobre o gráfico Recovery vs Fadiga" (Tendências).** Em `trends-midscroll-behind-nav.png` o título "Recovery vs Fadiga" aparece no topo do quadro, esmaecido mas legível; quem a FAB cobre é o rodapé "Baseado em 78 pesagens…" do card de Peso e o título "Volume de corrida (semanal)". Oclusão confirmada, alvo trocado.

### Medido no app PUBLICADO e diferente agora em localhost

- **Erros de console.** O REVIEW reporta "**1 erro de console (401)**". No audit de localhost `consoleErrors` tem o 401 (3 linhas: recurso, SDK, corpo) **e mais 3 warnings do React**: `Each child in a list should have a unique "key" prop … Check the render method of Today (Today.jsx:1022)`. Ou seja, em localhost há um segundo problema de console que o review publicado não capturou — chave duplicada em lista dentro de `Today`. É defeito de código, não só de rede.
- **Rótulo do botão de descanso.** O REVIEW chama o botão de "Marcar como dia de descanso" (é o que se lê em `today-01-top.png`, 219×**30**). Mas o `audit.json` captura o nome acessível desse mesmo elemento como **"Declarar hoje como dia de descanso"**. Rótulo visível ≠ nome acessível: leitor de tela anuncia frase diferente da que o olho lê. Isso o REVIEW não notou (ver Achado 5).

### O que o REVIEW deixou passar

Nenhuma contradição entre telas, nenhuma ambiguidade de controle, nenhum formato de data. O brief pedia isso explicitamente. Cobri nos Achados 2, 4 e 5.

---

## Parte 2 — Meus achados

### Achado 1 (P1) — Histórico: a tarefa de varredura está derrotada, não só "truncada"
- **Tela/elemento:** `/history`, coluna de nota `p.t-micro.text-muted-foreground`.
- **Medida:** 40 notas com `clientW 160` vs `scrollW 216–248` (`audit.json`). Em `history-01-top.png` lê-se `"Noite difícil… despertares l…"`, `"Noite em que o Lucca acor…"`; em `history-scroll-03-y2364.png`, `"Acordei de madrugada pela…"`.
- **Por que atrapalha:** a tarefa central da tela é distinguir um dia do outro. Com 160px cortando toda linha na primeira frase, várias entradas ficam **indistinguíveis** ("Noite difícil…" repete-se). O usuário não decide nada só com o "…". Some-se o `scrollHeight 7736px` (~9 telas, sem colapso por padrão) e a varredura vira trabalho sem recompensa.

### Achado 2 (P1) — Formato de data se contradiz dentro do próprio app
- **Tela/elemento:** input `DATA` em `/checkin` vs cabeçalhos de `/saude` e `/history`.
- **Medida:** `checkin-01-top.png` mostra o campo de data nativo em **07/28/2026** (MM/DD/YYYY, en-US). Já `saude-01-top.png` mostra **28/07/2026** e `history-01-top.png`/`today-01-top.png` mostram **"28 DE JUL."** (DD/MM, pt-BR).
- **Por que atrapalha:** é um app de saúde onde a pessoa **digita** a data do registro. Um brasileiro lendo "07/28/2026" no campo de check-in, com o resto do app em DD/MM, pode gravar o dia errado. Risco de integridade de dado, não só de estética. O input nativo também não parece um controle do app (é o widget cru do browser, destoando dos demais campos estilizados) — ver Achado 5.

### Achado 3 (P1/P2) — A FAB "+" oclui conteúdo real em qualquer scroll intermediário
- **Tela/elemento:** botão flutuante verde central, presente em todas as telas de aba.
- **Medida:** em `today-midscroll-behind-nav.png` a FAB cai sobre o card "RESUMO" (topo do próximo bloco) e a nav cobre "manhã muito boa / 90"; em `insights-midscroll-behind-nav.png` cobre o corpo do card "Leitura completa" ("Uma leitura mais detalhad[a]… recentes de"); em `trends-midscroll-behind-nav.png` cobre o rodapé "Baseado em 78 pesagens…" e o título "Volume de corrida (semanal)".
- **Por que atrapalha:** não é decorativo — some com texto e títulos de card no meio da rolagem, exatamente o "veja o que está atrás da barra" do brief. E a FAB é um controle **sem rótulo**: um "+" no centro que não diz o que adiciona (check-in? treino?). Controle ambíguo por cima de conteúdo ocluído.

### Achado 4 (P2) — Três números de "recuperação recente" que a pessoa precisa reconciliar de cabeça
- **Telas/elementos:** score de Hoje, cards de topo de Tendências, bloco "Mudança recente" de Padrões.
- **Medida:** `today-01-top.png` → **Recovery 90 / "Alta" / "Baseline sólido"**. `trends-01-top.png` → "Últimos 7 dias **71**", "Período selecionado **56**", "vs 7 dias anteriores **+34**". `insights-midscroll-behind-nav.png` → "Recuperação melhorando: subiu de **30 para 68**".
- **Por que atrapalha:** 90, 71, 68 são recortes diferentes (snapshot de hoje vs média 7d vs janela de mudança), mas nenhuma tela rotula o recorte de forma que dispense a outra. O usuário sai de Hoje achando "estou em 90", entra em Padrões e vê que a média vinha de 30 — precisa **decorar** de qual tela veio cada número. Mesmo padrão em HRV: Padrões "Sua evolução" mostra HRV **58.1 ms**, enquanto Saúde mostra HRV **61, base 57** (`insights-01-top.png` vs `saude-01-top.png`). Três valores de HRV (57/58,1/61) sem um dizer "este é o seu HRV".

### Achado 5 (P2) — Indicadores e rótulos que dizem uma coisa e sinalizam outra
- **Tela/elemento:** setas de tendência em `/saude`; rótulo do botão de descanso em `/today`.
- **Medida:** em `saude-01-top.png`, a linha **HRV 61 / base 57** exibe uma **seta para baixo verde**; a linha **FC de repouso 55 / base 56** exibe a **mesma seta ↓ verde**. Para HRV, "acima da base" e "para baixo" ao mesmo tempo, em verde, é auto-contraditório (HRV maior é melhor; ↓ deveria alertar). Para FC, ↓ verde faz sentido — o mesmo glifo serve a métricas que caminham em direções de saúde opostas, então a seta deixa de ensinar direção. Separadamente, o botão "Marcar como dia de descanso" (219×30, `today-01-top.png`) tem nome acessível **"Declarar hoje como dia de descanso"** no `audit.json`: o que o leitor de tela ouve não é o que o olho lê.
- **Por que atrapalha:** o valor do Monitor de Saúde é dizer "melhorou ou piorou". Se ↓verde aparece tanto no bom quanto no ruim, a pessoa tem de ir ao número bruto toda vez — o indicador vira ruído.

### Achado 6 (P3) — Estado vazio de Hoje acerta; registro isso porque é a exceção
- **Tela/elemento:** card "TREINOS DE HOJE" em `/today` (`today-midscroll-behind-nav.png`).
- **Medida:** "Nenhum treino registrado hoje" vem com CTA claro **"+ Adicionar treino"** (144×32) dentro do próprio vazio.
- **Observação:** ao contrário do que costumo encontrar, este estado vazio **diz o que fazer**. Fica como referência do padrão certo — só peca no alvo de 32px de altura, abaixo do piso.

---

## Nota

Sistêmico e medível: alvos < 44px em todas as telas, nav a 10px, 40 notas do Histórico cortadas em "…", mono 700, âmbar 3–12× o verde, FAB ocluindo card e sem rótulo, data em MM/DD onde o resto é DD/MM, setas de saúde ambíguas, três números de recovery sem recorte rotulado, e warning de chave do React em `Today.jsx`. A maioria é **atrito** — incomoda sem impedir. Duas coisas chegam a atrapalhar a tarefa: o truncamento do Histórico derrota a varredura (o motivo de existir da tela) e o campo de data em formato en-US arrisca gravar o dia errado num app de saúde. Como só uma tela (Histórico) tem a tarefa efetivamente comprometida e o restante é fricção contornável, não desço abaixo de 6.

**Nota: 6/10** — funciona, mas incomoda de forma consistente, com o Histórico beirando o 5.

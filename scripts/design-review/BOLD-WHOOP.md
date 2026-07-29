# BOLD-WHOOP — Avaliação de design do Reck

> Avaliador: design lead de wearable premium (linhagem Whoop/Oura). Lente de assinatura de US$30/mês:
> glanceability às 6h, o "um número que importa", ritual diário, luminosidade no dark, sensação de flagship.
> Não é auditoria de conformidade — são movimentos de design ranqueados por impacto.

---

## VEREDITO (2 linhas)

**Onde já é flagship:** a gema de recovery é de verdade — física de vidro, núcleo luminoso, verde que
carrega significado. Poucos apps de wearable têm um herói tão bonito, e a honestidade (Calibrando, "—",
gate estatístico) é uma vantagem de marca que Whoop e Oura *não* têm.

**Maior oportunidade ousada:** o momento-herói e o ritual estão **divorciados**. A gema mora na Today, mas
o check-in — o único ritual diário — é um formulário. O número aparece pronto; ninguém o vê *nascer*. É aí
que mora o salto.

---

## OS MOVIMENTOS (ranqueados por impacto)

### 1. O ritual do gem-birth: a gema se forma enquanto você faz o check-in

**(a) O movimento.** Hoje o check-in (`checkin-scroll-00`) é um formulário vertical: slider "como acordou",
slider Zepp, stepper de horas, dois inputs (HRV/FC), e lá embaixo um "PLANO PRELIMINAR: 72" chapado num
retângulo. Inverta a gravidade. Coloque uma **gema fantasma no topo do check-in** — cinza-slate, sem número,
pulsando devagar ("Calibrando o dia…"). A cada sinal que você digita, a gema **ganha massa e cor**: entra o
HRV → o núcleo acende; entra a FC → a borda satura; entra o sono → o número se resolve com um squash suave
e a cor migra pela gramática de zona (slate → verde). O botão final não é "Salvar" — é **"Revelar o dia"**,
e a gema faz o reveal em tela cheia por 800ms antes de te levar pra Today.

**(b) Por que eleva.** Isto é o *readiness reveal* do Oura e o momento de abrir o app do Whoop de manhã — o
gesto de assinatura pelo qual as pessoas pagam. Recompensa emocional por um ato que hoje é digitação de
dados. E é anti-placebo por construção: a gema só nasce dos sinais crus que você deu; se falta HRV, ela
**fica cinza e sem número** — a honestidade vira coreografia, não disclaimer.

**(c) Tela + elemento.** Check-in inteiro; o bloco "PLANO PRELIMINAR / RECOVERY DO DIA 72".

**(d) Regra.** Honra §6 (a gema é o herói e a marca) e §8 (honestidade tem forma — a forma é a ausência:
gema cinza sem número). Estica §4 (material) para dentro de um fluxo de input.

---

### 2. Uma gema herói, não três esferas democráticas

**(a) O movimento.** Na Today (`today-scroll-00`) descem três esferas do mesmo tamanho visual: Recovery 72
(verde), Sono 66 (azul), Strain **0** (bola cinza morta). Três heróis é zero herói. Mate a democracia:
a gema de Recovery fica **grande e sozinha**; Sono e Strain viram **dois readouts finos** abaixo dela —
número + rótulo + micro-sparkline, sem esfera, sem volume de vidro. E a bola cinza de Strain=0 **não deve
existir**: sem treino registrado, é "—" numa linha, não uma esfera 3D pedindo atenção igual à do herói.

**(b) Por que eleva.** O dogma do Whoop é *um* número (Recovery %); tudo mais é subordinado. Três esferas de
vidro competindo achatam a hierarquia e gastam o efeito "wow" da física de vidro em dado secundário. Menos
esferas = a gema que sobra fica **mais** premium, não menos.

**(c) Tela + elemento.** Today, trio Recovery/Sono/Strain logo abaixo do herói.

**(d) Regra.** Honra §4 ("Presença se conquista por material, não por saturação" — reserve o material caro
pro herói) e a UX do CONTEXT §5 ("herói gráfico + espaço em branco"). Honra §8: a esfera cinza de Strain 0
é literalmente "UI para dado que não existe".

---

### 3. Um verbo, não dois números brigando

**(a) O movimento.** No topo da Today (`today-01-top`) o card diz **"Recuperação parcial pede moderação"**,
a gema diz **72**, e o rótulo diz **"Alta"**. Parcial + Alta + moderação num só olhar é ruído semântico —
o usuário de 6h tem que *reconciliar* três afirmações. Resolva num único verbo-decisão gigante, travado na
cor de zona: **TREINE FORTE · MODERE · RECUPERE**. O número 72 vive *dentro* da gema servindo o verbo, não
competindo com ele. O rótulo "Alta" some — a cor da gema já é a zona; repetir "Alta" em texto verde é
redundância que rouba o significado do verde (a regra que a própria §2 defende).

**(b) Por que eleva.** A pergunta da marca é literal: "O que eu faço hoje?" (BRAND, essência). Whoop/Oura
respondem com *uma* palavra antes de qualquer número. O Reck já tem o `decision_mode` no motor — só falta
promovê-lo a herói tipográfico em vez de enterrá-lo numa frase de card.

**(c) Tela + elemento.** Today, card "DECISÃO DE HOJE" + rótulo "RECOVERY / Alta" sob a gema.

**(d) Regra.** Honra §2 (cor carrega significado; não gastar verde em texto neutro) e o princípio 3 do
CONTEXT (todo número conecta a uma decisão). Honra a personalidade "treinador direto" da §Personalidade.

---

### 4. O número-herói com peso variável de verdade

**(a) O movimento.** A §3 do BRAND *já manda*: "Número-herói usa peso variável atrelado ao valor (fino =
frágil, robusto = alto)". Nas telas, o 72 aparece com peso fixo e pesado em todos os dias (`today-01`,
`checkin-scroll-00`, `history` chips). Ative a regra escrita: um dia de recovery 29 renderiza o glífo
**fino, quase quebradiço** (Inter ~300); um dia 90 renderiza **robusto** (Inter ~800). O eixo `wght`
contínuo do Inter faz isso sem trocar de fonte. A tipografia passa a carregar leitura fisiológica igual a cor.

**(b) Por que eleva.** É a assinatura tátil que separa flagship de template: no Oura a densidade visual
muda com o estado. Um 29 frágil dá vontade de descansar antes mesmo de ler a cor — o corpo do número
*é* a mensagem. E é gratuito: a regra já está no BRAND, só não está no render.

**(c) Tela + elemento.** Número dentro da gema (Today, Check-in) e chips de score (History).

**(d) Regra.** Honra §3 diretamente (é a regra descumprida). Cuidado: número da gema é Inter, não
JetBrains Mono — o teto `font-semibold` do mono da §3 não se aplica aqui, o eixo até 800 é legítimo.

---

### 5. Dataviz com baseline pessoal sombreado — o "seu normal" como banda, não como legenda

**(a) O movimento.** As mini-cards RMSSD/RHR/Sono do "Resumo da manhã" (`today-scroll-02`) têm sparklines
lindas mas **flutuantes** — a linha sobe e desce sem referência, e "no seu normal" é só texto. Desenhe a
**banda do baseline** atrás de cada sparkline: uma faixa slate translúcida marcando ±1 spread do EWMA
pessoal, com o ponto de hoje pousado dentro ou fora dela. Mesma ideia no gráfico "Recovery base" das
Tendências (`trends-01`): a linha tracejada da média móvel vira uma **banda preenchida** (a "zona do seu
normal"), e os picos que furam pra fora ganham significado instantâneo.

**(b) Por que eleva.** É a linguagem central do Oura: seu dado só significa contra *seu* baseline, e o
baseline tem que ser **visível**, não implícito num rótulo. Transforma "55 ms" de número solto em "55,
dentro da sua faixa" sem uma palavra. Também dá corpo visual à tese anti-placebo (calibrado em você, não
na média — CONTEXT §2.2).

**(c) Tela + elemento.** Today "Resumo da manhã" (3 sparklines) e Tendências "Recovery base".

**(d) Regra.** Honra §2 (cinza/slate para chrome e banda neutra) e §8. A banda usa slate translúcido, sem
introduzir cor nova — respeita a gramática.

---

### 6. Glanceability às 6h: uma faixa de leitura única acima da dobra

**(a) O movimento.** Antes de chegar na gema (`today-01`), o olho de 6h atravessa: data, "Hoje", "Decisão
do dia", "Check-in registrado", chip de streak "🔥 3", botão "Marcar como dia de descanso", header do card,
título de 2 linhas, subtítulo, badge "Baseline sólido" — *só então* o número. Corte pela metade. Suba a
**gema + verbo-decisão** para ser a primeira coisa após o header. Demova a streak de fogo laranja (§2 diz
laranja = alerta fora de zona; um streak decorativo no canto superior direito compete com o herói e gasta
uma cor de alerta em vaidade). "Marcar descanso" vira um ícone discreto, não um botão de largura cheia.

**(b) Por que eleva.** Whoop e Oura são otimizados para o gesto de meio-segundo antes do café: número +
veredito, ponto. Cada elemento entre o topo e o herói é imposto de atenção. A streak, em particular, é
mecânica de engajamento estilo Duolingo — exatamente o tipo de "número bonito que não muda decisão" que
a marca jurou combater.

**(c) Tela + elemento.** Today, tudo entre o header e a gema; chip de streak laranja no topo.

**(d) Regra.** Honra CONTEXT §2.1 (número que não muda decisão não deveria existir — a streak) e §2 do
BRAND (laranja é alerta, não decoração). Desafia implicitamente o uso atual do chip de streak: **proponho
removê-lo**, porque contar dias consecutivos é gamificação de vaidade, não prontidão.

---

### 7. Aposente "Idade de condicionamento 29 anos" — é o placebo com nome bonito

**(a) O movimento.** Insights (`insights-01`) mostra **"IDADE DE CONDICIONAMENTO 29 anos · 5 anos mais
jovem que idade real"** ao lado de **"VO₂max 46"**. Isto é vitrine de vaidade: VO₂max é estimado (não
medido), "idade de condicionamento" é um derivado cosmético dele, e nenhum dos dois muda o que você faz
hoje. Remova o "5 anos mais jovem" e a "idade" inteira. Se o VO₂max fica, que fique como **contexto de
tendência de longo prazo** (uma linha nas Tendências, com direção), nunca como troféu comparativo na
abertura dos Insights.

**(b) Por que eleva.** Este é o teste de fogo do produto. Whoop foi criticado justamente por métricas-troféu;
Oura recuou de várias. Um app de US$30/mês que se vende como *anti-placebo* e mostra "você é 5 anos mais
jovem" está se traindo na própria tela. Cortar isso é o movimento mais alinhado à alma da marca — e o mais
corajoso, porque métricas-troféu "dão dopamina" e é tentador manter.

**(c) Tela + elemento.** Insights, bloco "Idade de condicionamento / VO₂max".

**(d) Regra.** Honra o núcleo INVIOLÁVEL do CONTEXT §2 (nenhuma métrica de vaidade; todo número conecta a
ação) e §8 do BRAND (honestidade). Nenhuma regra desafiada — só cumprida com rigor.

---

### 8. O Histórico como artefato emocional: o mapa de calor do ano

**(a) O movimento.** O Histórico (`history-01`, `history-scroll-02`) é uma boa lista semanal com chips
coloridos e citações ("Noite difícil com o Lucca…") — mas é uma *lista*. Adicione no topo um **mapa de calor
estilo contribuições**: 52 semanas × 7 dias, cada célula na cor de zona daquele recovery, com os gaps (dias
sem check-in) em vazio honesto. De longe você *vê a forma do seu ano* — os blocos vermelhos de gripe, as
faixas verdes de boa fase. Toque numa célula → rola pra aquele dia na lista.

**(b) Por que eleva.** Oura e Whoop sabem que retenção de assinatura vem do *acúmulo* — ver meses de você
mesmo. A lista mostra a semana; o heat-map mostra a **narrativa**. E respeita a honestidade: gap é célula
vazia, não interpolada — o vazio é resultado, não falha a esconder (§8).

**(c) Tela + elemento.** Histórico, acima da lista agrupada por semana.

**(d) Regra.** Honra §2 (gramática de zona aplicada em escala) e §8 (vazio honesto). Reusa `getZoneColor()`
— zero definição de cor nova, per §2 ("fonte única, inegociável").

---

## O SALTO

**Aposto tudo no Movimento 1: o ritual do gem-birth.**

Hoje o Reck tem um herói (a gema) e tem um ritual (o check-in) — mas eles não se tocam. O número aparece
pronto num retângulo no fim de um formulário, e a gema linda mora noutra tela. É a diferença entre *ter*
um belo objeto e *celebrá-lo todo dia*.

Faça o check-in **ser** o nascimento da gema. Ela começa cinza e sem número — "Calibrando o dia". Cada
sinal cru que você entrega dá massa, luz e cor a ela, ao vivo. No fim, um botão "Revelar o dia" e o reveal
em tela cheia. O gesto de 6h deixa de ser *preencher um formulário* e vira *ver seu dia se cristalizar a
partir dos seus próprios sinais*.

Isso muda a alma do produto de três formas que nenhum concorrente entrega junto: (1) dá ao Reck o **momento
ritual** de assinatura premium que Whoop/Oura cobram caro; (2) torna a honestidade **coreográfica** — sem
HRV, a gema simplesmente não nasce, e você *sente* a ausência em vez de ler um aviso; (3) funde o herói de
marca (§6) com o gesto diário, de modo que a coisa mais bonita do app é também a mais usada. É o único
movimento que ataca ao mesmo tempo glanceability, ritual, momento-herói e a tese anti-placebo — porque a
gema, por construção, só pode brilhar com o que os seus dados sustentam.

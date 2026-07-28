# PANEL.md — Compilação do painel de design do Reck

> Escrivão, não editor. Os três jurados rodaram em contextos separados e isolados, cada um só com o prompt e a evidência que o prompt dele autorizava. Aqui eu **cito**; não reescrevo achado, não resolvo contradição e não acrescento achado meu (o que é meu está na seção final "Fora do painel", explicitamente marcada). Fonte: `JUROR-A.md`, `JUROR-B.md`, `JUROR-C.md`.
>
> Evidência autorizada por jurado (afeta a leitura dos "exclusivos"): **A** — PNGs + app em localhost. **B** — PNGs + localhost + `BRAND.md`. **C** — tudo (PNGs, `audit.json`, localhost, código) + `REVIEW.md` para auditar.

---

## 1. As três notas

| Jurado | Papel | Nota | Frase de justificativa (palavras dele) |
|---|---|---|---|
| **A** | Usuário, 38, treina 5x, abre 6h da manhã | **7** | "funciona pro que eu preciso e a bola verde me responde rápido, mas tem várias coisas claramente erradas espalhadas (inglês solto, botão que tapa conteúdo, data trocada, número que não bate, tooltip preso) que qualquer um vê e que me tiram a confiança de que o app foi caprichado do começo ao fim." |
| **B** | Diretor de arte, 12 anos em saúde | **7** | "competente, várias coisas claramente erradas… a régua que o próprio documento chama de 'a que mais governa' está quebrada em Tendências, tem emoji onde o §5 proíbe, locale vazando no check-in, e a gema se repete a ponto de virar ruído em Hoje." |
| **C** | Pesquisa de usabilidade, 10 anos | **6** | "funciona, mas incomoda de forma consistente, com o Histórico beirando o 5… só uma tela (Histórico) tem a tarefa efetivamente comprometida e o restante é fricção contornável." |

---

## 2. CONVERGÊNCIA — o que dois ou três apontaram de forma independente

### 2.1 O campo de data do Check-in em formato americano (07/28/2026) — **3 de 3**
Chegaram os três, por caminhos diferentes:
- **A** (Achado 5), pela confusão do usuário: *"no Check-in o campo de data aparece **07/28/2026** — mês na frente, jeito americano. Isso me travou por um segundo porque parece que a data tá errada (mês 28?)."*
- **B** (Achado 6), pela voz da marca: *"o campo de data do check-in mostra **07/28/2026** — formato americano MM/DD — e os horários vêm em **AM/PM** ('09:09 PM'), enquanto a própria dica logo abaixo escreve 'Ex: 23:00' em 24h."* (B é o único que estende a queixa aos **campos de hora** AM/PM.)
- **C** (Achado 2), pelo risco de dado: *"um brasileiro lendo '07/28/2026' no campo de check-in, com o resto do app em DD/MM, pode gravar o dia errado. Risco de integridade de dado, não só de estética."*

Convergência forte: mesma tela, mesmo elemento, três lentes distintas (confusão / marca / integridade de dado).

### 2.2 A FAB "+" central — **3 de 3**, mas por dois motivos diferentes
- **A** (Achado 3): *"uma bolinha verde com um '+' que fica boiando bem no meio da barra de baixo. Em várias telas ela tapa o texto que tá atrás… Além de tapar, eu não sei o que ela faz. Adicionar o quê? Treino? Check-in?"*
- **C** (Achado 3), pela mesma via (oclusão + ambiguidade), medindo: *"em `today-midscroll-behind-nav.png` a FAB cai sobre o card 'RESUMO'… é um controle **sem rótulo**: um '+' no centro que não diz o que adiciona."*
- **B** (Achado 1) chega ao mesmo objeto por **outro caminho** — símbolo, não oclusão: a FAB é uma das *"três esferas verdes luminosas"* na tela Hoje. *"Quando o mesmo objeto é herói e affordance na mesma dobra, o herói perde autoridade."*

A e C convergem em "oclui e não se sabe o que faz"; B toca a mesma FAB acusando-a de repetir a gema. Vale registrar que dois caminhos independentes (usabilidade e composição) pousaram no mesmo botão.

### 2.3 Os três números do topo de Tendências (71 / 56 / +34) e o verde de Tendências — **A, B, C**, leituras cruzadas
- **A** (Achado 4), aritmética que não fecha: *"'Últimos 7 dias 71', 'Período selecionado 56' e 'vs. 7 dias anteriores +34'… se os últimos 7 dias deram 71 e o período deu 56, de onde sai +34 subindo? Não fechou na minha cabeça."*
- **C** (Achado 4), o mesmo topo como recortes não rotulados: *"90, 71, 68 são recortes diferentes… nenhuma tela rotula o recorte de forma que dispense a outra."*
- **B** (Achado 2), o mesmo tile pela cor: *"O tile 'Período selecionado' mostra **56 em verde** — 56 é zona âmbar (42–69) pela própria getZone()… Dois valores de zonas diferentes, pintados igual, na mesma fileira."*

Convergem na tela e no bloco; A e C sobre a **incoerência numérica**, B sobre a **cor errada** dos mesmos números.

### 2.4 O tooltip "Recovery base: 9" preso no gráfico de Tendências — **A e B**, diagnósticos incompatíveis
- **A** (Achado 4): *"uma caixinha de texto grudada no gráfico mostrando 'Recovery base: 9' num dia lá atrás — parece que ficou presa, tipo um errinho, como se eu tivesse encostado sem querer e ela travou aberta."*
- **B** (Achado 2): *"o tooltip do gráfico mostra **'Recovery base: 9' em verde** — 9 é vermelho profundo, e está verde. Isso é exatamente o inimigo declarado… o placebo."*

Mesmo elemento, duas causas apontadas (ver Discordância 3.3).

### 2.5 "Seis filtros/chips" em Tendências é demais — **A e B**
- **A** (Achado 4): *"seis bolinhas coloridas de filtro em cima (Recovery base, Sono, Fadiga, Estresse, HRV, BioCharge). É filtro demais pra uma cabeça de 6h da manhã."*
- **B** (pior tela): *"Seis chips de categoria é dashboard genérico — o oposto do 'silêncio > sinal fabricado' do §8."*

### 2.6 Sinais que exigem reconciliar de cabeça entre telas — **A e C**, instâncias diferentes
- **A** (Achado 6): *"O app me dá 90 de recovery e diz 'corpo recuperado'… Mas na mesma tela ele avisa 'Débito de sono: ~13h'… e lá em Padrões o sono aparece '-19.8 pts, piorando' em amarelo… em quem eu acredito, na bola verde ou no aviso amarelo?"*
- **C** (Achado 4): *"O usuário sai de Hoje achando 'estou em 90', entra em Padrões e vê que a média vinha de 30 — precisa **decorar** de qual tela veio cada número. Mesmo padrão em HRV: três valores (57 / 58,1 / 61) sem um dizer 'este é o seu HRV'."*

Convergem no fenômeno "o app diz duas coisas / a pessoa concilia sozinha"; A pelo par verde-vs-âmbar, C pela multiplicidade de números.

### 2.7 Vazamento/legibilidade da barra de nav durante a rolagem — **B e C**
- **B** (Achado 8): *"em Hoje o herói '90' e 'Manhã muito boa' fantasmam através da barra e passam bem atrás de 'Padrões / Tendências'… é o blur ativo deixando luminância verde demais passar."*
- **C** (Parte 1, confirmando o REVIEW): *"`today-navbar-crop.png` mostra 'manhã muito boa', 'Seu corpo acordou com ótima recuperação' e o '90' vazando por baixo da nav. Confirmado."* — e, à parte, os rótulos da nav a **10px**.

---

## 3. DISCORDÂNCIA — onde se contradizem, ou um elogia o que outro critica

### 3.1 Histórico: **B diz que é a MELHOR tela; C diz que é a de tarefa mais comprometida** ⭐
Contradição frontal sobre a mesma tela.
- **B** (Melhor e pior tela): *"**Melhor: Histórico.** É a única tela onde a cor faz exatamente o trabalho que o §2 exige e nada além: 90 verde, 59 âmbar, 35 vermelho — zona pura, getZone() visível a olho nu. O agrupamento por semana… dão ritmo e leitura instantânea, parada e rolando. Honra o §8 sem esforço."*
- **C** (Achado 1, P1): *"a tarefa de varredura está derrotada, não só 'truncada'… 40 notas com clientW 160 vs scrollW 216–248… várias entradas ficam **indistinguíveis** ('Noite difícil…' repete-se)… a varredura vira trabalho sem recompensa."* Conclui a tela *"beirando o 5"*.

B olha cor/composição e aprova; C olha conclusão-de-tarefa (distinguir um dia do outro) e reprova. **A** não avalia o Histórico como um todo — só menciona, no Achado 3, que a FAB *"tapa a última linha da lista"*.

### 3.2 O menisco (o motivo declarado do painel): **só B emite veredito**
- **B** (Achado 5): *"a curva funciona. O FAB-gema assenta na cova como uma gota d'água… Não é firula gratuita — dá lar ao botão central. **Mas** a borda do menisco é um hairline branco brilhante que… **compete com o specular da própria gema** logo acima… Corte o rim… Mantenha o menisco; mate o brilho da borda."*
- **A** e **C** não avaliam o menisco como forma. A trata a barra só pela FAB que boia nela; C trata a nav pelo vazamento e pelos rótulos de 10px. Não é contradição — é **ausência de contraditório**: a peça central do redesign recebeu opinião de um jurado só.

### 3.3 O "Recovery base: 9" de Tendências: **bug acidental (A) vs. crime cromático deliberado (B)**
Mesmo pixel, duas naturezas incompatíveis: A vê *"um errinho… travou aberta"* (defeito acidental de UI); B vê *"9 em verde… o placebo"* (cor semanticamente errada e intencional). Uma leitura pede conserto de estado; a outra, conserto de regra de cor.

### 3.4 Confiar no "90" para treinar forte: **A confia; C desconfia da reconciliação**
- **A** (confiaria?): *"Confiaria, sim. A bola é grande, é verde… no calor da hora eu vou na bola verde."* — com a ressalva do débito de sono amarelo.
- **C** (Achado 4) trata a multiplicidade de números (90 / 71 / 68; HRV 57 / 58,1 / 61) como algo que obriga a pessoa a *"decorar de qual tela veio cada número"* — erosão de confiança, não adesão.

Não é contradição limpa (lentes diferentes: decisão no calor da hora vs. rigor de recorte), mas as posturas divergem sobre o mesmo número.

### 3.5 Não há discordância sobre a data (07/28), a FAB nem o verde de Tendências
Nesses três pontos os jurados **concordam** (seção 2). Registro que a discordância real do painel está concentrada em **uma tela (Histórico)** e **um elemento (o tooltip '9')** — o resto é convergência ou exclusivo. Como os três avaliaram com lentes e evidências deliberadamente diferentes, a existência de discordância (3.1, 3.3) é sinal de independência real; ela não está vazia.

---

## 4. EXCLUSIVOS — achados que só um levantou

### Só A
- **Inglês solto num app pt-BR e a bola "STRAIN 0" parecendo quebrada** (Achado 2): *"uma cinza vazia com **0** escrito 'STRAIN / meta 15'. Eu não faço ideia do que é 'STRAIN'… parece que quebrou ou que faltou dado… Mesma coisa com 'RECOVERY' e 'BioCharge'."*
- **Copy hermética no card de Hoje** (Achado 1): *"'Seu corpo acordou com margem hoje' — o quê que é 'margem'?… 'dosar'?… 'Proteja a resposta'. Isso é linguagem de quem escreveu o app, não de quem usa."*

### Só B
- **A gema aparece três vezes em Hoje, uma delas é botão** (Achado 1): herói 90 + badge "90" do Resumo da Manhã + FAB. *"É a mesma forma dita três vezes, e uma delas não é leitura, é um botão de ação."*
- **Pastilhas de série reciclam vermelho/âmbar como cor de categoria; Sono e BioCharge com o mesmo ponto azul** (Achado 3): *"Fadiga ganhou um ponto vermelho e HRV um ponto âmbar — puramente como cor de legenda… É colisão de vocabulário."*
- **Dois corações e três sonos na iconografia** (Achado 4): HRV coração-pulso vs FC coração liso; cama / lua / lua para sono. Aponta o `BRAND.md` como **incompleto**: *"O BRAND não legisla 'um conceito, um glifo', e devia."*
- **O veredito do menisco** (Achado 5, ver 3.2): corte o rim.
- **Emoji 😴 no chrome do alerta "Débito de sono"** (Achado 7): *"§5 é taxativo… Emoji nunca aparece em chrome… Troca barata, violação clara."*
- **Melhor/pior tela** (Histórico / Tendências) e a **menção honrosa ao Monitor de Saúde** como *"marca-verdade em estado sólido"*.

### Só C
- **Auditoria do REVIEW.md**: confirma (nav 10px; alvos <44px — Hoje 8, Padrões 14, Tendências 11, Check-in 17; mono 700; 40 notas truncadas; âmbar 3–12× verde; sangramento da barra). **NÃO reproduz** dois achados do REVIEW: *"'A FAB esconde o número 29 anos em Padrões'… o '29' está totalmente visível"*; e *"'A FAB cobre o gráfico Recovery vs Fadiga'… quem a FAB cobre é o rodapé 'Baseado em 78 pesagens…' e o título 'Volume de corrida'"* — oclusão real, alvo trocado.
- **Diferenças publicado→localhost** (Achado/Parte 1): além do 401, *"3 warnings do React: Each child in a list should have a unique 'key' prop… Check the render method of Today (Today.jsx:1022)"*.
- **Nome acessível ≠ rótulo visível** (Achado 5): botão lê "Marcar como dia de descanso", mas o nome acessível é *"Declarar hoje como dia de descanso"* — *"leitor de tela anuncia frase diferente da que o olho lê."*
- **Setas ↓verde ambíguas no Monitor de Saúde** (Achado 5): *"HRV 61 / base 57 exibe seta para baixo verde; FC 55 / base 56 exibe a mesma seta ↓ verde… o mesmo glifo serve a métricas que caminham em direções de saúde opostas."*
- **Estado vazio de Hoje como exceção positiva** (Achado 6): *"'Nenhum treino registrado hoje' vem com CTA claro '+ Adicionar treino'… este estado vazio diz o que fazer."* (único achado marcadamente positivo do painel, à parte os elogios de B ao Histórico/Monitor.)

---

## 5. ORDENADO POR IMPACTO
*Do que mais atrapalha decidir o treino do dia ao que menos atrapalha. Ordenar não é julgar mérito — a autoria e a nota de cada jurado ficam preservadas.*

| # | Achado (tela · elemento) | Quem | 
|---|---|---|
| 1 | Sinal do dia se contradiz: 90 "recuperado" vs "Débito de sono ~13h"/sono "piorando" (Hoje·Padrões); e 90/71/68 + HRV 57/58,1/61 sem recorte rotulado entre telas | A6 · C4 |
| 2 | Data do Check-in em MM/DD (07/28/2026) — risco de gravar o dia errado (Check-in · campo DATA; B estende a hora AM/PM) | A5 · B6 · C2 |
| 3 | FAB "+" oclui card/texto em scroll e não diz o que adiciona (todas as abas · botão central) | A3 · C3 · (B1) |
| 4 | Topo de Tendências: 71/56/+34 não fecham; 56 e o tooltip "9" pintados de verde (Tendências · tiles/tooltip) | A4 · B2 · C4 |
| 5 | Histórico: 40 notas cortadas em "…" derrotam a varredura — **B considera a melhor tela** (Histórico · coluna de nota) | C1 ⇄ B(melhor) |
| 6 | Inglês solto (STRAIN/RECOVERY/BioCharge) e "STRAIN 0" parecendo quebrado (Hoje · bolinhas de score) | A2 |
| 7 | Barra de nav vaza conteúdo verde e rótulos a 10px perdem contraste ao rolar (todas · glass-bar) | B8 · C(parte 1) |
| 8 | Copy hermética "margem / dosar / proteja a resposta" (Hoje · card Decisão de Hoje) | A1 |
| 9 | Gema repetida 3× em Hoje (herói + badge Resumo + FAB) (Hoje) | B1 |
| 10 | Seis chips de filtro/categoria em Tendências (Tendências · seletor) | A4 · B(pior) |
| 11 | Pastilhas reciclam vermelho/âmbar como categoria; Sono/BioCharge azul gêmeo (Tendências · seletor) | B3 |
| 12 | Setas ↓verde ambíguas para HRV vs FC (Saúde · linhas de sinal) | C5 |
| 13 | Dois corações / três símbolos de sono (Padrões·Saúde·Missão da Noite · ícones) | B4 |
| 14 | Nome acessível ≠ rótulo visível no botão de descanso (Hoje) | C5 |
| 15 | Menisco: brilho da borda compete com o specular da gema (nav) | B5 |
| 16 | Emoji 😴 no chrome do alerta de sono (Hoje) | B7 |
| 17 | Mono peso 700 (borra o glifo) e alvos <44px generalizados, "Voltar" 20px (várias) | C(parte 1) |
| 18 | Warning de chave do React em Today.jsx:1022 (Hoje · código) | C(parte 1) |
| — | **Positivo:** estado vazio de "Treinos de hoje" com CTA claro (Hoje) | C6 · (B: Histórico e Monitor) |

---

## Fora do painel (observação minha — escrivão — não é achado de jurado)

Duas notas de proveniência que nenhum jurado tinha como saber e que ajudam a ler o documento acima. **Não são crítica de design.**

1. **"localhost" e "publicado" compartilham o mesmo backend.** O dev roda com o `/api` do Vite apontado para `https://reck.base44.app`, na conta real do dono. Então os **dados** que os três viram são os mesmos do app publicado; o que difere é só o **build de frontend** (esta branch, com o `MeniscusNav`). Isso qualifica a Parte 1 do C: as diferenças que ele mediu de "publicado → localhost" (os 3 warnings de chave do React em `Today.jsx`) são de build/frontend, não de dado — coerente com o que ele descreveu como "defeito de código".

2. **Os conjuntos de evidência foram desenhados diferentes de propósito**, então "exclusivo" nem sempre é falta de atenção: só **B** tinha `BRAND.md` (por isso as violações de §2/§5/§6 são todas dele); só **C** tinha `audit.json`, código e `REVIEW.md` (por isso as medidas em pixel, o warning do React e a auditoria do relatório são todos dele); **A** só tinha o olho e o app. A convergência A+B+C na data (2.1) é forte justamente por atravessar três conjuntos de evidência distintos.

# BOLD-APPLE — Reck, avaliação de acabamento caliber-Apple

## Veredito (2 linhas)

O craft já é Apple-caliber na **linguagem de material**: a gema com física de vidro, o menisco que cede sob o FAB, o hairline de luz no topo dos cards e a honestidade da ausência (`—` slate, sem número inventado) são decisões de designer maduro, não de template. A maior oportunidade de acabamento é **movimento**: o produto é uma bela fotografia parada — o número-herói não respira, não conta, não transiciona de zona, e as rotas montam secas. Onde a Apple faz o dado *chegar*, o Reck faz o dado *aparecer*.

---

## Movimentos, ranqueados por impacto

### 1. O número-herói que respira e chega contando
**(a) O movimento.** Hoje o `72` dentro da gema é estático. Faça-o **chegar**: na montagem da Today, conta de um piso perceptual (não de 0 — de `valor − 12`, arredondado ao baseline do dia) até o valor real em **~820ms**, curva `cubic-bezier(0.16, 1, 0.3, 1)` (o *ease-out expo* da Apple, desacelera longo). E amarre o **peso variável do glifo Inter ao valor durante a contagem**: `wght` interpola de `320` (frágil) a `760` (robusto) na mesma timeline — o número engrossa conforme sobe, exatamente o que a §3 já promete mas não executa. Depois de assentar, uma **respiração viva** de 4,2s em loop: a luz specular interna da gema desloca `translateY` de `-1px→+1px` e opacidade `0.88→1.0`, `ease-in-out`, alternando. `prefers-reduced-motion`: sem contagem (aparece no valor final), sem respiração, peso fixo no valor final.
**(b) Por que eleva.** O herói é a resposta à única pergunta do app ("o que faço hoje?"). Um número que chega contando comunica *cálculo em curso* — é o próprio verbo "reckon" tornado movimento. A respiração dá **vida biológica** à gema: ela lê como algo que pulsa com você, não um ícone pintado. É o gesto mais Apple que existe (o anel do Activity, o coração do Health).
**(c) Tela + elemento.** Today → gema `RecoveryField`, o glifo `72`.
**(d) Regra.** Honra §3 ("número-herói usa peso variável atrelado ao valor") e §4 (profundidade por luz). Respeita o teto do mono porque o herói é Inter, não JetBrains.

### 2. Uma gema por tela — rebaixe os satélites
**(a) O movimento.** Os satélites **Sono 66** (esfera azul biselada) e **Strain 0** (esfera slate) são gemas em miniatura competindo com o herói — dois planetas orbitando um sol do mesmo material. Retire deles a física esférica. Vire-os **discos planos** de 72px: `background` = `tint-sleep`/`tint-strain` (que já existem, linhas 122–123 do index.css), hairline `inset 0 1px 0 hsl(0 0% 100% / 0.06)`, número em Inter tabular, e **sem** o núcleo luminoso deslocado nem o bisel. A física de vidro fica reservada a **um** elemento por tela: o herói.
**(b) Por que eleva.** "Reduza, não adicione." Quando tudo é gema, nada é herói — a hierarquia de material vira ruído. Rebaixar os satélites faz o `72` verde saltar por *contraste de material*, não por tamanho. É a diferença entre um palco com um holofote e um palco com três.
**(c) Tela + elemento.** Today → satélites Sono/Strain sob o herói.
**(d) Regra.** Honra §6 ("a gema é o herói do produto") e §4 (presença por material, não por saturação replicada). Não desafia nada — corrige uma diluição.

### 3. Ambição tipográfica no título de página — desafio à escala fechada
**(a) O movimento.** "Hoje", "Padrões", "Tendências", "Histórico" abrem a 21px (`t-title`). Num dark premium mobile isso é **tímido** — o título mal domina o kicker de data acima dele. Proponho um **sétimo degrau, `t-hero` a 30px** (`line-height: 1.05`, `letter-spacing: -0.028em`, `font-weight: 700`), aplicado só ao H1 das quatro telas-índice. O kicker de data ("QUARTA-FEIRA, 29 DE JUL.") desce para `t-micro` caps com `tracking: 0.08em` e cor `muted-foreground`. Cria um lockup editorial: micro-caps frio + título grande e apertado.
**(b) Por que eleva.** A Apple abre telas (Fitness, News, App Store) com um título grande e apertado que ancora a rolagem — é a "large title" do HIG. 21px não faz isso; 30px com tracking negativo faz o título ter **peso de manchete** sem virar grito (não é peso 900, é tamanho + tracking, exatamente a filosofia da §3).
**(c) Tela + elemento.** Today / Padrões / Tendências / Histórico → o H1.
**(d) Regra.** **Desafia a §3 ("escala fechada, 6 degraus")**: proponho um 7º degrau. O motivo é que a escala atual tem um vão entre `t-display` (40px, reservado ao número-herói isolado) e `t-title` (21px) — não há degrau de "large title de página", então os títulos ficam subdimensionados. Não é abrir a porta para tamanho arbitrário; é fechar **um** degrau nomeado que a escala esqueceu.

### 4. Coreografia de entrada — cascata na montagem da rota
**(a) O movimento.** Hoje os cards aparecem todos de uma vez. Dê à rota um **stagger**: cada card/seção entra com `opacity 0→1` + `translateY(12px→0)`, duração 460ms, `cubic-bezier(0.16, 1, 0.3, 1)`, com **delay incremental de 55ms** por índice (herói primeiro, depois satélites, depois Missão da Noite, etc.). Teto de 6 elementos escalonados — o 7º em diante entra junto com o 6º, para não arrastar a cauda. `prefers-reduced-motion`: tudo em `opacity` só, sem `translateY`, sem stagger.
**(b) Por que eleva.** A cascata é como a Apple diz "isto foi montado para você, agora" — dá **direção de leitura** (o olho segue a ordem de entrada, que é a ordem de importância) e esconde o custo de render atrás de intenção. Sem ela, a tela "pisca" pronta; com ela, ela se *compõe*.
**(c) Tela + elemento.** Todas as rotas → containers de primeiro nível.
**(d) Regra.** Honra §4 (respeitar `prefers-reduced-motion` sempre). Preenche um silêncio do BRAND (a §4 fala de material, não de coreografia de entrada) — proposta nova, dentro do espírito.

### 5. Transição de zona como cross-fade de cor, nunca troca seca
**(a) O movimento.** Quando um score cruza um limiar (`70` verde, `42` âmbar), a cor da gema/pill hoje troca de estado instantaneamente entre dois check-ins. Faça a mudança de zona **transicionar**: a luz da gema faz cross-fade de `hsl` de zona em **600ms** `ease-in-out`, e a pill de rótulo ("Alta"/"Moderada") faz um `opacity` swap de 220ms com o texto novo subindo 4px. O valor da fonte-única (`getZoneColor`) não muda — só o *caminho* entre os dois estados ganha tempo.
**(b) Por que eleva.** Cor que salta lê como bug; cor que transiciona lê como *estado mudando*. É háptica visual — a Apple nunca troca uma cor semântica sem interpolar. Como a §2 diz que "cor carrega significado", a **transição** carrega a mudança de significado.
**(c) Tela + elemento.** Today → gema + pill de zona; Histórico → chips de score ao re-renderizar.
**(d) Regra.** Honra §2 (a cor continua saindo de `getZone()`/`getZoneColor()` — só animamos entre valores, não reescrevemos limiar) e §4 (movimento respeitando reduced-motion).

### 6. Corte: colapse "ENTENDER OS SCORES" e "Linha do dia" na própria gema
**(a) O movimento.** Abaixo dos satélites há três camadas de meta-texto empilhadas: `⌄ ENTENDER OS SCORES`, o card "Linha do dia" e depois "LEITURA DE HOJE ⌄" e "O que mais influenciou". É **muito andaime para um número**. Corte "Linha do dia" como card separado — funda a frase única ("recuperação alta — há margem pra puxar mais hoje") **diretamente sob a pill RECOVERY/Alta**, em `t-body`, sem moldura. E funda "Entender os scores" num **tap na própria gema** (a gema vira o disclosure — toque abre a folha de explicação). Menos uma borda, menos um card, o gesto mora no herói.
**(b) Por que eleva.** "Reduza, não adicione." Cada moldura extra rouba respiro do herói. A Apple faz o objeto principal *ser* o controle (tocar o anel abre o detalhe) em vez de empilhar um link "saiba mais". Corta cromo sem cortar informação.
**(c) Tela + elemento.** Today → bloco entre a gema e "Missão da Noite".
**(d) Regra.** Honra a §5 do CONTEXT ("premium = hierarquia + herói + espaço em branco + menos texto") e o núcleo anti-placebo (nada some do dado — só a moldura redundante). Inviolável preservado: a frase-ação continua, porque ela *muda decisão*.

### 7. O FAB não pode eclipsar o dado
**(a) O movimento.** Em toda captura rolada, a gema-FAB verde no centro da nav **tampa** conteúdo vivo atrás dela (o `66` do satélite, a linha "Débito de sono", "Manhã boa"). O dissolve inferior (`scroll-edge-bottom`) já derrete o conteúdo — mas ele derrete *tarde demais* sob o FAB. Suba o topo do dissolve mais alto no centro (acompanhando a crista do menisco) e garanta **12px de folga** entre a base do último card e a crista, para que nenhum número legível caia sob o disco verde. Alternativa mais ousada: quando a rolagem passa de ~40px, a gema-FAB **encolhe para 44px e recua** `translateY(6px)` com 200ms, virando um alvo discreto — o herói de ação some do caminho quando você está lendo.
**(b) Por que eleva.** Um controle flutuante que cobre dado é o oposto de honestidade visual — a §8 do BRAND trata o vazio com respeito; o dado cheio merece o mesmo. A Apple encolhe/esconde controles flutuantes na rolagem (Maps, Fotos) justamente para não competir com conteúdo.
**(c) Tela + elemento.** Todas → gema-FAB `meniscus-gem` sobre o conteúdo rolado.
**(d) Regra.** Honra §4 (legibilidade sob camada não é estética, é bug) e respeita `prefers-reduced-motion` (sem encolher, só corrige o dissolve).

---

## O SALTO

**O número-herói que respira e chega contando (movimento 1).** É a aposta única: se o Reck fizer *uma* coisa em nível Apple, que seja a gema pulsando devagar e o `72` engrossando de fino a robusto enquanto conta na abertura. Faz o produto **sentir** que está lendo você *agora* — que o número é uma conclusão sendo alcançada em tempo real, não um rótulo colado na tela. Transforma "abrir o app" em "receber a leitura". É a marca — "reckon", calcular até concluir — virada gesto, e é o tipo de detalhe que faz alguém mostrar a tela para um amigo sem saber explicar por quê.

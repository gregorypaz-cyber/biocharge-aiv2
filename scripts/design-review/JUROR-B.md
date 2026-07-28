# JUROR-B — Avaliação de Design do Reck

*Diretor de arte. Doze anos em produto de saúde. Whoop e Oura na retina. Implico com ofício, não com gosto.*

Julguei com o olho, navegando o app e lendo as telas. Não abri planilha de medida — de propósito. O que segue é composição, símbolo e cor, batido contra o `BRAND.md`.

---

## Achado 1 — A gema aparece três vezes na tela Hoje, e uma delas é botão

**Tela:** Hoje · **Elemento:** herói de Recovery (90), badge "90" do RESUMO DA MANHÃ, e o FAB central.

O `BRAND.md §6` é explícito: *"A marca é a gema — o herói do produto virado ícone."* A gema é, ao mesmo tempo, o herói (o campo de luz do 90), o símbolo de marca e o FAB do check-in. Isso significa que na tela Hoje eu vejo **três esferas verdes luminosas**: o herói gigante (90), o FAB com o "+" preso na nav, e — rolando um pouco — um mini-gema "90" repetido no card RESUMO DA MANHÃ. É a mesma forma dita três vezes, e uma delas não é leitura, é um botão de ação. O olho não consegue separar "isto é meu score" de "isto é onde eu clico". Quando o mesmo objeto é herói e affordance na mesma dobra, o herói perde autoridade. O `§6` fez a marca ser a gema; ninguém decidiu o que acontece quando a gema tem que ser duas coisas ao mesmo tempo na mesma tela. Aqui o BRAND é omisso e o produto pagou.

## Achado 2 — Tendências gasta verde como papel de parede, e um caso disso é placebo puro

**Tela:** Tendências · **Elemento:** tile "Período selecionado 56", linha de Vitalidade (51), barras de Volume de corrida, tooltip "Recovery base: 9".

O `§2` é a régua que o próprio documento chama de *"a regra que mais governa trabalho"*: verde = zona ≥70 · delta positivo · marca. E diz, com todas as letras: *"Verde gasto em número neutro rouba o significado do verde."* Em Tendências o verde virou tinta de fundo. O tile "Período selecionado" mostra **56 em verde** — 56 é zona âmbar (42–69) pela própria `getZone()` do `§2`. Ao lado, "Últimos 7 dias 71" também verde (esse correto). Dois valores de zonas diferentes, pintados igual, na mesma fileira. Pior: o tooltip do gráfico mostra **"Recovery base: 9" em verde** — 9 é vermelho profundo, e está verde. Isso é exatamente o inimigo declarado no `§`essência: *"o placebo — número bonito que não muda decisão."* A linha de Vitalidade (51) e as barras de Volume também são verdes por padrão decorativo, não por zona. Quando tudo é verde, nada é verde. Essa tela desliga o dispositivo semântico mais importante da marca.

## Achado 3 — As pastilhas de série reciclam vermelho e âmbar como se fossem cor de categoria

**Tela:** Tendências · **Elemento:** seletor de métricas (Recovery/Sono/Fadiga/Estresse/HRV/BioCharge) e o gráfico "Recovery vs Fadiga".

O `§2` reserva **vermelho** para "zona <42 · alerta agudo" e **âmbar** para "zona 42–69 · desvio". Nas pastilhas, Fadiga ganhou um ponto **vermelho** e HRV um ponto **âmbar** — puramente como cor de legenda, sem nenhuma zona por trás. Aí, no gráfico "Recovery vs Fadiga", barras vermelhas de Fadiga convivem com barras vermelhas que *deveriam* significar perigo em outra tela. O leitor treinado pelo app a ler "vermelho = alerta" recebe vermelho como "categoria fadiga". É colisão de vocabulário. Some a isso que **Sono e BioCharge têm os dois o mesmo ponto azul** — dois símbolos idênticos para coisas diferentes na mesma fileira de chips. O `§1` até separa `--bio-blue` (sono) de outras funções, mas na tela viraram gêmeos.

## Achado 4 — Dois corações e três sonos: a iconografia repete símbolo

**Tela:** Padrões (e cruzando com Saúde e Missão da Noite) · **Elemento:** ícones de HRV, FC de repouso, e as várias representações de sono.

Em "Sua evolução" (Padrões) o HRV usa um **coração-com-pulso** e o FC de repouso usa um **coração liso**. Dois glifos cardíacos quase idênticos, empilhados a dois cliques de distância — o olho tropeça pra decidir qual é qual. E o mesmo HRV que é coração-pulso aqui vira **ponto verde** no Monitor de Saúde: um mesmo dado, dois símbolos, duas telas. Sono é ainda mais espalhado: **cama** em "Sono (score)", **lua** em "Sono profundo", **lua** de novo na Missão da Noite. Três desenhos para um domínio. O `§5` manda "Lucide, exclusivamente" — e são todos Lucide, ok — mas exclusividade de biblioteca não é o mesmo que disciplina de símbolo. O BRAND não legisla "um conceito, um glifo", e devia. Este é um caso em que aponto o documento como incompleto, não a tela como rebelde.

## Achado 5 — O menisco: 70% ofício, 30% firula, e o defeito é o brilho da borda

**Tela:** todas com nav · **Elemento:** a superfície da nav que curva sob o FAB.

Vou ser justo: a curva funciona. O FAB-gema assenta na cova como uma gota d'água, e é uma citação honesta da física de vidro que o `§4` pede ("núcleo luminoso deslocado, Fresnel, specular"). Não é firula gratuita — dá lar ao botão central. **Mas** a borda do menisco é um *hairline* branco brilhante que sobe junto com a curva, e esse brilho **compete com o specular da própria gema** logo acima. Você tem dois destaques luminosos a 20px um do outro fazendo a mesma coisa. O `§4` diz "profundidade vem de luz, não de sombra chapada" — concordo — mas duas luzes disputando é ruído, não profundidade. Corte o rim: deixe a gema ser a única fonte especular ali. E a assimetria do calombo (só o centro sobe, as tabs internas ficam sob vidro mais alto que as externas) não carrega significado nenhum. Mantenha o menisco; mate o brilho da borda.

## Achado 6 — O check-in vaza locale de input nativo e quebra a voz da marca

**Tela:** Check-in · **Elemento:** campo DATA (07/28/2026) e campos de hora (09:09 PM, 07:56 PM).

O app inteiro fala pt-BR e data brasileira: "TERÇA-FEIRA, 28 DE JUL.", "28/07/2026". Aí o campo de data do check-in mostra **07/28/2026** — formato americano MM/DD — e os horários vêm em **AM/PM** ("09:09 PM"), enquanto a própria dica logo abaixo escreve "Ex: 23:00" em 24h. Contradição dentro do mesmo campo. São controles nativos do navegador não domados, e traem a `Personalidade` do `§`("Português do Brasil, segunda pessoa"). Não é só idioma: é a marca perdendo o controle da superfície num dos dois momentos em que o usuário realmente digita.

## Achado 7 — Emoji no chrome, exatamente onde o BRAND proíbe

**Tela:** Hoje · **Elemento:** alerta "Débito de sono" com carinha 😴.

O `§5` é taxativo: *"Emoji não é ícone… Emoji nunca aparece em chrome, label ou navegação."* E a `Personalidade`: *"Sem emoji no chrome."* O alerta "Débito de sono: ~13h nos últimos 7 dias" traz uma carinha de sono à esquerda. Isso é chrome gerado pelo sistema, não input do usuário — a exceção do `§5` (humor/DOMAIN_OF) não cobre. Um Lucide `moon` ou `bed` já existia a três cards de distância. Troca barata, violação clara.

## Achado 8 — Durante a rolagem, o conteúdo verde atravessa a nav e come os rótulos

**Tela:** Hoje e Check-in (midscroll) · **Elemento:** a barra de vidro sobre conteúdo claro.

Parado, o vidro está bonito. **Rolando**, o problema aparece: em Hoje o herói "90" e "Manhã muito boa" fantasmam através da barra e passam bem atrás de "Padrões / Tendências"; no Check-in o "Performance" e o slider verde vazam sob os rótulos. O `§4` avisa que fallback fraco de vidro "é bug de legibilidade, não de estética" — aqui nem é fallback, é o blur ativo deixando luminância verde demais passar. Os rótulos da tab bar (que o `§3` já coloca no piso de 10px) perdem contraste justo quando há movimento. É o momento em que a composição está pior, e é o momento que ninguém revisa parado.

---

## Melhor e pior tela

**Melhor: Histórico.** É a única tela onde a cor faz exatamente o trabalho que o `§2` exige e nada além: 90 verde, 59 âmbar, 35 vermelho — zona pura, `getZone()` visível a olho nu. O agrupamento por semana com "avg 61 ⚠" e as setas de tendência dão ritmo e leitura instantânea, parada e rolando. Honra o `§8` sem esforço: a semana ruim não é escondida, é marcada. Menção honrosa ao **Monitor de Saúde**, que é a expressão mais limpa da honestidade do `§8` — as linhas "em breve (anel)" em cinza com "—" e o disclaimer são marca-verdade em estado sólido. Menos ambiciosa, mas impecável de conduta.

**Pior: Tendências.** É onde a tese anti-placebo da marca é atropelada pela própria interface. Verde vira papel de parede (Achado 2), vermelho e âmbar viram cor de legenda (Achado 3), 56 e 9 aparecem pintados de "bom". Seis chips de categoria é dashboard genérico — o oposto do "silêncio > sinal fabricado" do `§8`. O gráfico em si é competente, nível Whoop; o problema é que a disciplina cromática da marca morre aqui.

---

## Nota

O produto tem herói de verdade, um Histórico que é aula de cor semântica, e um Monitor que encarna a honestidade da marca. Mas a régua que o próprio documento chama de "a que mais governa" está quebrada em Tendências, tem emoji onde o `§5` proíbe, locale vazando no check-in, e a gema se repete a ponto de virar ruído em Hoje. Nada disso impede a tarefa — mas várias coisas estão claramente erradas, e uma delas (56/9 em verde) é justamente o placebo que a marca jurou combater.

**7/10** — competente, várias coisas claramente erradas.

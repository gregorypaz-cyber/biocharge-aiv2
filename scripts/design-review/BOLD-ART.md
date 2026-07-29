# BOLD-ART — Direção de arte do Reck

*Parecer de diretor de arte. Opinativo, ranqueado por impacto. Nada de conformidade — só saltos.*

---

## VEREDITO (2 linhas)

O Reck tem **uma** ideia visual genuinamente memorável — a gema de luz do Recovery — e ela é ótima; mas ela vive sozinha numa ilha, cercada por um dashboard escuro competente e completamente genérico (cards cinza, labels cinza, gráficos Recharts verdes, listas). A maior chance de assinatura não é inventar nada novo: é **promover a física de luz da gema a linguagem de sistema** e deixar a tipografia-instrumento contar a mesma história honesta que a copy já conta. Hoje o app tem alma numa tela e amnésia nas outras cinco.

---

## OS MOVIMENTOS (ranqueados por impacto)

### 1. A gema deixa de ser um objeto e vira o SISTEMA — cada domínio ganha seu campo de luz

**(a) O movimento:** hoje só o Recovery é gema. Sono (66, azul), Strain, Vitalidade (49) e o veredito de Saúde ("Normal") são números chapados atrás de labels cinza — dá pra ver isso literalmente no rodapé da Today (os "66 / SONO" e "STRAIN" borrados atrás do FAB). Transforme os **satélites em micro-gemas** da mesma família física (núcleo luminoso deslocado, Fresnel, specular), só que menores e na cor do domínio: Sono = campo azul (`--bio-blue`), Strain = campo laranja (`--bio-orange`), Vitalidade = campo âmbar. Não um anel, não um donut — o mesmo *blob orgânico de vidro*, escalado. A Today vira uma constelação de campos de luz de cores diferentes, não um número grande e três caixinhas.

**(b) Por que eleva:** um app tem assinatura quando você reconhece **uma tela dele sem o logo**. A física de vidro da gema é isso — mas um único ponto de assinatura numa tela de seis não faz marca, faz mascote. Repetir a física em azul/laranja/âmbar cria um *idioma*: "no Reck, todo sinal vivo brilha; sinal sem dado é slate morto". Isso também resolve o placebo de graça — a ausência de luz passa a *significar* ausência de dado, visualmente, sem texto.

**(c) Tela + elemento:** Today, os satélites de Sono/Strain sob o herói; Insights, o "Vitalidade 49"; Saúde, o veredito.

**(d) Regra:** honra §6 (A gema é o herói do produto virado símbolo) e §4 (profundidade por luz, não sombra) — é levar a §6 até a consequência lógica dela. Honra §2 (cor de domínio: azul=sono, laranja=strain).

---

### 2. Tipografia-instrumento: o número mono passa de detalhe a IDENTIDADE do app inteiro

**(a) O movimento:** o app já usa JetBrains Mono em pontos certos (ACWR `0.00`, `75.2 kg`) — e é a coisa mais *distintiva* depois da gema, porque monoespaçado lê como **leitura de instrumento**, não como marketing de wellness. Isso está sub-explorado. Torne o mono a **textura assinatura de todo dado bruto do app**: HRV, RHR, horas de sono, despertares, peso, deltas — tudo em JetBrains Mono, alinhado em colunas tabulares reais, com o ponto/vírgula decimal sempre na mesma coluna vertical. O Reck deve parecer um **osciloscópio pessoal**, não um app de saúde. O número-herói da gema (o `72`) continua em Inter — é o veredito, não o dado bruto; essa distinção Inter-veredito / mono-medição vira regra de leitura visível.

**(b) Por que eleva:** essa é a tradução visual EXATA da tese anti-placebo. "Mono = medido, Inter = concluído." O usuário sente que está lendo um sensor, não um feed motivacional. Nenhum concorrente (Whoop, Oura, Zepp) commita nisso — todos usam sans humanista pra "acolher". O Reck seco, de consoante seca, merece a tipografia seca. É o "só o Reck faz isso" mais barato de implementar e mais alto de retorno.

**(c) Tela + elemento:** Resumo da manhã (RMSSD 55 / RHR 59 / Sono 6.28h), Check-in (todos os campos numéricos), Padrões ("Sua evolução": HRV 56.9, FC 59, Sono -20.6), Tendências (eixos e valores).

**(d) Regra:** honra §3 exatamente ("Dado/número → JetBrains Mono", teto `font-semibold`, "tipografia carrega significado, igual a cor"). É cumprir §3 com radicalidade, não desafiá-la.

---

### 3. O sangramento de luz: o veredito do dia tinge a MEMBRANA do app

**(a) O movimento:** hoje o topo da tela é preto neutro e a cor de zona fica presa dentro da gema. Deixe a gema **vazar**: um único gradiente radial muito sutil, na cor de zona do dia (verde/âmbar/vermelho de `getZoneColor`), subindo do herói e dissolvendo no `--background` antes de chegar no header — como se a gema iluminasse a sala. Um fio de luz de 1px na cor de zona pode correr sob a status bar. Verde num dia bom, âmbar num dia investigativo, vermelho num alerta — o **app inteiro muda de temperatura conforme seu corpo**, sem um único card novo.

**(b) Por que eleva:** este é o *momento-assinatura* — o que a pessoa lembra depois de fechar. Abrir o app e sentir a cor do dia antes de ler qualquer número é uma experiência corporal, não informacional. E é rigorosamente honesto: o tint É a zona, calculada por `getZone()`, não decoração. Em dia de calibração, sem zona, **não há tint** — slate, coerente com §8.

**(c) Tela + elemento:** Today, região atrás/acima do herói até o header.

**(d) Regra:** **desafia parcialmente §2** ("cor carrega significado, não decora" e "verde gasto em número neutro rouba o significado do verde") — porque espalha cor de zona por uma superfície grande. Defesa: não é neutro, é *a* leitura, a mesma fonte única (`getZoneColor`), aplicada com opacidade baixíssima e só quando há zona. Honra §4 (profundidade por luz) e §8 (ausência = sem dado = sem tint).

---

### 4. Os gráficos abandonam o preset Recharts e entram na física da casa

**(a) O movimento:** as linhas de Tendências são verde-neon puro sobre grid cinza pontilhado — é o gráfico default de qualquer lib, some no meio de mil dashboards. Dê a eles a assinatura de luz: linha com **glow/bloom** na cor do sinal (o mesmo Fresnel da gema, versão 1D), área preenchida por gradiente que morre em transparência, ponto "hoje" como uma **micro-gema pulsante** na ponta da linha em vez de um dot chapado. O scatter "Sono × Recovery" com pontos de vidro, não círculos flat. O eixo em mono, discreto.

**(b) Por que eleva:** gráfico é onde apps de dado revelam se têm ponto de vista ou se só chamaram uma lib. Um Reck com gráficos de *luz* — linhas que parecem trilhas de fósforo num tubo de raios — amarra Tendências à Today num único material. Coerência de sistema é o que separa "tem uma tela bonita" de "tem uma marca".

**(c) Tela + elemento:** Tendências (Recovery base, Recovery vs Fadiga, Peso, Volume de corrida, Vitalidade ao longo do tempo); Insights (correlações).

**(d) Regra:** honra §4 (material e luz como profundidade) e §2 (cada série na cor semântica do seu domínio). Proíbe explicitamente o "brilho saturado chapado" da §4 — então: bloom com falloff físico, nunca neon uniforme.

---

### 5. O Histórico vira a fita sísmica da tua vida — não uma lista

**(a) O movimento:** o Histórico hoje é a tela mais genérica e mais densa do app — linhas e linhas de números minúsculos, o oposto da §UX "menos texto, herói gráfico". Ele é também o único lugar que guarda a *alma longitudinal* do produto (a história do corpo do dono ao longo de meses) e desperdiça isso numa planilha. Reimagine como uma **fita/sismógrafo vertical**: uma coluna-espinha contínua à esquerda onde cada dia é uma marca de altura/cor = recovery daquele dia — uma leitura de sismógrafo que você *rola pelo tempo*. Os "Retrospecto da semana" já existentes viram os marcos maiores nessa fita. Números só aparecem no dia que você toca.

**(b) Por que eleva:** transforma a tela mais fraca na mais emocional. Ver 54 dias como um traçado contínuo de altura variável é sentir o próprio corpo como um sinal — reforça toda a tese "leia seus sinais". E dá ao Reck um segundo momento-assinatura, de escala oposta ao da gema: a gema é o *hoje*, a fita é a *vida*.

**(c) Tela + elemento:** Histórico, a lista inteira.

**(d) Regra:** honra a §5 do CONTEXT ("herói gráfico + espaço em branco + menos texto") e §3 do BRAND (número-herói vs. dado). Honra §8 — dias sem dado = lacuna real na fita, não linha preenchida.

---

### 6. Micro-tipografia expressiva no veredito: o peso do número é o sinal vital

**(a) O movimento:** o BRAND §3 já pede que o número-herói use peso variável atrelado ao valor ("fino = frágil, robusto = alto"). Na Today isso está tímido — o `72` parece o mesmo peso que um `45` pareceria. Torne o eixo `wght` do Inter **dramático e legível de longe**: um recovery baixo desenha um `41` afilado, quase transparente, frágil; um `88` desenha um número encorpado, denso, confiante — sem nunca chegar ao "grito" do 900 que a §3 proíbe (teto ~700). O mesmo gesto na tag "Alta/Baixa" abaixo. O número não *tem* um estado; ele *é* o estado, na carne do glifo.

**(b) Por que eleva:** é tipografia como diagnóstico — antes de ler o valor você já sente se o dia é forte ou frágil. É a expressividade tipográfica que dá personalidade sem recorrer a peso-black decorativo. Micro, mas é o tipo de detalhe que faz alguém dizer "isso foi *pensado*".

**(c) Tela + elemento:** Today, número dentro da gema e a label de zona; Check-in, o `72 Recovery alto` do plano preliminar.

**(d) Regra:** honra §3 diretamente ("Número-herói usa peso variável atrelado ao valor… a tipografia carrega significado, igual a cor") e respeita o teto de peso ("Peso 900 em UI é grito").

---

### 7. O check-in humano: os seletores de humor viram a única assinatura "quente" do app

**(a) O movimento:** os seletores de Disposição/Estresse/Hidratação/Dor são pílulas com ícone colorido — funcionais mas indistinguíveis de qualquer form. Este é o único momento em que o app é *input do humano*, não *output do sensor* (o BRAND §5 até reconhece o emoji como "input intencional do usuário"). Dê a essa fileira um gesto próprio: a opção selecionada acende como uma **brasa/gema pequena** na cor do estado, e a fileira inteira lê como um teclado de instrumento. O contraste com a frieza mono do resto vira intencional: sensores são frios, tua percepção é a coisa que brilha.

**(b) Por que eleva:** cria tensão de sistema — o app inteiro é instrumento seco, e no único ponto onde *você* fala, ele esquenta. Essa polaridade é ponto de vista. Sem ela, o check-in é só um Google Form escuro.

**(c) Tela + elemento:** Check-in, blocos Bem-estar (Disposição, Estresse, Hidratação, Dor Muscular).

**(d) Regra:** honra §5 (emoji como input mapeado pra Lucide no render) e §2 (cor do estado). Honra §4 (a "brasa" é luz, não sombra).

---

## O SALTO

**A gema deixa de ser um ícone e vira um organismo vivo que É o app.**

Um único campo de luz — nascido no Recovery, replicado em azul pro sono e laranja pro strain, com gráficos feitos da mesma luz e uma fita sísmica que guarda sua história. O peso do número é seu sinal vital; a cor do dia sangra pela membrana da tela e muda a temperatura da sala antes de você ler um dígito; e no instante em que você salva o check-in, a gema **se remorfa ao vivo** do valor de ontem pro de hoje — uma única animação orgânica de 600ms que é a coisa que a pessoa vai imitar com a mão pra mostrar pro amigo. Não um dashboard com um enfeite bonito: um instrumento vivo que respira na cor do teu corpo. Isso é o "que app é ESSE?".

Aposto tudo nesse gesto: **um material, muitas cores, uma física — e o momento-morph no check-in como o clímax.** Tudo o mais no app se subordina a ele.

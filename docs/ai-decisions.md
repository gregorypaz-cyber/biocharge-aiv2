# Decisões de IA — log append-only

> Entradas mais recentes no topo. Nunca reescrever entrada antiga, só acrescentar.
> Entradas anteriores a 28/07/2026 vivem nos arquivos do Projeto (ainda não migradas).

## 2026-08-15 · Tendências — honestidade de veredito + fonte única (3 ondas)

**Nenhuma fórmula tocada** (recovery, sono, strain, readiness, constantes intactos).
Todas as mudanças são de gate/apresentação. Lógica pura extraída para
`src/lib/trends-gates.js` (sem React), coberta por `src/lib/__tests__/trends-gates.test.js`.

### Scatter: alvo trocado (recovery → HRV do dia seguinte) — anti-circularidade
- O scatter "Sono × Recovery do dia seguinte" correlacionava sono contra `recovery_score`,
  mas **sono é 30% do recovery** (CONTEXT §3) — é a tautologia que o `detectCorrelations`
  proíbe explicitamente (§2.3). Alvo trocado para **HRV do dia seguinte** (`nextDay.hrv`),
  independente do sono. Eixo Y agora "HRV (ms)", domínio automático.
- **Sem linha em regime misto:** se a janela de 30 dias cruza a quebra de sono de
  **11/07/2026** (`REGIME_BREAK`), a reta é suprimida — uma reta sobre dois regimes mede
  a mudança de rotina, não o corpo. Pontos coloridos por regime (pré = slate / pós = azul).
- **Direção implausível anotada:** se `r < 0` e `p ≤ 0,05` (mais sono → menos HRV), o rodapé
  explica que é o artefato que o `_hrvTrustFactor` já corrige no score — aqui aparece cru.

### ACWR: gate de crônica mínima (respeita o motor)
- `classifyTrainingLoad` (trends-gates): antes de classificar por ratio, se
  `lowConfidence` **ou** `chronic < 4` pontos/semana (`ACWR_CHRONIC_MIN`), o card vira
  estado **muted** ("Sem base de comparação"): sem vermelho, sem pill "Carga muito alta",
  ponteiro cinza no centro. `ratio > 2` é marcado "fora de escala" em vez de saturar o
  ponteiro em silêncio. Motivo: uma sessão depois de semanas parado infla a razão sem carga real.

### Gate de recência nos cards de corrida (21 dias)
- Volume semanal e Economia de corrida ficam **dormentes** quando a última corrida com
  distância é > 21 dias atrás: sem pill de veredito, texto "Sem corridas nos últimos N
  dias…". O histórico de Volume segue visível em cinza. Evita publicar "22% menos eficiente"
  sobre um fóssil.

### Peso: fonte única `weightTrend` (Hoje = Tendências)
- Hoje mostrava "tendência real" (EWMA do FatLossEngine) e Tendências "média de 7 pesagens":
  dois números para a mesma coisa. Nova função canônica **`weightTrend(checkins)`**
  (`physiological-engine.js`) → `{ current, delta7, delta100d, samples }`, definida como
  **média móvel de 7 pesagens**. `FatLossCard` (Hoje) e `WeightTrendCard` (Tendências)
  consomem o mesmo `current` — nenhum recalcula por conta própria. O engine de corte
  (fase/ritmo/ETA) segue por trás, mas não define mais o número exibido. **Não entra em
  nenhuma fórmula de score.**

### Vitalidade: janelas rotuladas (mesma engine, janelas diferentes)
- Padrões (`BodyAgeCard`, pontual/últimos ~30 dias) mostrava 58; Tendências
  (`LongevityTrendCard`, média móvel de 3 semanas) mostrava 55. Ambas usam `computeBodyAge`
  — a divergência é legítima de janela. Em vez de dois números nus, cada tela **rotula a
  própria janela**: "hoje" (Padrões) vs "média 3 semanas" (Tendências).

### Outros (Onda 2)
- Cada card fora do seletor 7D/30D/90D declara a própria janela numa t-micro cinza.
  Subtítulo da página explicita que o seletor só rege o gráfico principal.
- "Média de N dias": número perde o âmbar da série — recovery segue a gramática de zona
  (`getZoneColor`), as demais métricas ficam neutras.
- Bug do tooltip "faixa normal: 63101" corrigido: faixa `[lo, hi]` formatada como "lo–hi".
- Eixo X já estava em dd/MM via `formatDateChart` em todos os gráficos — nenhum
  `tickFormatter` extra foi adicionado (reprocessaria uma data já formatada e a quebraria).

## 2026-08-14 · Padrões/Insights — honestidade de dado + hierarquia (3 ondas)

**Nenhuma fórmula tocada** (recovery, sono, strain, readiness, constantes intactos).
Onda 1 = honestidade de fonte/gate; ondas 2–3 = composição e superfície de IA.

### Fonte da tendência de sono trocada (Zepp → v2 próprio)
- `detectLongTermTrends` (`physiological-engine.js`): a linha **"Sono (score)"** passou
  a medir `sleep_quality` (saída do `calculateSleepScore` v2, sinal cru portável) em vez
  de `sleep_score` (o **composto do Zepp**, que por CONTEXT §3 é só referência de
  calibração e não entra em fórmula). A definição do Zepp muda entre firmwares e não é
  portável — medir tendência sobre ele misturava réguas.
- **Aviso de não-comparabilidade:** valores anteriores dessa linha (que refletiam o
  composto do Zepp) **não são comparáveis** com os novos (score v2 próprio). A tendência
  recomeça do zero conceitual nesta troca; não ler a inflexão de 08/2026 como mudança
  fisiológica.
- Cada métrica de tendência agora expõe `basis` (`'media 7d'` p/ o HRV suavizado, `'hoje'`
  p/ o resto) e a janela expõe `firstDate`/`lastDate` — a UI rotula a base temporal por
  linha e avisa quando a janela atravessa a quebra de regime de sono de 11/07.

### Gate anti-quase-binário em `buildRecentShifts` (Insights.jsx)
- Sono <7h que já domina **>85% de ≥15 noites** com registro deixa de acender item
  negativo "sono recente curto" e vira item **neutro** "sono curto virou o seu normal":
  não é mudança recente, é o regime atual (CONTEXT §2.4 — variável quase-binária não gera
  alerta). Evita o vermelho crônico que acende todo dia e vira placebo.
- Recovery: o limiar fixo de ±5 pts virou **efeito mínimo relativo** — exige
  `|Δ7v7| ≥ max(5, sd(deltas 7v7 das últimas 8 janelas))`, com nota de variação típica no
  texto. Só sinaliza mudança acima do ruído próprio.

### Correlações promovidas ao topo + ficha técnica exposta
- Bloco de correlações movido para logo abaixo do herói, aberto por padrão. `detectCorrelations`
  agora expõe `p` no payload; o `CorrelationsCard` mostra `r · n · p` (font-mono cinza, sem
  cor semântica — ficha técnica, não alerta).
- Herói sem sinal deixa de ser card vazio: `detectPersonalBottleneck` expõe `evaluated[]`
  (label, r, n, passed — só dados já calculados no loop) e a UI lista "o que estou testando
  agora" contra o corte, com rodapé "o silêncio aqui é proposital".
- Superfície de IA fundida: "Leitura completa" + "Pergunte ao Coach" → card único
  **"Pergunte ao Reck"** (leitura completa vira a 1ª sugestão da lista). `askLLM`/
  `buildCoachContext`/estados preservados — só a casca mudou. Dívida de sono usa
  `sleepDebt.debt` com 1 casa (mesmo número da Hoje), sem `~7h` arredondado à mão.

### Testes
- Suite inteira verde (127 testes). Nenhum teste fixava `'sleep_score'` como chave, então
  não houve teste a atualizar por causa da troca de fonte.

## 2026-08-14 · Reorganização da Today (3 ondas) — só composição de tela

**Nenhuma fórmula tocada** (recovery, sono, strain, readiness, constantes intactos).
Puramente composição/hierarquia da tela Hoje, em 3 commits.

### Onda 1 — deduplicar e reordenar
- `priorityEngine.ts` (4 fases): `why_score` vira `action:'exclude'` — `renderCard`
  já retornava `null`, mas o card consumia uma vaga de `MAX_PRIMARY`, cortada antes
  do render. `current_state` removido do descriptor (era removido pelo `strip` no
  Today depois do corte — vaga desperdiçada). `morning_recovery` movido para
  `priority 2.5` (a causa da noite vem antes do plano e dos treinos).
- Today.jsx: removido o banner de fase (duplicava o verbo do herói; `bannerCfg`
  mantido pois outras props seguem em uso). `QuickIntentEdit` deixou de ser card
  próprio — passou para dentro do `ExecutionCard`, abaixo dos chips. Removida a
  frase-ação repetida sob os satélites e o subtítulo "Decisão do dia" do cabeçalho.
- **Fusão do plano**: `DayFocusCard` saiu do fragmento de `execution` e passou a ser
  renderizado logo acima do card de sono (`sleep_forecast`), no mesmo `React.Fragment`.
- **Um só número de débito**: a bullet de dívida de sono saiu do `DayFocusCard`
  (filtrada na apresentação, sem tocar `buildDayFocus`); o número canônico fica no
  `SleepForecastCard` com 1 casa decimal. Antes: 6,9h vs ~7h no mesmo scroll.

### Onda 2 — herói decide, sem repetir
- **Linha de causa** sob os satélites do herói (font-mono, fato não alerta, sem cor):
  sono em HhMM · HRV + Δ vs baseline · FC + Δ vs baseline. Deltas vêm de
  `analysis.baseline` (d14→d7) — **não** recalcula média local. Cada termo sem dado
  é omitido.
- **Chip de saúde** ao lado do baseline quando `healthSignals.state` é `acute`
  (âmbar "Sinais fora do padrão") ou `sustained` (vermelho "2º dia de sinais
  alterados"), tap → `/saude`. `normal`/`calibrating` → silêncio.
- **Alvo de carga** no `DayFocusCard`: primeira linha "Hoje · carga alvo até
  {strainTarget}" (prop vinda do Today), só o número — sem prescrever treino.
- `TrainingSessionsList`: empty state único (0 sessões oculta "Resumo do dia" e o
  CTA duplicado do header; sobra um bloco com mensagem + um CTA).

### Onda 3 — acompanhamento vira linha, títulos viram sistema
- `FatLossCard` em **modo compacto por padrão**: uma linha (ícone + "Corte" + peso
  font-mono + delta/semana + sparkline 14d h=24 + chevron que expande o card completo).
- **Header único de card**: ícone Lucide 16px + `text-sm font-semibold tracking-tight`
  (sentence case). Convertidos "DECISÃO DE HOJE" (ícone Compass), "CORTE" e
  "ARQUITETURA DA NOITE". Maiúsculas só em eyebrows de seção fora de card.
- **Nomenclatura** no `MorningRecoveryCard`: "RMSSD"→"HRV", "RHR"→"FC repouso"
  (bate com o `RecoveryDriversCard`); tile de sono em HhMM (6h22), não 6.37h.
- Data removida do cabeçalho do `MorningRecoveryCard` (já está no topo da tela).

**Por quê:** a Today acumulou duplicações (mesmo verbo no banner e no herói, dois
números de débito com arredondamentos diferentes, dois empty states de treino, dois
CTAs) e altura excessiva. Objetivo: uma única frase de veredito, um único número de
débito, um único CTA de treino, e títulos consistentes — sem tocar em nenhuma fórmula.

## 2026-08-12 · Sessão de agosto: BYO-LLM, backup e badge de sono

### Fonte de noite: Fitbit Air SUBSTITUÍDO pelo Garmin Cirqa
O §2 do plano de ingestão foi respondido **sem conta Garmin**: o RMSSD só aparece em
leituras de 5 min e a temperatura **não tem endpoint** na `python-garminconnect` → a
entrada de noite fica **manual** por ora. **Por quê:** não travar o produto na compra —
a automação de ingestão foi **desacoplada** da aquisição do relógio. O Cirqa é o plano
vigente de fonte de noite; o Fitbit deixou de ser plano.

### BYO-LLM via OpenRouter
Coach + análise profunda + deep-analysis passam a rodar por provedor próprio. **Por quê:**
tirar o runtime de LLM do crédito de integração Base44 (free, escasso). O **retrospecto
semanal fica de fora** por ser função de **backend** — a chave do usuário nunca pode ir ao
backend, então ele segue no crédito Base44.

### stress_score REMOVIDO do prompt da análise
`stress_score` é **composto** (stress 50% + mood 30% + energy 20%), assume **só 3 valores
em 21 dias**, e o modelo o interpretou literalmente como "50% de estresse", produzindo
**diagnóstico causal sem base**. **Por quê:** um número composto e quase-binário não é
evidência — dava munição para o modelo inventar causa. Fora do prompt.

### notes (check-in) e notas de treino ENTRARAM no prompt
Com regra explícita de **nunca citar literalmente**. **Por quê:** a nota é contexto de vida
e de esforço percebido que os números não capturam — ela deve **mudar a conclusão, não
enfeitá-la**. Citar literal viraria enfeite; usar como evidência muda a leitura.

### AnalysisHighlights: heurística de frases → leitura de cabeçalhos
A pontuação de frases aceitava `score > 0`, então **qualquer frase com número** virava
"Pede atenção". **Por quê:** falso positivo estrutural. Trocado por leitura direta dos
cabeçalhos da análise, que já carregam a hierarquia.

### Badge de regime de sono (Direção B) no ar
Dispara em ~**76%** das noites no regime atual. Limiares **NÃO recalibrados de propósito**.
**Por quê:** calibrar com 21 noites de um regime atípico (pós-bebê) fixaria a régua no
transitório — melhor badge honesto de baixa confiança do que limiar falsamente preciso.

### awake_minutes: colinearidade resolvida, sinal ainda não-testável
A **colinearidade estrutural com o regime foi RESOLVIDA** (há noites de 66% e de 99% no
mesmo mês). Mas o sinal **segue não-testável**: deriva temporal (parcial r=−0,34, p=0,13)
e alvo **quase-binário** (energia: 95,2% em 2 valores). **Por quê:** sem variância no alvo
e sem controle da deriva, não há como extrair sinal — fica congelado, não descartado.

### Autocorreção registrada: teste de minutos-por-despertar tinha premissa falsa
Três noites (**04, 05 e 07/08**) foram acusadas de implausíveis por um teste de
minutos-por-despertar; as **notas do próprio dono confirmaram que eram reais**. **Por quê
o teste errou:** despertares **não são intercambiáveis** — o teste embutia a premissa falsa
de que todo despertar dura um tempo comparável. Premissa removida.

## 2026-07-28 · Investigação de peso do Recovery ENCERRADA sem re-peso

### Decisão
Manter Recovery em **HRV 50% / RHR 20% / Sono 30%**. A investigação de peso, congelada
em 19/07 e reaberta hoje a pedido do dono, é encerrada **sem alteração de pesos**.

### Evidência (harness Node importando a engine real do main; recalculou 70 dias, bate
### exato com os scores salvos nos dias recentes)
1. **Envelope de peso.** No dia-problema (27/07, zHRV +0.52 / zRHR +0.48 / zSono +0.58 —
   todos positivos), varrendo as **231 combinações possíveis** de peso: score mínimo 79,
   máximo 82. Amplitude de **3 pontos**, todos verdes. Nenhuma ponderação conserta o dia.
2. **Bootstrap (1000 reamostragens).** IC95% do peso ótimo de HRV = **[0.00, 0.70]**.
   O intervalo cobre quase o espaço inteiro: com n=70 o peso **não é identificável**.
3. **Validação temporal (treino mai-jun → teste jul).** Peso otimizado no passado deu
   **r=0.01** em julho; o peso atual deu **r=0.411**. O ótimo in-sample é ruído puro.

### O problema real: NORMALIZAÇÃO, não ponderação
Baseline de sono caiu de **83 (sd 3.3)** no regime pré-bebê para **50 (sd 27)** no atual.
O sono de 27/07 (64 pts) vale z **+0.58** contra a régua atual e z **−2.39** contra a do
regime normal — **2.97σ de deriva pura de baseline**. Shifting baseline syndrome: o app
responde honestamente a "foi melhor que as últimas duas semanas?" quando a pergunta é
"estou recuperado?".

Simulação de correção (janela de 60 noites em vez de 14): 27/07 cairia 81 → 71; no regime
normal o impacto é Δ médio 1.4 pts e 2 zonas alteradas em 59 dias. **Não implementado** —
fica registrado como candidato para quando o regime estabilizar.

### Gate de reabertura
Não reabrir sem (a) regime de sono estável e (b) alvo com variância real.

## 2026-07-28 · Campo awake_minutes + saneamento da regularidade + correções de schema

### Decisões
1. **Criado `awake_minutes`** (number) em `base44/entities/DailyCheckin.jsonc`, com input
   no `DailyCheckin.jsx`. Nome escolhido sobre `awake_time` por seguir a convenção do repo
   (`hydration_liters`, `deep_sleep_pct`) e casar com `minutesAwake` do Fitbit (nov/2026).
   Persistência confirmada ponta a ponta via SDK (não só via MCP).
2. **Removidos 4 `sleep_regularity_pct` fantasma** (17, 22, 23 e 24/07). O Zepp devolve
   **0 quando não consegue computar o índice** (noites sem relógio no pulso), e o 0 entrava
   na fórmula com peso 0.25 como se fosse regularidade péssima. Confirmado por
   `sleep_start_time`: 21:37 / 21:41 / 21:58 em noites seguidas = regularidade ALTA.
   Os valores `1` de 15/07 e 19/07 foram preservados (sem evidência do mesmo defeito).
   Efeito: 7 dias alterados, Δ máx 6 pts, **zero mudanças de zona**.

### Três premissas do dono que a auditoria derrubou
- **"Regularidade do sono está morta"** — FALSO. É o 2º maior peso do sono (0.25, logo
  7,5% do recovery), usada em 4 sítios (`biocharge-utils.js:525` e `:193`,
  `physiological-engine.js:778`, `BodyAgeCard`/`longevityTrend`). E é o **preditor mais
  forte da fórmula**: r=+0.542 (p<0.001) vs sensação; r=+0.375 (p=0.011) excluindo os
  zeros; e r=+0.037 vs recovery — ou seja, **ortogonal**, carrega informação que nenhum
  outro termo carrega.
- **"`sleep_quality` é o score do Zepp"** — FALSO. `biocharge-utils.js:1425` grava
  `sleep_quality: sleepScore`. É o nosso `calculateSleepScore` v2 persistido. O campo do
  Zepp é `sleep_score`. Descrições do schema corrigidas para não repetir o erro.
- **"As âncoras do Zepp não servem pra nada"** — FALSO, e incômodo: no mesmo n=40,
  `biocharge_morning` (HybridCharge) prevê a sensação com **r=+0.767 (p<0.001)** contra
  **r=+0.483** do nosso recovery. E onde discordam >15 pts, **19 de 20 são Reck ABAIXO do
  Zepp**, com energia média 3.53 (igual à geral) — o Reck é **sistematicamente pessimista**,
  confirmando a suspeita de `ringmigration.md` §4.7. Suspeito principal: o teto autonômico.
  **RESSALVA QUE IMPEDE USAR ISSO COMO PROVA:** o dono digita o número do Zepp no check-in
  e avalia a própria energia na mesma tela — ancoragem é confundidor real. Exige teste com
  sensação registrada ANTES de ver os números do Zepp.

### Regra permanente
`0` em campo vindo do Zepp significa **ausente**, nunca "zero". Deixar em branco.
Registrado na description do próprio schema como guard-rail para agentes futuros.

## 2026-07-28 · H1 (eficiência de sono) declarada NÃO TESTÁVEL — confundimento estrutural

### O achado
Com `awake_minutes` em 7 noites (15, 17, 22, 23, 24, 27, 28/07), a eficiência ficou entre
**66% e 84%** — todas abaixo do limiar clínico de 85%. O dono então informou o dado que
fecha a questão: **antes do nascimento do Lucca (11/07) ele tinha ≤3 despertares de ~5 min
(ida ao banheiro), ou seja, eficiência ~97-99% em praticamente toda noite.**

### Por que isso mata o teste
Eficiência é **quase perfeitamente colinear com o regime antes/depois do bebê**. Não é uma
variável que varia no dia a dia — é um marcador de qual regime o dono está vivendo. Entre
os dois blocos mudou tudo simultaneamente (sono, estresse, rotina, carga emocional).
Correlacionar eficiência com sensação entre blocos mede **"a vida mudou"**, não o efeito da
eficiência. **Coletar as noites de junho PIORA**: daria aparência de significância a um
confundimento. Decisão de NÃO coletar tomada antes de gastar o esforço.

### Números registrados (n=7, nenhum fecha gate)
- eficiência ↔ energia: r=+0.463, p=0.30 · duração ↔ energia: r=+0.362, p=0.43
- `sd(energia) = 0.58` (valores 1,2,2,2,2,3,2) — alvo praticamente constante
- poder com n=7: só detecta |r| ≥ 0.73
- tempo na cama ↔ recovery: r=+0.903, p=0.005 — **passa o gate mas é confundido**
  (tempo na cama = sono + acordado, e duração sozinha dá r=+0.896)
- regressão `recovery ~ horas dormindo + horas acordado`: coeficiente de **horas acordado
  = +9.85** (cada hora acordado ADICIONA ~10 pts de recovery), mas t=1.22, não significativo
- quase-experimento natural: 24/07 (7.25h dormindo, 82 min acordado) → recovery 81 vs
  28/07 (7.20h dormindo, **181 min** acordado) → recovery **90**. Mesma duração,
  +99 min acordado, **+9 de recovery**. Um par a favor; o par 23 vs 17/07 deu diferença zero.

### Reenquadramento aceito
A fórmula **não está quebrada — está sendo operada fora do domínio onde é válida.** Nenhum
wearable de consumo é validado em sono de recém-nascido; os modelos assumem sono
consolidado. Recalibrar pesos para o regime bebê ajustaria o app a uma condição temporária
e o quebraria quando o Lucca dormir a noite toda.

### PRÉ-REGISTRO — detector de regime (não implementado)
- **Critério:** eficiência = `sleep_hours*60 / (sleep_hours*60 + awake_minutes)`; abaixo de
  **85%** (limiar clínico de insônia, não escolhido por nós) o recovery está fora do domínio
  de validade.
- **Comportamento:** o recovery não aparece como número verde confiante. Forma exata (faixa,
  marcação de baixa confiança, ou recusa de avaliar) é **decisão de produto, pendente do dono**.
- **Por que não precisa de gate estatístico:** não é afirmação sobre o corpo do dono, é
  afirmação sobre a confiança do app — mesma lógica do "Calibrando" do cold-start.

### O que continua
Logar `awake_minutes` diariamente. Não para validar agora, mas para ter a série pronta
quando o regime mudar: com noites eficientes E fragmentadas **dentro do mesmo período de
vida**, o confundimento desaparece e H1 vira testável de verdade.

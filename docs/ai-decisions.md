# Decisões de IA — log append-only

> Entradas mais recentes no topo. Nunca reescrever entrada antiga, só acrescentar.
> Entradas anteriores a 28/07/2026 vivem nos arquivos do Projeto (ainda não migradas).

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

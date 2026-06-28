# CONTEXT.md — BioCharge AI

> Documento de contexto para qualquer agente de IA (Claude Code incluído) que vá editar este repositório. **Leia antes de mexer no código.** Estas regras não são preferências de estilo — são o núcleo do projeto. Violá-las quebra a confiança do app.
>
> **Última sincronização com o código real: 20/06/2026.** Antes desta data, a §3 (Fórmulas) estava desatualizada — descrevia uma versão anterior do Recovery que já tinha sido substituída no código sem o documento ser atualizado junto. Se uma instância de IA notar o código divergindo deste arquivo, **o código manda** — e o patch que resolver a divergência deve atualizar este documento na mesma sessão, não depois.

---

## 1. O que é o app

App pessoal de recuperação / strain / sono, de **usuário único** (não é produto comercial — é para uso próprio do dono). Construído no **Base44** (React + Vite + TanStack Query). Dados inseridos **manualmente** a partir do Amazfit Bip 6 / app Zepp.

Objetivo: insights **honestos** sobre sono, corrida e musculação. O dono é corredor (treina com plano Runna), faz check-in diário.

**Medo central do dono — e princípio nº1 do projeto:** que o app vire **placebo** (números bonitos que não mudam nenhuma decisão). Todo o resto deriva disso.

---

## 2. Filosofia anti-placebo (INVIOLÁVEL)

1. **Todo insight tem que conectar a uma AÇÃO.** Se um número não muda o que a pessoa faz hoje, ele não deveria existir na tela.
2. **Portão estatístico, sem exceção:** só declarar uma tendência ou criar um card de insight de correlação se **|r| ≥ 0,35 E p ≤ 0,05**. Abaixo disso, fica silencioso. Silêncio honesto > insight falso.
3. **Sem circularidade:** nunca correlacionar uma variável contra um score que já a contém (ex.: recovery contém HRV/sono/subjetivo — não correlacionar HRV vs recovery). Correlacionar contra alvo independente (ex.: HRV de amanhã).
4. **Variável quase-binária bloqueada:** se os 2 valores mais comuns de uma variável cobrem >85% dos dias, ela não gera insight (não há variância pra extrair sinal).
5. **Correlação exige variância.** Os dados do dono variam pouco (sono ~6,5–8,75h; stress quase sempre 1–2). Insights comportamentais que não disparam por falta de variância **estão certos** em ficar silenciosos. Investir em HRV / tendências / strain, que variam.
6. **Score tem que ser ALCANÇÁVEL** — o verde precisa ser possível num bom dia real do dono, ou o score perde credibilidade.

---

## 3. Fórmulas atuais (estado vigente — verificado contra `physio-constants.js`/`biocharge-utils.js` em 20/06/2026)

**Recovery** — baseline EWMA winsorizado + z-score relativo ao próprio histórico (não é mais curva absoluta):
- HRV 50% + RHR 20% + Sono 30% (`REC_W_HRV`/`REC_W_RHR`/`REC_W_SONO`).
- Baseline pessoal por EWMA (seed/maturidade em `BL_SEED_NIGHTS`/`BL_TRUST_NIGHTS`), winsorizado (±`BL_WINSOR_K`·spread, outlier duro em ±`BL_HARD_OUTLIER_K`·spread), janela fixa de `BL_WINDOW_NIGHTS` dias.
- Squash logístico ancorado: z=0 (seu normal) → score 64 (`REC_LOGISTIC_K=1.6`, `REC_LOGISTIC_Z0=-0.36`).
- Teto autonômico: combinação HRV+RHR ruim trava o score (sem verde abaixo de `REC_CAP_NOGREEN_AUTON`; teto duro 45 abaixo de `REC_CAP_HARD_AUTON`) — sono bom não resgata dia autonomicamente ruim.
- Cold-start: sem HRV hoje OU baseline imaturo (<4 noites) → `recovery_score` é `null` (a UI mostra "Calibrando", nunca 0 falso).

**Sleep score (Sono v2)** — sinais crus portáveis, NÃO o score do Zepp:
- duração 42% (curva centrada em ~7,5h) / regularidade 25% / continuidade-despertares 15% / profundo 10% / REM 8% (renormalizado sobre os componentes presentes).
- `sleep_score` (Zepp) e `biocharge_morning` (HybridCharge do Zepp) **não entram em nenhuma fórmula** — ficam só como referência de calibração. Por decisão do dono (20/06/2026), continuam sendo coletados no check-in por mais ~15 dias para comparar com o score novo na próxima calibração, mas **não são mais obrigatórios para salvar**.

**Dois números diferentes no check-in — não confundir:**
- `recovery_score` = o "Score do dia" oficial, o número do anel (`getDayScore()`). É só o composto fisiológico acima — **a fadiga subjetiva não entra aqui**.
- `readiness_score` = Recovery×0,80 + (100 − `fatigue_score`)×0,20, onde `fatigue_score` = fadiga×0,65 + dor muscular(%)×0,20 + estresse(%)×0,15. Esse número quase não aparece na UI (cai atrás de `recovery_score ?? readiness_score` na maioria dos componentes); seu efeito real é categórico via `getDailyMasterSignal`/`decision_mode`: fadiga ≥72 força "recuperar", readiness participa do limiar de "treino forte". Confirmado nos dados reais (jun/2026): a fadiga do dono nunca passou de 52 — esse gatilho nunca disparou na prática.

**Strain** é métrica **SEPARADA** — NUNCA entra no recovery (confirmado por WHOOP/Oura). Escala 0–21. `calculateStrainScore` prefere o Training Effect (Efeito do Treino) do Zepp em corridas, com FC média como fallback. FC máx default 185 (≈ Tanaka 184 para o dono). *(não reauditado em 20/06 — herdado de versão anterior deste documento)*

> ⚠️ **Não recalibrar sem necessidade.** Recalibrar a fórmula no meio do histórico torna scores antigos não-comparáveis (invalida cálculo de tendência no campo afetado). Avisar isso ANTES de qualquer mudança de peso. Deixar a fórmula assentar 10–14 dias antes de nova calibração — não perseguir alvo móvel.

---

## 4. Regras de arquitetura (Base44)

- **Row-level security:** todo registro é do usuário — `created_by = user.email`.
- **Campos fora do schema são DESCARTADOS no save.** Se um campo precisa persistir, ele TEM que estar no `.jsonc` da entidade. (Já mordeu: REM, hora de dormir, jantar, e os campos de compromisso do WorkoutFeedback estavam sendo descartados — corrigidos.)
- **Inputs crus** (HRV, sono, FC, horários) **precisam** estar no schema — se descartados, o dado é perdido pra sempre.
- **Campos computados** (readiness_score, fatigue_score, stress_score, autonomic_state, hrv_trend, recovery_high_threshold, etc.) **NÃO precisam ser persistidos** — todas as telas recalculam ao vivo via `computeCheckinScores`. **Não persistir score computado** (evita o problema de score "congelado" desalinhado da fórmula atual). Exceção deliberada já existente: `morning_recovery_score` (âncora do dia) é salvo de propósito.
  - **Confirmado via MCP em 20/06/2026:** isso não é só "não precisa" — na prática `fatigue_score`, `stress_score`, `sleep_quality` e `readiness_score` **não existem em nenhum registro salvo** (vêm ausentes mesmo pedindo explicitamente por `fields`), porque não estão no `.jsonc` da entidade. `computeCheckinScores` os calcula e devolve, mas o save descarta silenciosamente. Qualquer tela que precise desses valores do dia atual TEM que rodar `computeCheckinScores` ao vivo (como `Today.jsx` já fazia) — não dá pra ler do histórico. Já mordeu: o `ScoresGrid` ficou meses pronto e nunca usado porque ninguém tinha feito esse recálculo ao vivo pra ele (corrigido em 20/06 — ver §7).
- **`computeCheckinScores`** (em `src/lib/biocharge-utils.js`) é a função canônica. Telas que mostram histórico devem recalcular a partir dos sinais crus salvos, não ler score salvo (exceto a âncora da manhã).

---

## 5. Regras de UX

- **Não inchar o check-in nem as telas.** Cada campo novo precisa justificar sua existência. Resistir a over-engineering.
- **O gate de "salvar" do check-in deve exigir o sinal que a fórmula realmente precisa, não o que parece mais "principal" na tela.** Hoje exige HRV + horas de sono (são os únicos cuja ausência muda o resultado: sem HRV, `recovery_score` sai `null`). Campos de calibração (Zepp: `biocharge_morning`, `sleep_score`) nunca devem ser obrigatórios — eles não entram em fórmula nenhuma (corrigido em 20/06/2026, antes travava o save nos campos errados).
- Premium visual = hierarquia + herói gráfico + espaço em branco + **menos** texto.
- 6 abas com papéis distintos, sem redundância: **Hoje** (decisão do dia), **Insights** (padrões e o que explica), **Check-in**, **Tendências** (evolução no tempo), **Resumo** (estado + semana), **Timeline** (histórico dia-a-dia).
- UI em **português-BR**.

---

## 6. Proteção de créditos (Base44 free)

- Plano free: 25 créditos de mensagem/mês (5/dia), 100 créditos de integração/mês.
- **Chamadas de LLM no runtime gastam crédito de integração.** Estão atrás de um toggle opt-in (`generate_ai`, default false) no check-in da manhã + gate de "registro novo, sem análise prévia". **Não reintroduzir geração automática de IA no save.**
- `runPhysiologicalAnalysis` e correlações são **JS local** — não gastam crédito, pode usar à vontade.
- Edição via GitHub→Base44 (este fluxo) **não gasta** crédito de mensagem.

---

## 7. Monitor de Saúde (adicionado em 28/06/2026)

**Fase 0 ativa. Fase 1 dormente (slots mapeados).**

- `assessHealthSignals(checkins, baseline)` em `src/lib/physiological-engine.js` — nova função exportada. Reusa a matemática de `detectHRVAnomaly` (intacta). Adiciona gate de ≥2 flags simultâneas e persistência de 2 dias consecutivos.
- `analysis.healthSignals` wired no objeto retornado por `runPhysiologicalAnalysis` (ao lado do `hrvAnomaly` que continua intacto para CI).
- `src/components/today/HealthStatusCard.jsx` — card âmbar (acute) / vermelho (sustained) / linha "✓" (normal) na Today.
- `src/pages/Health.jsx` — página `/saude` com veredito, painel de vitais, flags ativas, histórico e rodapé de honestidade. Fora do `AppLayout` (sem entrada no menu).
- Estados: `calibrating` (<7 noites de HRV) → silêncio. `normal` → linha "✓" no colapsável. `acute` → card âmbar. `sustained` (2 dias consecutivos) → card vermelho.
- Slots do anel (Fase 1): `skin_temp`, `spo2`, `respiratory` já presentes em `flags[]` com `status:'pending'`. Quando o anel validar, basta popular os valores e virar `status:'live'` — o gate e a persistência não mudam.
- 8 novos testes em `src/lib/__tests__/health-signals.test.js`. Constantes em `HEALTH_MIN_BASELINE_NIGHTS=7` e `HEALTH_FLAG_GATE=2` (physio-constants.js).

**Invariante central:** 1 sinal isolado nunca alerta. Desvio isolado = âmbar. Desvio sustentado (2 dias) = vermelho.

---

## 8. Backlog (em ordem de prioridade)

1. **Camada de normalização de fonte** (`source-normalize.js`, arquivo novo) — mapeia nomes de campo de cada marca de relógio → formato canônico. É a tese de portabilidade no nível do código.
2. ~~Recovery v2 — baseline robusto (EWMA + Winsorização)~~ **✅ já em produção** (confirmado em `physio-constants.js`/`calculateRecoveryScore` em 20/06/2026 — ver §3). Estava registrado aqui como pendente, mas já tinha sido implementado; este documento não tinha sido atualizado junto. **Lição:** ao concluir um item de backlog, atualizar este arquivo no mesmo patch que entrega o código, não depois.
3. **Chrononutrição Fase 2** — após ~3–4 semanas de dados de `dinner_time` + `sleep_start_time`, testar `corr(intervalo jantar→cama, despertares)` com o portão |r|≥0,35 / p≤0,05. `dinner_time` hoje só alimenta o prompt de IA opcional — zero uso determinístico ainda.

**Já descartado (não reabrir sem dados novos):** strain→recovery D+1 (r=+0,17, sem sinal; strain do dono é de baixa variância).

**Entidades órfãs** (no schema, nunca escritas — candidatas a limpeza): SleepRecord, WorkoutSession, HRVRecord, WeeklyRetrospect. `cadence_spm` é loop morto (nunca preenchido).

**Componentes órfãos (resolvido 20/06/2026):** `ScoresGrid.jsx` e `HeroSection.jsx` existiam calculados/prontos, mas não importados em nenhuma rota — código morto, zero retorno pro dono. `HeroSection` foi removido (duplicava a Today: mesmo anel, mesma recomendação, até tinha um botão "Ver plano do dia → /today"). `ScoresGrid` foi religado no Resumo com recálculo ao vivo (e corrigido o rótulo "Prontidão"→"Recovery", que tinha o mesmo erro de nomenclatura do §3). **Lição de processo:** antes de declarar um componente "pronto", confirmar com `grep -rl "NomeDoComponente" src` que ele é de fato importado em alguma página roteada (`App.jsx`) — código calculado e nunca exibido é o tipo de placebo mais fácil de não perceber, porque "funciona" em todo teste que só olha o cálculo, nunca a tela.

**Auditoria de regularidade circular (revisitada 20/06/2026):** `calculateSleepConsistency` (baseada em `sleep_start_time`, usada em Insights/Resumo) já recentraliza os horários em torno da meia-noite antes do desvio-padrão — não é o bug catastrófico (SRI saindo 0 quando deveria ser ≈63) que constava como pendente no `Esquema-Alvo-Sono-Portavel.md`. Não é estatística circular de livro-texto (média vetorial), mas funciona corretamente para o padrão de sono do dono (deitar entre ~22h–01h). Rebaixado de "bug a corrigir" para "melhoria opcional, baixa prioridade" — não mexer sem necessidade nova.

---

## 9. Método de trabalho (OBRIGATÓRIO antes de mudar lógica)

1. **Auditar o código real** antes de editar (não assumir estado).
2. **Validar a matemática/lógica contra os dados reais** antes de mudar qualquer fórmula (há acesso aos dados via MCP do Base44; entidades DailyCheckin, TrainingSession, WorkoutFeedback, User). Nunca criar registros de teste (contamina dados reais).
3. **Avisar quando uma recalibração torna scores antigos não-comparáveis.**
4. **Honestidade científica acima de tudo** — só afirmar o que os dados sustentam.
5. Validar sintaxe (esbuild/lint) antes de commitar.

---

## 10. Arquivos-chave

- `src/lib/biocharge-utils.js` — motor de cálculo (computeCheckinScores, calculateStrainScore, calculateSleepScore, getSmartMessage…).
- `src/lib/physiological-engine.js` — análise fisiológica / correlações / portão de p-valor.
- `src/lib/training-impact-engine.js`, `src/lib/physio-constants.js` — impacto de treino e constantes.
- `src/pages/` — Today, DailyCheckin, Insights, Trends, Dashboard, History.
- `base44/entities/*.jsonc` — schemas (lembrar: campo ausente = descartado no save).

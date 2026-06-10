# CONTEXT.md — BioCharge AI

> Documento de contexto para qualquer agente de IA (Claude Code incluído) que vá editar este repositório. **Leia antes de mexer no código.** Estas regras não são preferências de estilo — são o núcleo do projeto. Violá-las quebra a confiança do app.

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

## 3. Fórmulas atuais (estado vigente)

**Recovery** = HRV 30% + RHR 10% + Sono 35% + Subjetivo 25%.
- Curvas HRV/RHR com centro deslocado para −8% (estar no seu normal já conta como recuperado → verde alcançável). HRV scale 13, RHR scale 9.
- Baseline personalizado (7d HRV / 14d RHR), exclui o dia atual, com proteção anti-"baseline móvel" (mistura 70/30 com janela de 30d se houver queda sustentada >5%).

**Sleep score (Sono v2)** — reconstruído a partir de sinais **crus portáveis**, NÃO do score proprietário do Zepp:
- duração 42% (curva centrada na meta realista do dono, ~7,5h) / regularidade 25% / continuidade-despertares 15% / profundo 10% / REM 8% (renormalizado sobre os componentes presentes).
- O `sleep_score` do Zepp foi **removido da fórmula** (era 55% — dupla contagem + violação de portabilidade), mas **continua sendo salvo como referência de calibração** (não é input do cálculo).

**Score do dia** = Recovery × 0,80 + (100 − fadiga) × 0,20.

**Strain** é métrica **SEPARADA** — NUNCA entra no recovery (confirmado por WHOOP/Oura). Escala 0–21. `calculateStrainScore` prefere o Training Effect (Efeito do Treino) do Zepp em corridas, com FC média como fallback. FC máx default 185 (≈ Tanaka 184 para o dono).

> ⚠️ **Não recalibrar sem necessidade.** Recalibrar a fórmula no meio do histórico torna scores antigos não-comparáveis (invalida cálculo de tendência no campo afetado). Avisar isso ANTES de qualquer mudança de peso. Deixar a fórmula assentar 10–14 dias antes de nova calibração — não perseguir alvo móvel.

---

## 4. Regras de arquitetura (Base44)

- **Row-level security:** todo registro é do usuário — `created_by = user.email`.
- **Campos fora do schema são DESCARTADOS no save.** Se um campo precisa persistir, ele TEM que estar no `.jsonc` da entidade. (Já mordeu: REM, hora de dormir, jantar, e os campos de compromisso do WorkoutFeedback estavam sendo descartados — corrigidos.)
- **Inputs crus** (HRV, sono, FC, horários) **precisam** estar no schema — se descartados, o dado é perdido pra sempre.
- **Campos computados** (readiness_score, fatigue_score, stress_score, autonomic_state, hrv_trend, recovery_high_threshold, etc.) **NÃO precisam ser persistidos** — todas as telas recalculam ao vivo via `computeCheckinScores`. **Não persistir score computado** (evita o problema de score "congelado" desalinhado da fórmula atual). Exceção deliberada já existente: `morning_recovery_score` (âncora do dia) é salvo de propósito.
- **`computeCheckinScores`** (em `src/lib/biocharge-utils.js`) é a função canônica. Telas que mostram histórico devem recalcular a partir dos sinais crus salvos, não ler score salvo (exceto a âncora da manhã).

---

## 5. Regras de UX

- **Não inchar o check-in nem as telas.** Cada campo novo precisa justificar sua existência. Resistir a over-engineering.
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

## 7. Backlog (em ordem de prioridade)

1. **Camada de normalização de fonte** (`source-normalize.js`, arquivo novo) — mapeia nomes de campo de cada marca de relógio → formato canônico. É a tese de portabilidade no nível do código.
2. **Recovery v2** — baseline robusto (EWMA + Winsorização). Projeto deliberado, validar nos dados reais ANTES, só depois de estabilizar. Reseta a estabilização.
3. **Chrononutrição Fase 2** — após ~3–4 semanas de dados de `dinner_time` + `sleep_start_time`, testar `corr(intervalo jantar→cama, despertares)` com o portão |r|≥0,35 / p≤0,05.

**Já descartado (não reabrir sem dados novos):** strain→recovery D+1 (r=+0,17, sem sinal; strain do dono é de baixa variância).

**Entidades órfãs** (no schema, nunca escritas — candidatas a limpeza): SleepRecord, WorkoutSession, HRVRecord, WeeklyRetrospect. `cadence_spm` é loop morto (nunca preenchido).

---

## 8. Método de trabalho (OBRIGATÓRIO antes de mudar lógica)

1. **Auditar o código real** antes de editar (não assumir estado).
2. **Validar a matemática/lógica contra os dados reais** antes de mudar qualquer fórmula (há acesso aos dados via MCP do Base44; entidades DailyCheckin, TrainingSession, WorkoutFeedback, User). Nunca criar registros de teste (contamina dados reais).
3. **Avisar quando uma recalibração torna scores antigos não-comparáveis.**
4. **Honestidade científica acima de tudo** — só afirmar o que os dados sustentam.
5. Validar sintaxe (esbuild/lint) antes de commitar.

---

## 9. Arquivos-chave

- `src/lib/biocharge-utils.js` — motor de cálculo (computeCheckinScores, calculateStrainScore, calculateSleepScore, getSmartMessage…).
- `src/lib/physiological-engine.js` — análise fisiológica / correlações / portão de p-valor.
- `src/lib/training-impact-engine.js`, `src/lib/physio-constants.js` — impacto de treino e constantes.
- `src/pages/` — Today, DailyCheckin, Insights, Trends, Dashboard, History.
- `base44/entities/*.jsonc` — schemas (lembrar: campo ausente = descartado no save).

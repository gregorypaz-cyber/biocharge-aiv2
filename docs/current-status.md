# Status atual — Reck / BioCharge AI

> Atualizado em **12/08/2026**. Foto do estado vigente. Onde este arquivo divergir do código, **o código manda** — e quem corrigir a divergência atualiza este documento na mesma sessão.

## Fórmulas em produção

_(copiadas de `CONTEXT.md §3` — não inventar; se o código divergir, o código manda)_

- **Recovery** — baseline EWMA winsorizado + z-score relativo ao próprio histórico. HRV 50% + RHR 20% + Sono 30% (`REC_W_HRV`/`REC_W_RHR`/`REC_W_SONO`). Baseline pessoal por EWMA (seed/maturidade em `BL_SEED_NIGHTS`/`BL_TRUST_NIGHTS`), winsorizado (±`BL_WINSOR_K`·spread, outlier duro em ±`BL_HARD_OUTLIER_K`·spread), janela fixa de `BL_WINDOW_NIGHTS` dias. Squash logístico ancorado: z=0 → score 64 (`REC_LOGISTIC_K=1.6`, `REC_LOGISTIC_Z0=-0.36`). Teto autonômico (HRV+RHR ruim trava o score; sem verde abaixo de `REC_CAP_NOGREEN_AUTON`, teto duro 45 abaixo de `REC_CAP_HARD_AUTON`). Cold-start (sem HRV hoje OU baseline <4 noites) → `recovery_score` é `null` (UI mostra "Calibrando").
- **Sleep score (Sono v2)** — sinais crus portáveis, não o score do Zepp: duração 42% (curva centrada ~7,5h) / regularidade 25% / continuidade-despertares 15% / profundo 10% / REM 8% (renormalizado sobre os componentes presentes). `sleep_score` e `biocharge_morning` do Zepp ficam só como referência de calibração — não entram em fórmula.
- **readiness_score** = Recovery×0,80 + (100 − `fatigue_score`)×0,20, com `fatigue_score` = fadiga×0,65 + dor muscular(%)×0,20 + estresse(%)×0,15. Quase não aparece na UI; efeito real é categórico via `getDailyMasterSignal`/`decision_mode`.
- **Strain** — métrica SEPARADA (0–21), nunca entra no Recovery. `calculateStrainScore` prefere o Training Effect do Zepp em corridas, FC média como fallback. FC máx default 185.

## Sessão de agosto/2026 — o que entrou

- **Export + import de backup** (`AppSettings.jsx`): export já existia; o import chegou nesta sessão, **aditivo** — só cria o que falta, nunca faz update nem delete.
- **BYO-LLM (OpenRouter)** roteando **coach + análise profunda + deep-analysis do check-in** por provedor próprio (`src/lib/byo-llm.js`, chave em `localStorage` `reck-byo-llm`), sem gastar crédito de integração Base44. O retrospecto semanal segue no crédito Base44 (é função de backend; a chave nunca vai ao backend).
- **Badge de regime de sono (Direção B)** no ar na Today (`assessSleepRegime()` em `physiological-engine.js`), com marca de baixa confiança.
- **Destaques da análise** (`AnalysisHighlights`) passaram a ser lidos por cabeçalho, não por heurística de pontuação de frases.
- **stress_score removido do prompt** da análise (composto, quase-binário, induzia diagnóstico causal falso).
- **notes (check-in) + notas de treino entraram no prompt**, com regra de nunca citar literalmente.
- **8 dependências órfãs removidas.**

## Fonte de dados de noite

- **Amazfit Bip 6** (entrada manual via app Zepp) — fonte vigente.
- Anel **R10 encerrado em 22/07**.
- **Garmin Cirqa** planejado para **novembro** (viagem à Itália). Automação está desacoplada da compra.

## Congelado (não reabrir sem dados novos)

- **Peso do Recovery** — falta variância no alvo, não dias. Com n≈70 o peso de HRV não é identificável (IC95% ≈ [0,00; 0,70]).
- **awake_minutes como sinal** — confundido por deriva temporal + alvo quase-binário (parcial r=−0,34, p=0,13).
- **Monitor Fase 1** — falta sensor (skin_temp/spo2/respiratory ainda `pending`).
- **Tudo de strain** — o dono não treina força; baixa variância, sem sinal.

## Próximo passo

- Redesign do `Insights.jsx`.
- Codificação redundante de cor (zona comunicada só por matiz em Today/History).

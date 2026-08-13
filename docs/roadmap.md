# Roadmap — Reck / BioCharge AI

> Atualizado em **12/08/2026**. Colunas por estado. "Congelado" traz o **gate** que precisa ser satisfeito antes de reabrir.

## Em andamento

- Consolidação documental (este roadmap + `current-status.md` + correções de `CONTEXT.md`).

## Próximo

- **Redesign do `Insights.jsx`** — a tela mais densa e menos hierarquizada do app.
- **Codificação redundante de zona** — hoje a zona é comunicada só por matiz:
  - `getZoneLabel` só é usado em `LivePreview.jsx`;
  - `dotColor` na Today e o score do dia no History passam a zona **só por cor**.
  Acrescentar um segundo canal (rótulo/ícone/forma) para não depender de cor sozinha.

## Congelado (com gate de reabertura)

- **Peso do Recovery** — gate: alvo com variância real **e** regime de sono estável. Com n≈70 o peso não é identificável.
- **Normalização de baseline (janela de 60 noites)** — gate: regime de sono estabilizado. Shifting baseline syndrome documentado; correção simulada mas não implementada.
- **awake_minutes como sinal** — gate: alvo com variância (hoje quase-binário) e controle da deriva temporal.
- **Monitor de Saúde Fase 1** — gate: sensor que valide skin_temp / spo2 / respiratory.
- **Strain → recovery / insights comportamentais de strain** — gate: dono voltar a ter treino de força com variância. Sem sinal hoje.
- **Chrononutrição Fase 2** (`corr(intervalo jantar→cama, despertares)`) — gate: ~3–4 semanas de `dinner_time` + `sleep_start_time` e o portão |r|≥0,35 / p≤0,05.

## Concluído (sessão de agosto/2026 — os 7 commits desta sessão)

1. Roteamento da análise profunda e do deep-analysis pelo BYO-LLM.
2. BYO-LLM roteando coach + análise profunda + deep-analysis do check-in (OpenRouter).
3. Timeout por chamada + erro visível na análise profunda.
4. Destaques por cabeçalho + prompt sem stress composto, com notas.
5. Autorização de ausência de ação quando o limitador não é modificável (Insights).
6. Restauração de backup de forma aditiva (AppSettings).
7. Notas de treino como contexto da análise (Insights).

---

**Fonte de noite:** Amazfit Bip 6 (manual) hoje; **Garmin Cirqa** planejado para novembro. O antigo plano de anel/fonte automática foi **substituído pelo Garmin Cirqa** — nenhuma outra fonte está prevista.

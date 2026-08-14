// trends-gates.js — lógica pura (sem React) por trás dos "portões de honestidade"
// da tela Tendências. Isolada aqui para ser testável em ambiente node e para que
// nenhuma fórmula de score viva num componente de UI.
//
// Nada aqui calcula score. São apenas gates de APRESENTAÇÃO: quando traçar uma
// linha de tendência, quando um card não tem base para classificar risco, e como
// formatar um valor de tooltip que pode chegar como faixa [lo, hi].

// Quebra de regime de sono. Uma reta traçada sobre os dois lados desta data mede
// a mudança de rotina, não a fisiologia — o scatter suprime a linha nesse caso.
export const REGIME_BREAK = '2026-07-11';

// Carga crônica (pontos de strain/semana) abaixo da qual o ACWR não é
// interpretável: uma única sessão depois de semanas parado infla a razão.
export const ACWR_CHRONIC_MIN = 4;

/** true se a janela de pontos atravessa a quebra de regime (pré e pós). */
export function scatterCrossesRegime(points, breakDate = REGIME_BREAK) {
  if (!Array.isArray(points) || !points.length) return false;
  return (
    points.some((p) => p.date < breakDate) &&
    points.some((p) => p.date >= breakDate)
  );
}

/** Portão estatístico do scatter: só é significativo com |r|≥0,35, p≤0,05,
 *  n≥8 E sem cruzar a quebra de regime. */
export function scatterSignificant({ r, pValue, n, crossesRegime }) {
  return (
    Math.abs(r) >= 0.35 &&
    pValue <= 0.05 &&
    n >= 8 &&
    !crossesRegime
  );
}

/** Classifica a carga (ACWR) respeitando o gate que o motor já calcula.
 *  Devolve um objeto SEM React (label, risco, muted, textos) — o componente
 *  mapeia tier→ícone/cor. `muted` significa "mostra o número, não classifica
 *  risco". */
export function classifyTrainingLoad(load) {
  const ratio = load?.ratio;
  const chronic = load?.chronic ?? 0;
  const outOfScale = ratio != null && ratio > 2;

  // Sem base de comparação: histórico curto (lowConfidence) OU crônica baixa.
  if (load?.lowConfidence || chronic < ACWR_CHRONIC_MIN) {
    return {
      tier: 'no_base',
      label: 'Sem base de comparação',
      risk: 'none',
      muted: true,
      outOfScale,
      summary: `Carga crônica muito baixa (${chronic}/semana) para calcular ACWR com sentido.`,
      recommendation:
        'O número aparece abaixo, mas não classifica risco: uma única sessão depois de semanas parado infla a razão sem significar carga real.',
    };
  }

  if (ratio == null) {
    return {
      tier: 'no_data',
      label: 'Sem dados',
      risk: 'none',
      muted: true,
      outOfScale: false,
      summary: 'Ainda não dá para calcular a relação carga aguda/crônica.',
      recommendation: 'Continue registrando treinos e check-ins por algumas semanas.',
    };
  }

  if (ratio < 0.8) {
    return {
      tier: 'undercarga',
      label: 'Subcarga',
      risk: 'low',
      muted: false,
      outOfScale,
      summary: `Sua carga recente está abaixo da sua média (ACWR ${ratio.toFixed(2)}).`,
      recommendation: 'Há espaço para aumentar volume/intensidade de forma progressiva, se a recuperação acompanhar.',
    };
  }

  if (ratio <= 1.3) {
    return {
      tier: 'ideal',
      label: 'Faixa ideal',
      risk: 'low',
      muted: false,
      outOfScale,
      summary: `Sua carga aguda está alinhada com a crônica (ACWR ${ratio.toFixed(2)}).`,
      recommendation: 'Boa zona para sustentar consistência sem sobrecarregar.',
    };
  }

  if (ratio <= 1.5) {
    return {
      tier: 'elevada',
      label: 'Carga elevada',
      risk: 'moderate',
      muted: false,
      outOfScale,
      summary: `Sua carga aguda subiu acima da sua média recente (ACWR ${ratio.toFixed(2)}).`,
      recommendation: 'Vale evitar novos saltos de volume por alguns dias antes de seguir subindo.',
    };
  }

  return {
    tier: 'alta',
    label: 'Carga muito alta',
    risk: 'high',
    muted: false,
    outOfScale,
    summary: `Sua carga aguda está bem acima da crônica (ACWR ${ratio.toFixed(2)}).`,
    recommendation: 'Priorize recuperação e segure novos aumentos de carga até a relação cair.',
  };
}

/** Formata um valor de tooltip: faixa [lo, hi] → "lo–hi" arredondado; escalar
 *  inalterado. Corrige o bug "Sua faixa normal: 63101". */
export function formatTooltipValue(value) {
  return Array.isArray(value)
    ? `${Math.round(value[0])}–${Math.round(value[1])}`
    : value;
}

/**
 * Tema unificado para todos os gráficos Recharts.
 * Mantém identidade visual do instrumento — grid minimal, tipografia mono, réguas de zona.
 *
 * Uso: spread ou acesso por campo em XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine.
 * Cores: hardcoded (não CSS vars) porque SVG presentation attributes não herdam custom properties.
 */

const TICK_STYLE = {
  fontSize: 11,
  fontFamily: 'JetBrains Mono, monospace',
  fill: 'hsl(215, 15%, 56%)',
};

export const chartTheme = {
  grid: {
    stroke: 'hsl(220, 15%, 11%)',
    strokeDasharray: '3 3',
    horizontal: true,
    vertical: false,
  },
  axis: {
    tick: TICK_STYLE,
    axisLine: false,
    tickLine: false,
  },
  tooltip: {
    contentStyle: {
      background: 'hsl(220, 18%, 7%)',
      border: '1px solid hsl(220, 15%, 14%)',
      borderRadius: '12px',
      fontFamily: 'Inter, sans-serif',
fontSize: 12,
      color: 'hsl(210, 40%, 96%)',
      padding: '8px 12px',
    },
  },
  /**
   * Réguas de zona — exibir apenas em gráficos de score 0–100
   * (recovery_score, sleep_quality, fatigue_score, stress_score, biocharge_morning).
   * Não aplicar em gráficos de HRV (ms), peso (kg) ou km.
   */
  referenceLines: [
    { y: 42, stroke: 'hsl(45, 93%, 58%)',  strokeDasharray: '4 4', strokeOpacity: 0.45 },
    { y: 70, stroke: 'hsl(142, 70%, 50%)', strokeDasharray: '4 4', strokeOpacity: 0.45 },
  ],
};

/** Métricas expressas em escala 0–100 — qualificadas para réguas de zona */
export const SCORE_METRICS = new Set([
  'recovery_score',
  'sleep_quality',
  'fatigue_score',
  'stress_score',
  'biocharge_morning',
]);

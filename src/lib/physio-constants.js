// ─── Physiological Engine Constants ──────────────────────────────────────────
// refactor(physio): extract magic numbers to physio-constants.js (safe ESM import)
//
// All values here mirror exactly the literals used in physiological-engine.js.
// Change a value here to change behaviour globally — never edit the literals directly.

// ── Training Load ─────────────────────────────────────────────────────────────
/** Minimum checkins required before training load can be calculated */
export const TRAINING_LOAD_MIN_CHECKINS = 14;
/** ACWR above this → risk: 'high' */
export const TRAINING_RATIO_HIGH = 1.5;
/** ACWR above this → risk: 'moderate' */
export const TRAINING_RATIO_MODERATE = 1.3;
/** Multiplier applied to RPE when no session strain data is available */
export const RPE_LOAD_MULTIPLIER = 2;

// ── HRV / Physiological State ─────────────────────────────────────────────────
/** HRV % above baseline → positive signal */
export const HRV_POSITIVE_DELTA_PCT = 10;
/** HRV % below baseline → negative signal */
export const HRV_NEGATIVE_DELTA_PCT = -10;
/** RHR % above baseline → negative signal */
export const RHR_HIGH_DELTA_PCT = 8;
/** RHR % below baseline → positive signal */
export const RHR_LOW_DELTA_PCT = -5;
/** Stress level ≥ this → stress high signal */
export const STRESS_HIGH_THRESHOLD = 4;
/** Stress level ≤ this → stress low (controlled) signal */
export const STRESS_LOW_THRESHOLD = 2;
/** Recovery score ≥ this → positive recovery signal */
export const RECOVERY_HIGH_THRESHOLD = 74; // escala v3: verde-forte
/** Recovery score < this → negative recovery signal */
export const RECOVERY_LOW_THRESHOLD = 42; // escala v3: limiar do vermelho
/** Fatigue score > this → fatigue signal */
export const FATIGUE_HIGH_THRESHOLD = 65;
/** Fatigue score > this → state classified as Fatigued vs High Stress */
export const FATIGUE_STATE_THRESHOLD = 60;
/** Sleep debt hours > this → negative signal in physiological state */
export const SLEEP_DEBT_HIGH_HOURS = 5;
/** Physio score ≥ this → state: Recovered */
export const PHYSIO_SCORE_RECOVERED = 4;
/** Physio score ≥ this → state: Balanced */
export const PHYSIO_SCORE_BALANCED = 2;
/** Physio score ≤ this → state: Overreached */
export const PHYSIO_SCORE_OVERREACHED = -4;
/** Physio score ≤ this → state: Fatigued or High Stress */
export const PHYSIO_SCORE_STRESSED = -2;

// ── Why / Explain Score ───────────────────────────────────────────────────────
/** HRV delta % below this → negative reason shown */
export const WHY_HRV_NEGATIVE_PCT = -8;
/** HRV delta % above this → positive reason shown */
export const WHY_HRV_POSITIVE_PCT = 8;
/** RHR delta % above this → negative reason shown */
export const WHY_RHR_HIGH_PCT = 8;
/** Sleep quality delta % below this → negative reason shown */
export const WHY_SLEEP_NEGATIVE_PCT = -10;
/** Sleep quality delta % above this → positive reason shown */
export const WHY_SLEEP_POSITIVE_PCT = 10;
/** Stress level ≥ this → negative reason shown */
export const WHY_STRESS_HIGH = 4;
/** Fatigue score > this → negative reason shown */
export const WHY_FATIGUE_HIGH = 65;
/** Muscle soreness ≥ this → negative reason shown */
export const WHY_SORENESS_HIGH = 4;
/** Energy level ≥ this → positive reason shown */
export const WHY_ENERGY_HIGH = 4;
/** Mood level ≥ this → positive reason shown */
export const WHY_MOOD_HIGH = 4;

// ── Narrative / buildRecoveryNarrative ───────────────────────────────────────
/** HRV delta % above this → positive HRV narrative line */
export const NARRATIVE_HRV_POSITIVE_PCT = 8;
/** HRV delta % below negative of this → negative HRV narrative line */
export const NARRATIVE_HRV_NEGATIVE_PCT = -8;
/** Sleep delta % above this → "more sleep than usual" narrative */
export const NARRATIVE_SLEEP_MORE_PCT = 10;
/** Sleep delta % below negative of this → "less sleep than usual" narrative */
export const NARRATIVE_SLEEP_LESS_PCT = -10;
/** Recovery ≥ this → "great day for high intensity" narrative */
export const NARRATIVE_RECOVERY_HIGH = 80;
/** Recovery ≥ this → "moderate intensity recommended" narrative */
export const NARRATIVE_RECOVERY_MODERATE = 65;
/** Recovery ≥ this → "light activities preferred" narrative */
export const NARRATIVE_RECOVERY_LIGHT = 50;

// ── Baseline Insights ─────────────────────────────────────────────────────────
/** Minimum absolute delta % to surface a baseline insight */
export const BASELINE_INSIGHT_MIN_DELTA_PCT = 5;

// ── Correlations ──────────────────────────────────────────────────────────────
/** Min checkins before correlation engine runs */
export const CORRELATION_MIN_CHECKINS = 7;
/** Sleep hours ≥ this → "high sleep" group */
export const SLEEP_HIGH_HOURS = 7.5;
/** Sleep hours < this → "low sleep" group */
export const SLEEP_LOW_HOURS = 6.5;
/** Min recovery diff between sleep groups to surface insight */
export const SLEEP_RECOVERY_DIFF_MIN = 8;
/** RPE ≥ this → "high RPE" day */
export const RPE_HIGH_THRESHOLD = 8;
/** Min recovery drop after high-RPE day to surface insight */
export const RPE_RECOVERY_DROP_MIN = 8;
/** Stress ≥ this → "high stress" group */
export const STRESS_HIGH_CORR = 4;
/** Stress ≤ this → "low stress" group */
export const STRESS_LOW_CORR = 2;
/** Min HRV diff between stress groups to surface insight */
export const STRESS_HRV_DIFF_MIN = 5;
/** Hydration ≥ this → "good hydration" group */
export const HYDRATION_GOOD_THRESHOLD = 4;
/** Hydration ≤ this → "poor hydration" group */
export const HYDRATION_POOR_THRESHOLD = 2;
/** Min recovery diff between hydration groups to surface insight */
export const HYDRATION_RECOVERY_DIFF_MIN = 6;

// ── Lagged Effects ────────────────────────────────────────────────────────────
/** Min checkins before lagged effect engine runs */
export const LAGGED_MIN_CHECKINS = 5;
/** Min recovery drop at 48h to surface lagged effect */
export const LAGGED_RECOVERY_DROP_MIN = 8;
/** Min sleep reduction after intense day to surface lagged effect */
export const LAGGED_SLEEP_DROP_MIN = 0.5;

// ── Actionable Recs ───────────────────────────────────────────────────────────
/** Recovery ≥ this → recommend high intensity */
export const REC_RECOVERY_HIGH = 80;
/** Recovery ≥ this → recommend moderate intensity */
export const REC_RECOVERY_MODERATE = 65;
/** Recovery < this → recommend mobility/rest */
export const REC_RECOVERY_LOW = 55;
/** Sleep debt hours > this → surface sleep rec */
export const REC_SLEEP_DEBT_MIN = 3;
/** Hydration ≤ this → surface hydration rec */
export const REC_HYDRATION_LOW = 2;
/** Stress ≥ this → surface stress rec */
export const REC_STRESS_HIGH = 4;
/** Max actionable recs returned */
export const REC_MAX_COUNT = 4;

// ── Running Economy ───────────────────────────────────────────────────────────
/** Min valid running sessions required */
export const RUNNING_ECONOMY_MIN_SESSIONS = 4;
/** Improvement % below this (absolute) → return null (not meaningful) */
export const RUNNING_ECONOMY_IMPROVEMENT_MIN_PCT = 2;
/** Sessions ≥ this → confidence: Alta */
export const RUNNING_ECONOMY_HIGH_CONFIDENCE_SESSIONS = 8;

// ── Cardiac Drift ─────────────────────────────────────────────────────────────
/** Min long run sessions required */
export const CARDIAC_DRIFT_MIN_RUNS = 3;
/** Relative drift ≤ this → not significant, return null */
export const CARDIAC_DRIFT_THRESHOLD = 0.15;
/** Long run minimum duration in minutes */
export const CARDIAC_DRIFT_MIN_DURATION_MINUTES = 30;
/** Sessions ≥ this → confidence: Alta */
export const CARDIAC_DRIFT_HIGH_CONFIDENCE_RUNS = 5;
/** Number of most recent sessions used for drift average */
export const CARDIAC_DRIFT_RECENT_N = 3;

// ── Health Monitor ────────────────────────────────────────────────────────────
/** Min nights with HRV data before health monitor evaluates (senão → calibrating) */
export const HEALTH_MIN_BASELINE_NIGHTS = 7;
/** Min simultaneous flags to declare a "deviation day" (gate anti-ruído) */
export const HEALTH_FLAG_GATE           = 2;
// reuses: HRV_ANOMALY_ZSCORE_THRESHOLD (-1.5), HRV_ANOMALY_RHR_ELEVATED_PCT (1.07)

// ── HRV Anomaly ───────────────────────────────────────────────────────────────
/** Min checkins before HRV anomaly detector runs */
export const HRV_ANOMALY_MIN_CHECKINS = 5;
/** Min HRV readings in recent window to compute z-score */
export const HRV_ANOMALY_MIN_READINGS = 5;
/** Z-score below this (more negative) triggers anomaly alert */
export const HRV_ANOMALY_ZSCORE_THRESHOLD = -1.5;
/** RHR % above baseline → elevated flag */
export const HRV_ANOMALY_RHR_ELEVATED_PCT = 1.07;

// ── Sleep Consistency ─────────────────────────────────────────────────────────
/** Min sleep time entries to compute consistency */
export const SLEEP_CONSISTENCY_MIN_ENTRIES = 5;
/** StdDev (minutes) < this → "consistent" sleep times */
export const SLEEP_CONSISTENCY_GOOD_STDDEV = 20;
/** StdDev (minutes) > this → "irregular" sleep times discovery */
export const SLEEP_CONSISTENCY_BAD_STDDEV = 60;
/** StdDev < this → isConsistent: true */
export const SLEEP_CONSISTENCY_THRESHOLD = 30;
/** Entries ≥ this → confidence: Alta */
export const SLEEP_CONSISTENCY_HIGH_CONFIDENCE = 10;

// ── Performance Window ────────────────────────────────────────────────────────
/** Min sessions/checkins required for performance window analysis */
export const PERF_WINDOW_MIN_DATA = 6;
/** Min sessions per period to include in analysis */
export const PERF_WINDOW_MIN_PER_PERIOD = 2;
/** Min periods with data to surface a result */
export const PERF_WINDOW_MIN_PERIODS = 2;
/** Sessions ≥ this → confidence: Alta */
export const PERF_WINDOW_HIGH_CONFIDENCE_COUNT = 5;

// ── Recovery v3 — baseline EWMA winsorizado + z-score (relativo ao próprio) ──
// Migra o recovery de curvas absolutas para z contra o baseline pessoal.
// Validado em dados reais (jun/2026): "seu normal" (z=0) → 64.

// Baseline EWMA winsorizado (por métrica)
export const BL_HRV = { min: 5,  max: 250, floorSpread: 5.0, halfLifeB: 14, halfLifeS: 21 };
export const BL_RHR = { min: 30, max: 120, floorSpread: 2.0, halfLifeB: 14, halfLifeS: 21 };
export const BL_SEED_NIGHTS  = 4;     // < isto: calibrando (sem score)
export const BL_TRUST_NIGHTS = 14;    // ≥ isto: baseline confiável
export const BL_WINSOR_K        = 3.0; // dobra só dentro de ±3σ
export const BL_HARD_OUTLIER_K  = 5.0; // > 5σ: noite vista, NÃO dobrada
// Anti-ancoragem early-life: baseline jovem (0 < n < BL_EARLY_N) adapta rápido +
// winsor largo + sem hard-gate, pra um seed atípico (troca de aparelho/anel) não
// grudar por semanas. Inerte após madurar. Validado nos dados reais: Δ≈0 na
// baseline madura; corrige ~14ms de ancoragem no cenário de re-seed do anel.
export const BL_EARLY_N          = 8;   // < isto: regime early-life
export const BL_EARLY_HALFLIFE_B = 4;   // meia-vida do centro (vs 14 maduro)
export const BL_EARLY_HALFLIFE_S = 6;   // meia-vida do spread (vs 21)
export const BL_EARLY_WINSOR_K   = 6.0; // banda winsor larga (vs 3.0)
export const BL_SIGMA_FROM_SPREAD = 1.253; // σ ≈ 1.253 × spread (EWMA abs-dev → Gaussiana)

// Composto de recovery (z ponderado) + logística
export const REC_W_HRV  = 0.50;
export const REC_W_RHR  = 0.20;
export const REC_W_SONO = 0.30;
export const REC_LOGISTIC_K  = 1.6;
export const REC_LOGISTIC_Z0 = -0.36; // âncora: z=0 (seu normal) → 64

// Teto autonômico: sono bom NÃO resgata dia autonomicamente ruim
export const REC_CAP_NOGREEN_AUTON = -0.8; // auton z ≤ isto → sem verde
export const REC_CAP_HARD_AUTON    = -1.5; // auton z ≤ isto → teto duro
export const REC_CAP_NOGREEN_CEIL  = 66;
export const REC_CAP_HARD_CEIL     = 45;

// Zonas — RECALIBRADAS para a nova escala (seu normal = 64)
export const ZONE_GREEN_MIN  = 70; // ≥ : acima do seu normal
export const ZONE_YELLOW_MIN = 42; // ≥ : em torno/abaixo do normal; < isto = vermelho

// Janela de baseline (dias). Usada por TODOS os caminhos p/ o score ser idêntico
// independentemente de onde é calculado (Today recomputa ao vivo; DailyCheckin salva).
export const BL_WINDOW_NIGHTS = 90;

// Janela da baseline do componente Sono do Recovery (_sleepZ).
// 90 noites alinha com Oura (tendencia de 14d comparada a media de 3 meses) e
// Bevel (baseline pessoal de 60d). A janela antiga de 14 noites fazia a regua
// descer junto com o usuario em mudanca de regime: em jul/2026 a baseline de
// sono caiu de 83 para 50 (sd 3.3 -> 27), e uma noite ruim passou a ler como
// "acima do meu normal" (deriva de 2.97 sigma). Ver docs/ai-decisions.md 28/07.
export const SLEEP_BL_WINDOW_NIGHTS = 90;

// ── HRV Variabilidade (Esco 2026 — médias semanais) ───────────────────────────
/** Janela de dias para a média móvel do HRV (RMSSDmean) */
export const RMSSD_MEAN_WINDOW = 7;

// ── Frescor de baseline (stale-after-gap) ─────────────────────────────────────
// Anota a confiança do baseline quando há lacuna de dias. NÃO altera o recovery.
export const BL_FRESH_MAX_DAYS = 2;  // gap ≤ isto → 'fresh'
export const BL_STALE_MIN_DAYS = 7;  // gap ≥ isto → 'stale' (entre os dois = 'aging')

// ── Piso por sono + peso dinâmico (reavaliação 2026-07-13) ────────────────────
// Quanto pior a noite, mais o recovery olha o sono e se desapega do HRV (que
// fica pouco confiável após noite curta — pode ler ALTO por artefato autonômico,
// ex.: noites de recém-nascido). Sono catastrófico (<3h) tampa o score: o HRV
// não é interpretável. Validado nos DailyCheckin reais: muda só noites <6h; toda
// noite normal fica bit-idêntica (comparabilidade preservada).
export const SLEEP_CATASTROPHIC_H    = 3.0;  // < isto: HRV não interpretável
export const SLEEP_CATASTROPHIC_CEIL = 30;   // teto do recovery em noite catastrófica
export const SLEEP_DYN_FULL_H        = 6.0;  // ≥ isto: sem deslocamento de peso
export const SLEEP_DYN_MAX_SHIFT     = 0.25; // peso máx. movido HRV → Sono (atingido em 3h)
export const SLEEP_HRV_TRUST_H       = 5.0;  // < isto: HRV positivo não conta (fade a partir de SLEEP_DYN_FULL_H)

// ── Detector de regime de sono ────────────────────────────────────
// Eficiencia = tempo dormindo / tempo na cama. Abaixo de 85% e o limiar
// clinico usado para insonia — nao e numero escolhido por nos. Abaixo dele
// o recovery esta fora do dominio onde HRV/RHR foram validados: a literatura
// (Sci Rep, crossover com polissonografia) mostra que fragmentacao de sono
// NAO altera parametros autonomicos, entao HRV e RHR sao cegos a ela.
// Isto NAO altera o score — so marca confianca. Ver docs/ai-decisions.md 28/07.
export const SLEEP_EFF_CONSOLIDATED = 0.85;
export const SLEEP_EFF_SEVERE       = 0.75;
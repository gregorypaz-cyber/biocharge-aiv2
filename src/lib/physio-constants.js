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
export const RECOVERY_HIGH_THRESHOLD = 80;
/** Recovery score < this → negative recovery signal */
export const RECOVERY_LOW_THRESHOLD = 55;
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
// ─── Checkin Normalization Utility ───────────────────────────────────────────
// Centralizes alias resolution, type coercion, and ordering for checkin arrays.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toDateStr(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const s = val.toISOString().slice(0, 10);
    return DATE_RE.test(s) ? s : null;
  }
  if (typeof val === 'string') {
    const s = val.slice(0, 10);
    return DATE_RE.test(s) ? s : null;
  }
  return null;
}

function toNum(v) {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function clamp(v, min, max) {
  if (v == null) return null;
  return Math.min(max, Math.max(min, v));
}

/**
 * normalizeCheckins(checkins, opts?)
 * - Resolves field aliases (resting_heart_rate → resting_hr)
 * - Normalizes date to YYYY-MM-DD; removes invalid dates (with console.warn)
 * - Coerces string numbers to Number; NaN → null
 * - Clamps rpe to [0, 10]
 * - Defaults rest_day to false
 * - Sorts DESC by date if opts.ensureDesc === true (default)
 * - Marks result._normalized = true
 */
export function normalizeCheckins(checkins, opts = { ensureDesc: true }) {
  if (!Array.isArray(checkins) || checkins.length === 0) return [];

  const numericFields = [
    'hrv', 'resting_hr', 'sleep_hours', 'rpe', 'daily_strain_accumulated',
    'recovery_score', 'morning_recovery_score', 'fatigue', 'sleep_score',
    'deep_sleep_pct', 'mood', 'stress', 'energy', 'hydration', 'muscle_soreness',
    'resting_heart_rate', 'sleep_quality', 'energy_level', 'stress_level',
    'muscle_soreness_level', 'mood_level', 'hydration_liters', 'hrv_manual',
    'body_weight',
  ];

  let invalidCount = 0;

  const normalized = checkins.reduce((acc, raw) => {
    if (!raw || typeof raw !== 'object') return acc;

    // Date normalization
    const date = toDateStr(raw.date);
    if (!date) {
      invalidCount++;
      return acc;
    }

    const c = { ...raw, date };

    // Alias: resting_heart_rate / resting_heart_rate_avg → resting_hr
    if (c.resting_hr == null) {
      if (c.resting_heart_rate != null) c.resting_hr = c.resting_heart_rate;
      else if (c.resting_heart_rate_avg != null) c.resting_hr = c.resting_heart_rate_avg;
    }

    // Numeric coercion
    for (const field of numericFields) {
      if (c[field] != null) c[field] = toNum(c[field]);
    }

    // Clamp rpe
    if (c.rpe != null) c.rpe = clamp(c.rpe, 0, 10);

    // Default rest_day
    if (c.rest_day == null) c.rest_day = false;

    acc.push(c);
    return acc;
  }, []);

  if (invalidCount > 0) {
    console.warn(`[physio-normalize] Removed ${invalidCount} checkin(s) with invalid date.`);
  }

  // Sort DESC
  if (opts.ensureDesc !== false) {
    normalized.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
  }

  normalized._normalized = true;
  return normalized;
}

/**
 * ensureNormalized(checkins, opts?)
 * Returns the same array if already normalized, otherwise normalizes it.
 */
export function ensureNormalized(checkins, opts) {
  if (Array.isArray(checkins) && checkins._normalized === true) return checkins;
  return normalizeCheckins(checkins, opts);
}
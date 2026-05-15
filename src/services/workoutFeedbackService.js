// ─── Workout Feedback Service ─────────────────────────────────────────────────
// Persists user's daily workout choices, completions, and perceived effort.
// All functions are safe: never throw to UI — returns null on any error.

import { base44 } from '@/api/base44Client';

// ─── userId / deviceId ────────────────────────────────────────────────────────

export async function getUserIdOrDeviceId() {
  try {
    const user = await base44.auth.me();
    if (user?.email) return user.email;
  } catch {
    // not authenticated — fall through to deviceId
  }
  try {
    const KEY = 'biocharge:deviceId';
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = 'device_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch (err) {
    console.warn('workoutFeedbackService: cannot get userId or deviceId', err);
    return 'anonymous';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Find existing feedback record for (user_id, date) — returns first match or null */
async function findRecord(userId, dateKey) {
  try {
    const list = await base44.entities.WorkoutFeedback.filter(
      { user_id: userId, date: dateKey },
      '-created_date',
      1
    );
    return list?.[0] ?? null;
  } catch (err) {
    console.warn('workoutFeedbackService: findRecord error', err);
    return null;
  }
}

// ─── Upsert: selection ────────────────────────────────────────────────────────

/**
 * Persist which option (A/B/C) the user selected today.
 * payload: { selected_option, planned_duration_min?, planned_intensity_type?,
 *            planned_intensity_min?, planned_intensity_max?, evidence_snapshot? }
 */
export async function upsertDailySelection(userId, dateKey, payload) {
  try {
    const existing = await findRecord(userId, dateKey);
    const data = {
      user_id: userId,
      date: dateKey,
      selected_option: payload.selected_option,
      planned_duration_min: payload.planned_duration_min ?? null,
      planned_intensity_type: payload.planned_intensity_type ?? null,
      planned_intensity_min: payload.planned_intensity_min ?? null,
      planned_intensity_max: payload.planned_intensity_max ?? null,
      evidence_snapshot: payload.evidence_snapshot
        ? JSON.stringify(payload.evidence_snapshot)
        : null,
    };
    if (existing?.id) {
      return await base44.entities.WorkoutFeedback.update(existing.id, data);
    }
    return await base44.entities.WorkoutFeedback.create(data);
  } catch (err) {
    console.warn('workoutFeedbackService: upsertDailySelection error', err);
    return null;
  }
}

// ─── Upsert: completion ───────────────────────────────────────────────────────

/**
 * Mark workout as completed with RPE and optional notes.
 * payload: { completed: boolean, perceived_rpe?: number, notes?: string }
 */
export async function upsertDailyCompletion(userId, dateKey, payload) {
  try {
    const existing = await findRecord(userId, dateKey);
    const data = {
      user_id: userId,
      date: dateKey,
      completed: payload.completed ?? true,
      perceived_rpe: payload.perceived_rpe ?? null,
      notes: payload.notes ?? null,
      // preserve selected_option if already set
      ...(existing?.selected_option ? { selected_option: existing.selected_option } : { selected_option: 'A' }),
    };
    if (existing?.id) {
      return await base44.entities.WorkoutFeedback.update(existing.id, data);
    }
    return await base44.entities.WorkoutFeedback.create(data);
  } catch (err) {
    console.warn('workoutFeedbackService: upsertDailyCompletion error', err);
    return null;
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getFeedbackByDate(userId, dateKey) {
  return findRecord(userId, dateKey);
}

export async function getRecentFeedback(userId, days = 14) {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const list = await base44.entities.WorkoutFeedback.filter(
      { user_id: userId },
      '-date',
      days
    );
    return (list || []).filter(r => r.date >= cutoffStr);
  } catch (err) {
    console.warn('workoutFeedbackService: getRecentFeedback error', err);
    return [];
  }
}
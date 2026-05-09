/**
 * Date utilities — always use LOCAL timezone, never UTC for display/storage
 */

/**
 * Get today's date as YYYY-MM-DD in local timezone
 */
export function getTodayLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse a YYYY-MM-DD string safely without UTC offset issues.
 * Using T12:00:00 avoids day-off-by-one from UTC conversion.
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(`${dateStr}T12:00:00`);
}

/**
 * Format a date string or Date object for display in pt-BR
 */
export function formatDatePtBR(dateOrStr, options = {}) {
  const date = typeof dateOrStr === 'string' ? parseLocalDate(dateOrStr) : dateOrStr;
  if (!date || isNaN(date)) return '—';
  return date.toLocaleDateString('pt-BR', options);
}

/**
 * Format date as "12 de mai" style
 */
export function formatDateShort(dateOrStr) {
  return formatDatePtBR(dateOrStr, { day: 'numeric', month: 'short' });
}

/**
 * Format date as "sáb, 12 de maio de 2025"
 */
export function formatDateFull(dateOrStr) {
  return formatDatePtBR(dateOrStr, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Format date as DD/MM (short for charts)
 */
export function formatDateChart(dateOrStr) {
  const date = typeof dateOrStr === 'string' ? parseLocalDate(dateOrStr) : dateOrStr;
  if (!date || isNaN(date)) return '—';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
}

/**
 * Check if a YYYY-MM-DD string is today (local)
 */
export function isToday(dateStr) {
  return dateStr === getTodayLocal();
}

/**
 * Check if two YYYY-MM-DD strings are the same day
 */
export function isSameDay(a, b) {
  return a === b;
}

/**
 * Get difference in days between two YYYY-MM-DD strings (a - b)
 */
export function daysBetween(a, b) {
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  return Math.round((da - db) / (1000 * 60 * 60 * 24));
}

/**
 * Get YYYY-MM-DD for N days ago (local)
 */
export function daysAgoLocal(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Get label for time of day
 */
export function getTimeOfDayLabel(timeOfDay) {
  const labels = {
    morning: 'Manhã',
    afternoon: 'Tarde',
    evening: 'Noite',
    night: 'Madrugada',
  };
  return labels[timeOfDay] || timeOfDay;
}
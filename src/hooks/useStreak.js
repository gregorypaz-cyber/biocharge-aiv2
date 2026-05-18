import { useMemo } from 'react';
import { getTodayLocal } from '@/lib/date-utils';

/**
 * Calculates the current check-in streak from an array of checkins.
 * Returns { streak, hasCheckedInToday }
 */
export function useStreak(checkins = []) {
  return useMemo(() => {
    if (!checkins.length) return { streak: 0, hasCheckedInToday: false };

    const today = getTodayLocal();
    const dates = new Set(checkins.map(c => c.date));
    const hasCheckedInToday = dates.has(today);

    // Count consecutive days ending today (or yesterday if not yet checked in)
    let streak = 0;
    const cursor = new Date(today + 'T12:00:00');

    // If today not done yet, don't count today in streak
    if (!hasCheckedInToday) {
      cursor.setDate(cursor.getDate() - 1);
    }

    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (!dates.has(key)) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { streak, hasCheckedInToday };
  }, [checkins]);
}
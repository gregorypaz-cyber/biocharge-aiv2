import { useState, useEffect, useMemo } from 'react';
import { getTodayLocal } from '@/lib/date-utils';

const KEY_PREFIX = 'biocharge:dayContext:';
const EVENT_NAME = 'dayContext:change';

export const DayPhase = {
  PLANNING: 'PLANNING',
  OPTIMAL_LOAD: 'OPTIMAL_LOAD',
  OVERLOAD: 'OVERLOAD',
  RECOVERY_DAY: 'RECOVERY_DAY',
};

function keyFor(dateKey) {
  return `${KEY_PREFIX}${dateKey}`;
}

function defaultState() {
  return {
    intent: 'undecided',
    userDefined: false,
    locked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function loadDayContext(dateKey) {
  try {
    const raw = localStorage.getItem(keyFor(dateKey));
    if (!raw) return defaultState();
    return JSON.parse(raw);
  } catch {
    return defaultState();
  }
}

export function saveDayContext(dateKey, state) {
  try {
    localStorage.setItem(keyFor(dateKey), JSON.stringify(state));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {}
}

function deriveDayPhase(state, metrics) {
  const currentStrain = Number(metrics?.currentStrain ?? 0);
  const strainTarget = Number(metrics?.strainTarget ?? 0);
  const readiness = Number(metrics?.readiness ?? 0);
  const hasSessions = !!metrics?.hasSessions;

  if (state.locked && state.intent === 'recovery') {
    return DayPhase.RECOVERY_DAY;
  }

  if (state.intent === 'recovery' && state.userDefined) {
    return DayPhase.RECOVERY_DAY;
  }

  if (!metrics) {
    return DayPhase.PLANNING;
  }

  if (!hasSessions && readiness < 50) {
    return DayPhase.RECOVERY_DAY;
  }

  if (strainTarget > 0 && currentStrain > strainTarget) {
    return DayPhase.OVERLOAD;
  }

  if (hasSessions && strainTarget > 0 && currentStrain >= Math.max(strainTarget - 1, strainTarget * 0.85)) {
    return DayPhase.OPTIMAL_LOAD;
  }

  return DayPhase.PLANNING;
}

export function useDayContext(metrics = null) {
  const today = getTodayLocal();
  const [state, setState] = useState(() => loadDayContext(today));

  useEffect(() => {
    setState(loadDayContext(today));
  }, [today]);

  useEffect(() => {
    const handler = () => setState(loadDayContext(today));
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [today]);

  function setDayIntent(intent) {
    const next = {
      ...state,
      intent,
      userDefined: true,
      updatedAt: new Date().toISOString(),
    };
    setState(next);
    saveDayContext(today, next);
  }

  function resetDayContext() {
    const next = defaultState();
    setState(next);
    saveDayContext(today, next);
  }

  function quickToggleRecovery() {
    setDayIntent(state.intent === 'recovery' ? 'training' : 'recovery');
  }

  function lockRestDay() {
    const next = {
      ...state,
      intent: 'recovery',
      userDefined: true,
      locked: true,
      updatedAt: new Date().toISOString(),
    };
    setState(next);
    saveDayContext(today, next);
  }

  function unlockRestDay(previousIntent = 'undecided') {
    const next = {
      ...state,
      intent: previousIntent,
      userDefined: previousIntent !== 'undecided',
      locked: false,
      updatedAt: new Date().toISOString(),
    };
    setState(next);
    saveDayContext(today, next);
  }

  const dayPhase = useMemo(() => deriveDayPhase(state, metrics), [
    state,
    metrics?.currentStrain,
    metrics?.strainTarget,
    metrics?.readiness,
    metrics?.hasSessions,
  ]);

  return {
    ...state,
    dayPhase,
    DayPhase,
    setDayIntent,
    resetDayContext,
    quickToggleRecovery,
    lockRestDay,
    unlockRestDay,
  };
}
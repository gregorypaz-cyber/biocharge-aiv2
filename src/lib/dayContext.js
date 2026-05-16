import { useState, useEffect } from 'react';
import { getTodayLocal } from '@/lib/date-utils';

const KEY_PREFIX = 'biocharge:dayContext:';
const EVENT_NAME = 'dayContext:change';

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

// HOOK
export function useDayContext() {
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

  /** Declara "Hoje é dia de descanso" — força RECOVERY_DAY e trava a decisão */
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

  /** Desfaz o lock (usado pelo Undo do toast) */
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

  return {
    ...state,
    setDayIntent,
    resetDayContext,
    quickToggleRecovery,
    lockRestDay,
    unlockRestDay,
  };
}
// physio-worker.js — Web Worker for runPhysiologicalAnalysis
// Runs the CPU-heavy analysis off the main thread.

import { runPhysiologicalAnalysis } from './physiological-engine.js';

self.onmessage = function (event) {
  const { checkins, sessions } = event.data || {};
  try {
    const result = runPhysiologicalAnalysis(checkins || [], sessions || []);
    self.postMessage({ ok: true, result });
  } catch (err) {
    self.postMessage({ ok: false, error: err?.message || 'worker_error' });
  }
};
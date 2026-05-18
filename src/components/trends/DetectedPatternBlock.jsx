import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function avg(arr) {
  const v = arr.filter(x => x != null && !isNaN(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

/**
 * Detects the most significant pattern from the filtered checkins.
 * Returns { text, occurrences } or null if nothing significant.
 */
function detectTopPattern(checkins) {
  if (checkins.length < 5) return null;

  const sorted = [...checkins].sort((a, b) => (a.date < b.date ? -1 : 1));
  const candidates = [];

  // ── Pattern 1: sleep < threshold → next-day readiness drop ─────────────
  const SLEEP_THRESHOLD = 6.5;
  const sleepImpactPairs = sorted.slice(0, -1).reduce((acc, c, i) => {
    const next = sorted[i + 1];
    const sleepH = c.sleep_hours;
    const todayReady = c.readiness_score ?? c.recovery_score ?? c.biocharge_morning;
    const nextReady = next?.readiness_score ?? next?.recovery_score ?? next?.biocharge_morning;
    if (sleepH != null && todayReady != null && nextReady != null) {
      acc.push({ shortSleep: sleepH < SLEEP_THRESHOLD, drop: todayReady - nextReady });
    }
    return acc;
  }, []);

  const shortSleepDrops = sleepImpactPairs.filter(p => p.shortSleep && p.drop > 0);
  const normalSleepDrops = sleepImpactPairs.filter(p => !p.shortSleep && p.drop > 0);
  if (shortSleepDrops.length >= 2) {
    const avgShortDrop = avg(shortSleepDrops.map(p => p.drop));
    const avgNormalDrop = avg(normalSleepDrops.map(p => p.drop)) ?? 0;
    const netDrop = Math.round(avgShortDrop - avgNormalDrop);
    if (netDrop >= 4) {
      candidates.push({
        score: shortSleepDrops.length * netDrop,
        text: `Quando você dorme menos de ${SLEEP_THRESHOLD}h, sua prontidão cai em média ${Math.round(avgShortDrop)}pts no dia seguinte. Isso aconteceu ${shortSleepDrops.length} ${shortSleepDrops.length === 1 ? 'vez' : 'vezes'} neste período.`,
        occurrences: shortSleepDrops.length,
      });
    }
  }

  // ── Pattern 2: day-of-week consistently higher/lower readiness ──────────
  const byDow = {};
  sorted.forEach(c => {
    if (!c.date) return;
    const ready = c.readiness_score ?? c.recovery_score ?? c.biocharge_morning;
    if (ready == null) return;
    const dow = new Date(c.date + 'T12:00:00').getDay();
    if (!byDow[dow]) byDow[dow] = [];
    byDow[dow].push(ready);
  });

  const overallAvg = avg(sorted.map(c => c.readiness_score ?? c.recovery_score ?? c.biocharge_morning));
  if (overallAvg != null) {
    const dowEntries = Object.entries(byDow)
      .map(([dow, vals]) => ({ dow: Number(dow), avg: avg(vals), count: vals.length }))
      .filter(e => e.count >= 2 && e.avg != null);

    const best = dowEntries.sort((a, b) => b.avg - a.avg)[0];
    const worst = dowEntries.sort((a, b) => a.avg - b.avg)[0];

    if (best && Math.round(best.avg - overallAvg) >= 8) {
      candidates.push({
        score: (best.avg - overallAvg) * best.count,
        text: `Sua prontidão tende a ser maior nas ${DAY_NAMES[best.dow]}s (média ${Math.round(best.avg)} vs ${Math.round(overallAvg)} geral). Padrão observado em ${best.count} semanas.`,
        occurrences: best.count,
      });
    }
    if (worst && Math.round(overallAvg - worst.avg) >= 8 && worst.dow !== best?.dow) {
      candidates.push({
        score: (overallAvg - worst.avg) * worst.count,
        text: `Sua prontidão tende a ser menor nas ${DAY_NAMES[worst.dow]}s (média ${Math.round(worst.avg)} vs ${Math.round(overallAvg)} geral). Padrão observado em ${worst.count} semanas.`,
        occurrences: worst.count,
      });
    }
  }

  // ── Pattern 3: high strain → readiness drop 48h later ──────────────────
  const STRAIN_THRESHOLD = 14;
  const strainPairs = sorted.slice(0, -2).reduce((acc, c, i) => {
    const twoDaysLater = sorted[i + 2];
    const strain = c.daily_strain_accumulated;
    const readyNow = c.readiness_score ?? c.recovery_score ?? c.biocharge_morning;
    const readyLater = twoDaysLater?.readiness_score ?? twoDaysLater?.recovery_score ?? twoDaysLater?.biocharge_morning;
    if (strain != null && readyNow != null && readyLater != null) {
      acc.push({ highStrain: strain >= STRAIN_THRESHOLD, drop: readyNow - readyLater });
    }
    return acc;
  }, []);

  const heavyDrops = strainPairs.filter(p => p.highStrain && p.drop > 0);
  if (heavyDrops.length >= 2) {
    const avgDrop = avg(heavyDrops.map(p => p.drop));
    if (Math.round(avgDrop) >= 5) {
      candidates.push({
        score: heavyDrops.length * avgDrop,
        text: `Após treinos pesados (strain ≥ ${STRAIN_THRESHOLD}), sua prontidão cai em média ${Math.round(avgDrop)}pts 48h depois. Isso aconteceu ${heavyDrops.length} ${heavyDrops.length === 1 ? 'vez' : 'vezes'} neste período.`,
        occurrences: heavyDrops.length,
      });
    }
  }

  if (!candidates.length) return null;

  // Return the most significant (highest score)
  return candidates.sort((a, b) => b.score - a.score)[0];
}

export default function DetectedPatternBlock({ checkins }) {
  const pattern = useMemo(() => detectTopPattern(checkins), [checkins]);

  if (!pattern) return null;

  return (
    <motion.div
      key={pattern.text}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3.5 flex gap-3 items-start"
    >
      <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Padrão Detectado</p>
        <p className="text-sm leading-snug text-foreground/90">{pattern.text}</p>
      </div>
    </motion.div>
  );
}
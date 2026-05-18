import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function mean(arr) {
  const v = arr.filter(x => x != null && !isNaN(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

function readiness(c) {
  return c?.readiness_score ?? c?.recovery_score ?? c?.biocharge_morning ?? null;
}

/**
 * Detects the most significant pattern from the provided checkins.
 * Uses ALL passed checkins for calculation (pass full history for more signal).
 * Returns { text } or null if nothing significant.
 */
function detectTopPattern(checkins) {
  if (!checkins || checkins.length < 3) return null;

  const sorted = [...checkins].sort((a, b) => (a.date < b.date ? -1 : 1));
  const candidates = [];

  // ── Pattern 1: sleep < threshold → next-day readiness drop ─────────────
  const SLEEP_THRESHOLD = 6.5;
  const shortDrops = [];
  const normalDrops = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const c = sorted[i];
    const next = sorted[i + 1];
    const sleepH = c.sleep_hours;
    const rNow = readiness(c);
    const rNext = readiness(next);
    if (sleepH == null || rNow == null || rNext == null) continue;
    const drop = rNow - rNext;
    if (sleepH < SLEEP_THRESHOLD) shortDrops.push(drop);
    else normalDrops.push(drop);
  }

  if (shortDrops.length >= 1) {
    const avgShort = mean(shortDrops) ?? 0;
    const avgNormal = mean(normalDrops) ?? 0;
    const netDrop = Math.round(avgShort - avgNormal);
    if (netDrop >= 2) {
      candidates.push({
        score: shortDrops.length * Math.max(netDrop, 1),
        text: `Quando você dorme menos de ${SLEEP_THRESHOLD}h, sua prontidão cai em média ${Math.round(avgShort)}pts no dia seguinte. Isso aconteceu ${shortDrops.length} ${shortDrops.length === 1 ? 'vez' : 'vezes'} neste período.`,
      });
    }
  }

  // ── Pattern 2: day-of-week consistently higher/lower ───────────────────
  const byDow = {};
  for (const c of sorted) {
    if (!c.date) continue;
    const r = readiness(c);
    if (r == null) continue;
    const dow = new Date(c.date + 'T12:00:00').getDay();
    if (!byDow[dow]) byDow[dow] = [];
    byDow[dow].push(r);
  }

  const overallAvg = mean(sorted.map(readiness));
  if (overallAvg != null) {
    const dowEntries = Object.entries(byDow)
      .map(([dow, vals]) => ({ dow: Number(dow), avg: mean(vals), count: vals.length }))
      .filter(e => e.count >= 2 && e.avg != null);

    if (dowEntries.length >= 2) {
      const best = [...dowEntries].sort((a, b) => b.avg - a.avg)[0];
      const worst = [...dowEntries].sort((a, b) => a.avg - b.avg)[0];

      if (best && Math.round(best.avg - overallAvg) >= 5) {
        candidates.push({
          score: (best.avg - overallAvg) * best.count,
          text: `Sua prontidão tende a ser maior nas ${DAY_NAMES[best.dow]}s (média ${Math.round(best.avg)} vs ${Math.round(overallAvg)} geral). Padrão observado em ${best.count} semanas.`,
        });
      }
      if (worst && Math.round(overallAvg - worst.avg) >= 5 && worst.dow !== best?.dow) {
        candidates.push({
          score: (overallAvg - worst.avg) * worst.count,
          text: `Sua prontidão tende a ser menor nas ${DAY_NAMES[worst.dow]}s (média ${Math.round(worst.avg)} vs ${Math.round(overallAvg)} geral). Padrão observado em ${worst.count} semanas.`,
        });
      }
    }
  }

  // ── Pattern 3: high strain → readiness drop 48h later ──────────────────
  const STRAIN_THRESHOLD = 12;
  const heavyDrops = [];

  for (let i = 0; i < sorted.length - 2; i++) {
    const c = sorted[i];
    const later = sorted[i + 2];
    const strain = c.daily_strain_accumulated;
    const rNow = readiness(c);
    const rLater = readiness(later);
    if (strain == null || rNow == null || rLater == null) continue;
    if (strain >= STRAIN_THRESHOLD) heavyDrops.push(rNow - rLater);
  }

  if (heavyDrops.length >= 1) {
    const avgDrop = mean(heavyDrops) ?? 0;
    if (Math.round(avgDrop) >= 3) {
      candidates.push({
        score: heavyDrops.length * Math.max(avgDrop, 1),
        text: `Após treinos pesados (strain ≥ ${STRAIN_THRESHOLD}), sua prontidão cai em média ${Math.round(avgDrop)}pts 48h depois. Isso aconteceu ${heavyDrops.length} ${heavyDrops.length === 1 ? 'vez' : 'vezes'} neste período.`,
      });
    }
  }

  if (!candidates.length) return null;

  return candidates.sort((a, b) => b.score - a.score)[0];
}

export default function DetectedPatternBlock({ checkins, allCheckins }) {
  // Use allCheckins (full history) if provided for better signal, but show counts from filtered period
  const pattern = useMemo(
    () => detectTopPattern(allCheckins && allCheckins.length > checkins.length ? allCheckins : checkins),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checkins, allCheckins]
  );

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
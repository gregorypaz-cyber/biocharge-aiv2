import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Moon, Dumbbell, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function WeeklyRetrospectCard({ weekStart, weekEnd, checkins, sessions }) {
  const [retrospect, setRetrospect] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!weekStart || checkins.length < 4) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // First try to read from DB
        const existing = await base44.entities.WeeklyRetrospect.filter({ week_start: weekStart });
        if (existing?.length > 0) {
          if (!cancelled) setRetrospect(existing[0]);
          return;
        }

        // Only generate if week is complete enough (≥4 check-ins) and is a past week
        const today = new Date().toISOString().slice(0, 10);
        if (weekEnd >= today) return; // don't generate for current/future week

        const res = await base44.functions.invoke('generateWeeklyRetrospect', {
          week_start: weekStart,
          checkins,
          sessions,
        });
        if (!cancelled && res?.data?.retrospect) {
          setRetrospect(res.data.retrospect);
        }
      } catch (e) {
        console.warn('WeeklyRetrospectCard: failed to load', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="mx-4 mb-2 px-3 py-2.5 rounded-xl border border-primary/15 bg-primary/5 flex items-center gap-2">
        <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin shrink-0" />
        <p className="text-[11px] text-muted-foreground">Gerando retrospecto...</p>
      </div>
    );
  }

  if (!retrospect) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-2 rounded-xl border border-primary/20 bg-primary/6 px-3.5 py-3 space-y-2"
    >
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Retrospecto da semana</span>
      </div>

      {/* Metrics row */}
      <div className="flex gap-3 flex-wrap">
        {retrospect.avg_readiness != null && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Zap className="w-3 h-3 text-primary/70" />
            Prontidão média <span className="font-semibold text-foreground ml-0.5">{retrospect.avg_readiness}</span>
          </span>
        )}
        {retrospect.avg_sleep_hours != null && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Moon className="w-3 h-3 text-blue-400/70" />
            Sono médio <span className="font-semibold text-foreground ml-0.5">{retrospect.avg_sleep_hours}h</span>
          </span>
        )}
        {retrospect.training_count != null && retrospect.training_count > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Dumbbell className="w-3 h-3 text-muted-foreground/70" />
            <span className="font-semibold text-foreground">{retrospect.training_count}</span> treino{retrospect.training_count !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Learning phrase */}
      {retrospect.learning_phrase && (
        <p className="text-xs text-foreground/85 leading-snug italic border-l-2 border-primary/30 pl-2">
          {retrospect.learning_phrase}
        </p>
      )}
    </motion.div>
  );
}
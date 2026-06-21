import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Moon, Dumbbell, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export default function WeeklyRetrospectCard({ weekStart, weekEnd, checkins, sessions }) {
    const [retrospect, setRetrospect] = useState(null);
  const [loading, setLoading] = useState(false);
  const [canGenerate, setCanGenerate] = useState(false);
  const { user } = useAuth();

  // EFEITO = SÓ LEITURA DE CACHE (não gasta crédito de IA).
  // A geração via InvokeLLM virou opt-in (botão handleGenerate), alinhada ao
  // princípio de nunca disparar IA automática no runtime (CONTEXT §6).
  useEffect(() => {
    if (!weekStart || checkins.length < 4) { setCanGenerate(false); return; }

    let cancelled = false;

    async function loadCache() {
      setLoading(true);
      try {
        const existing = await base44.entities.WeeklyRetrospect.filter({ week_start: weekStart, created_by: user?.email });
        if (!cancelled && existing?.length > 0) {
          setRetrospect(existing[0]);
          setCanGenerate(false);
          return;
        }
        // Sem cache: apenas fica ELEGÍVEL para gerar (semana passada e completa).
        // Não invoca nada aqui — espera o clique do usuário.
        const today = new Date().toISOString().slice(0, 10);
        if (!cancelled) setCanGenerate(weekEnd < today);
      } catch (e) {
        console.warn('WeeklyRetrospectCard: cache read failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCache();
    return () => { cancelled = true; };
  }, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  // Geração explícita (opt-in) — ÚNICA via que chama o InvokeLLM (gasta crédito).
  async function handleGenerate() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('generateWeeklyRetrospect', {
        week_start: weekStart,
        checkins,
        sessions,
      });
      if (res?.data?.retrospect) {
        setRetrospect(res.data.retrospect);
        setCanGenerate(false);
      }
    } catch (e) {
      console.warn('WeeklyRetrospectCard: generate failed', e);
    } finally {
      setLoading(false);
    }
  }


    if (loading) {
    return (
      <div className="mx-4 mb-2 px-3 py-2.5 rounded-xl border border-primary/15 bg-primary/5 flex items-center gap-2">
        <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin shrink-0" />
        <p className="text-[11px] text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  // Sem retrospecto salvo: oferece GERAR (opt-in) em vez de gerar sozinho.
  if (!retrospect) {
    if (!canGenerate) return null;
    return (
      <button
        onClick={handleGenerate}
        className="mx-4 mb-2 w-[calc(100%-2rem)] px-3 py-2.5 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-2 text-left hover:bg-primary/10 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-[11px] text-muted-foreground">
          Gerar retrospecto desta semana <span className="opacity-60">(usa IA)</span>
        </span>
      </button>
    );
  }


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
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Flame, AlertTriangle, Dumbbell, LayoutList } from 'lucide-react';
import RecoveryRing from '@/components/ui-bio/RecoveryRing';
import StatusBadge from '@/components/ui-bio/StatusBadge';
import StreakBadge from '@/components/ui-bio/StreakBadge';

export default function HeroSection({ today, streak, displayedScore }) {
  const dateStr = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const score = displayedScore ?? today.recovery_score;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-6"
      style={{
        background: 'linear-gradient(135deg, hsl(220,18%,8%) 0%, hsl(220,18%,6%) 100%)',
        boxShadow: '0 0 60px -20px hsl(142,70%,50%,0.15)',
      }}
    >
      {/* Date */}
      <p className="text-xs font-medium text-muted-foreground capitalize mb-4">{dateStr}</p>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Ring */}
        <div className="shrink-0">
          <RecoveryRing value={score} zone={today.zone} size={180} />
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left space-y-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Plano de hoje</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Prontidão: <span className="text-foreground font-semibold font-mono">{score ?? '—'}</span>
              <span className="text-muted-foreground">/100</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
            <StatusBadge zone={today.zone} />
            {streak >= 2 && <StreakBadge streak={streak} />}
          </div>

          {today.alert === 'high_performance' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-[hsl(142,70%,50%)]/10 text-[hsl(142,70%,55%)] border border-[hsl(142,70%,50%)]/20"
            >
              <Flame className="w-4 h-4" /> Condição de Alta Performance
            </motion.div>
          )}
          {today.alert === 'attention' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-[hsl(45,93%,58%)]/10 text-[hsl(45,93%,63%)] border border-[hsl(45,93%,58%)]/20"
            >
              <AlertTriangle className="w-4 h-4" /> Atenção — Prontidão baixa
            </motion.div>
          )}

          <p className="text-sm text-muted-foreground font-medium">
            Hoje: <span className="text-foreground">{today.recommendation}</span>
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
            <Link
              to="/today"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all"
            >
              <LayoutList className="w-3.5 h-3.5" /> Planejar dia
            </Link>
            <Link
              to="/today"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary border border-border text-xs font-semibold hover:bg-secondary/80 transition-all"
            >
              <Dumbbell className="w-3.5 h-3.5" /> Registrar treino
            </Link>
          </div>
        </div>
      </div>

      {/* Subtle bg glow */}
      <div
        className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(142,70%,50%), transparent)' }}
      />
    </motion.div>
  );
}
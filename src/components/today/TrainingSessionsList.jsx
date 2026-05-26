import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Dumbbell, Clock, Gauge, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { getTimeOfDayLabel } from '@/lib/date-utils';
import AddTrainingModal from '@/components/training/AddTrainingModal';

function getStrainZone(strain) {
  if (strain >= 18) return { label: 'Máximo', color: 'text-red-400' };
  if (strain >= 14) return { label: 'Alto', color: 'text-orange-400' };
  if (strain >= 10) return { label: 'Moderado', color: 'text-yellow-400' };
  return { label: 'Leve', color: 'text-emerald-400' };
}

function StrainBadge({ strain }) {
  const val = strain || 0;
  const zone = getStrainZone(val);

  return (
    <div className="text-right">
      <p className={`text-sm font-mono font-bold ${zone.color}`}>⚡ {val}</p>
      <p className="text-[10px] text-muted-foreground">{zone.label}</p>
    </div>
  );
}

const INTENSITY_LABELS = {
  very_light: 'Muito leve',
  light: 'Leve',
  moderate: 'Moderado',
  hard: 'Intenso',
  very_hard: 'Máximo',
};

const INTENSITY_COLORS = {
  very_light: 'text-emerald-400',
  light: 'text-green-400',
  moderate: 'text-yellow-400',
  hard: 'text-orange-400',
  very_hard: 'text-red-400',
};

function getDaySummary(totalStrain, sessionsCount) {
  if (sessionsCount === 0) {
    return 'Nenhum treino registrado hoje.';
  }

  if (totalStrain >= 16) {
    return 'A carga de hoje já está alta. O restante do dia deve focar em recuperação.';
  }

  if (totalStrain >= 10) {
    return 'O dia já tem estímulo útil. Vale pensar bem antes de adicionar mais carga.';
  }

  return 'O dia ainda está relativamente controlado.';
}

export default function TrainingSessionsList({ checkin, sessions = [], onUpdate }) {
  const [showModal, setShowModal] = useState(false);

  const totalStrain = useMemo(() => {
    return sessions.reduce((sum, s) => sum + (s.strain_score || 0), 0);
  }, [sessions]);

  const summaryText = getDaySummary(totalStrain, sessions.length);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide">
            Treinos de hoje
          </span>

          {sessions.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
              {sessions.length}
            </span>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-3 h-3" />
          Adicionar
        </Button>
      </div>

      {/* Daily summary */}
      <div className="rounded-xl bg-secondary/40 border border-border/40 px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Resumo do dia
        </p>
        <p className="text-xs text-foreground/85 leading-relaxed">
          {summaryText}
        </p>
      </div>

      {/* Empty state */}
      <AnimatePresence mode="popLayout">
        {sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-7 rounded-2xl border border-dashed border-border"
          >
            <p className="text-sm text-muted-foreground">
              Nenhum treino registrado hoje
            </p>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar treino
            </button>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s, i) => (
              <motion.div
                key={s.id || i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <Dumbbell className="w-4 h-4 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate">{s.sport}</span>

                    {s.intensity && (
                      <span className={`text-[10px] font-semibold ${INTENSITY_COLORS[s.intensity] || 'text-muted-foreground'}`}>
                        {INTENSITY_LABELS[s.intensity] ?? s.intensity}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    {s.duration_minutes != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {s.duration_minutes}min
                      </span>
                    )}

                    {s.time_of_day && (
                      <span>{getTimeOfDayLabel(s.time_of_day)}</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <StrainBadge strain={s.strain_score} />
                </div>
              </motion.div>
            ))}

            {/* Totals */}
            <div className="rounded-xl bg-black/20 border border-white/5 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Total do dia
                  </p>
                  <p className="text-xs text-foreground/85 leading-relaxed">
                    {sessions.length} {sessions.length === 1 ? 'sessão registrada' : 'sessões registradas'}
                  </p>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Strain total
                    </span>
                  </div>
                  <p className={`text-lg font-mono font-bold ${getStrainZone(totalStrain).color}`}>
                    ⚡ {totalStrain}
                  </p>
                </div>
              </div>
            </div>

            {/* Single post-workout CTA */}
            <Link
              to="/checkin?mode=post"
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-xs text-foreground/85">
                  Registrar pós-treino e melhorar a leitura de amanhã
                </span>
              </div>
              <span className="text-primary text-xs font-semibold group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </Link>
          </div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <AddTrainingModal
            checkin={checkin}
            existingSessions={sessions}
            onClose={() => setShowModal(false)}
            onAdded={() => {
              setShowModal(false);
              if (onUpdate) onUpdate();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
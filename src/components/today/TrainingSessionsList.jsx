import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Dumbbell, Clock, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTimeOfDayLabel } from '@/lib/date-utils';
import AddTrainingModal from '@/components/training/AddTrainingModal';

const INTENSITY_LABELS = {
  very_light: 'Muito Leve',
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

export default function TrainingSessionsList({ checkin, sessions, onUpdate }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Treinos Hoje</span>
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
          <Plus className="w-3 h-3" /> Adicionar
        </Button>
      </div>

      <AnimatePresence mode="popLayout">
        {sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6 text-muted-foreground text-sm rounded-2xl border border-dashed border-border"
          >
            Nenhum treino registrado hoje
          </motion.div>
        ) : (
          sessions.map((s, i) => (
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
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">{s.sport}</span>
                  <span className={`text-[10px] font-semibold ${INTENSITY_COLORS[s.intensity]}`}>
                    {INTENSITY_LABELS[s.intensity]}
                  </span>
                </div>
                <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.duration_minutes}min</span>
                  <span>{getTimeOfDayLabel(s.time_of_day)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-amber-400">
                  <Flame className="w-3.5 h-3.5" />
                  <span className="text-sm font-mono font-bold">{s.strain_score || 0}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">strain</span>
              </div>
            </motion.div>
          ))
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <AddTrainingModal
            checkin={checkin}
            existingSessions={sessions}
            onClose={() => setShowModal(false)}
            onAdded={onUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
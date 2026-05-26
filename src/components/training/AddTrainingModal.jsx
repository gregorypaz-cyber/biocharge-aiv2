import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { getTodayLocal } from '@/lib/date-utils';
import { calculateStrainScore, generateTrainingImpactMessage } from '@/lib/training-impact-engine';
import { useUserCheckins } from '@/hooks/useUserData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useAuth } from '@/lib/AuthContext';

const INTENSITIES = [
  { value: 'very_light', label: 'Muito Leve', emoji: '🟢' },
  { value: 'light',      label: 'Leve',       emoji: '🟡' },
  { value: 'moderate',   label: 'Moderado',   emoji: '🟠' },
  { value: 'hard',       label: 'Intenso',    emoji: '🔴' },
  { value: 'very_hard',  label: 'Máximo',     emoji: '💀' },
];

const TIME_OF_DAY = [
  { value: 'morning',   label: 'Manhã',      emoji: '🌅' },
  { value: 'afternoon', label: 'Tarde',      emoji: '☀️' },
  { value: 'evening',   label: 'Noite',      emoji: '🌆' },
  { value: 'night',     label: 'Madrugada',  emoji: '🌙' },
];

const COMMON_SPORTS = ['Corrida', 'Musculação', 'Ciclismo', 'Natação', 'Futsal', 'Padel', 'Futebol', 'Jiu-jitsu', 'CrossFit', 'HIIT', 'Yoga', 'Caminhada'];

function getStrainZone(strain) {
  if (strain >= 18) return { emoji: '🔴', label: 'Máximo (18-21) — Requer 1-2 dias de recuperação', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
  if (strain >= 14) return { emoji: '🟠', label: 'Alto (14-17) — Estimula ganhos de performance', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
  if (strain >= 10) return { emoji: '🟡', label: 'Moderado (10-13) — Manutenção do condicionamento', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' };
  return { emoji: '🟢', label: 'Leve (0-9) — Recuperação ativa', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
}

function StrainPreview({ form, maxHr }) {
  const strain = calculateStrainScore(form, maxHr);
  const zone = getStrainZone(strain);
  return (
    <div className={`rounded-xl border p-3 ${zone.bg}`}>
      <p className={`text-xs font-bold mb-0.5 ${zone.color}`}>⚡ Strain estimado: {strain}</p>
      <p className="text-[11px] text-muted-foreground">{zone.emoji} {zone.label}</p>
    </div>
  );
}

export default function AddTrainingModal({ checkin, existingSessions, onClose, onAdded }) {
  const queryClient = useQueryClient();
const { data: recentCheckins = [] } = useUserCheckins(30);
  const [form, setForm] = useState({
    sport: '',
    intensity: 'moderate',
    duration_minutes: 45,
    time_of_day: 'afternoon',
    perceived_effort: 6,
    heart_rate_avg: '',
    heart_rate_max: '',
    notes: '',
  });
  const [calculating, setCalculating] = useState(false);
  const [impactMsg, setImpactMsg] = useState(null);

  const mutation = useMutation({
    mutationFn: async (data) => {
    setCalculating(true);
    const maxHr = user?.preferences?.max_hr || 185;
    const strainScore = calculateStrainScore(data, maxHr);
      const sessionData = {
        ...data,
        date: getTodayLocal(),
        checkin_id: checkin?.id,
        strain_score: strainScore,
        heart_rate_avg: data.heart_rate_avg ? Number(data.heart_rate_avg) : undefined,
        heart_rate_max: data.heart_rate_max ? Number(data.heart_rate_max) : undefined,
        duration_minutes: Number(data.duration_minutes),
        perceived_effort: Number(data.perceived_effort),
      };

      const created = await base44.entities.TrainingSession.create(sessionData);

      // Generate AI impact message
      const allSessions = [...(existingSessions || []), { ...sessionData, strain_score: strainScore }];
const msg = await generateTrainingImpactMessage(created, checkin, allSessions);
setImpactMsg(msg);

// ✅ salvar impacto no banco
await base44.entities.TrainingSession.update(created.id, {
  impact_message: msg,
});


// ✅ salvar no banco (isso estava faltando)
await base44.entities.TrainingSession.update(created.id, {
  impact_message: msg,
});

      // Update checkin with new strain/state
      if (checkin?.id) {
        const totalStrain = Math.min(21, allSessions.reduce((s, t) => s + (t.strain_score || 0), 0));
        const { calculateBodyState, calculateRemainingCapacity, calculateRecoveryDemand, calculateSleepNeed } = await import('@/lib/training-impact-engine');
        const { calcNextDayForecast } = await import('@/lib/biocharge-utils');
        const morningRecovery = checkin.morning_recovery_score || checkin.recovery_score || 70;
        const sleepNeed = calculateSleepNeed(totalStrain, morningRecovery);
// ✅ importar normalizador
const { normalizeDailySignals, computeCheckinScores } = await import('@/lib/biocharge-utils');

const updatedBase = {
  ...checkin,
  daily_strain_accumulated: totalStrain,
  current_body_state: calculateBodyState(morningRecovery, totalStrain),
  remaining_capacity: calculateRemainingCapacity(morningRecovery, totalStrain),
  recovery_demand: calculateRecoveryDemand(totalStrain, morningRecovery),
  sleep_need_tonight: sleepNeed,
  next_day_forecast: calcNextDayForecast(morningRecovery, sleepNeed),
};

// ✅ recalcular TODOS os sinais corretamente
const normalized = computeCheckinScores(
  updatedBase,
  [], // pode melhorar depois com histórico
  allSessions
);

await base44.entities.DailyCheckin.update(checkin.id, {
  daily_strain_accumulated: normalized.daily_strain_accumulated,
  current_body_state: normalized.current_body_state,
  remaining_capacity: normalized.remaining_capacity,
  recovery_demand: normalized.recovery_demand,

  // ✅ sinais coerentes
  zone: normalized.zone,
  recommendation: normalized.recommendation,
  training_load: normalized.training_load,
  headline_today: normalized.headline_today,
  sleep_need_tonight: normalized.sleep_need_tonight,
  next_day_forecast: normalized.next_day_forecast,
});
      }

      return created;
    },
    onSuccess: () => {
      setCalculating(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.checkins(user?.email) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trainingSessions(user?.email) });
    },
    onError: () => setCalculating(false),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.sport || !form.duration_minutes) return;
    mutation.mutate(form);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-card border border-border rounded-3xl w-full max-w-md flex flex-col"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header — fixo */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base">Registrar Treino</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Impact result */}
        <AnimatePresence>
          {impactMsg && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 overflow-y-auto p-5"
            >
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <p className="text-xs font-semibold text-primary mb-1">⚡ Impacto Fisiológico</p>
                <p className="text-sm leading-relaxed text-foreground">{impactMsg}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-border shrink-0">
                <Button className="w-full h-12 font-semibold" onClick={() => { onAdded?.(); onClose(); }}>
                  Fechar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!impactMsg && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Sport */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Esporte / Atividade</label>
                <Input
                  placeholder="Ex: Corrida, Musculação..."
                  value={form.sport}
                  onChange={e => set('sport', e.target.value)}
                  className="bg-secondary border-border mb-2"
                />
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_SPORTS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('sport', s)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                        form.sport === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intensity */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Intensidade</label>
                <div className="flex gap-1.5">
                  {INTENSITIES.map(i => (
                    <button
                      key={i.value}
                      type="button"
                      onClick={() => set('intensity', i.value)}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[10px] font-semibold transition-all border ${
                        form.intensity === i.value
                          ? 'border-primary/50 bg-primary/10 text-foreground'
                          : 'border-border bg-secondary text-muted-foreground'
                      }`}
                    >
                      <span className="text-base">{i.emoji}</span>
                      <span>{i.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Duração (min)</label>
                  <Input
                    type="number"
                    min={5}
                    max={300}
                    value={form.duration_minutes}
                    onChange={e => set('duration_minutes', e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Período</label>
                  <div className="grid grid-cols-2 gap-1">
                    {TIME_OF_DAY.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => set('time_of_day', t.value)}
                        className={`py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                          form.time_of_day === t.value
                            ? 'border-primary/50 bg-primary/10 text-foreground'
                            : 'border-border bg-secondary text-muted-foreground'
                        }`}
                      >
                        {t.emoji} {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Effort */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Esforço (1-10)</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.perceived_effort}
                  onChange={e => set('perceived_effort', e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>

              {/* HR avg + max */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">FC Média (opt)</label>
                  <Input
                    type="number"
                    placeholder="bpm"
                    value={form.heart_rate_avg}
                    onChange={e => set('heart_rate_avg', e.target.value)}
                    className="bg-secondary border-border"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Média — veja no Zepp</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">FC Máxima (opt)</label>
                  <Input
                    type="number"
                    placeholder="bpm"
                    value={form.heart_rate_max}
                    onChange={e => set('heart_rate_max', e.target.value)}
                    className="bg-secondary border-border"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Pico de FC — veja no Zepp</p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Notas (opcional)</label>
                <Input
                  placeholder="Como foi o treino?"
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>

              {/* Strain preview */}
              {form.sport && form.duration_minutes && <StrainPreview form={form} maxHr={user?.preferences?.max_hr} />}
            </div>

            {/* Footer — fixo */}
            <div className="p-5 pt-3 border-t border-border shrink-0">
              <Button
                type="submit"
                className="w-full h-12 font-semibold"
                disabled={mutation.isPending || !form.sport}
              >
                {mutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Calculando impacto fisiológico...
                  </span>
                ) : (
                  'Registrar Treino'
                )}
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { getTodayLocal } from '@/lib/date-utils';
import {
  calculateStrainScore,
  generateTrainingImpactMessage,
} from '@/lib/training-impact-engine';
import { useUserCheckins } from '@/hooks/useUserData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useAuth } from '@/lib/AuthContext';

const INTENSITIES = [
  { value: 'very_light', label: 'Muito Leve', emoji: '🟢' },
  { value: 'light', label: 'Leve', emoji: '🟡' },
  { value: 'moderate', label: 'Moderado', emoji: '🟠' },
  { value: 'hard', label: 'Intenso', emoji: '🔴' },
  { value: 'very_hard', label: 'Máximo', emoji: '💀' },
];

const TIME_OF_DAY = [
  { value: 'morning', label: 'Manhã', emoji: '🌅' },
  { value: 'afternoon', label: 'Tarde', emoji: '☀️' },
  { value: 'evening', label: 'Noite', emoji: '🌆' },
  { value: 'night', label: 'Madrugada', emoji: '🌙' },
];

const COMMON_SPORTS = [
  'Corrida',
  'Musculação',
  'Ciclismo',
  'Natação',
  'Futsal',
  'Padel',
  'Futebol',
  'Jiu-jitsu',
  'CrossFit',
  'HIIT',
  'Yoga',
  'Caminhada',
];

function getStrainZone(strain) {
  if (strain >= 18) {
    return {
      emoji: '🔴',
      label: 'Máximo (18-21) — Requer 1-2 dias de recuperação',
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
    };
  }

  if (strain >= 14) {
    return {
      emoji: '🟠',
      label: 'Alto (14-17) — Estimula ganhos de performance',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10 border-orange-500/20',
    };
  }

  if (strain >= 10) {
    return {
      emoji: '🟡',
      label: 'Moderado (10-13) — Manutenção do condicionamento',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10 border-yellow-500/20',
    };
  }

  return {
    emoji: '🟢',
    label: 'Leve (0-9) — Recuperação ativa',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  };
}

function StrainPreview({ form, maxHr }) {
  const strain = calculateStrainScore(form, maxHr);
  const zone = getStrainZone(strain);

  const isRunning = String(form?.sport || '').toLowerCase().includes('corr');
  const hasTE =
    Number(form?.training_effect_aerobic) > 0 ||
    Number(form?.training_effect_anaerobic) > 0;
  const strainSource = isRunning
    ? (hasTE
        ? 'via Efeito do Treino (Zepp) — preciso'
        : 'estimado por FC/RPE — preencha o Efeito do Treino p/ mais precisão')
    : 'por FC/RPE e duração';

  return (
    <div className={`rounded-xl border p-3 ${zone.bg}`}>
      <p className={`text-xs font-bold mb-0.5 ${zone.color}`}>
        ⚡ Strain estimado: {strain}
      </p>
      <p className="t-micro text-muted-foreground">
        {zone.emoji} {zone.label}
      </p>
      <p className="t-micro text-muted-foreground mt-1 opacity-80">
        Cálculo {strainSource}.
      </p>
    </div>
  );
}

export default function AddTrainingModal({
  checkin,
  existingSessions,
  onClose,
  onAdded,
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: recentCheckins = [] } = useUserCheckins(30);

  const [form, setForm] = useState({
    sport: '',
    intensity: 'moderate',
    duration_minutes: 45,
    time_of_day: 'afternoon',
    perceived_effort: 6,
    heart_rate_avg: '',
    heart_rate_max: '',
    distance_km: '',
    pace_min: '',
    pace_sec: '',
    training_effect_aerobic: '',
    training_effect_anaerobic: '',
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
        heart_rate_avg: data.heart_rate_avg
          ? Number(data.heart_rate_avg)
          : undefined,
        heart_rate_max: data.heart_rate_max
          ? Number(data.heart_rate_max)
          : undefined,
        distance_km: data.distance_km
          ? Number(data.distance_km)
          : undefined,
        avg_pace_seconds_per_km:
          Number(data.pace_min) > 0 || Number(data.pace_sec) > 0
            ? Number(data.pace_min || 0) * 60 + Number(data.pace_sec || 0)
            : undefined,
        training_effect_aerobic: data.training_effect_aerobic
          ? Number(data.training_effect_aerobic)
          : undefined,
        training_effect_anaerobic: data.training_effect_anaerobic
          ? Number(data.training_effect_anaerobic)
          : undefined,
        duration_minutes: Number(data.duration_minutes),
        perceived_effort: Number(data.perceived_effort),
      };

      const created = await base44.entities.TrainingSession.create(sessionData);

      const allSessions = [
        ...(existingSessions || []),
        { ...sessionData, id: created.id, strain_score: strainScore },
      ];

      const msg = await generateTrainingImpactMessage(created, checkin, allSessions);
      setImpactMsg(msg);

      // Salva o impacto no banco
      if (msg) {
        await base44.entities.TrainingSession.update(created.id, {
          impact_message: msg,
        });
      }

      // Atualiza o check-in com novo estado coerente do dia
      if (checkin?.id) {
        const totalStrain = Math.min(
          21,
          allSessions.reduce((s, t) => s + (t.strain_score || 0), 0)
        );

        const {
          calculateBodyState,
          calculateRemainingCapacity,
          calculateRecoveryDemand,
          calculateSleepNeed,
        } = await import('@/lib/training-impact-engine');

        const { computeCheckinScores } = await import('@/lib/biocharge-utils');

        const morningRecovery =
          checkin.morning_recovery_score || checkin.recovery_score || 70;

        const sleepNeed = calculateSleepNeed(totalStrain, morningRecovery, recentCheckins);

        const nonTodayRecentCheckins = [...recentCheckins]
          .filter((c) => c.id !== checkin.id)
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))
          .slice(0, 14);

        const updatedBase = {
          ...checkin,
          daily_strain_accumulated: totalStrain,
          current_body_state: calculateBodyState(morningRecovery, totalStrain),
          remaining_capacity: calculateRemainingCapacity(
            morningRecovery,
            totalStrain
          ),
          recovery_demand: calculateRecoveryDemand(totalStrain, morningRecovery),
          sleep_need_tonight: sleepNeed,
        };

        const normalized = computeCheckinScores(
          updatedBase,
          nonTodayRecentCheckins,
          allSessions
        );

        normalized.morning_recovery_score =
          checkin.morning_recovery_score ??
          checkin.recovery_score ??
          normalized.recovery_score;

        // Anexa a observação do treino ao notes do dia, para alimentar a
        // inteligência (deep analysis / bullets) — igual ao pós-treino faz.
        const trainingNote = (data.notes && String(data.notes).trim()) ? String(data.notes).trim() : '';
        const trainingTag = data.sport ? `[TREINO — ${data.sport}]` : '[TREINO]';
        const mergedDayNotes = trainingNote
          ? (checkin.notes ? `${checkin.notes}\n\n${trainingTag} ${trainingNote}` : `${trainingTag} ${trainingNote}`)
          : (checkin.notes || '');

        await base44.entities.DailyCheckin.update(checkin.id, {
          ...(trainingNote ? { notes: mergedDayNotes } : {}),
          daily_strain_accumulated: normalized.daily_strain_accumulated,
          current_body_state: updatedBase.current_body_state,
          remaining_capacity: updatedBase.remaining_capacity,
          recovery_demand: updatedBase.recovery_demand,
          zone: normalized.zone,
          recommendation: normalized.recommendation,
          training_load: normalized.training_load,
          headline_today: normalized.headline_today,
          sleep_need_tonight: normalized.sleep_need_tonight,
          next_day_forecast: normalized.next_day_forecast,
          delayed_fatigue_alert:
            normalized.delayed_fatigue_alert ??
            checkin.delayed_fatigue_alert ??
            null,
          morning_recovery_score: normalized.morning_recovery_score,
        });
      }

      return created;
    },

    onSuccess: () => {
      setCalculating(false);
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.checkins(user?.email),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.trainingSessions(user?.email),
      });
    },

    onError: () => {
      setCalculating(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.sport || !form.duration_minutes) return;
    mutation.mutate(form);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Folha modal padrão iOS: trava o scroll de fundo e fecha no Escape.
  // Espelha o DayDetailSheet do Histórico — as duas folhas do app se comportam igual.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-training-title"
        initial={{ y: '5%', opacity: 0.7 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '5%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.9 }}
        className="sheet-surface sheet-scroll bg-card border border-border rounded-3xl w-full max-w-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-2.5 pb-1 flex justify-center shrink-0">
          <span className="sheet-grabber" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 pt-1 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            <h2 id="add-training-title" className="t-section font-semibold">Registrar Treino</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-11 h-11 -mr-2.5 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resultado */}
        <AnimatePresence>
          {impactMsg && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 overflow-y-auto overscroll-contain p-5"
            >
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <p className="text-xs font-semibold text-primary mb-1">
                  ⚡ Impacto Fisiológico
                </p>
                <p className="text-sm leading-relaxed text-foreground">
                  {impactMsg}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-border shrink-0">
                <Button
                  className="w-full h-12 font-semibold"
                  onClick={() => {
                    onAdded?.();
                    onClose();
                  }}
                >
                  Fechar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!impactMsg && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Sport */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Esporte / Atividade
                </label>

                <Input
                  placeholder="Ex: Corrida, Musculação..."
                  value={form.sport}
                  onChange={(e) => set('sport', e.target.value)}
                  className="bg-secondary border-border mb-2"
                />

                <div className="flex flex-wrap gap-1.5">
                  {COMMON_SPORTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('sport', s)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                        form.sport === s
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intensity */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Intensidade
                </label>

                <div className="flex gap-1.5">
                  {INTENSITIES.map((i) => (
                    <button
                      key={i.value}
                      type="button"
                      onClick={() => set('intensity', i.value)}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl t-micro font-semibold transition-all border ${
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
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Duração (min)
                  </label>

                  <Input
                    type="number"
                    min={5}
                    max={300}
                    value={form.duration_minutes}
                    onChange={(e) => set('duration_minutes', e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Período
                  </label>

                  <div className="grid grid-cols-2 gap-1">
                    {TIME_OF_DAY.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => set('time_of_day', t.value)}
                        className={`py-1.5 rounded-lg t-micro font-semibold transition-all border ${
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
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Esforço (1-10)
                </label>

                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.perceived_effort}
                  onChange={(e) => set('perceived_effort', e.target.value)}
                  className="bg-secondary border-border"
                />
                <p className="t-micro text-muted-foreground mt-1.5 leading-relaxed">
                  Teste da fala — <strong>1-2</strong>: quase parado · <strong>3-4</strong>: converso em frases inteiras · <strong>5-6</strong>: só frases curtas · <strong>7-8</strong>: só palavras soltas · <strong>9-10</strong>: não consigo falar. Em corrida, o Efeito do Treino do Zepp é mais preciso.
                </p>
              </div>

              {/* HR */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    FC Média (opt)
                  </label>

                  <Input
                    type="number"
                    placeholder="bpm"
                    value={form.heart_rate_avg}
                    onChange={(e) => set('heart_rate_avg', e.target.value)}
                    className="bg-secondary border-border"
                  />
                  <p className="t-micro text-muted-foreground mt-1">
                    Média — veja no Zepp
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    FC Máxima (opt)
                  </label>

                  <Input
                    type="number"
                    placeholder="bpm"
                    value={form.heart_rate_max}
                    onChange={(e) => set('heart_rate_max', e.target.value)}
                    className="bg-secondary border-border"
                  />
                  <p className="t-micro text-muted-foreground mt-1">
                    Pico de FC — veja no Zepp
                  </p>
                </div>
              </div>

              {/* Corrida: distância e pace — alimentam o motor de economia de corrida */}
              {form.sport && form.sport.toLowerCase().includes('corr') && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
                  <p className="t-micro font-semibold text-primary uppercase tracking-wider">
                    Dados da corrida (melhoram seus insights)
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                        Distância (km)
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="ex: 8.5"
                        value={form.distance_km}
                        onChange={(e) => set('distance_km', e.target.value)}
                        className="bg-secondary border-border"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                        Pace médio (/km)
                      </label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          placeholder="min"
                          value={form.pace_min}
                          onChange={(e) => set('pace_min', e.target.value)}
                          className="bg-secondary border-border text-center"
                        />
                        <span className="text-muted-foreground font-mono">:</span>
                        <Input
                          type="number"
                          placeholder="seg"
                          max={59}
                          value={form.pace_sec}
                          onChange={(e) => set('pace_sec', e.target.value)}
                          className="bg-secondary border-border text-center"
                        />
                      </div>
                      <p className="t-micro text-muted-foreground mt-1">
                        Ex: 5 : 30 = 5min30/km
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                        Efeito aeróbico
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        max={5}
                        placeholder="ex: 3.5"
                        value={form.training_effect_aerobic}
                        onChange={(e) => set('training_effect_aerobic', e.target.value)}
                        className="bg-secondary border-border text-center"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                        Efeito anaeróbico
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        max={5}
                        placeholder="ex: 3.3"
                        value={form.training_effect_anaerobic}
                        onChange={(e) => set('training_effect_anaerobic', e.target.value)}
                        className="bg-secondary border-border text-center"
                      />
                    </div>
                  </div>
                  <p className="t-micro text-primary/90 mt-2 leading-relaxed">
                    💡 Preencha o <strong>Efeito do Treino</strong> (Zepp → resumo da corrida): quando informado, o strain da corrida vem direto dele — mais preciso que estimar por FC/RPE.
                  </p>
                </div>
              )}


              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Notas (opcional)
                </label>

                <Input
                  placeholder="Como foi o treino?"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>

              {/* Preview */}
              {form.sport && form.duration_minutes && (
                <StrainPreview form={form} maxHr={user?.preferences?.max_hr} />
              )}
            </div>

            {/* Footer */}
            <div className="p-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] border-t border-border shrink-0">
              <Button
                type="submit"
                className="w-full h-12 font-semibold"
                disabled={mutation.isPending || !form.sport}
              >
                {mutation.isPending || calculating ? (
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

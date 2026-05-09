import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save, ArrowLeft, Zap, Moon, Activity, Dumbbell, Heart, Scale } from 'lucide-react';
import SliderField from '@/components/checkin/SliderField';
import EmojiSelector from '@/components/checkin/EmojiSelector';
import { computeCheckinScores } from '@/lib/biocharge-utils';
import CircularGauge from '@/components/ui-bio/CircularGauge';
import StatusBadge from '@/components/ui-bio/StatusBadge';
import { getZoneColor } from '@/lib/biocharge-utils';

export default function DailyCheckin() {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData;
  const queryClient = useQueryClient();

  const [form, setForm] = useState(editData || {
    date: format(new Date(), 'yyyy-MM-dd'),
    biocharge_morning: 70,
    biocharge_pre_workout: null,
    biocharge_post_workout: null,
    sleep_score: 70,
    fatigue: 30,
    deep_sleep_pct: 25,
    rpe: 5,
    mood: 3,
    stress: 2,
    energy: 3,
    hydration: 3,
    muscle_soreness: 1,
    sleep_hours: 7,
    resting_hr: null,
    hrv: null,
    body_weight: null,
    notes: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const preview = computeCheckinScores(form);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const scores = computeCheckinScores(data);
      if (editData?.id) {
        return base44.entities.DailyCheckin.update(editData.id, scores);
      }
      return base44.entities.DailyCheckin.create(scores);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins'] });
      navigate('/');
    },
  });

  const handleSave = () => saveMutation.mutate(form);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Voltar</span>
        </button>
        <h1 className="text-lg font-bold">{editData ? 'Editar' : 'Novo'} Check-in</h1>
        <div className="w-16" />
      </div>

      {/* Live Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card"
      >
        <CircularGauge value={preview.recovery_score} size={80} strokeWidth={6} color={getZoneColor(preview.zone)} />
        <div>
          <StatusBadge zone={preview.zone} />
          <p className="text-xs text-muted-foreground mt-1">{preview.recommendation}</p>
        </div>
      </motion.div>

      {/* Date */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Data</label>
        <Input type="date" value={form.date} onChange={e => update('date', e.target.value)} className="bg-card border-border" />
      </div>

      {/* Core Metrics */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-5 space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Métricas Principais</h2>
        <SliderField label="BioCharge Manhã" value={form.biocharge_morning} onChange={v => update('biocharge_morning', v)} icon={Zap} />
        <SliderField label="BioCharge Pré-Treino" value={form.biocharge_pre_workout} onChange={v => update('biocharge_pre_workout', v)} icon={Zap} />
        <SliderField label="BioCharge Pós-Treino" value={form.biocharge_post_workout} onChange={v => update('biocharge_post_workout', v)} icon={Zap} />
        <SliderField label="Sleep Score" value={form.sleep_score} onChange={v => update('sleep_score', v)} icon={Moon} />
        <SliderField label="Fadiga" value={form.fatigue} onChange={v => update('fatigue', v)} icon={Activity} />
        <SliderField label="Sono Profundo" value={form.deep_sleep_pct} onChange={v => update('deep_sleep_pct', v)} unit="%" icon={Moon} max={60} />
        <SliderField label="RPE" value={form.rpe} onChange={v => update('rpe', v)} icon={Dumbbell} min={1} max={10} />
      </motion.div>

      {/* Wellbeing */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-border bg-card p-5 space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Bem-estar</h2>
        <EmojiSelector label="Humor" type="mood" value={form.mood} onChange={v => update('mood', v)} />
        <EmojiSelector label="Estresse" type="stress" value={form.stress} onChange={v => update('stress', v)} />
        <EmojiSelector label="Energia" type="energy" value={form.energy} onChange={v => update('energy', v)} />
        <EmojiSelector label="Hidratação" type="hydration" value={form.hydration} onChange={v => update('hydration', v)} />
        <EmojiSelector label="Dor Muscular" type="soreness" value={form.muscle_soreness} onChange={v => update('muscle_soreness', v)} />
      </motion.div>

      {/* Body Metrics */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Corpo</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Moon className="w-3 h-3" /> Horas de sono</label>
            <Input type="number" step="0.5" value={form.sleep_hours || ''} onChange={e => update('sleep_hours', parseFloat(e.target.value) || null)} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Heart className="w-3 h-3" /> FC Repouso</label>
            <Input type="number" value={form.resting_hr || ''} onChange={e => update('resting_hr', parseFloat(e.target.value) || null)} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3" /> HRV (ms)</label>
            <Input type="number" value={form.hrv || ''} onChange={e => update('hrv', parseFloat(e.target.value) || null)} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Scale className="w-3 h-3" /> Peso (kg)</label>
            <Input type="number" step="0.1" value={form.body_weight || ''} onChange={e => update('body_weight', parseFloat(e.target.value) || null)} className="bg-secondary border-border" />
          </div>
        </div>
      </motion.div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Observações</label>
        <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Como foi seu dia?" className="bg-card border-border min-h-[80px]" />
      </div>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className="w-full h-12 bg-primary text-primary-foreground font-semibold rounded-xl text-base"
      >
        {saveMutation.isPending ? (
          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
        ) : (
          <><Save className="w-5 h-5 mr-2" /> Salvar Check-in</>
        )}
      </Button>
    </div>
  );
}
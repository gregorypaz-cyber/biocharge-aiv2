import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save, ArrowLeft, Moon, Activity, Heart, Scale } from 'lucide-react';
import SliderField from '@/components/checkin/SliderField';
import EmojiSelector from '@/components/checkin/EmojiSelector';
import CheckinStep from '@/components/checkin/CheckinStep';
import LivePreview from '@/components/checkin/LivePreview';
import { computeCheckinScores } from '@/lib/biocharge-utils';

const DEFAULT_FORM = {
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
};

export default function DailyCheckin() {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData;
  const queryClient = useQueryClient();

  const [form, setForm] = useState(editData || DEFAULT_FORM);
  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const preview = computeCheckinScores(form);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const scores = computeCheckinScores(data);
      if (editData?.id) return base44.entities.DailyCheckin.update(editData.id, scores);
      return base44.entities.DailyCheckin.create(scores);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins'] });
      navigate('/');
    },
  });

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <h1 className="text-base font-bold">{editData ? 'Editar' : 'Novo'} Check-in</h1>
        <div className="w-16" />
      </div>

      {/* Live Preview */}
      <LivePreview preview={preview} />

      {/* Date */}
      <div className="px-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Data</label>
        <Input
          type="date"
          value={form.date}
          onChange={e => update('date', e.target.value)}
          className="bg-card border-border/60 max-w-[200px]"
        />
      </div>

      {/* BioCharge */}
      <CheckinStep title="BioCharge" emoji="⚡" delay={0.05}>
        <SliderField label="Manhã" value={form.biocharge_morning} onChange={v => update('biocharge_morning', v)} />
        <SliderField label="Pré-Treino" value={form.biocharge_pre_workout ?? 0} onChange={v => update('biocharge_pre_workout', v)} />
        <SliderField label="Pós-Treino" value={form.biocharge_post_workout ?? 0} onChange={v => update('biocharge_post_workout', v)} />
      </CheckinStep>

      {/* Sleep */}
      <CheckinStep title="Sono" emoji="🌙" delay={0.1}>
        <SliderField label="Sleep Score" value={form.sleep_score} onChange={v => update('sleep_score', v)} icon={Moon} />
        <SliderField label="Sono Profundo" value={form.deep_sleep_pct} onChange={v => update('deep_sleep_pct', v)} unit="%" max={60} />
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground flex-1">Horas de Sono</label>
          <Input
            type="number"
            step="0.5"
            min="0"
            max="12"
            value={form.sleep_hours || ''}
            onChange={e => update('sleep_hours', parseFloat(e.target.value) || null)}
            className="bg-secondary border-border/40 w-24 text-center font-mono"
          />
        </div>
      </CheckinStep>

      {/* Performance */}
      <CheckinStep title="Performance" emoji="🏋️" delay={0.15}>
        <SliderField label="Fadiga" value={form.fatigue} onChange={v => update('fatigue', v)} icon={Activity} />
        <SliderField label="RPE (Esforço Percebido)" value={form.rpe} onChange={v => update('rpe', v)} min={1} max={10} />
      </CheckinStep>

      {/* Wellbeing */}
      <CheckinStep title="Bem-estar" emoji="🧠" delay={0.2}>
        <EmojiSelector label="Humor" type="mood" value={form.mood} onChange={v => update('mood', v)} />
        <EmojiSelector label="Estresse" type="stress" value={form.stress} onChange={v => update('stress', v)} />
        <EmojiSelector label="Energia" type="energy" value={form.energy} onChange={v => update('energy', v)} />
        <EmojiSelector label="Hidratação" type="hydration" value={form.hydration} onChange={v => update('hydration', v)} />
        <EmojiSelector label="Dor Muscular" type="soreness" value={form.muscle_soreness} onChange={v => update('muscle_soreness', v)} />
      </CheckinStep>

      {/* Body metrics */}
      <CheckinStep title="Biometria" emoji="📊" delay={0.25}>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'FC Repouso', field: 'resting_hr', icon: Heart, unit: 'bpm' },
            { label: 'HRV', field: 'hrv', icon: Activity, unit: 'ms' },
            { label: 'Peso (kg)', field: 'body_weight', icon: Scale, step: '0.1' },
          ].map(({ label, field, icon: Icon, unit, step }) => (
            <div key={field} className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                {Icon && <Icon className="w-3 h-3" />} {label}
              </label>
              <Input
                type="number"
                step={step || '1'}
                value={form[field] || ''}
                onChange={e => update(field, parseFloat(e.target.value) || null)}
                placeholder="—"
                className="bg-secondary border-border/40 font-mono"
              />
            </div>
          ))}
        </div>
      </CheckinStep>

      {/* Notes */}
      <CheckinStep title="Observações" emoji="📝" delay={0.3}>
        <Textarea
          value={form.notes}
          onChange={e => update('notes', e.target.value)}
          placeholder="Como foi seu dia? Algo relevante?"
          className="bg-secondary border-border/40 min-h-[80px] resize-none"
        />
      </CheckinStep>

      {/* Save */}
      <Button
        onClick={() => saveMutation.mutate(form)}
        disabled={saveMutation.isPending}
        className="w-full h-13 bg-primary text-primary-foreground font-bold rounded-2xl text-base py-4 hover:bg-primary/90 transition-all hover:scale-[1.01]"
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
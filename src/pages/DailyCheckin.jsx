import React, { useState } from 'react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { getTodayLocal } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, ArrowLeft, Moon, Activity, Heart, Scale, Info } from 'lucide-react';
import SliderField from '@/components/checkin/SliderField';
import EmojiSelector from '@/components/checkin/EmojiSelector';
import CheckinStep from '@/components/checkin/CheckinStep';
import LivePreview from '@/components/checkin/LivePreview';
import RestDayToggle from '@/components/checkin/RestDayToggle';
import { computeCheckinScores } from '@/lib/biocharge-utils';

function HRVField({ value, onChange }) {
  const [showTip, setShowTip] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground flex items-center gap-1">
        <Activity className="w-3 h-3" /> HRV (ms)
        <button
          type="button"
          onClick={() => setShowTip(p => !p)}
          className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Info className="w-3 h-3" />
        </button>
      </label>
      {showTip && (
        <div className="text-[10px] text-muted-foreground bg-secondary rounded-xl p-3 leading-relaxed border border-border/40">
          <p className="font-semibold text-foreground mb-1">Onde encontrar no Zepp:</p>
          Abra o Zepp → aba BioCharge →<br />
          Variabilidade da Frequência Cardíaca<br />
          Digite o valor em ms mostrado na tela.
        </div>
      )}
      <Input
        type="number"
        step="1"
        value={value || ''}
        onChange={e => onChange(parseFloat(e.target.value) || null)}
        placeholder="Ex: 48"
        className="bg-secondary border-border/40 font-mono"
      />
      <p className="text-[10px] text-muted-foreground">Valor da manhã, antes de se levantar</p>
    </div>
  );
}

const DEFAULT_FORM = {
  date: getTodayLocal(),
  rest_day: false,
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
  const { user } = useAuth();

  const [form, setForm] = useState(editData ? { rest_day: false, ...editData } : DEFAULT_FORM);
  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const isRestDay = form.rest_day;
  const preview = computeCheckinScores(form);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = data.rest_day
        ? { ...data, rpe: 0, fatigue: 0, biocharge_pre_workout: null, biocharge_post_workout: null }
        : data;
      const scores = computeCheckinScores(payload);
      // Set morning_recovery_score only on NEW check-ins (immutable after creation)
      if (!editData?.id) {
        scores.morning_recovery_score = scores.recovery_score;
      }
      if (editData?.id) return base44.entities.DailyCheckin.update(editData.id, scores);
      return base44.entities.DailyCheckin.create(scores);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins', user?.email] });
      toast.success('✅ Check-in salvo com sucesso!');
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

      {/* BioCharge / Energia Percebida */}
      <CheckinStep title="Energia Percebida" emoji="⚡" delay={0.05}>
        <SliderField
          label="Como você acordou? (0-100)"
          hint="Sua percepção geral ao acordar"
          value={form.biocharge_morning}
          onChange={v => update('biocharge_morning', v)}
        />
        <div style={{ opacity: isRestDay ? 0.4 : 1 }} className="space-y-5 transition-opacity">
          <SliderField
            label="Energia antes do treino (0-100)"
            hint="Deixe em 0 se não treinou hoje"
            value={form.biocharge_pre_workout ?? 0}
            onChange={v => update('biocharge_pre_workout', v)}
          />
          <SliderField
            label="Como ficou após o treino? (0-100)"
            hint="Deixe em 0 se não treinou hoje"
            value={form.biocharge_post_workout ?? 0}
            onChange={v => update('biocharge_post_workout', v)}
          />
        </div>
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

      {/* Performance — hidden on rest day */}
      {!isRestDay && (
        <CheckinStep title="Performance" emoji="🏋️" delay={0.15}>
          <SliderField label="Fadiga" value={form.fatigue} onChange={v => update('fatigue', v)} icon={Activity} />
          <SliderField label="RPE (Esforço Percebido)" value={form.rpe} onChange={v => update('rpe', v)} min={1} max={10} />
        </CheckinStep>
      )}

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
          {/* FC Repouso */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Heart className="w-3 h-3" /> FC Repouso
            </label>
            <Input
              type="number"
              step="1"
              value={form.resting_hr || ''}
              onChange={e => update('resting_hr', parseFloat(e.target.value) || null)}
              placeholder="—"
              className="bg-secondary border-border/40 font-mono"
            />
          </div>

          {/* HRV with tooltip */}
          <HRVField value={form.hrv} onChange={v => update('hrv', v)} />

          {/* Peso */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Scale className="w-3 h-3" /> Peso (kg)
            </label>
            <Input
              type="number"
              step="0.1"
              value={form.body_weight || ''}
              onChange={e => update('body_weight', parseFloat(e.target.value) || null)}
              placeholder="—"
              className="bg-secondary border-border/40 font-mono"
            />
          </div>
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

      {/* Rest Day Toggle — at the end */}
      <RestDayToggle value={isRestDay} onChange={v => update('rest_day', v)} />

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
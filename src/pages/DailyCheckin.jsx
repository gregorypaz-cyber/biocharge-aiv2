import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { getTodayLocal } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, ArrowLeft, Moon, Activity, Heart, Scale, Info, Zap, SkipForward } from 'lucide-react';
import SliderField from '@/components/checkin/SliderField';
import EmojiSelector from '@/components/checkin/EmojiSelector';
import CheckinStep from '@/components/checkin/CheckinStep';
import LivePreview from '@/components/checkin/LivePreview';
import RestDayToggle from '@/components/checkin/RestDayToggle';
import { computeCheckinScores, calcSleepNeedTonight, calcNextDayForecast, calcDelayedFatigueAlert } from '@/lib/biocharge-utils';
import { useUserCheckins, useUserTrainingSessions } from '@/hooks/useUserData';

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
  sleep_start_time: null,
  resting_hr: null,
  hrv: null,
  body_weight: null,
  notes: '',
};

const DEFAULT_POST_FORM = {
  biocharge_post_workout: 0,
  rpe: 0,
  energy: 0,
  muscle_soreness: 0,
  notes: '',
};

export default function DailyCheckin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'morning';
  const isPostMode = mode === 'post';

  const editData = location.state?.editData;
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // For post mode + delayed fatigue: fetch history
  const { data: checkins = [], isLoading: loadingCheckins } = useUserCheckins(30);
  const { data: allSessions = [] } = useUserTrainingSessions(100);
  const todayDate = getTodayLocal();
  const todayRecord = checkins.find(c => c.date === todayDate);

  const [form, setForm] = useState(editData ? { rest_day: false, ...editData } : DEFAULT_FORM);
  const [postForm, setPostForm] = useState(DEFAULT_POST_FORM);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const updatePost = (field, value) => setPostForm(prev => ({ ...prev, [field]: value }));

  const isRestDay = form.rest_day;
  const preview = computeCheckinScores(form);

  // Morning save mutation
  const saveMorningMutation = useMutation({
    mutationFn: async (data) => {
      const payload = data.rest_day
        ? { ...data, rpe: 0, fatigue: 0, biocharge_pre_workout: null, biocharge_post_workout: null }
        : data;
      const recentCheckins = checkins.filter(c => c.date !== data.date).slice(0, 14);
      const scores = computeCheckinScores(payload, recentCheckins, allSessions);
      if (!editData?.id) {
        scores.morning_recovery_score = scores.recovery_score;
      }
      // Compute and save the three new fields
      const strainAccumulated = payload.daily_strain_accumulated || 0;
      const sleepNeed = calcSleepNeedTonight(scores.recovery_score, strainAccumulated, recentCheckins);
      scores.sleep_need_tonight = sleepNeed;
      scores.next_day_forecast = calcNextDayForecast(scores.recovery_score, sleepNeed);
      scores.delayed_fatigue_alert = calcDelayedFatigueAlert(payload, recentCheckins, allSessions);
      if (editData?.id) return base44.entities.DailyCheckin.update(editData.id, scores);
      return base44.entities.DailyCheckin.create(scores);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins', user?.email] });
      toast.success('✅ Check-in salvo com sucesso!');
      navigate('/');
    },
  });

  // Post-workout save mutation
  const savePostMutation = useMutation({
    mutationFn: async (data) => {
      const existing = todayRecord;
      // Merge notes
      const mergedNotes = data.notes
        ? (existing.notes ? existing.notes + '\n\n[PÓS-TREINO] ' + data.notes : '[PÓS-TREINO] ' + data.notes)
        : existing.notes || '';

      // Compute delta_post
      const deltaPost = (data.biocharge_post_workout > 0 && existing.biocharge_morning)
        ? data.biocharge_post_workout - existing.biocharge_morning
        : existing.delta_post ?? null;

      const payload = {
        ...existing,
        biocharge_post_workout: data.biocharge_post_workout > 0 ? data.biocharge_post_workout : existing.biocharge_post_workout,
        rpe: data.rpe > 0 ? data.rpe : existing.rpe,
        energy: data.energy > 0 ? data.energy : existing.energy,
        muscle_soreness: data.muscle_soreness > 0 ? data.muscle_soreness : existing.muscle_soreness,
        delta_post: deltaPost,
        notes: mergedNotes,
      };

      const scores = computeCheckinScores(payload);
      return base44.entities.DailyCheckin.update(existing.id, scores);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins', user?.email] });
      toast.success('✅ Pós-treino salvo!');
      navigate('/today');
    },
  });

  // Post mode: no morning checkin guard
  if (isPostMode && !loadingCheckins && !todayRecord) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-6 max-w-sm mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-5">
          <Zap className="w-10 h-10 text-yellow-400" />
        </div>
        <h2 className="text-xl font-black mb-2">Faça o check-in da manhã primeiro</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          O pós-treino atualiza o seu check-in de hoje. Faça o check-in da manhã para habilitar.
        </p>
        <Link
          to="/checkin"
          className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-2xl font-semibold hover:bg-primary/90 transition-all mb-3"
        >
          Fazer check-in da manhã
        </Link>
        <button
          onClick={() => navigate('/today')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Voltar para Hoje
        </button>
      </div>
    );
  }

  // Loading state for post mode
  if (isPostMode && loadingCheckins) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // POST MODE UI
  if (isPostMode) {
    const handleSavePost = () => {
      const { biocharge_post_workout, rpe, energy, muscle_soreness, notes } = postForm;
      const hasData = biocharge_post_workout > 0 || rpe > 0 || energy > 0 || muscle_soreness > 0 || notes.trim().length > 0;
      if (!hasData) {
        toast.warning("Preencha ao menos um campo ou toque em 'Pular por agora'.");
        return;
      }
      savePostMutation.mutate(postForm);
    };

    return (
      <div className="space-y-4 max-w-xl mx-auto pb-8">
        {/* Header */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => navigate('/today')}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <h1 className="text-base font-bold">Pós-treino</h1>
          <div className="w-16" />
        </div>

        <div className="px-1">
          <p className="text-sm text-muted-foreground">Leva ~30s e melhora seus insights</p>
        </div>

        {/* BioCharge pós-treino */}
        <CheckinStep title="BioCharge pós-treino" emoji="⚡" delay={0.05}>
          <SliderField
            label="Como ficou após o treino? (0–100)"
            hint="0 = deixe vazio se não quiser informar"
            value={postForm.biocharge_post_workout}
            onChange={v => updatePost('biocharge_post_workout', v)}
          />
        </CheckinStep>

        {/* RPE */}
        <CheckinStep title="Esforço percebido" emoji="🔥" delay={0.1}>
          <SliderField
            label="RPE (1–10)"
            hint="Como foi a intensidade do treino?"
            value={postForm.rpe}
            onChange={v => updatePost('rpe', v)}
            min={0}
            max={10}
          />
        </CheckinStep>

        {/* Energia e Dor */}
        <CheckinStep title="Sensações" emoji="🧠" delay={0.15}>
          <EmojiSelector label="Energia agora" type="energy" value={postForm.energy} onChange={v => updatePost('energy', v)} />
          <EmojiSelector label="Dor muscular" type="soreness" value={postForm.muscle_soreness} onChange={v => updatePost('muscle_soreness', v)} />
        </CheckinStep>

        {/* Notes */}
        <CheckinStep title="Observação rápida" emoji="📝" delay={0.2}>
          <Textarea
            value={postForm.notes}
            onChange={e => updatePost('notes', e.target.value)}
            placeholder="Ex: pernas pesadas, ritmo bom..."
            className="bg-secondary border-border/40 min-h-[70px] resize-none"
          />
        </CheckinStep>

        {/* Buttons */}
        <Button
          onClick={handleSavePost}
          disabled={savePostMutation.isPending}
          className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-2xl text-sm hover:bg-primary/90 transition-all"
        >
          {savePostMutation.isPending ? (
            <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Salvar pós-treino</>
          )}
        </Button>

        <button
          onClick={() => navigate('/today')}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl border border-border text-muted-foreground text-sm font-medium hover:text-foreground hover:border-border/60 transition-all"
        >
          <SkipForward className="w-4 h-4" /> Pular por agora
        </button>
      </div>
    );
  }

  // MORNING MODE UI
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
        <h1 className="text-base font-bold">Check-in da manhã</h1>
        <div className="w-16" />
      </div>

      <div className="px-1">
        <p className="text-sm text-muted-foreground">Leva ~2 min e gera seu plano do dia</p>
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

      {/* BioCharge Manhã */}
      <CheckinStep title="Energia Percebida" emoji="⚡" delay={0.05}>
        <SliderField
          label="Como você acordou? (0–100)"
          hint="Sua percepção geral ao acordar"
          value={form.biocharge_morning}
          onChange={v => update('biocharge_morning', v)}
        />
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
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Hora de dormir (opcional)</label>
          <Input
            type="time"
            value={form.sleep_start_time || ''}
            onChange={e => update('sleep_start_time', e.target.value || null)}
            className="bg-secondary border-border/40 font-mono w-36"
          />
          <p className="text-[10px] text-muted-foreground">Ex: 23:00 — encontre no Zepp → Sono</p>
        </div>
      </CheckinStep>

      {/* Performance — hidden on rest day */}
      {!isRestDay && (
        <CheckinStep title="Performance" emoji="🏋️" delay={0.15}>
          <SliderField label="Fadiga" value={form.fatigue} onChange={v => update('fatigue', v)} icon={Activity} />
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
          <HRVField value={form.hrv} onChange={v => update('hrv', v)} />
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
        <p className="text-xs text-muted-foreground -mt-1 mb-2">Contexto da noite anterior — ajuda a IA a interpretar seus dados</p>
        <Textarea
          value={form.notes}
          onChange={e => update('notes', e.target.value)}
          placeholder="Como foi sua noite? Algo a registrar?"
          className="bg-secondary border-border/40 min-h-[80px] resize-none"
        />
      </CheckinStep>

      {/* Rest Day Toggle */}
      <RestDayToggle value={isRestDay} onChange={v => update('rest_day', v)} />

      {/* Save */}
      <Button
        onClick={() => saveMorningMutation.mutate(form)}
        disabled={saveMorningMutation.isPending}
        className="w-full h-13 bg-primary text-primary-foreground font-bold rounded-2xl text-base py-4 hover:bg-primary/90 transition-all hover:scale-[1.01]"
      >
        {saveMorningMutation.isPending ? (
          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
        ) : (
          <><Save className="w-5 h-5 mr-2" /> Salvar check-in da manhã</>
        )}
      </Button>
    </div>
  );
}
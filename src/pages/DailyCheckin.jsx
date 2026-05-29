import React, { useState, useReducer, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { getTodayLocal } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Save,
  ArrowLeft,
  Moon,
  Activity,
  Heart,
  Scale,
  Info,
  Zap,
  SkipForward,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import SliderField from '@/components/checkin/SliderField';
import EmojiSelector from '@/components/checkin/EmojiSelector';
import CheckinStep from '@/components/checkin/CheckinStep';
import LivePreview from '@/components/checkin/LivePreview';
import RestDayToggle from '@/components/checkin/RestDayToggle';
import {
  computeCheckinScores,
  generateContextualBulletsAI,
} from '@/lib/biocharge-utils';
import CheckinSuccessOverlay from '@/components/checkin/CheckinSuccessOverlay';
import { useUserCheckins, useUserTrainingSessions } from '@/hooks/useUserData';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useDayContext } from '@/lib/dayContext';

function parseSleepDurationToHours(str) {
  if (!str || str.toString().trim() === '') return null;
  const s = str.toString().trim().replace(',', '.');
  // "7:45" or "7h45" or "7h 45"
  const colonMatch = s.match(/^(\d{1,2})[h:][\s]?(\d{2})$/i);
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    if (h < 0 || h > 12 || m < 0 || m > 59) return null;
    return parseFloat((h + m / 60).toFixed(4));
  }
  // "7.5" or "8"
  const num = parseFloat(s);
  if (!isNaN(num) && num >= 0 && num <= 12) return num;
  return null;
}

function formatHoursToSleepDuration(hoursFloat) {
  if (hoursFloat == null || isNaN(hoursFloat)) return '';
  const h = Math.floor(hoursFloat);
  const m = Math.round((hoursFloat - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}


function HRVField({ value, onChange }) {
  const [showTip, setShowTip] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground flex items-center gap-1">
        <Activity className="w-3 h-3" /> HRV — RMSSD (ms)
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
    <p className="font-semibold text-foreground mb-1">Como medir RMSSD:</p>
    Use apps como HRV4Training, Elite HRV ou seu wearable para medir RMSSD ao acordar,
    sempre em repouso e antes de levantar.<br />
    No Zepp, use o valor de HRV mostrado na manhã do dia.<br />
    Faixa comum: 20–100 ms. Em geral, quanto maior em relação à sua média, melhor.
  </div>
)}
      <Input
        type="number"
        step="1"
        min={0}
        max={250}
        value={value || ''}
        onChange={e => onChange(parseFloat(e.target.value) || null)}
        onBlur={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v) && (v < 0 || v > 250)) onChange(null);
        }}
        placeholder="Ex: 48"
        className="bg-secondary border-border/40 font-mono"
      />
      <p className="text-[10px] text-muted-foreground">Valor válido: 0–250 ms</p>
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
  rem_sleep_pct: 20,
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
  hrv_manual: null,
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

const checkinReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, form: { ...state.form, [action.field]: action.value } };
    case 'SET_POST_FIELD':
      return { ...state, postForm: { ...state.postForm, [action.field]: action.value } };
    case 'RESET':
      return { form: DEFAULT_FORM, postForm: DEFAULT_POST_FORM };
    case 'LOAD_EDIT':
      return { ...state, form: { rest_day: false, ...action.data } };
    case 'SET_REST_DAY':
      return { ...state, form: { ...state.form, rest_day: action.value } };
    default:
      return state;
  }
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

  const [checkinState, dispatch] = useReducer(checkinReducer, {
    form: editData ? { rest_day: false, ...editData } : DEFAULT_FORM,
    postForm: DEFAULT_POST_FORM,
  });
  const { form, postForm } = checkinState;

  const [sleepHoursText, setSleepHoursText] = useState(
    formatHoursToSleepDuration(editData?.sleep_hours ?? DEFAULT_FORM.sleep_hours)
  );

  const [savedCheckin, setSavedCheckin] = useState(null);


  const [advancedOpen, setAdvancedOpen] = useState(false);

const update = (field, value) => dispatch({ type: 'SET_FIELD', field, value });
  const updatePost = (field, value) => dispatch({ type: 'SET_POST_FIELD', field, value });

  const updateHrv = (value) => {
    update('hrv_manual', value);
    update('hrv', value); // espelha por compatibilidade com legado
  };

  const { intent: dayIntent, setDayIntent } = useDayContext();


const isRestDay = form.rest_day;

  const preview = useMemo(() => {
    const recentCheckins = [...checkins]
      .filter((c) => c.date !== form.date && c.id !== editData?.id)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 14);

    const sortedSessions = [...allSessions].sort((a, b) =>
      String(b.date).localeCompare(String(a.date))
    );

    return computeCheckinScores(form, recentCheckins, sortedSessions);
  }, [form, checkins, allSessions, editData?.id]);

const saveMorningMutation = useMutation({
  mutationFn: async (data) => {
    const payload = data.rest_day
      ? {
          ...data,
          rpe: 0,
          fatigue: 0,
          biocharge_pre_workout: null,
          biocharge_post_workout: null,
        }
      : data;

    const recentCheckins = [...checkins]
      .filter((c) => c.date !== payload.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 14);

    const sortedSessions = [...allSessions].sort((a, b) =>
      String(b.date).localeCompare(String(a.date))
    );

    const scores = computeCheckinScores(payload, recentCheckins, sortedSessions);

    // Morning score vira âncora do dia quando é novo registro
    if (!editData?.id && !todayRecord?.id) {
      scores.morning_recovery_score = scores.recovery_score;
    } else {
      scores.morning_recovery_score =
        editData?.morning_recovery_score ??
        todayRecord?.morning_recovery_score ??
        scores.recovery_score;
    }

    // ✅ IA só entra como suporte secundário, não como voz principal do dia
    try {
      const acwr = payload.acwr ?? null;
      const aiBullets =
        !payload.rest_day
          ? await generateContextualBulletsAI(payload, scores, recentCheckins, sortedSessions, acwr)
          : null;

      if (aiBullets?.length) {
        scores.contextual_bullets = JSON.stringify(aiBullets);
      }
    } catch (e) {
      console.warn('AI support bullets failed, keeping deterministic signals', e);
    }

    let savedRecord;
    if (editData?.id) {
      savedRecord = await base44.entities.DailyCheckin.update(editData.id, scores);
    } else if (todayRecord?.id) {
      savedRecord = await base44.entities.DailyCheckin.update(todayRecord.id, scores);
    } else {
      savedRecord = await base44.entities.DailyCheckin.create(scores);
    }

    // ✅ Deep analysis fica só para Insights / aprofundamento
    if (!editData?.id) {
      const summary = [scores, ...recentCheckins.slice(0, 13)].map((c) => ({
        date: c.date,
        recovery: c.recovery_score,
        readiness: c.readiness_score,
        sleep: c.sleep_quality ?? c.sleep_score,
        fatigue: c.fatigue_score ?? c.fatigue,
        stress: c.stress_score ?? c.stress,
        hrv: c.hrv,
        rpe: c.rpe,
        zone: c.zone,
        deep_sleep: c.deep_sleep_pct,
        rem_sleep: c.rem_sleep_pct,
        mood: c.mood,
        energy: c.energy,
        sleep_hours: c.sleep_hours,
      }));

      base44.integrations.Core.InvokeLLM({
        prompt: `INSTRUÇÃO: Você é um analista de performance e recuperação. Gere uma análise profunda, útil e estruturada em português brasileiro.

IMPORTANTE:
- não repita a recomendação operacional do dia
- não diga "treine moderado" ou "descanse" como decisão principal
- foque em padrões, tendências e ajustes de comportamento
- o texto deve terminar com frase completa
- não use tom de conversa nem saudações

FORMATO:
Análise de tendência
[2–3 frases]

Sono
[1–2 frases]

Fadiga e carga
[1–2 frases]

Recomendações para os próximos 7 dias
• [ação concreta 1]
• [ação concreta 2]
• [ação concreta 3]

DADOS (${summary.length} dias, mais recente primeiro):
${JSON.stringify(summary, null, 2)}`,
      })
        .then((deepAnalysis) => {
          if (deepAnalysis && savedRecord?.id) {
            base44.entities.DailyCheckin.update(savedRecord.id, {
              deep_analysis_text: deepAnalysis,
            });
          }
        })
        .catch((e) => console.warn('Deep analysis generation failed', e));
    }

    return savedRecord;
  },
  onSuccess: async (result) => {
    await queryClient.refetchQueries({ queryKey: QUERY_KEYS.checkins(user?.email) });
    await queryClient.refetchQueries({ queryKey: QUERY_KEYS.trainingSessions(user?.email) });

    if (navigator.vibrate) navigator.vibrate(40);

    if (editData?.id) {
      toast.success('✅ Check-in atualizado!');
      navigate('/history');
    } else {
      setSavedCheckin(result);
    }
  },
});

const savePostMutation = useMutation({
  mutationFn: async (data) => {
    const existing = todayRecord;

    if (!existing?.id) {
      throw new Error('Check-in da manhã não encontrado. Faça o check-in da manhã primeiro.');
    }

    const mergedNotes = data.notes
      ? existing.notes
        ? existing.notes + '\n\n[PÓS-TREINO] ' + data.notes
        : '[PÓS-TREINO] ' + data.notes
      : existing.notes || '';

    const deltaPost =
      data.biocharge_post_workout > 0 && existing.biocharge_morning
        ? data.biocharge_post_workout - existing.biocharge_morning
        : existing.delta_post ?? null;

    const payload = {
      ...existing,
      biocharge_post_workout:
        data.biocharge_post_workout > 0
          ? data.biocharge_post_workout
          : existing.biocharge_post_workout,
      rpe: data.rpe > 0 ? data.rpe : existing.rpe,
      energy: data.energy > 0 ? data.energy : existing.energy,
      muscle_soreness:
        data.muscle_soreness > 0
          ? data.muscle_soreness
          : existing.muscle_soreness,
      delta_post: deltaPost,
      notes: mergedNotes,
    };

    const recentCheckins = [...checkins]
      .filter((c) => c.id !== existing.id)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 14);

    const sortedSessions = [...allSessions].sort((a, b) =>
      String(b.date).localeCompare(String(a.date))
    );

    const scores = computeCheckinScores(payload, recentCheckins, sortedSessions);

    // ✅ preservar a âncora da manhã
    scores.morning_recovery_score =
      existing.morning_recovery_score ??
      existing.recovery_score ??
      scores.recovery_score;

    return base44.entities.DailyCheckin.update(existing.id, scores);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.checkins(user?.email) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trainingSessions(user?.email) });

    if (navigator.vibrate) navigator.vibrate(40);

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
            hint="RPE — Escala de esforço percebido (1 = muito leve, 10 = máximo)"
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
    <>
      {savedCheckin && (
        <CheckinSuccessOverlay
          checkin={savedCheckin}
          onContinue={() => navigate('/today')}
        />
      )}

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
          <p className="text-sm text-muted-foreground">
            Comece com o essencial. Você pode refinar a leitura depois.
          </p>
        </div>



          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Esporte principal
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  ['corrida', 'Corrida'],
                  ['forca', 'Força'],
                  ['misto', 'Misto'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, sport: value }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      profile.sport === value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Nível
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  ['iniciante', 'Iniciante'],
                  ['intermediario', 'Intermediário'],
                  ['avancado', 'Avançado'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, level: value }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      profile.level === value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Objetivo
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  ['performance', 'Render mais'],
                  ['consistencia', 'Consistência'],
                  ['recuperacao', 'Recuperar melhor'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, goal: value }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      profile.goal === value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Salvo localmente neste dispositivo por enquanto.
          </p>
        </div>

        {/* Day Intent */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Qual será o foco do seu dia?</span>
            <span className="text-xs text-muted-foreground">Opcional</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setDayIntent('training')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                dayIntent === 'training'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              Vou treinar
            </button>
            <button
              type="button"
              onClick={() => setDayIntent('undecided')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                dayIntent === 'undecided'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              Ainda não decidi
            </button>
            <button
              type="button"
              onClick={() => setDayIntent('recovery')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                dayIntent === 'recovery'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              Hoje será recuperação
            </button>
          </div>
          <p className="text-xs mt-2 text-muted-foreground">
            Você pode mudar isso a qualquer momento.
          </p>
        </div>

        {/* Date */}
        <div className="px-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Data
          </label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => update('date', e.target.value)}
            className="bg-card border-border/60 max-w-[200px]"
          />
        </div>

        {/* Quick Check-in */}
        <CheckinStep title="Check-in rápido" emoji="⚡" delay={0.05}>
          <SliderField
            label="Como você acordou? (0–100)"
            hint="Sua percepção geral ao acordar"
            value={form.biocharge_morning}
            onChange={(v) => update('biocharge_morning', v)}
          />

          <SliderField
            label="Pontuação do Sono (Zepp)"
            hint="Valor de 0–100 do app Zepp → Sono"
            value={form.sleep_score}
            onChange={(v) => update('sleep_score', v)}
            icon={Moon}
          />

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-foreground flex-1">
              Horas de Sono
            </label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Ex: 7:45"
              value={sleepHoursText}
              onChange={(e) => {
                setSleepHoursText(e.target.value);
                update('sleep_hours', parseSleepDurationToHours(e.target.value));
              }}
              className="bg-secondary border-border/40 w-24 text-center font-mono"
            />
          </div>
          <p className="text-[10px] text-muted-foreground -mt-1">
            Use 7:45 (ou 7.5). Isso já basta para gerar uma leitura inicial.
          </p>
        </CheckinStep>

        {/* Live Preview */}
        <LivePreview preview={preview} />

        {/* Advanced toggle */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
              <p className="text-sm font-semibold">Refinar precisão</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Adicione sinais avançados para melhorar a leitura do dia.
              </p>
            </div>
            {advancedOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </button>

          {!advancedOpen && (
            <p className="text-[11px] text-muted-foreground">
              Opcional: sono profundo/REM, fadiga, humor, stress, HRV e FC de repouso.
            </p>
          )}
        </div>

        {/* Advanced fields */}
        {advancedOpen && (
          <>
            <CheckinStep title="Sono — contexto avançado" emoji="🌙" delay={0.1}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SliderField
                  label="Sono Profundo"
                  hint="Percentual de sono profundo"
                  value={form.deep_sleep_pct}
                  onChange={(v) => update('deep_sleep_pct', v)}
                  unit="%"
                  max={60}
                />

                <SliderField
                  label="Sono REM"
                  hint="Percentual de sono REM"
                  value={form.rem_sleep_pct ?? 20}
                  onChange={(v) => update('rem_sleep_pct', v)}
                  unit="%"
                  max={60}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  Hora de dormir (opcional)
                </label>
                <Input
                  type="time"
                  value={form.sleep_start_time || ''}
                  onChange={(e) => update('sleep_start_time', e.target.value || null)}
                  className="bg-secondary border-border/40 font-mono w-36"
                />
                <p className="text-[10px] text-muted-foreground">
                  Ex: 23:00 — encontre no Zepp → Sono
                </p>
              </div>
            </CheckinStep>

            {!isRestDay && (
              <CheckinStep title="Performance" emoji="🏋️" delay={0.15}>
                <SliderField
                  label="Fadiga"
                  value={form.fatigue}
                  onChange={(v) => update('fatigue', v)}
                  icon={Activity}
                />
              </CheckinStep>
            )}

            <CheckinStep title="Bem-estar" emoji="🧠" delay={0.2}>
              <EmojiSelector
                label="Humor"
                type="mood"
                value={form.mood}
                onChange={(v) => update('mood', v)}
              />
              <EmojiSelector
                label="Estresse"
                type="stress"
                value={form.stress}
                onChange={(v) => update('stress', v)}
              />
              <EmojiSelector
                label="Energia"
                type="energy"
                value={form.energy}
                onChange={(v) => update('energy', v)}
              />
              <EmojiSelector
                label="Hidratação"
                type="hydration"
                value={form.hydration}
                onChange={(v) => update('hydration', v)}
              />
              <EmojiSelector
                label="Dor Muscular"
                type="soreness"
                value={form.muscle_soreness}
                onChange={(v) => update('muscle_soreness', v)}
              />
            </CheckinStep>

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
                    onChange={(e) => update('resting_hr', parseFloat(e.target.value) || null)}
                    placeholder="—"
                    className="bg-secondary border-border/40 font-mono"
                  />
                </div>

                <HRVField
                  value={form.hrv_manual ?? form.hrv}
                  onChange={updateHrv}
                />

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Scale className="w-3 h-3" /> Peso (kg)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.body_weight || ''}
                    onChange={(e) => update('body_weight', parseFloat(e.target.value) || null)}
                    placeholder="—"
                    className="bg-secondary border-border/40 font-mono"
                  />
                </div>
              </div>
            </CheckinStep>

            <CheckinStep title="Observações" emoji="📝" delay={0.3}>
              <p className="text-xs text-muted-foreground -mt-1 mb-2">
                Contexto útil para interpretar a noite anterior
              </p>
              <Textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="Como foi sua noite? Algo a registrar?"
                className="bg-secondary border-border/40 min-h-[80px] resize-none"
              />
            </CheckinStep>

            <RestDayToggle
              value={isRestDay}
              onChange={(v) => dispatch({ type: 'SET_REST_DAY', value: v })}
            />
          </>
        )}

        {/* Save */}
        {!savedCheckin && (
          <Button
            onClick={() => saveMorningMutation.mutate(form)}
            disabled={saveMorningMutation.isPending}
            className="w-full h-13 bg-primary text-primary-foreground font-bold rounded-2xl text-base py-4 hover:bg-primary/90 transition-all hover:scale-[1.01]"
          >
            {saveMorningMutation.isPending ? (
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Salvar plano do dia
              </>
            )}
          </Button>
        )}
      </div>
    </>
);
}


// ── Today Preview Block ────────────────────────────────────────────────────────
function TodayPreviewBlock({ checkin, onGoToToday }) {
  const score = checkin.readiness_score ?? checkin.recovery_score ?? checkin.morning_recovery_score ?? checkin.biocharge_morning ?? 0;
  const zone = checkin.zone;
  const zoneLabel = zone === 'green' ? 'Verde 🟢' : zone === 'yellow' ? 'Amarelo 🟡' : zone === 'red' ? 'Vermelho 🔴' : null;

  const recommendation = checkin.recommendation || checkin.headline_today;
  const headline = checkin.headline_today;

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-4">
      <p className="text-xs font-bold uppercase tracking-wider text-primary">Seu dia começa assim</p>

      {/* Score + zona */}
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-mono font-black">{score}</span>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Prontidão</p>
          {zoneLabel && <p className="text-xs text-foreground/70">{zoneLabel}</p>}
        </div>
      </div>

      {/* Treino sugerido */}
      {recommendation && (
        <div className="px-3 py-2.5 rounded-xl bg-secondary/60 border border-border/40">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Decisão principal</p>
          <p className="text-sm font-semibold leading-snug">{recommendation}</p>
        </div>
      )}

      {/* Headline */}
      {headline && headline !== recommendation && (
        <p className="text-xs text-muted-foreground leading-relaxed italic">"{headline}"</p>
      )}

      <button
        onClick={onGoToToday}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all"
      >
        Ver meu dia completo <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
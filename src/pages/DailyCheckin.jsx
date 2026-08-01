import React, { useState, useReducer, useMemo, useEffect, useRef } from 'react';
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
  ChevronDown,
  ChevronUp,
  Flame,
  PencilLine,
  Dumbbell,
  Smile,
  HeartPulse,
  CheckCircle2,
  ArrowUp,
} from 'lucide-react';
import SliderField from '@/components/checkin/SliderField';
import EmojiSelector from '@/components/checkin/EmojiSelector';
import CheckinStep from '@/components/checkin/CheckinStep';
import LivePreview from '@/components/checkin/LivePreview';
import { computeCheckinScores } from '@/lib/biocharge-utils';
import CheckinSuccessOverlay from '@/components/checkin/CheckinSuccessOverlay';
import PostWorkoutCloseOverlay from '@/components/checkin/PostWorkoutCloseOverlay';
import { useUserCheckins, useUserTrainingSessions } from '@/hooks/useUserData';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useDayContext } from '@/lib/dayContext';


// Converte horas decimais (ex: 7.75) para "HH:MM" (ex: "07:45") e vice-versa,
// para usar <input type="time"> (roleta no iPhone) mantendo o armazenamento em horas.
function hoursToHHMM(h) {
  if (h == null || isNaN(h) || h <= 0) return '';
  const totalMin = Math.round(Number(h) * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function hhmmToHours(value) {
  if (!value) return null;
  const [hh, mm] = String(value).split(':').map((n) => parseInt(n, 10));
  if (isNaN(hh)) return null;
  const h = hh + (isNaN(mm) ? 0 : mm) / 60;
  return Number(h.toFixed(2));
}

function HRVField({ value, onChange, metric = 'rMSSD' }) {
  const [showTip, setShowTip] = useState(false);
  const isSdnn = metric === 'SDNN';
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground flex items-center gap-1">
        <Activity className="w-3 h-3" /> HRV — {metric} (ms)
        <button
          type="button"
          onClick={() => setShowTip(p => !p)}
          aria-label="Como medir HRV"
          className="-m-2 p-2 text-muted-foreground hover:text-foreground transition-colors tap-target"
        >
          <Info className="w-3 h-3" />
        </button>
      </label>
      {showTip && (
  <div className="t-micro text-muted-foreground bg-secondary rounded-xl p-3 leading-relaxed border border-border/40">
    <p className="font-semibold text-foreground mb-1">Como medir {metric}:</p>
    {isSdnn ? (
      <>
        O Apple Watch reporta HRV como <strong>SDNN</strong> (app Saúde → Variabilidade da FC).
        Use o valor noturno/de repouso.<br />
        SDNN e rMSSD não são intercambiáveis — mantenha sempre a mesma fonte.<br />
        Em geral, quanto maior em relação à sua média, melhor.
      </>
    ) : (
      <>
        Use apps como HRV4Training, Elite HRV ou seu wearable para medir rMSSD ao acordar,
        sempre em repouso e antes de levantar.<br />
        No Zepp, use o valor de HRV mostrado na manhã do dia.<br />
        Faixa comum: 20–100 ms. Em geral, quanto maior em relação à sua média, melhor.
      </>
    )}
  </div>
)}
      <Input
        type="number"
        inputMode="numeric"
        step="1"
        min={0}
        max={250}
        value={value || ''}
        onChange={e => onChange(parseFloat(e.target.value) || null)}
        onBlur={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(Math.min(250, Math.max(0, v)));
        }}
        placeholder="Ex: 48"
        className="bg-secondary border-border/40 font-mono"
      />
      <p className="t-micro text-muted-foreground">Valor válido: 0–250 ms</p>
      <p className="t-micro text-muted-foreground">Valor da manhã, antes de se levantar</p>
    </div>
  );
}

const DEFAULT_FORM = {
  date: getTodayLocal(),
  rest_day: false,
  // Subjetivos nascem VAZIOS (null), nunca num "neutro" pré-marcado: um default
  // preenchido é um dado fabricado — o app gravaria fadiga/energia/stress que o
  // usuário nunca informou. Ausente = ausente; o motor já renormaliza pelo que
  // existe. (Instrumento manual: honestidade > formulário "completo".)
  biocharge_morning: null,
  biocharge_pre_workout: null,
  biocharge_post_workout: null,
  sleep_score: null,
  fatigue: null,
  deep_sleep_pct: null,
  rem_sleep_pct: null,
  sleep_awakenings: null,
  awake_minutes: null,
  sleep_regularity_pct: null,
  sleep_heart_rate: null,
  rpe: 0,
  mood: null,
  stress: null,
  energy: null,
  hydration: null,
  muscle_soreness: null,
  sleep_hours: 7,
  sleep_start_time: null,
  dinner_time: null,
  generate_ai: false,
  resting_hr: null,
  hrv: null,
  hrv_manual: null,
  body_weight: null,
  notes: '',
};

const DEFAULT_POST_FORM = {
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
      return { ...state, form: { ...DEFAULT_FORM, ...action.data } };
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
  const wearableProfile = user?.preferences?.wearable_profile || 'zepp';
  const isApple = wearableProfile === 'apple';

  // For post mode + delayed fatigue: fetch history
  const { data: checkins = [], isLoading: loadingCheckins } = useUserCheckins(90);
  const { data: allSessions = [] } = useUserTrainingSessions(100);
  const todayDate = getTodayLocal();
  const todayRecord = checkins.find(c => c.date === todayDate);

  const [checkinState, dispatch] = useReducer(checkinReducer, {
    form: editData ? { ...DEFAULT_FORM, ...editData } : DEFAULT_FORM,
    postForm: DEFAULT_POST_FORM,
  });
  const { form, postForm } = checkinState;


  const [savedCheckin, setSavedCheckin] = useState(null);
  const [postClosed, setPostClosed] = useState(false);

  // Dia anterior com Recovery real — origem do morph da gema no reveal (O SALTO).
  // Sem ontem, o overlay faz a gema "nascer" slate em vez de morfar.
  const prevCheckinForReveal = useMemo(() => {
    if (!savedCheckin) return null;
    return [...checkins]
      .filter((c) => c.date < savedCheckin.date && (c.recovery_score ?? c.morning_recovery_score) != null)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;
  }, [checkins, savedCheckin]);

  // Exige HRV + horas de sono — não biocharge_morning/sleep_score (Zepp). Esses
  // dois ficam só como referência de calibração (não entram em nenhuma fórmula);
  // HRV é o único sinal sem o qual recovery_score sai null. Mesma exigência para
  // Apple e Zepp, porque é o mesmo motor por trás dos dois perfis.
  //
  // Trava baseada em VALOR, não em "toque": antes exigíamos que o usuário mexesse
  // no campo de sono, então quem aceitava o padrão (7h) e só preenchia o HRV ficava
  // com o botão desabilitado pra sempre — "salvar não fazia nada" e nada persistia.
  const morningReady =
    (form.hrv != null || form.hrv_manual != null) && Number(form.sleep_hours) > 0;

  // Carrega o check-in já salvo de hoje uma única vez, para não sobrescrever
  // dados reais com os valores default ao reabrir a página.
  const loadedTodayRef = useRef(false);
  const [editingExisting, setEditingExisting] = useState(false);
  useEffect(() => {
    if (
      !isPostMode &&
      !editData &&
      !savedCheckin &&
      todayRecord &&
      !loadedTodayRef.current
    ) {
      loadedTodayRef.current = true;
      dispatch({ type: 'LOAD_EDIT', data: { rest_day: !!todayRecord.rest_day, ...todayRecord } });
      setEditingExisting(true);
    }
  }, [isPostMode, editData, savedCheckin, todayRecord]);

  // Pós-treino: pré-preenche o RPE com o esforço já informado no registro do
  // treino, para não pedir o mesmo RPE duas vezes (T3). Só se ainda estiver em 0.
  const prefilledPostRpeRef = useRef(false);
  useEffect(() => {
    if (!isPostMode || prefilledPostRpeRef.current) return;
    const todays = allSessions.filter((s) => s.date === todayDate);
    if (todays.length === 0) return;
    const latest = [...todays].sort((a, b) =>
      String(b.created_date || b.date).localeCompare(String(a.created_date || a.date))
    )[0];
    const sessionRpe = Number(latest?.perceived_effort);
    if (sessionRpe > 0 && (postForm.rpe ?? 0) === 0) {
      dispatch({ type: 'SET_POST_FIELD', field: 'rpe', value: sessionRpe });
    }
    prefilledPostRpeRef.current = true;
  }, [isPostMode, allSessions, todayDate, postForm.rpe]);


  // Refino nasce FECHADO: o trabalho diário é HRV + sono + olhar o número. Os
  // ~15 campos opcionais ficam a um toque, não empilhados abertos toda manhã.
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Streak do ritual: manhãs seguidas que a pessoa se leu (termina hoje/ontem).
  // Reenquadra o ato manual como identidade — "sou alguém que se lê" — que é a
  // força de retenção mais forte que existe, ao custo de uma linha de contagem.
  const readingStreak = useMemo(() => {
    if (!checkins?.length) return 0;
    const dates = new Set(checkins.map((c) => c.date));
    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 400; i++) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      if (dates.has(iso)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (i === 0) {
        // Hoje ainda não salvo: começa a contar a partir de ontem.
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [checkins]);

const update = (field, value) => dispatch({ type: 'SET_FIELD', field, value });
  const updatePost = (field, value) => dispatch({ type: 'SET_POST_FIELD', field, value });

  const updateHrv = (value) => {
    update('hrv_manual', value);
    update('hrv', value); // espelha por compatibilidade com legado
  };

const { intent: dayIntent, setDayIntent } = useDayContext();

  const setDayPlan = (nextIntent) => {
    setDayIntent(nextIntent);
    dispatch({
      type: 'SET_REST_DAY',
      value: nextIntent === 'recovery',
    });
  };

  const selectedIntent = form.rest_day ? 'recovery' : (dayIntent || 'undecided');


const isRestDay = form.rest_day;

  const preview = useMemo(() => {
    const recentCheckins = [...checkins]
      .filter((c) => c.date !== form.date && c.id !== editData?.id)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 90);

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
      .slice(0, 90);

    const sortedSessions = [...allSessions].sort((a, b) =>
      String(b.date).localeCompare(String(a.date))
    );

    const scores = computeCheckinScores(payload, recentCheckins, sortedSessions);
// Registro que corresponde à DATA do formulário (não necessariamente hoje),
    // para nunca sobrescrever o registro de hoje ao trocar a data.
    const recordForPayloadDate = checkins.find((c) => c.date === payload.date) || null;

    // Morning score vira âncora do dia quando é novo registro
    if (!editData?.id && !recordForPayloadDate?.id) {
      scores.morning_recovery_score = scores.recovery_score;
    } else {
      scores.morning_recovery_score =
        editData?.morning_recovery_score ??
        recordForPayloadDate?.morning_recovery_score ??
        scores.recovery_score;
    }
    

    // (Removido) bullets contextuais via InvokeLLM: a saída era gravada mas NUNCA
    // renderizada em lugar nenhum — LLM queimando crédito por texto invisível. A
    // voz do dia já vem determinística (headline_today / recommendation).

    let savedRecord;
    if (editData?.id) {
      savedRecord = await base44.entities.DailyCheckin.update(editData.id, scores);
    } else if (recordForPayloadDate?.id) {
      savedRecord = await base44.entities.DailyCheckin.update(recordForPayloadDate.id, scores);
    } else {
      savedRecord = await base44.entities.DailyCheckin.create(scores);
    }

    // ✅ Deep analysis fica só para Insights / aprofundamento
    // Evita queimar crédito de IA: só gera em registro novo do dia, OU num re-save
    // de hoje que ainda não tem análise (recupera de uma 1ª tentativa que falhou).
    const jaTemDeepAnalysis = !!(editData?.deep_analysis_text || recordForPayloadDate?.deep_analysis_text);
    if (!editData?.id && !jaTemDeepAnalysis && data.generate_ai) {
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
        deep_sleep_pct: c.deep_sleep_pct,
        rem_sleep_pct: c.rem_sleep_pct,
        sleep_start_time: c.sleep_start_time,
        dinner_time: c.dinner_time,
        mood: c.mood,
        energy: c.energy,
        sleep_hours_h: c.sleep_hours,
        notes: c.notes ? String(c.notes).slice(0, 160) : null,
      }));

      // Contexto do dia de hoje para guiar a análise e evitar contradições
      const todayContext = {
        decisao_do_dia: scores.decision_mode ?? '—',
        recomendacao: scores.recommendation ?? '—',
        carga_label: scores.training_load ?? '—',
        headline: scores.headline_today ?? '—',
        zone: scores.zone ?? '—',
        alerta_fadiga_retardada: scores.delayed_fatigue_alert ?? null,
        acwr: scores.acwr ?? null,
        hrv_trend: scores.hrv_trend ?? null,
        autonomic_state: scores.autonomic_state ?? null,
        sleep_need_tonight: scores.sleep_need_tonight ?? null,
        preview_confidence: scores.preview_confidence ?? null,
        nota_de_hoje: (payload.notes && String(payload.notes).trim()) ? String(payload.notes).trim().slice(0, 200) : null,
      };

      base44.integrations.Core.InvokeLLM({
        prompt: `INSTRUÇÃO: Você é um analista de performance e recuperação esportiva. Gere uma análise personalizada, profunda e útil em português brasileiro.

CONTEXTO DO DIA DE HOJE (use para guiar o tom — não repita estas frases literalmente):
- Decisão: ${todayContext.decisao_do_dia}
- Zone: ${todayContext.zone}
- HRV trend: ${todayContext.hrv_trend ?? 'sem dados'}
- Estado autonômico: ${todayContext.autonomic_state ?? 'sem dados'}
- ACWR: ${todayContext.acwr ?? 'sem dados'}
- Sono necessário esta noite: ${todayContext.sleep_need_tonight ?? 'sem dados'}h
- Alerta fadiga retardada: ${todayContext.alerta_fadiga_retardada ?? 'nenhum'}
- Confiança da leitura: ${todayContext.preview_confidence ?? 'sem dados'}
- Anotação do usuário hoje: ${todayContext.nota_de_hoje ?? 'nenhuma'}

REGRAS OBRIGATÓRIAS:
- cite números REAIS dos dados (ex: "seu HRV caiu de 68ms para 52ms nos últimos 5 dias")
- UNIDADES (respeite à risca, NUNCA converta): deep_sleep_pct e rem_sleep_pct são PERCENTUAIS do sono (%), jamais minutos; sleep_hours_h é em horas; hrv em ms; recovery, readiness, fatigue e stress são escalas 0–100; rpe é 0–10. Se o sono profundo parecer baixo, escreva "X% de sono profundo", nunca "X minutos".
- quando houver "notes" nos dados (anotações do próprio usuário, ex: "dormi tarde, NBA" ou "janta pesada"), USE-AS para explicar variações de sono/recuperação — conecte a causa que o usuário relatou ao efeito nos números. Nunca invente causas que não estejam nas notas.
- cada seção deve mencionar pelo menos 1 valor específico dos dados
- recomendações devem ser DIFERENTES entre si e não genéricas ("durma mais" não é aceitável sozinho — especifique quanto, quando, por quê)
- não use bullets genéricos que servem para qualquer atleta
- o texto deve terminar com frase completa
- não use tom de conversa nem saudações
- não repita a decisão operacional do dia como se fosse insight novo

FORMATO:
Análise de tendência
[2–3 frases com números reais dos dados]

Sono
[1–2 frases com valores específicos de horas e qualidade]

Fadiga e carga
[1–2 frases com referência a RPE, strain ou ACWR reais]

Recomendações para os próximos 7 dias
- [ação concreta com número específico — ex: "aumentar sono para X h nos próximos 3 dias"]
- [ação concreta sobre treino baseada no ACWR atual]
- [ação concreta sobre o ponto mais fraco identificado nos dados]

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
      toast.success('Check-in atualizado!');
      navigate('/history');
    } else {
      setSavedCheckin(result);
    }
  },
  onError: (err) => {
    console.error('Falha ao salvar check-in da manhã', err);
    toast.error('Não consegui salvar seu check-in. Verifique a conexão e tente de novo.');
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

    // O pós-treino é a leitura do FIM do dia: ele NÃO reescreve o recovery/prontidão
    // da manhã (nenhum destes sinais chega no recovery, e sobrescrever a coluna da
    // manhã destruía o significado do registro matinal). Grava o estado pós-esforço
    // em colunas próprias (*_post), preserva tudo da manhã, e marca o dia como fechado
    // com uma flag explícita — a detecção de "pós-treino feito" não depende mais de o
    // usuário ter digitado uma nota.
    const payload = {
      ...existing,
      energy_post: data.energy > 0 ? data.energy : (existing.energy_post ?? null),
      soreness_post: data.muscle_soreness > 0 ? data.muscle_soreness : (existing.soreness_post ?? null),
      rpe_post: data.rpe > 0 ? data.rpe : (existing.rpe_post ?? null),
      notes: mergedNotes,
      post_workout_done: true,
    };

    return base44.entities.DailyCheckin.update(existing.id, payload);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.checkins(user?.email) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trainingSessions(user?.email) });

    if (navigator.vibrate) navigator.vibrate(40);

    // O fechamento é a recompensa (PostWorkoutCloseOverlay), não um toast.
    setPostClosed(true);
  },
});

  // Post mode: no morning checkin guard
  if (isPostMode && !loadingCheckins && !todayRecord) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-6 max-w-sm mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-5">
          <Zap className="w-10 h-10 text-yellow-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Faça o check-in da manhã primeiro</h2>
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

  // Manhã: espera os check-ins carregarem antes de montar o form, para o
  // registro de hoje carregar sem corrida (evita sobrescrever suas edições).
  if (!isPostMode && loadingCheckins && !editData) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // POST MODE UI
if (isPostMode) {
  const todaySessions = allSessions.filter((session) => session.date === todayDate);
  const totalStrain = todaySessions.reduce((sum, session) => sum + (session.strain_score || 0), 0);

  const morningRecovery =
    todayRecord?.morning_recovery_score ??
    todayRecord?.recovery_score ??
    todayRecord?.readiness_score ??
    null;

  const sleepNeed = todayRecord?.sleep_need_tonight ?? null;

  const handleSavePost = () => {
    const { rpe, energy, muscle_soreness, notes } = postForm;

    const hasData =
      rpe > 0 ||
      energy > 0 ||
      muscle_soreness > 0 ||
      notes.trim().length > 0;

    if (!hasData) {
      toast.warning("Preencha ao menos um campo ou toque em 'Deixar pra depois'.");
      return;
    }

    savePostMutation.mutate(postForm);
  };

  if (postClosed) {
    return (
      <PostWorkoutCloseOverlay
        recovery={morningRecovery}
        sleepNeed={sleepNeed}
        onContinue={() => navigate('/today', { state: { fromCheckin: true } })}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => navigate('/today')}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm tap-target"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <h1 className="text-base font-bold">
          Pós-treino
        </h1>

        <div className="w-16" />
      </div>

      {/* Intro */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-primary" />
          </div>

          <div>
            <h2 className="text-lg font-semibold leading-tight">
              Como o corpo respondeu?
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">
              Você fez o trabalho — agora conta como ficou. Leva 30 segundos e fecha o dia.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="rounded-xl bg-secondary border border-border/30 px-3 py-2.5">
            <p className="t-micro text-muted-foreground mb-1">
              Recovery manhã
            </p>
            <p className="text-sm font-mono font-semibold">
              {morningRecovery ?? '—'}
            </p>
          </div>

          <div className="rounded-xl bg-secondary border border-border/30 px-3 py-2.5">
            <p className="t-micro text-muted-foreground mb-1">
              Strain hoje
            </p>
            <p className="text-sm font-mono font-semibold">
              <Zap size={13} className="inline -mt-0.5" /> {totalStrain}
            </p>
          </div>

          <div className="rounded-xl bg-secondary border border-border/30 px-3 py-2.5">
            <p className="t-micro text-muted-foreground mb-1">
              Sono alvo
            </p>
            <p className="text-sm font-mono font-semibold">
              {sleepNeed != null ? `${sleepNeed}h` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* RPE */}
      <CheckinStep title="Esforço percebido" icon={Flame} delay={0.05}>
        <SliderField
          label="Quão pesado foi o treino?"
          hint="De 1 a 10, quanto o treino puxou? Se você já registrou, é só confirmar."
          value={postForm.rpe}
          onChange={(value) => updatePost('rpe', value)}
          min={0}
          max={10}
          lowLabel="Leve"
          midLabel="Moderado"
          highLabel="Máximo"
          neutralTrack
        />
      </CheckinStep>

      {/* Sensations */}
      <CheckinStep title="Como você tá agora" icon={Activity} delay={0.1}>
        <EmojiSelector
          label="Energia agora"
          type="energy"
          value={postForm.energy}
          onChange={(value) => updatePost('energy', value)}
        />

        <EmojiSelector
          label="Dor muscular"
          type="soreness"
          value={postForm.muscle_soreness}
          onChange={(value) => updatePost('muscle_soreness', value)}
        />
      </CheckinStep>

    

      {/* Notes */}
      <CheckinStep title="Observação pós-treino" icon={PencilLine} delay={0.2}>
        <Textarea
          value={postForm.notes}
          onChange={(event) => updatePost('notes', event.target.value)}
          placeholder="Como você saiu do treino? Leve, arrasado, surpreso… o que quiser deixar registrado."
          className="bg-secondary border-border/40 min-h-[80px] resize-none"
        />

        <p className="t-micro text-muted-foreground leading-relaxed">
          Opcional. O que você escreveu ao registrar o treino já está guardado.
        </p>
      </CheckinStep>

      {/* Save */}
      <Button
        onClick={handleSavePost}
        disabled={savePostMutation.isPending}
        className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-2xl text-sm hover:bg-primary/90 transition-all"
      >
        {savePostMutation.isPending ? (
          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Fechar o dia
          </>
        )}
      </Button>

      <button
        onClick={() => navigate('/today')}
        className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl border border-border text-muted-foreground text-sm font-medium hover:text-foreground hover:border-border/60 transition-all"
      >
        <SkipForward className="w-4 h-4" />
        Deixar pra depois
      </button>

      <p className="t-micro text-muted-foreground text-center leading-relaxed px-4">
        Fica registrado no seu dia e ajuda o app a entender como você responde ao esforço.
      </p>
    </div>
  );
}

// MORNING MODE UI
  return (
    <>
      {savedCheckin && (
        <CheckinSuccessOverlay
          checkin={savedCheckin}
          previousCheckin={prevCheckinForReveal}
          onContinue={() => navigate('/today', { state: { fromCheckin: true } })}
        />
      )}

      <div className="space-y-4 max-w-xl mx-auto pb-8">
        {/* Header */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm tap-target"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <h1 className="text-lg font-semibold tracking-tight">Sua leitura da manhã</h1>
          <div className="w-16" />
        </div>

<div className="px-1 space-y-1">
  {readingStreak >= 2 && (
    <p className="t-micro font-semibold text-primary/90">
      {readingStreak}ª manhã seguida que você se lê
    </p>
  )}
  <p className="text-sm text-muted-foreground">
    Bom dia. Conta como você amanheceu — eu leio o resto.
  </p>
  <p className="t-micro text-muted-foreground">
    Dois números bastam pra ler seu dia: HRV e horas de sono. O resto é refino, quando você quiser.
  </p>
</div>

{editingExisting && (
  <div className="rounded-2xl border border-primary/25 bg-primary/5 p-3 mx-1">
    <p className="text-xs text-foreground font-medium">
      <CheckCircle2 size={14} className="inline mr-1 text-primary" />Você já fez o check-in de hoje
    </p>
    <p className="t-micro text-muted-foreground mt-0.5">
      Estes são os dados que você salvou. Ao salvar de novo, eles serão atualizados — não duplicados.
    </p>
  </div>
)}

        {/* Abertura humana: o único lugar em que a pessoa FALA antes do instrumento
            medir. Um ember de um toque — rápido, quente — que já conta no score
            (energia/disposição), no lugar da antiga barra "0–100" que não entrava
            em fórmula nenhuma. Uma manhã em modo recuperação não pede disposição. */}
        {!isRestDay && (
          <div className="rounded-2xl bg-card p-4">
            <EmojiSelector
              label="Como você amanheceu?"
              type="energy"
              value={form.energy}
              onChange={(v) => { update('energy', v); update('mood', v); }}
            />
          </div>
        )}


        {/* Day Intent */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Qual será o foco do seu dia?</span>
            <span className="text-xs text-muted-foreground">Define a leitura</span>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setDayPlan('training')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium tap-target ${
                selectedIntent === 'training'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              Treinar
            </button>

            <button
              type="button"
              onClick={() => setDayPlan('undecided')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium tap-target ${
                selectedIntent === 'undecided'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              Decidir depois
            </button>

            <button
              type="button"
              onClick={() => setDayPlan('recovery')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium tap-target ${
                selectedIntent === 'recovery'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              Recuperar
            </button>
          </div>

          <p className="text-xs mt-2 text-muted-foreground">
            Se marcar recuperação, o check-in se adapta automaticamente.
          </p>
        </div>


        {/* Sinais essenciais — os três que produzem o número: sono, HRV, FC.
            As barras de calibração do Zepp saíram daqui (não entram em fórmula):
            viraram um bloco opcional no fim do refino. */}
        <CheckinStep title="Sinais essenciais" icon={Zap} delay={0.05}>
          <div className="space-y-1.5">
            <label htmlFor="sleep-hours" className="text-sm font-medium text-foreground">
              Horas de sono
            </label>

            {/* Roleta de hora do iPhone (type="time") — mesma do "hora do jantar".
               Guardamos em horas decimais; hoursToHHMM/hhmmToHours convertem
               "HH:MM" ⇄ 7.75. */}
            <Input
              id="sleep-hours"
              type="time"
              value={hoursToHHMM(form.sleep_hours)}
              onChange={(e) => update('sleep_hours', hhmmToHours(e.target.value))}
              className="bg-secondary border-border/40 font-mono w-36 h-11 text-sm tap-target"
            />

            <p className="t-micro text-muted-foreground">
              Duração total do sono — ex: 7:45.
            </p>
          </div>

          {/* HRV + FC repouso — sinais dominantes do recovery, promovidos
              do avançado para cá: sem HRV a prévia não calcula. */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <HRVField
              value={form.hrv_manual ?? form.hrv}
              onChange={updateHrv}
              metric={isApple ? 'SDNN' : 'rMSSD'}
            />

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Heart className="w-3 h-3" /> FC Repouso
              </label>
              <Input
                type="number"
                inputMode="numeric"
                step="1"
                min={30}
                max={220}
                value={form.resting_hr || ''}
                onChange={(e) => update('resting_hr', parseFloat(e.target.value) || null)}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) update('resting_hr', Math.min(220, Math.max(30, v)));
                }}
                placeholder="—"
                className="bg-secondary border-border/40 font-mono"
              />
            </div>
          </div>

        </CheckinStep>

{/* Mini Preview — a recompensa acende assim que HRV + sono entram */}
<LivePreview preview={preview} compact />

{/* IA + Salvar logo abaixo da recompensa: recompensa → ação, lado a lado.
    O refino (opcional) fica embaixo — não mais entre a pessoa e o Salvar. */}
{!savedCheckin && (
  <div className="space-y-3">
    {!isRestDay && (
      <button
        type="button"
        onClick={() => update('generate_ai', !form.generate_ai)}
        className={`w-full flex items-center justify-between rounded-2xl border p-3.5 text-left transition-all ${form.generate_ai ? 'border-primary/40 bg-primary/5' : 'border-border/40 bg-secondary'}`}
      >
        <div>
          <p className="text-sm font-semibold">Gerar análise de IA hoje</p>
          <p className="t-micro text-muted-foreground mt-0.5">
            Texto profundo + bullets da Today. Usa crédito de integração — ligue só quando quiser.
          </p>
        </div>
        <span className={`ml-3 shrink-0 w-11 h-6 rounded-full transition-all relative ${form.generate_ai ? 'bg-primary' : 'bg-border'}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${form.generate_ai ? 'left-[22px]' : 'left-0.5'}`} />
        </span>
      </button>
    )}

    <div className="space-y-2">
      {!morningReady && (
        <p className="t-micro text-amber-400/80 px-1 text-center">
          <ArrowUp size={12} className="inline mr-1" />Falta só o HRV — aí eu fecho seu plano
        </p>
      )}
      <Button
        onClick={() => saveMorningMutation.mutate(form)}
        disabled={saveMorningMutation.isPending || !morningReady}
        className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-2xl text-sm hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saveMorningMutation.isPending ? (
          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Salvar plano do dia
          </>
        )}
      </Button>
    </div>

    {/* Data — quase sempre hoje; discreta, fora do caminho dos sinais */}
    <div className="px-1">
      <div className="flex items-center gap-2">
        <span className="t-micro text-muted-foreground">Data</span>
        <Input
          type="date"
          value={form.date}
          max={getTodayLocal()}
          onChange={(e) => update('date', e.target.value)}
          className="bg-card border-border/60 max-w-[160px] h-8 text-xs"
        />
      </div>
    </div>
  </div>
)}

{/* Advanced toggle */}
<div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
  <p className="text-sm font-semibold">Refinar leitura</p>
  <p className="t-micro text-muted-foreground mt-1">
    Adicione sono avançado, biometria e sensações para deixar a dose do dia mais precisa.
  </p>
</div>
            {advancedOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </button>

          {!advancedOpen && (
  <p className="t-micro text-muted-foreground">
    {isRestDay
      ? 'Opcional: sono profundo/REM, regularidade, stress e hidratação para afinar a leitura da recuperação.'
      : 'Opcional: sono profundo/REM, regularidade, fadiga, stress e hidratação para afinar a prescrição do dia.'}
  </p>
)}

        </div>

        {/* Advanced fields */}
        {advancedOpen && (
          <>
            <CheckinStep title="Sono — contexto avançado" icon={Moon} delay={0.1}>
              <p className="t-micro text-muted-foreground -mt-1">
                Estes campos vêm do Zepp → Sono. Preencha o que quiser — cada um afina um pouco a leitura.
              </p>
              {/* Profundo/REM são números EXATOS copiados do Zepp, não quantidades
                  "sentidas" — campo numérico bate slider (você digita, não mira). */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Sono profundo (%)</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min={0}
                    max={60}
                    placeholder="ex: 20"
                    value={form.deep_sleep_pct ?? ''}
                    onChange={(e) => update('deep_sleep_pct', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) update('deep_sleep_pct', Math.min(60, Math.max(0, v)));
                    }}
                    className="bg-secondary border-border/40 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Sono REM (%)</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min={0}
                    max={60}
                    placeholder="ex: 22"
                    value={form.rem_sleep_pct ?? ''}
                    onChange={(e) => update('rem_sleep_pct', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) update('rem_sleep_pct', Math.min(60, Math.max(0, v)));
                    }}
                    className="bg-secondary border-border/40 font-mono"
                  />
                </div>
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
                <p className="t-micro text-muted-foreground">
                  Ex: 23:00 — encontre no Zepp → Sono
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  Hora do jantar (opcional)
                </label>
                <Input
                  type="time"
                  value={form.dinner_time || ''}
                  onChange={(e) => update('dinner_time', e.target.value || null)}
                  className="bg-secondary border-border/40 font-mono w-36"
                />
                <p className="t-micro text-muted-foreground">
                  Última refeição — contexto p/ analisar despertares (não entra no score)
                </p>
              </div>

              {/* Regularidade primeiro: é o 2º sinal de sono mais pesado (0.25),
                  depois só a duração — não fica mais enterrada no fim do grid. */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    Regularidade
                  </label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min={0}
                    max={100}
                    placeholder="%"
                    value={form.sleep_regularity_pct ?? ''}
                    onChange={(e) => update('sleep_regularity_pct', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) update('sleep_regularity_pct', Math.min(100, Math.max(0, v)));
                    }}
                    className="bg-secondary border-border/40 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    Despertares
                  </label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min={0}
                    max={30}
                    placeholder="nº"
                    value={form.sleep_awakenings ?? ''}
                    onChange={(e) => update('sleep_awakenings', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) update('sleep_awakenings', Math.min(30, Math.max(0, v)));
                    }}
                    className="bg-secondary border-border/40 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    Tempo acordado
                  </label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min={0}
                    max={600}
                    placeholder="min"
                    value={form.awake_minutes ?? ''}
                    onChange={(e) => update('awake_minutes', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) update('awake_minutes', Math.min(600, Math.max(0, v)));
                    }}
                    className="bg-secondary border-border/40 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    FC no sono
                  </label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min={30}
                    max={120}
                    placeholder="bpm"
                    value={form.sleep_heart_rate ?? ''}
                    onChange={(e) => update('sleep_heart_rate', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) update('sleep_heart_rate', Math.min(120, Math.max(30, v)));
                    }}
                    className="bg-secondary border-border/40 font-mono"
                  />
                </div>
              </div>
            </CheckinStep>

            {!isRestDay && (
              <CheckinStep title="Performance" icon={Dumbbell} delay={0.15}>
                
<SliderField
  label="Fadiga"
  value={form.fatigue}
  onChange={(v) => update('fatigue', v)}
  icon={Activity}
  lowLabel="Baixa"
  midLabel="Moderada"
  highLabel="Alta"
/>

              </CheckinStep>
            )}

            <CheckinStep title="Bem-estar" icon={Smile} delay={0.2}>
              {/* Disposição/energia já foi a abertura da tela — não se pergunta
                  de novo aqui. Restam os sinais que ela não cobre. */}
              <EmojiSelector
                label="Estresse"
                type="stress"
                value={form.stress}
                onChange={(v) => update('stress', v)}
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

            <CheckinStep title="Biometria" icon={HeartPulse} delay={0.25}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Scale className="w-3 h-3" /> Peso (kg)
                  </label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={30}
                    max={300}
                    value={form.body_weight || ''}
                    onChange={(e) => update('body_weight', parseFloat(e.target.value) || null)}
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) update('body_weight', Math.min(300, Math.max(30, v)));
                    }}
                    placeholder="—"
                    className="bg-secondary border-border/40 font-mono"
                  />
                </div>
              </div>
            </CheckinStep>

            <CheckinStep title="Observações" icon={PencilLine} delay={0.3}>
              <p className="text-xs text-muted-foreground -mt-1 mb-2">
                Contexto útil para interpretar a noite anterior
              </p>
              <Textarea
                value={form.notes ?? ''}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="Como foi sua noite? Algo a registrar?"
                className="bg-secondary border-border/40 min-h-[80px] resize-none"
              />
            </CheckinStep>

            {/* Calibração (opcional) — o resumo que o Zepp já cospe. Não muda o
                cálculo (é fusão dos mesmos sinais brutos); fica como SUA
                referência pra comparar percepção × número. Some no perfil Apple. */}
            {!isApple && (
              <CheckinStep title="Calibração do Zepp (opcional)" icon={Moon} delay={0.35}>
                <SliderField
                  label="Pontuação do Sono (Zepp)"
                  hint="Como o Zepp resumiu sua noite — sua referência, não muda o cálculo"
                  value={form.sleep_score}
                  onChange={(v) => update('sleep_score', v)}
                  lowLabel="Ruim"
                  midLabel="Ok"
                  highLabel="Boa"
                />
              </CheckinStep>
            )}


          </>
        )}

      </div>
    </>
);
}

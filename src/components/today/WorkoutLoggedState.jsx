import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Moon, Gauge, Activity, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const INTENSITY_LABELS = {
  very_light: 'Muito leve',
  light: 'Leve',
  moderate: 'Moderado',
  hard: 'Intenso',
  very_hard: 'Máximo',
};

function getSleepDebtHours(analysis) {
  return analysis?.sleepDebt?.debt ?? analysis?.sleepDebtHours ?? 0;
}

function interpretAcwr(acwr) {
  if (acwr == null) return null;
  if (acwr > 1.5) return 'Muito acima da zona ideal — encerre o dia em recuperação.';
  if (acwr > 1.3) return 'Acima da zona ideal — evite adicionar mais carga hoje.';
  if (acwr < 0.8) return 'Abaixo da zona ideal — ainda assim, o treino de hoje já conta.';
  return 'Dentro da zona segura.';
}

function hasPostWorkoutData(checkin) {
  return (
    checkin?.biocharge_post_workout > 0 ||
    checkin?.delta_post != null ||
    String(checkin?.notes || '').includes('[PÓS-TREINO]')
  );
}

function getPostWorkoutVerdict(checkin, analysis, totalStrain, hasPostWorkout) {
  const recovery = checkin?.morning_recovery_score ?? checkin?.recovery_score ?? 50;
  const ratio = analysis?.trainingLoad?.ratio ?? null;
  const risk = analysis?.trainingLoad?.risk ?? null;
  const sleepDebt = getSleepDebtHours(analysis);
  const physioState = analysis?.physioState?.state ?? checkin?.current_body_state ?? null;

  const heavyDay =
    totalStrain >= 16 ||
    risk === 'high' ||
    ratio > 1.5 ||
    recovery < 55 ||
    physioState === 'Fatigued' ||
    physioState === 'Overreached';

  const moderateDay =
    !heavyDay &&
    (
      totalStrain >= 12 ||
      risk === 'moderate' ||
      ratio > 1.3 ||
      recovery < 70 ||
      sleepDebt >= 4
    );

  if (heavyDay) {
    return {
      title: hasPostWorkout ? 'Resposta registrada. Agora recupere.' : 'Agora o foco é recuperar',
      subtitle: 'A carga do dia já foi suficiente. O restante do ganho vem de encerrar bem o dia.',
      tonightFocus: 'Priorize sono, hidratação e redução de estresse.',
      tomorrow: hasPostWorkout
        ? 'A leitura de amanhã agora vai combinar check-in, treino, resposta pós-treino e sono desta noite.'
        : 'Amanhã pode começar com prontidão baixa a moderada se a recuperação de hoje não for boa.',
      tone: 'strong',
      color: 'text-red-400',
      border: 'border-red-500/25',
      bg: 'bg-red-500/5',
      badge: 'Carga alta',
    };
  }

  if (moderateDay) {
    return {
      title: hasPostWorkout ? 'Pós-treino salvo. Feche bem o dia.' : 'Bom ponto de parada',
      subtitle: 'O treino de hoje já gerou estímulo útil. Agora vale preservar a recuperação.',
      tonightFocus: 'Tente dormir bem para consolidar o benefício do treino.',
      tomorrow: hasPostWorkout
        ? 'A leitura de amanhã ficou mais completa. O sono desta noite ainda será o principal fator restante.'
        : 'Amanhã tende a depender bastante da qualidade do sono desta noite.',
      tone: 'moderate',
      color: 'text-yellow-400',
      border: 'border-yellow-500/25',
      bg: 'bg-yellow-500/5',
      badge: 'Carga moderada',
    };
  }

  return {
    title: hasPostWorkout ? 'Resposta salva. Dia bem controlado.' : 'Treino concluído com boa margem',
    subtitle: 'Seu dia segue controlado. O próximo ganho vem de fechar bem a recuperação.',
    tonightFocus: 'Mantenha uma rotina de sono estável para transformar o treino em adaptação.',
    tomorrow: hasPostWorkout
      ? 'Com o pós-treino salvo, a leitura de amanhã terá uma visão melhor da resposta do seu corpo.'
      : 'Se você recuperar bem hoje, amanhã tende a começar com margem moderada a boa.',
    tone: 'good',
    color: 'text-emerald-400',
    border: 'border-emerald-500/25',
    bg: 'bg-emerald-500/5',
    badge: 'Dia controlado',
  };
}

export default function WorkoutLoggedState({ sessions = [], checkin, analysis }) {
  if (!sessions.length) return null;

  const totalStrain = sessions.reduce(
    (sum, session) => sum + (session.strain_score ?? 0),
    0
  );

  const acwr = analysis?.trainingLoad?.ratio ?? null;
  const acwrInterpretation = interpretAcwr(acwr);
  const hasPostWorkout = hasPostWorkoutData(checkin);
  const verdict = getPostWorkoutVerdict(checkin, analysis, totalStrain, hasPostWorkout);

  const sleepNeed = checkin?.sleep_need_tonight ?? null;

  const recoveryScore =
    checkin?.morning_recovery_score ??
    checkin?.recovery_score ??
    checkin?.readiness_score ??
    '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 space-y-4 ${verdict.border} ${verdict.bg}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />

          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Treino registrado
          </span>
        </div>

        <span className={`t-micro font-bold px-2 py-0.5 rounded-full bg-white/5 ${verdict.color}`}>
          {verdict.badge}
        </span>
      </div>

      {/* Main verdict */}
      <div className="space-y-1">
        <h3 className="text-base font-semibold leading-tight">
          {verdict.title}
        </h3>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {verdict.subtitle}
        </p>
      </div>

      {/* Primary CTA */}
      {hasPostWorkout ? (
        <div className="flex items-center justify-between w-full px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-emerald-400 shrink-0" />

            <div>
              <p className="text-sm font-bold leading-tight text-emerald-400">
                Pós-treino registrado
              </p>

              <p className="t-micro text-muted-foreground leading-tight mt-0.5">
                Sua resposta ao treino já entrou na leitura de amanhã.
              </p>
            </div>
          </div>

          <span className="t-micro font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            Salvo
          </span>
        </div>
      ) : (
        <Link
          to="/checkin?mode=post"
          className="flex items-center justify-between w-full px-4 py-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 shrink-0" />

            <div>
              <p className="text-sm font-bold leading-tight">
                Registrar pós-treino
              </p>

              <p className="t-micro opacity-85 leading-tight mt-0.5">
                RPE, energia e dor muscular · melhora a leitura de amanhã
              </p>
            </div>
          </div>

          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </Link>
      )}

      {/* Session summary */}
      <div className="rounded-xl bg-black/15 border border-white/5 px-3 py-3 space-y-2">
        <p className="t-micro text-muted-foreground uppercase tracking-wider font-semibold">
          Sessão registrada
        </p>

        <div className="space-y-2">
          {sessions.map((session, index) => (
            <div key={session.id || index} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-sm font-semibold">
                  {session.sport || 'Treino'}
                </span>

                {session.intensity && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {INTENSITY_LABELS[session.intensity] ?? session.intensity}
                  </span>
                )}

                {session.duration_minutes && (
                  <span className="text-xs text-muted-foreground ml-1">
                    · {session.duration_minutes}min
                  </span>
                )}
              </div>

              <div className="text-right shrink-0">
                {session.strain_score != null && (
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    ⚡ {session.strain_score}
                  </span>
                )}

                {session.perceived_effort != null && (
                  <p className="t-micro text-muted-foreground">
                    RPE {session.perceived_effort}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-2 border-t border-border/30 text-xs text-muted-foreground">
          <span>Carga total de hoje</span>

          <span className="font-mono font-bold text-emerald-400">
            ⚡ {totalStrain}
          </span>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-black/15 border border-white/5 px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-3.5 h-3.5 text-muted-foreground" />

            <p className="t-micro text-muted-foreground uppercase tracking-wider">
              Recovery manhã
            </p>
          </div>

          <p className="text-sm font-mono font-bold">
            {recoveryScore}
          </p>

          <p className="t-micro text-muted-foreground mt-1 leading-snug">
            Como você começou o dia.
          </p>
        </div>

        <div className="rounded-xl bg-black/15 border border-white/5 px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <Gauge className="w-3.5 h-3.5 text-muted-foreground" />

            <p className="t-micro text-muted-foreground uppercase tracking-wider">
              ACWR
            </p>
          </div>

          <p className="text-sm font-mono font-bold">
            {acwr != null ? acwr.toFixed(2) : '—'}
          </p>

          {acwrInterpretation && (
            <p className="t-micro text-muted-foreground mt-1 leading-snug">
              {acwrInterpretation}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-black/15 border border-white/5 px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <Moon className="w-3.5 h-3.5 text-muted-foreground" />

            <p className="t-micro text-muted-foreground uppercase tracking-wider">
              Sono hoje
            </p>
          </div>

          <p className="text-sm font-mono font-bold">
            {sleepNeed != null ? `${sleepNeed}h` : 'Recuperar'}
          </p>

          <p className="t-micro text-muted-foreground mt-1 leading-snug">
            {verdict.tonightFocus}
          </p>
        </div>
      </div>

      {/* Tomorrow projection */}
      <div className="rounded-xl bg-black/15 border border-white/5 px-3 py-2.5">
        <p className="t-micro text-muted-foreground uppercase tracking-wider mb-1">
          Amanhã cedo
        </p>

        <p className="text-xs text-foreground/85 leading-relaxed">
          {verdict.tomorrow}
        </p>

        <p className="t-micro text-muted-foreground mt-1">
          Tendência, não garantia — sono e stress ainda influenciam a leitura.
        </p>
      </div>
    </motion.div>
  );
}
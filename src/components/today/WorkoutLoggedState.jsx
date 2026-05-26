import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Moon, Gauge, Activity } from 'lucide-react';
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
  if (acwr > 1.5) return 'Muito acima da zona ideal — hoje vale encerrar o dia em recuperação.';
  if (acwr > 1.3) return 'Acima da zona ideal — monitore sinais de fadiga e evite adicionar mais carga.';
  if (acwr < 0.8) return 'Abaixo da zona ideal — ainda assim, o treino de hoje já conta. O resto do dia deve focar em recuperar bem.';
  return 'Dentro da zona segura para a maioria dos dias.';
}

function getPostWorkoutVerdict(checkin, analysis, totalStrain) {
  const recovery = checkin?.recovery_score ?? checkin?.morning_recovery_score ?? 50;
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
      title: 'Hoje o foco agora é recuperar',
      subtitle: 'A carga do dia já foi suficiente. O restante do ganho vem de encerrar bem o dia.',
      tonightFocus: 'Hoje à noite, priorize sono, hidratação e redução de estresse.',
      tomorrow: 'A tendência para amanhã é de prontidão baixa a moderada se você não recuperar bem hoje.',
      tone: 'strong',
      color: 'text-red-400',
      badge: 'Carga alta',
    };
  }

  if (moderateDay) {
    return {
      title: 'Bom ponto de parada',
      subtitle: 'O treino de hoje já gerou estímulo útil. Agora vale preservar a recuperação.',
      tonightFocus: 'Hoje à noite, tente dormir bem para consolidar o benefício do treino.',
      tomorrow: 'A tendência para amanhã é de manutenção ou leve queda, dependendo do sono desta noite.',
      tone: 'moderate',
      color: 'text-yellow-400',
      badge: 'Carga moderada',
    };
  }

  return {
    title: 'Treino concluído com boa margem',
    subtitle: 'Seu dia segue controlado. O próximo ganho vem de fechar bem a recuperação.',
    tonightFocus: 'Hoje à noite, mantenha uma rotina de sono estável para transformar o treino em adaptação.',
    tomorrow: 'Se você recuperar bem hoje, a tendência para amanhã é de prontidão moderada a boa.',
    tone: 'good',
    color: 'text-emerald-400',
    badge: 'Dia controlado',
  };
}

export default function WorkoutLoggedState({ sessions = [], checkin, analysis }) {
  if (!sessions.length) return null;

  const totalStrain = sessions.reduce((s, t) => s + (t.strain_score || 0), 0);
  const acwr = analysis?.trainingLoad?.ratio ?? null;
  const acwrInterpretation = interpretAcwr(acwr);
  const verdict = getPostWorkoutVerdict(checkin, analysis, totalStrain);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Treino registrado
          </span>
        </div>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 ${verdict.color}`}>
          {verdict.badge}
        </span>
      </div>

      {/* Main verdict */}
      <div className="space-y-1">
        <h3 className="text-sm font-bold">{verdict.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {verdict.subtitle}
        </p>
      </div>

      {/* Session summary */}
      <div className="space-y-2">
        {sessions.map((s, i) => (
          <div key={s.id || i} className="flex items-center justify-between gap-2">
            <div>
              <span className="text-sm font-semibold">{s.sport}</span>

              {s.intensity && (
                <span className="text-xs text-muted-foreground ml-2">
                  {INTENSITY_LABELS[s.intensity] ?? s.intensity}
                </span>
              )}

              {s.duration_minutes && (
                <span className="text-xs text-muted-foreground ml-1">
                  · {s.duration_minutes}min
                </span>
              )}
            </div>

            <div className="text-right shrink-0">
              {s.strain_score != null && (
                <span className="text-sm font-mono font-bold text-emerald-400">
                  ⚡ {s.strain_score}
                </span>
              )}

              {s.perceived_effort != null && (
                <p className="text-[10px] text-muted-foreground">
                  RPE {s.perceived_effort}
                </p>
              )}
            </div>
          </div>
        ))}

        <div className="flex justify-between pt-1 border-t border-border/30 text-xs text-muted-foreground">
          <span>Carga total de hoje</span>
          <span className="font-mono font-bold text-emerald-400">⚡ {totalStrain}</span>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-black/20 border border-white/5 px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              ACWR atual
            </p>
          </div>
          <p className="text-sm font-mono font-bold">
            {acwr != null ? acwr.toFixed(2) : '—'}
          </p>
          {acwrInterpretation && (
            <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
              {acwrInterpretation}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-black/20 border border-white/5 px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Recovery da manhã
            </p>
          </div>
          <p className="text-sm font-mono font-bold">
            {checkin?.recovery_score ?? checkin?.morning_recovery_score ?? '—'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
            Referência de como você começou o dia.
          </p>
        </div>

        <div className="rounded-xl bg-black/20 border border-white/5 px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <Moon className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Hoje à noite
            </p>
          </div>
          <p className="text-sm font-semibold">
            Recuperar bem
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
            {verdict.tonightFocus}
          </p>
        </div>
      </div>

      {/* Tomorrow projection */}
      <div className="rounded-xl bg-black/20 border border-white/5 px-3 py-2.5">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
          Amanhã cedo (projeção)
        </p>
        <p className="text-xs text-foreground/85 leading-relaxed">
          {verdict.tomorrow}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Isso é uma tendência, não uma garantia — o sono e o restante do dia ainda influenciam bastante.
        </p>
      </div>

      {/* CTA */}
      <Link
        to="/checkin"
        className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl bg-secondary/60 border border-border/40 hover:bg-secondary/80 transition-colors group"
      >
        <span className="text-xs text-muted-foreground">
          Veja amanhã no check-in como seu corpo respondeu
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-primary group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </motion.div>
  );
}
``
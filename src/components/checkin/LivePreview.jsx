import { motion } from 'framer-motion';
import { getZoneColor, getZoneLabel } from '@/lib/biocharge-utils';
import { cn } from '@/lib/utils';

function ZoneBar({ value, color }) {
  return (
    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value || 0, 100)}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}

function getDecisionLabel(mode) {
  if (mode === 'train_high') return 'Dose alta';
  if (mode === 'train_moderate') return 'Dose moderada';
  if (mode === 'train_light') return 'Dose leve';
  if (mode === 'recover') return 'Recuperação';
  return 'Em análise';
}

function getDecisionTone(mode) {
  if (mode === 'train_high') return 'text-zone-green bg-zone-green/10 border-zone-green/20';
  if (mode === 'train_moderate') return 'text-zone-yellow bg-zone-yellow/10 border-zone-yellow/20';
  if (mode === 'train_light') return 'text-domain-sleep bg-domain-sleep/10 border-domain-sleep/20';
  if (mode === 'recover') return 'text-zone-red bg-zone-red/10 border-zone-red/20';
  return 'text-muted-foreground bg-secondary border-border/40';
}

function getConfidenceChip(confidence) {
  if (confidence === 'high') {
    return {
      label: 'Confiança alta',
      className: 'text-zone-green bg-zone-green/10 border-zone-green/20',
    };
  }

  if (confidence === 'medium') {
    return {
      label: 'Confiança média',
      className: 'text-zone-yellow bg-zone-yellow/10 border-zone-yellow/20',
    };
  }

  return {
    label: 'Confiança baixa',
    className: 'text-domain-strain bg-domain-strain/10 border-domain-strain/20',
  };
}

function CalibratingCard({ hasHrvToday, compact }) {
  const title = hasHrvToday ? 'Calibrando seu baseline' : 'Falta o sinal principal';
  const body = hasHrvToday
    ? 'HRV de hoje registrado. Antes de cravar um número de recovery, preciso de algumas noites de HRV para aprender o seu normal — é assim que o app evita inventar dado. Pode salvar normalmente; o histórico já está sendo construído.'
    : 'Informe o HRV (e a FC de repouso, se tiver) acima para calcular o recovery do dia. Sem HRV, o número não teria base fisiológica.';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-domain-sleep/60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-400" />
        </span>
        <p className="text-xs uppercase tracking-wider font-semibold text-domain-sleep">
          {hasHrvToday ? 'Calibrando' : 'Aguardando HRV'}
        </p>
      </div>

      <div>
        <p className="text-sm font-semibold leading-snug">{title}</p>
        <p className="text-support text-muted-foreground leading-relaxed mt-1.5">{body}</p>
      </div>

      {!compact && (
        <div className="rounded-xl bg-secondary/30 border border-border/30 px-3 py-2.5">
          <p className="text-support text-muted-foreground leading-relaxed">
            O recovery aparece quando seu baseline pessoal de HRV amadurece. Até lá, o app não mostra um número que não confiaria.
          </p>
        </div>
      )}
    </motion.div>
  );
}

export default function LivePreview({ preview, compact = false }) {
  if (!preview) return null;

  // Recovery null = não há número honesto a mostrar. Dois motivos: (1) HRV de
  // hoje ainda não informado; (2) HRV informado, mas baseline jovem (< 4 noites)
  // → "calibrando". Nunca mostrar "0".
  if (preview.recovery_score == null) {
    const hrvToday = preview.hrv_manual ?? preview.hrv ?? null;
    const hasHrvToday = hrvToday != null && Number(hrvToday) > 0;
    return <CalibratingCard hasHrvToday={hasHrvToday} compact={compact} />;
  }

  const recoveryScore = preview.recovery_score ?? 0;
  const readinessScore = preview.readiness_score ?? recoveryScore;
  const zone = preview.zone || 'yellow';
  const color = getZoneColor(zone);
  const zoneLabel = getZoneLabel(zone);
  const decisionMode = preview.decision_mode || null;

  const headline =
    preview.headline_today ||
    preview.recommendation ||
    'Complete os sinais essenciais para calcular a dose do dia.';

  const sleepNeed = preview.sleep_need_tonight ?? null;
  const confidence = preview.preview_confidence || 'low';
  const confidenceReason =
    preview.preview_confidence_reason ||
    'Esta leitura ainda depende do que foi preenchido manualmente.';

  const confidenceChip = getConfidenceChip(confidence);

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 bg-card p-4 space-y-3"
        style={{ boxShadow: `0 0 24px -12px ${color}22` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Plano preliminar
            </p>
            <p className="text-support text-muted-foreground mt-1">
              Você já pode salvar com estes dados e refinar depois.
            </p>
          </div>

          <span
            className={cn(
              'text-micro font-bold px-2 py-1 rounded-full border',
              confidenceChip.className
            )}
          >
            {confidenceChip.label}
          </span>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-micro text-muted-foreground uppercase tracking-wider mb-1">
              Recovery do dia
            </p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black font-mono leading-none" style={{ color }}>
                {recoveryScore}
              </span>
              <span className="text-sm font-semibold mb-0.5" style={{ color }}>
                {zoneLabel}
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-micro text-muted-foreground uppercase tracking-wider mb-1">
              Dose
            </p>
            <p className="text-sm font-semibold">
              {decisionMode ? getDecisionLabel(decisionMode) : 'Em análise'}
            </p>
          </div>
        </div>

        <ZoneBar value={recoveryScore} color={color} />

        <div className="rounded-xl bg-secondary/35 border border-border/40 px-3 py-2.5">
          <p className="text-micro text-muted-foreground uppercase tracking-wider mb-1">
            Linha da manhã
          </p>
          <p className="text-sm font-semibold leading-snug">{headline}</p>
          <p className="text-support text-muted-foreground leading-relaxed mt-1.5">
            {confidenceReason}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-4 space-y-4"
      style={{ boxShadow: `0 0 30px -10px ${color}22` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Plano do dia
          </p>
          <p className="text-support text-muted-foreground mt-1">
            Esta é a leitura com os dados que serão salvos agora.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span
            className={cn(
              'text-micro font-bold px-2 py-1 rounded-full border',
              confidenceChip.className
            )}
          >
            {confidenceChip.label}
          </span>

          {decisionMode && (
            <span
              className={cn(
                'text-micro font-bold px-2 py-1 rounded-full border',
                getDecisionTone(decisionMode)
              )}
            >
              {getDecisionLabel(decisionMode)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-micro text-muted-foreground uppercase tracking-wider mb-1">
            Recovery do dia
          </p>

          <div className="flex items-end gap-2">
            <span className="text-4xl font-black font-mono leading-none" style={{ color }}>
              {recoveryScore}
            </span>
            <span className="text-sm font-semibold mb-1" style={{ color }}>
              {zoneLabel}
            </span>
          </div>
        </div>

        <div className="text-right">
          <p className="text-micro text-muted-foreground uppercase tracking-wider mb-1">
            Prontidão
          </p>
          <p className="text-lg font-mono font-bold text-foreground">
            {readinessScore}
          </p>
        </div>
      </div>

      <ZoneBar value={recoveryScore} color={color} />

      <div className="rounded-xl bg-secondary/40 border border-border/40 px-3 py-2.5 space-y-1">
        <div>
          <p className="text-micro text-muted-foreground uppercase tracking-wider mb-1">
            Linha do dia
          </p>
          <p className="text-sm font-semibold leading-snug">{headline}</p>
        </div>

        <p className="text-support text-muted-foreground leading-relaxed">
          {confidenceReason}
        </p>
      </div>

      {(preview.deep_sleep_pct != null || preview.rem_sleep_pct != null) && (
        <div className="rounded-xl bg-secondary/25 border border-border/30 px-3 py-2.5">
          <p className="text-micro text-muted-foreground uppercase tracking-wider mb-1">
            Sono avançado
          </p>
          <p className="text-xs text-foreground/80 leading-relaxed">
            {preview.deep_sleep_pct != null ? `Profundo: ${preview.deep_sleep_pct}%` : 'Profundo: —'}
            {' · '}
            {preview.rem_sleep_pct != null ? `REM: ${preview.rem_sleep_pct}%` : 'REM: —'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-secondary/30 border border-border/30 px-3 py-2.5">
          <p className="text-micro text-muted-foreground mb-1">
            Sono
          </p>
          <p
            className={cn(
              'text-sm font-mono font-bold',
              preview.sleep_performance_pct >= 85
                ? 'text-zone-green'
                : preview.sleep_performance_pct >= 70
                ? 'text-zone-yellow'
                : preview.sleep_performance_pct != null
                ? 'text-zone-red'
                : 'text-foreground'
            )}
          >
            {preview.sleep_performance_pct != null
              ? `${preview.sleep_performance_pct}%`
              : (preview.sleep_quality ?? preview.sleep_score ?? '—')}
          </p>
        </div>

        <div className="rounded-xl bg-secondary/30 border border-border/30 px-3 py-2.5">
          <p className="text-micro text-muted-foreground mb-1">
            RMSSD
          </p>
          <p className="text-sm font-mono font-bold">
            {preview.hrv_manual ?? preview.hrv ?? '—'}
          </p>
        </div>

        <div className="rounded-xl bg-secondary/30 border border-border/30 px-3 py-2.5">
          <p className="text-micro text-muted-foreground mb-1">
            Sono hoje
          </p>
          <p className="text-sm font-mono font-bold">
            {sleepNeed != null ? `${sleepNeed}h` : '—'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

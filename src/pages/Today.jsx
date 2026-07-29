import React, { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useUserCheckins, useUserTrainingSessions } from '@/hooks/useUserData';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Plus, Zap, Dumbbell, Info, Moon, Heart, X, ChevronDown, TrendingUp, Settings, ChevronRight, AlertTriangle, Flag, ArrowUpRight } from 'lucide-react';
import { getTodayLocal } from '@/lib/date-utils';
import { computeCheckinScores, getDayScore, explainRecoveryV3, getZone, getZoneColor, getZoneClasses } from '@/lib/biocharge-utils';
import {
  calculateBodyState,
  calculateRemainingCapacity,
  calculateRecoveryDemand,
  calculateSleepNeed,
} from '@/lib/training-impact-engine';
import { runPhysiologicalAnalysisAsync } from '@/lib/physiological-engine';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useDayContext } from '@/lib/dayContext';

import MorningRecoveryCard from '@/components/today/MorningRecoveryCard';
import TrainingSessionsList from '@/components/today/TrainingSessionsList';
import SleepForecastCard from '@/components/today/SleepForecastCard';
import WorkoutLoggedState from '@/components/today/WorkoutLoggedState';
import NarrativeCard from '@/components/intelligence/NarrativeCard';
import LongevityOnboardingCard from '@/components/intelligence/LongevityOnboardingCard';
import WhyScoreCard from '@/components/intelligence/WhyScoreCard';
import SecondaryMetrics from '@/components/today/SecondaryMetrics';
import HealthStatusCard from '@/components/today/HealthStatusCard';
import RecoveryField from '@/components/today/RecoveryField';
import FatLossCard from '@/components/today/FatLossCard';
import QuickIntentEdit from '@/components/today/QuickIntentEdit';
import AddTrainingModal from '@/components/training/AddTrainingModal';
import { buildCardLayout } from '@/utils/priorityEngine';
import { getDailyVerdict, getSleepDebtHours } from '@/lib/decision-engine';


function getHeroDynamicContext({ checkin, analysis, dailyVerdict, todaySessions, isRestMode }) {
  const delayedFatigue = checkin?.delayed_fatigue_alert || null;
  const forecast = checkin?.next_day_forecast || null;
  const sleepNeed = checkin?.sleep_need_tonight ?? null;
  const ratio = analysis?.trainingLoad?.ratio ?? null;

    // (Removidos) 3 ganchos de "amanhã" que eram placebo:
  //  • fadiga retardada → atribuição causal a treino de 2 dias atrás (refutada);
  //  • "prévia de amanhã" → texto templated/horóscopo (meta de sono está no SleepForecastCard);
  //  • carga>1.25 → relação carga→recovery que não se sustenta (r≈+0,17, ns).
  // O hero mantém só leituras honestas (janela de recuperação / estímulo).



  if (isRestMode && sleepNeed != null) {
    return {
      tone: 'positive',
      heroLine: 'Recuperar bem hoje pode abrir uma margem melhor amanhã.',
      title: 'Janela de recuperação',
      text: `Se você proteger o sono hoje, há boa chance de melhorar a leitura de amanhã. Meta sugerida: ${sleepNeed}h.`,
    };
  }

  if (dailyVerdict?.mode === 'train_high') {
    return {
      tone: 'positive',
      heroLine: 'Se você dosar bem hoje, a tendência é sustentar uma boa linha amanhã.',
      title: 'Proteja a resposta',
      text: 'A oportunidade de hoje é boa, mas ela rende mais se vier com execução controlada e sono forte à noite.',
    };
  }

  return null;
}

function getHeroDynamicToneClass(tone) {
  if (tone === 'warning') {
    return 'bg-zone-amber/8 border-zone-amber/20 text-zone-amber';
  }

  if (tone === 'positive') {
    return 'bg-zone-green/8 border-zone-green/20 text-zone-green';
  }

  if (tone === 'info') {
    return 'bg-primary/5 border-primary/10 text-foreground';
  }

  return 'bg-secondary/60 border-border/40 text-foreground';
}

// Explicação recolhível — mostra um botão "entender" que expande o texto ao toque.
// Mesmo padrão visual das outras seções recolhíveis do app (SecondaryMetrics).
function CollapsibleHint({ children, label = 'Entender' }) {
  const [open, setOpen] = useState(false);
  if (!children) return null;
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 t-micro font-semibold uppercase tracking-wider opacity-60 hover:opacity-90 transition-opacity"
      >
        {label}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3 h-3" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="t-micro leading-relaxed opacity-80 pt-1.5">{children}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExecutionCard({ displayedScore, enrichedCheckin, strainVsTarget, isRestMode, phase, phaseCfg, isCalibrating, dailyVerdict, calibratingNightsLeft, heroDynamicContext, baselineTier, priorHrvNights, readinessFaixa, ringTrends, recoveryBaseline, cappedStrain, todaySessions, strainTarget, analysis, sortedCheckins, today, recoveryDrivers, targetZoneLabel, CAPACITY_PT, AUTONOMIC_PT, capacityContradictionNote, setShowAddModal, CtaIcon }) {
  const [showProntidaoHint, setShowProntidaoHint] = useState(false);

  // Zona = fonte única (getZone → ZONE_GREEN_MIN/ZONE_YELLOW_MIN). Gema e legenda
  // derivam da MESMA zona, então não há como uma dizer verde e a outra amarelo.
  const recoveryZone = getZone(displayedScore);
  const recoveryColor = getZoneColor(recoveryZone);
  const recoveryCaptionColor = getZoneClasses(recoveryZone).text;

  // Chip de confiança do baseline. O frescor (stale-after-gap) tem PRIORIDADE sobre
  // o tier: baseline defasado por lacuna de dias não é "sólido" mesmo com noites suficientes.
  const bf = analysis?.baselineFreshness;
  let baselineChip;
  if (bf?.status === 'stale' || bf?.status === 'aging') {
    const amber = bf.status === 'aging';
    const label = bf.reason === 'baseline_gap'
      ? `Baseline recalibrando · pausa de ${bf.gapBeforeLatest} ${bf.gapBeforeLatest === 1 ? 'dia' : 'dias'}`
      : `Leitura de ${bf.daysSinceLastReading} ${bf.daysSinceLastReading === 1 ? 'dia' : 'dias'} atrás`;
    baselineChip = {
      wrap: amber ? 'bg-zone-amber/10 text-zone-amber/90' : 'bg-zone-orange/10 text-zone-orange/90',
      dot: amber ? 'bg-zone-amber' : 'bg-zone-orange',
      label,
    };
  } else {
    baselineChip = {
      wrap: baselineTier === 'solido' ? 'bg-zone-green/10 text-zone-green/90' : 'bg-zone-amber/10 text-zone-amber/90',
      dot: baselineTier === 'solido' ? 'bg-zone-green' : 'bg-zone-amber',
      label: baselineTier === 'solido' ? 'Baseline sólido' : `Baseline construindo · ${priorHrvNights}/14 noites`,
    };
  }

  const sleepVal = enrichedCheckin?.sleep_quality ?? enrichedCheckin?.sleep_score ?? null;
  const sleepColor =
    sleepVal == null ? 'hsl(215,30%,55%)'
    : sleepVal >= 80 ? 'hsl(205,90%,62%)'
    : sleepVal >= 65 ? 'hsl(210,85%,55%)'
    : 'hsl(222,60%,52%)';
  const sleepWord =
    sleepVal == null ? 'Sem dado'
    : sleepVal >= 80 ? 'Ótimo'
    : sleepVal >= 65 ? 'Bom'
    : sleepVal >= 50 ? 'Regular'
    : 'Baixo';
  const sleepCaptionColor =
    sleepVal == null ? 'text-muted-foreground'
    : sleepVal >= 80 ? 'text-zone-blue'
    : sleepVal >= 65 ? 'text-blue-400'
    : 'text-blue-500';

  // Visão B (constelação, ART): satélites são micro-gemas em cor de DOMÍNIO.
  // Sono já é campo azul (sleepColor). Strain vira campo LARANJA (BRAND §2:
  // laranja é o domínio de carga), slate quando não há carga ("sinal sem dado
  // é slate morto"). Exceção: esgotamento continua VERMELHO — é alerta real de
  // segurança, e §2 reserva o vermelho pra isso. O resto do estado (na-zona,
  // acima) segue vivo na legenda colorida abaixo, não no corpo da gema.
  const strainColor =
    cappedStrain <= 0 ? 'hsl(215,30%,55%)'
    : strainVsTarget.color === 'text-zone-red' ? 'hsl(0,84%,60%)'
    : 'hsl(25,90%,55%)';
  const strainCaption = isRestMode ? 'foco recuperar' : strainVsTarget.short;

  return (
    <motion.div
      key={phase + '-card'}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
  'relative overflow-hidden rounded-3xl border px-5 pt-5 pb-4',
  phaseCfg.accentBorder,
  phaseCfg.accentBg
)}
    >
      {/* Scenic hero — fundo atmosférico com domain bloom (estilo Noop) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 36%, hsl(220 25% 11%), hsl(220 20% 4%) 85%)' }} />
        {!isCalibrating && (
          <div
            className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[140%] h-[100%] blur-2xl"
            style={{ background: `radial-gradient(ellipse at center top, ${recoveryColor}, transparent 55%)`, opacity: 0.18 }}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/5" style={{ background: 'linear-gradient(to bottom, transparent, hsl(220 18% 7% / 0.8))' }} />
      </div>
      <div className="relative z-10 flex flex-col gap-3.5">
        {/* Decisão de hoje */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
               Decisão de hoje
            </span>
                        <h2 className="text-xl font-semibold mt-1 leading-tight">
              {isCalibrating ? 'Calibrando seu baseline' : dailyVerdict.headline}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isCalibrating
                ? (calibratingNightsLeft > 0
                    ? `Faltam ${calibratingNightsLeft} ${calibratingNightsLeft === 1 ? 'noite' : 'noites'} de HRV para o Recovery ficar confiável. Continue registrando — não vou inventar um número antes disso.`
                    : 'Quase lá — mais uma leitura e o Recovery abre.')
                : (heroDynamicContext?.heroLine || dailyVerdict.subheadline)}
            </p>

            {!isCalibrating && (
              <span
                className={`mt-2 inline-flex items-center gap-1.5 t-micro font-medium px-2 py-0.5 rounded-full ${baselineChip.wrap}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${baselineChip.dot}`} />
                {baselineChip.label}
              </span>
            )}

          </div>

                      </div>

        {/* HERÓI — Recovery dominante + satélites Sono/Strain */}
        <div className="flex flex-col items-center pt-0">
          <RecoveryField
            value={isCalibrating ? null : displayedScore}
            max={100}
            color={recoveryColor}
            label="Recovery"
            caption={isCalibrating ? 'Calibrando' : readinessFaixa}
            captionColor={isCalibrating ? 'text-muted-foreground' : recoveryCaptionColor}
            size={288}
            animateCount
            onClick={() => setShowProntidaoHint((v) => !v)}
          />

          <div className="flex justify-center gap-10 mt-2.5">
            <RecoveryField
              value={sleepVal}
              max={100}
              color={sleepColor}
              label="Sono"
              caption={sleepWord}
              captionColor={sleepCaptionColor}
              size={96}
              live={false}
            />
            <RecoveryField
              value={cappedStrain}
              max={21}
              color={strainColor}
              label="Strain"
              caption={strainCaption}
              captionColor={cappedStrain <= 0 ? 'text-muted-foreground' : strainVsTarget.color}
              size={96}
              live={false}
            />
          </div>
        </div>

        {/* Entender os scores (toque — funciona no iPhone) */}
        <div className="flex justify-center -mt-1.5">
          <button
            type="button"
            aria-expanded={showProntidaoHint}
            onClick={() => setShowProntidaoHint((v) => !v)}
            className="flex items-center gap-1 t-micro font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors tap-target"
          >
            <Info className="w-3 h-3" />
            Entender os scores
            <motion.span animate={{ rotate: showProntidaoHint ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-3 h-3" />
            </motion.span>
          </button>
        </div>
        <AnimatePresence initial={false}>
          {showProntidaoHint && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl bg-secondary/50 border border-border/40 px-3 py-2.5 space-y-1.5">
                <p className="t-micro leading-relaxed">
                  <span className="font-semibold text-foreground">Recovery</span>{' '}
                  <span className="text-muted-foreground">— seu score do dia, calculado pelos sinais fisiológicos da manhã: HRV, frequência cardíaca de repouso e sono. É o número que orienta a decisão de treino.</span>
                </p>
                {recoveryDrivers?.drivers?.length ? (
                  <div className="mt-1.5 pt-1.5 border-t border-border/30 space-y-1">
                    <p className="t-micro uppercase tracking-wider text-muted-foreground/80">O que moldou hoje · vs seu normal</p>
                    {recoveryDrivers.drivers.map((d) => {
                      const up = d.direction === 'positive';
                      return (
                        <div key={d.id} className="flex items-center justify-between gap-2 t-micro">
                          <span className="text-muted-foreground">
                            {d.label}
                            <span className="text-muted-foreground/60">{' '}{d.value}{d.unit === 'pts' ? '' : ` ${d.unit}`}{d.baseline != null ? ` · base ${d.baseline}` : ''}</span>
                          </span>
                          <span className={cn('font-semibold tabular-nums', d.deltaPoints === 0 ? 'text-muted-foreground' : up ? 'text-zone-green' : 'text-zone-red')}>
                            {d.deltaPoints === 0 ? '±0' : `${d.deltaPoints > 0 ? '+' : ''}${d.deltaPoints}`}
                          </span>
                        </div>
                      );
                    })}
                    <p className="t-micro leading-snug text-muted-foreground/60 pt-0.5">Efeito de cada sinal vs seu baseline. Não somam ao score (a curva e os tetos não são lineares).</p>
                  </div>
                ) : null}
                <p className="t-micro leading-relaxed">
                  <span className="font-semibold text-foreground">Sono</span>{' '}
                  <span className="text-muted-foreground">— qualidade da sua noite (duração, regularidade, continuidade, profundo e REM).</span>
                </p>
                <p className="t-micro leading-relaxed">
                  <span className="font-semibold text-foreground">Strain</span>{' '}
                  <span className="text-muted-foreground">— esforço acumulado hoje (0–21). É separado do recovery e comparado à meta sugerida para o dia.</span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {heroDynamicContext ? (
          <div
            className={cn(
              'px-3 py-2.5 rounded-xl border text-xs leading-snug',
              getHeroDynamicToneClass(heroDynamicContext.tone)
            )}
          >
            <span className="font-semibold">
              {heroDynamicContext.title}:
            </span>{' '}
            {heroDynamicContext.text}
          </div>
        ) : (
          !todaySessions.length && !isRestMode && (
            <div className="mt-0.5 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/10 text-xs leading-snug">
              <span className="font-semibold text-primary">Linha do dia:</span>{' '}
              {isCalibrating
                ? 'ainda calibrando seu baseline. Quando o Recovery abrir, esta linha vira a leitura do seu dia.'
                : displayedScore >= 70
                ? 'recuperação alta — há margem pra puxar um pouco mais hoje, se a vontade pedir.'
                : displayedScore >= 42
                ? 'recuperação moderada — segure a intensidade no controle; não transforme moderado em máximo.'
                : 'recuperação baixa — o ganho de hoje está em recuperar, não em forçar.'}
            </div>
          )
        )}

        {!heroDynamicContext &&
          phase !== 'RECOVERY_DAY' &&
          phase !== 'OVERLOAD' &&
          dailyVerdict.caution && (
            <div className="px-3 py-2.5 rounded-xl bg-secondary/60 border border-border/40 text-xs leading-snug">
              <span className="font-semibold">O que pede controle hoje:</span> {dailyVerdict.caution}
            </div>
          )}

        {capacityContradictionNote && (
          <p className="t-micro text-muted-foreground leading-relaxed">
            {capacityContradictionNote}
          </p>
        )}
      </div>

      {phaseCfg.showCta && (
        <button
          onClick={() => setShowAddModal(true)}
          className={cn(
            'w-full flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold text-sm transition-all',
            phaseCfg.ctaClass
          )}
        >
          <CtaIcon className="w-4 h-4" />
          {phaseCfg.ctaLabel}
        </button>
      )}
    </motion.div>
  );
}

function TodayReadingCard({ displayedScore, enrichedCheckin, cappedStrain, strainTarget, targetZoneLabel, CAPACITY_PT, AUTONOMIC_PT, analysis, sortedCheckins, today, isCalibrating }) {
  const [open, setOpen] = useState(false);
  if (isCalibrating || !enrichedCheckin?.current_body_state) return null;

          const bodyKey = enrichedCheckin.current_body_state;
          const autoKey = enrichedCheckin.autonomic_state || 'balanced';
          const si = enrichedCheckin.baevsky_si;
          const cap = enrichedCheckin.remaining_capacity;

          const bodyClause = {
            Recovered: 'Corpo recuperado', Activated: 'Corpo ativado',
            Balanced: 'Corpo equilibrado', Loaded: 'Corpo carregado',
            Sympathetic_Load: 'Corpo sob carga simpática', Fatigued: 'Corpo fatigado',
            Overreached: 'Corpo em sobrecarga',
          }[bodyKey] || 'Corpo estável';
          const autoClause = {
            parasympathetic: 'sistema nervoso em recuperação',
            balanced: 'sistema nervoso calmo',
            sympathetic: 'sistema nervoso em alerta',
          }[autoKey] || 'sistema nervoso estável';
          const tail =
            displayedScore >= 70 ? 'dá pra puxar hoje.' :
            displayedScore >= 42 ? 'dá pra treinar com controle.' :
            'hoje é segurar.';
          const toneClass = getZoneClasses(getZone(displayedScore)).text;

          const STRAIN_MAX = 21;
          const currentStrainPct = Math.max(0, Math.min(100, (cappedStrain / STRAIN_MAX) * 100));
          const targetStrainPct = Math.max(0, Math.min(100, (strainTarget / STRAIN_MAX) * 100));
          const overTarget = cappedStrain > strainTarget;

          const fmtH = (h) => { const H = Math.floor(h); const M = Math.round((h - H) * 60); return M ? `${H}h${String(M).padStart(2, '0')}` : `${H}h`; };
          const bn = analysis?.personalBottleneck;
          const sleepBase = (() => {
            const xs = (sortedCheckins || [])
              .filter((c) => c.date !== today && Number(c?.sleep_hours) > 0)
              .map((c) => Number(c.sleep_hours)).slice(0, 14);
            return xs.length >= 3 ? xs.reduce((a, v) => a + v, 0) / xs.length : null;
          })();
          const lastSleep = Number(enrichedCheckin.sleep_hours) > 0 ? Number(enrichedCheckin.sleep_hours) : null;
          const dMin = (lastSleep != null && sleepBase != null) ? Math.round((lastSleep - sleepBase) * 60) : null;

          let lever;
          if (bn?.hasSignal && bn.bottleneck) {
            const b = bn.bottleneck;
            const isSleepH = b.key === 'sleep_hours' && lastSleep != null && sleepBase != null;
            lever = isSleepH ? (
              <>
                <b className="text-zone-amber">Validado:</b> seu <b>{b.label.toLowerCase()}</b> acompanha seu HRV do dia seguinte. Ontem {fmtH(lastSleep)}, {dMin < 0 ? `${Math.abs(dMin)}min abaixo` : 'no'} do seu normal (~{fmtH(sleepBase)}). Amanhã, mire seu normal.
              </>
            ) : (
              <>
                <b className="text-zone-amber">Validado:</b> noites com mais <b>{b.label.toLowerCase()}</b> vêm com HRV {b.direction === 'positive' ? 'melhor' : 'pior'} no dia seguinte. {b.direction === 'positive' ? 'Quanto mais, melhor seu amanhã.' : 'Quanto menos, melhor seu amanhã.'}
              </>
            );
          } else if (lastSleep != null && sleepBase != null && dMin < -20) {
            lever = <>Sem gargalo provado hoje. O desvio do dia foi o sono: <b>{fmtH(lastSleep)}</b>, {Math.abs(dMin)}min abaixo do seu normal (~{fmtH(sleepBase)}). Vale mirar seu normal amanhã.</>;
          } else if (lastSleep != null && sleepBase != null) {
            lever = <>Sem gargalo provado, e seus controláveis estão no seu normal. Nada pra ajustar — siga assim.</>;
          } else {
            lever = <>Sem gargalo provado hoje. Seus sinais estão dentro do seu normal.</>;
          }

  const dotColor = getZoneClasses(getZone(displayedScore)).bg;

  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
          <span className="t-micro font-bold uppercase tracking-widest text-muted-foreground shrink-0">Leitura de hoje</span>
          {!open && (
            <span className={`text-xs truncate ${toneClass}`}>{bodyClause}</span>
          )}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 text-muted-foreground">
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              <p className="text-sm leading-snug">
                <span className={toneClass}>{bodyClause}</span>, {autoClause} — {tail}
              </p>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="t-micro font-semibold uppercase tracking-wider text-muted-foreground">
                    Quanto dá pra puxar
                  </span>
                  {cap && CAPACITY_PT[cap] ? (
                    <span className="t-micro text-muted-foreground">
                      sobra <b>{CAPACITY_PT[cap].toLowerCase()}</b>
                    </span>
                  ) : null}
                </div>

                <div className="relative pt-5 mb-1">
                  <div
                    className="absolute top-0 -translate-x-1/2 flex flex-col items-center leading-none"
                    style={{ left: `${targetStrainPct}%` }}
                  >
                    <span className="t-micro font-bold tracking-wider text-white/80 whitespace-nowrap">
                      META {strainTarget}
                    </span>
                    <span className="text-white/50 t-micro mt-px">▾</span>
                  </div>
                  <div className="relative h-2.5 rounded-full bg-white/[0.07] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{
                        width: `${currentStrainPct}%`,
                        background: overTarget
                          ? 'linear-gradient(90deg, hsl(35,80%,35%), hsl(25,95%,55%))'
                          : 'linear-gradient(90deg, hsl(142,50%,25%), hsl(142,65%,48%))',
                      }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-[2px] -translate-x-1/2 bg-white/60 rounded-full"
                      style={{ left: `${targetStrainPct}%` }}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="t-micro font-mono text-muted-foreground/40">0</span>
                    <span className="t-micro font-mono text-muted-foreground/40">21</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-snug">
                  Você está em <b>{cappedStrain}</b>. Bom puxar até <b>~{strainTarget}</b> ({(targetZoneLabel || '').toLowerCase()}); acima começa a cavar a recuperação de amanhã.
                </p>
              </div>

              <div className="rounded-xl border border-zone-amber/20 bg-zone-amber/5 px-3.5 py-3">
                <p className="t-micro font-bold uppercase tracking-wider text-zone-amber/90 mb-0.5"><ArrowUpRight size={11} className="inline" /> Alavanca pra amanhã</p>
                <p className="text-xs text-foreground/90 leading-snug">{lever}</p>
              </div>

              {si != null && (
                <CollapsibleHint>
                  Baevsky {si}/100 · {AUTONOMIC_PT[autoKey] || 'modo estável'}{cap && CAPACITY_PT[cap] ? ` · capacidade ${CAPACITY_PT[cap].toLowerCase()}` : ''}
                </CollapsibleHint>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Today() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const today = getTodayLocal();

  const { data: checkins = [], isLoading: loadingCheckins } = useUserCheckins(90);
  const { data: allSessions = [], isLoading: loadingSessions } = useUserTrainingSessions(100);

  const sortedCheckins = useMemo(() => {
    return [...checkins].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [checkins]);

  const sortedSessions = useMemo(() => {
    return [...allSessions].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [allSessions]);

  const todayCheckins = sortedCheckins.filter((c) => c.date === today);
  const rawCheckin = todayCheckins[0] || null;

  const computed = useMemo(() => {
    return sortedCheckins.map((c, i) => computeCheckinScores(c, sortedCheckins.slice(i + 1), []));
  }, [sortedCheckins]);

  const todaySessions = sortedSessions.filter((s) => s.date === today);

  const engineScores = rawCheckin
    ? computeCheckinScores(rawCheckin, sortedCheckins.slice(1), todaySessions)
    : null;

  // RecoveryDrivers: MESMA janela que gerou o score (rawCheckin + slice(1)) -> reproduz.
  const recoveryDrivers = useMemo(
    () => (rawCheckin ? explainRecoveryV3(rawCheckin, sortedCheckins.slice(1)) : null),
    [rawCheckin, sortedCheckins]
  );

  const checkin = rawCheckin
    ? (() => {
        const base = { ...rawCheckin };
        const engine = engineScores || {};
        const approvedEngineFields = [
  'readiness_score',
  'fatigue_score',
  'stress_score',
  'sleep_quality',
  'sleep_performance_pct',
  // recovery_score / morning_recovery_score / zone NÃO entram aqui de propósito:
  // o score é a FONTE ÚNICA gravada no check-in. A Today lê o salvo (via getDayScore),
  // igual ao Histórico/Timeline — nunca recalcula pra exibir. Só os campos DERIVADOS
  // (decision_mode, thresholds, hrv_trend, etc.) seguem sendo calculados ao vivo.
  'alert',
  'recommendation',
  'training_load',
  'sleep_need_tonight',
  'next_day_forecast',
  'delayed_fatigue_alert',
  'headline_today',
  'decision_mode',
  'recovery_high_threshold',
  'hrv_7d_avg',
  'hrv_trend',
  'baevsky_si',
  'autonomic_state',
];

        for (const k of approvedEngineFields) {
          if (typeof engine[k] !== 'undefined' && engine[k] !== null) {
            base[k] = engine[k];
          }
        }

        return base;
      })()
    : null;

  const totalStrain = todaySessions.reduce((sum, session) => sum + (session.strain_score ?? 0), 0);
  const morningRecovery = checkin?.morning_recovery_score ?? checkin?.recovery_score ?? 0;

  const liveBodyState = checkin ? calculateBodyState(morningRecovery, totalStrain) : null;
  const liveCapacity = checkin ? calculateRemainingCapacity(morningRecovery, totalStrain) : null;
  const liveRecoveryDemand = checkin ? calculateRecoveryDemand(totalStrain, morningRecovery) : null;
  const liveSleepNeed = checkin ? calculateSleepNeed(totalStrain, morningRecovery, sortedCheckins.filter((c) => c.date !== today)) : null;

  const enrichedCheckin = checkin
    ? {
        ...checkin,
        current_body_state: checkin.current_body_state || liveBodyState,
        remaining_capacity: checkin.remaining_capacity || liveCapacity,
        recovery_demand: checkin.recovery_demand ?? liveRecoveryDemand,
        sleep_need_tonight: liveSleepNeed ?? checkin.sleep_need_tonight,
      }
    : null;

  const isLoading = loadingCheckins || loadingSessions;

  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const computedKey = `${computed.length}:${computed[0]?.date || ''}:${computed[0]?.recovery_score || ''}`;
  const sessionsKey = `${sortedSessions.length}:${sortedSessions[0]?.date || ''}:${sortedSessions[0]?.strain_score || ''}`;

  useEffect(() => {
    // Sem check-ins suficientes para análise histórica robusta
    if (computed.length < 2) {
      setAnalysis(null);
      setAnalysisLoading(false);
      setAnalysisError(null);
      return;
    }

    let cancelled = false;
    setAnalysisLoading(true);
    setAnalysisError(null);

    runPhysiologicalAnalysisAsync(computed, sortedSessions, {
      useWorker: true,
      cacheTTLMinutes: 15,
    })
      .then((result) => {
        if (!cancelled) {
          if (result && typeof result === 'object') {
            setAnalysis(result);
          } else {
            setAnalysis(null);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('Today: analysis failed', err);
          setAnalysisError(err?.message || 'analysis_failed');
          setAnalysis(null);
        }
      })
      .finally(() => {
        if (!cancelled) setAnalysisLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [computedKey, sessionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const recoveryDelta = Array.isArray(analysis?.baselineInsights)
    ? analysis.baselineInsights.find((i) => i.label === 'Recovery')?.delta ?? null
    : null;

  const last7Checkins = sortedCheckins.filter((c) => c.date !== today).slice(0, 7);

  // baseline de recovery (média 7d, exclui hoje) — alimenta o marcador ▲ do anel herói
  const recoveryBaseline = (() => {
    const vals = last7Checkins.map((c) => c.recovery_score).filter((v) => v != null);
    return vals.length >= 3 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  })();

  const ringTrends = useMemo(() => {
    const chrono = [...last7Checkins].reverse(); // mais antigo → mais recente
    return {
      recovery: chrono.map((c) => c.recovery_score ?? c.biocharge_morning ?? c.readiness_score).filter((v) => v != null),
    };
  }, [last7Checkins]);

  const isSilentMode = ['Overreached', 'Fatigued'].includes(analysis?.physioState?.state);

  const [deepSleepAlertDismissed, setDeepSleepAlertDismissed] = useState(false);
  const deepSleepAlert = useMemo(() => {
    if (!rawCheckin?.deep_sleep_pct) return null;

    const sorted = [...sortedCheckins].sort((a, b) => b.date.localeCompare(a.date));
    let consecutiveNights = 0;

    // Limiar alinhado à nova banda: 13% é o piso saudável (idealLow). 13-22% =
    // saudável, NÃO alerta. Só sequências abaixo de 13% sinalizam profundo baixo.
    for (const c of sorted) {
      if (c.deep_sleep_pct != null && c.deep_sleep_pct < 13) {
        consecutiveNights++;
      } else {
        break;
      }
    }

    if (consecutiveNights < 2) return null;

    const pct = rawCheckin.deep_sleep_pct;
    const recentPcts = sorted
      .slice(0, consecutiveNights)
      .map((c) => c.deep_sleep_pct)
      .filter((v) => v != null);

    const isImproving = recentPcts.length >= 2 && recentPcts[0] > recentPcts[1];

    let framing;
    if (isImproving) {
      framing = `Profundo melhorando, mas ainda abaixo do seu saudável.`;
    } else if (consecutiveNights >= 7) {
      framing = `Uma semana com profundo baixo.`;
    } else if (consecutiveNights >= 4) {
      framing = `Dia ${consecutiveNights} de profundo abaixo do saudável.`;
    } else {
      framing = `Noite ${consecutiveNights} de profundo baixo.`;
    }

    // Ação no lever CERTO (higiene de sono), não na intensidade — a dose de
    // treino é decidida só pela engine principal, p/ não dar duas ordens na tela.
    return `${framing} Priorize dormir cedo, em quarto fresco e escuro — é onde o profundo se recupera. (sono profundo: ${pct}%)`;
  }, [sortedCheckins, rawCheckin?.deep_sleep_pct]); // eslint-disable-line
  const capacityContradictionNote = useMemo(() => {
    if (!rawCheckin) return null;

    // Não sugerir treino quando o dia é de recuperação/descanso —
    // a nota contradiria a decisão principal da tela.
    const isRecoveryDay =
      !!rawCheckin.rest_day || enrichedCheckin?.decision_mode === 'recover';
    if (isRecoveryDay) return null;

    const bio = rawCheckin.recovery_score ?? 0; // recovery v3, não o composto Zepp (biocharge_morning)
    const cap = enrichedCheckin?.remaining_capacity;
    const sleep = rawCheckin.sleep_quality ?? rawCheckin.sleep_score ?? 100;

    if (bio < 70 && ['High', 'Alta'].includes(cap) && sleep < 75) {
      return 'Sua capacidade muscular parece melhor do que o sono sugere. Se treinar, mantenha o foco em controle e não em intensidade máxima.';
    }

    return null;
  }, [
    rawCheckin?.rest_day,
    rawCheckin?.biocharge_morning,
    enrichedCheckin?.remaining_capacity,
    enrichedCheckin?.decision_mode,
    rawCheckin?.sleep_score,
    rawCheckin?.sleep_quality,
  ]); // eslint-disable-line

  const [showAddModal, setShowAddModal] = useState(false);

  const scrollToWorkoutPrescription = () => {
    const el = document.getElementById('today-workout-prescription');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

    // Cold-start: o recovery é null enquanto o baseline de HRV é jovem (<4 noites).
  // NUNCA mostramos "0" nesse caso — seria um número falso (anti-placebo).
  const rawDayScore = getDayScore(checkin);
  const isCalibrating = !!checkin && rawDayScore == null;
  const displayedScore = rawDayScore ?? 0; // só p/ comparações de lógica; a UI usa isCalibrating

  // Noites de HRV já registradas antes de hoje (o baseline matura em 4 — BL_SEED_NIGHTS).
  const priorHrvNights = (sortedCheckins || []).filter(
    (c) => c.date !== today && Number(c?.hrv_manual ?? c?.hrv) > 0
  ).length;
  const calibratingNightsLeft = Math.max(0, 4 - priorHrvNights);

  // Tier de confiança do baseline (honestidade): nos dias 4–13 o Recovery já existe,
  // mas o baseline matura até 14 noites (BL_TRUST_NIGHTS). Surfacar isso evita que um
  // score com baseline provisório pareça tão firme quanto um já consolidado.
  // calibrando (sem score) → o título já avisa; construindo (<14) → âmbar; sólido (≥14) → verde.
  const baselineTier = isCalibrating
    ? 'calibrando'
    : (priorHrvNights >= 14 ? 'solido' : 'construindo');


  const prescriptionScore = checkin?.recovery_score ?? displayedScore;
  const personalHigh = enrichedCheckin?.recovery_high_threshold ?? 74;
  // Faixa = ESTADO de recovery, alinhada às zonas do anel (verde ≥70 / amarelo ≥42).
  // A DOSE de treino (train_high / strain Alto) usa personalHigh — é outro eixo.
  const readinessFaixa =
  displayedScore >= 70 ? 'Alta' :
  displayedScore >= 42 ? 'Moderada' :
  'Baixa';

  // Alvo de strain ALINHADO à decisão do dia (decision_mode), pra o anel não
  // contradizer o título (ex.: "manter leve" não mostrar alvo de treino moderado).
  // Sem decisão salva, cai para os tiers por prontidão.
  const verdictMode = enrichedCheckin?.decision_mode || null;
  const strainTarget =
    verdictMode === 'train_high' ? 15 :
    verdictMode === 'train_moderate' ? 12 :
    verdictMode === 'train_light' ? 9 :
    verdictMode === 'recover' ? 6 :
    (prescriptionScore >= personalHigh ? 16 :
     prescriptionScore >= 55 ? 13 :
     prescriptionScore >= 42 ? 10 :
     7);

  const cappedStrain = Math.min(21, totalStrain);

  // Zonas WHOOP de strain (escala 0-21, absoluta).
  const STRAIN_ZONES = [
    { key: 'leve', label: 'Leve', min: 0 },
    { key: 'moderado', label: 'Moderado', min: 10 },
    { key: 'alto', label: 'Alto', min: 14 },
    { key: 'esgotamento', label: 'Esgotamento', min: 18 },
  ];
  const strainZoneOf = (s) => {
    let z = STRAIN_ZONES[0];
    for (const cand of STRAIN_ZONES) if (s >= cand.min) z = cand;
    return z;
  };
  const zoneIdx = (key) => STRAIN_ZONES.findIndex((z) => z.key === key);

  // Zona-ALVO do dia, definida pela decisão (decision_mode). recover = sem carga.
  const targetZoneKey =
    verdictMode === 'train_high' ? 'alto' :
    verdictMode === 'train_moderate' ? 'moderado' :
    verdictMode === 'train_light' ? 'leve' :
    verdictMode === 'recover' ? 'recuperacao' :
    (prescriptionScore >= personalHigh ? 'alto' :
     prescriptionScore >= 55 ? 'moderado' :
     prescriptionScore >= 42 ? 'leve' : 'recuperacao');
  const targetZoneLabel =
    targetZoneKey === 'alto' ? 'Alto' :
    targetZoneKey === 'moderado' ? 'Moderado' :
    targetZoneKey === 'leve' ? 'Leve' : 'Recuperação';

  // Strain acumulado relativo à ZONA-ALVO (estilo WHOOP). Esgotamento (18+) é
  // sempre alerta, independente da meta. A mesma carga lê diferente conforme o
  // dia: 14 num dia "Alto" = na zona; 14 num dia de recuperação = acima.
  const strainVsTarget = (() => {
    const curZone = strainZoneOf(cappedStrain);
    // Alvo SEMPRE com o número (não só o nome da zona), pra "moderado" virar "moderado · 12".
    const targetLabelNum = `${targetZoneLabel} · ${strainTarget}`;
    if (cappedStrain <= 0) {
      return { color: 'text-muted-foreground', ring: 'hsl(215,20%,45%)', short: `meta ${strainTarget}` };
    }
    if (curZone.key === 'esgotamento') {
      return { color: 'text-zone-red', ring: 'hsl(0,84%,60%)', short: 'Esgotamento — recupere' };
    }
    if (targetZoneKey === 'recuperacao') {
      return curZone.key === 'leve'
        ? { color: 'text-zone-blue', ring: 'hsl(199,89%,60%)', short: 'Leve · dia de recuperação' }
        : { color: 'text-zone-orange', ring: 'hsl(25,95%,58%)', short: `${curZone.label} · era recuperação` };
    }
    const diff = zoneIdx(curZone.key) - zoneIdx(targetZoneKey);
    if (diff < 0) return { color: 'text-zone-blue', ring: 'hsl(199,89%,60%)', short: `${curZone.label} → ${strainTarget}` };
    if (diff === 0) return { color: 'text-zone-green', ring: 'hsl(142,70%,50%)', short: `Na zona · meta ${strainTarget}` };
    return { color: 'text-zone-orange', ring: 'hsl(25,95%,58%)', short: `${curZone.label} → ${strainTarget}` };
  })();

  const dayMetrics = enrichedCheckin
    ? {
        currentStrain: cappedStrain,
        strainTarget,
        readiness: prescriptionScore,
        hrv: enrichedCheckin.hrv_manual ?? enrichedCheckin.hrv ?? null,
        hasSessions: todaySessions.length > 0,
      }
    : null;

  const { intent, locked, dayPhase, DayPhase: Phase } = useDayContext(dayMetrics);

const AUTONOMIC_PT = {
    parasympathetic: 'Modo recuperação',
    balanced: 'Equilibrado',
    sympathetic: 'Modo alerta',
  };

  const CAPACITY_PT = {
    High: 'Alta',
    Moderate: 'Moderada',
    Low: 'Baixa',
    Minimal: 'Mínima',
  };

  const PHASE_CONFIG = {
    PLANNING: {
      headerTitle: 'Hoje',
      headerSub: 'Decisão do dia',
      ctaLabel: 'Adicionar treino',
      ctaIcon: Dumbbell,
      ctaClass: 'bg-primary text-primary-foreground hover:bg-primary/90',
      showCta: true,
      accentBorder: 'border-border',
      accentBg: 'bg-card',
      bannerClass: null,
      bannerText: null,
    },
    OPTIMAL_LOAD: {
      headerTitle: 'Hoje',
      headerSub: 'Carga útil atingida',
      ctaLabel: 'Adicionar treino',
      ctaIcon: Dumbbell,
      ctaClass: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      showCta: true,
      accentBorder: 'border-border',
      accentBg: 'bg-card',
      bannerClass: null,
      bannerText: null,
    },
    OVERLOAD: {
      headerTitle: 'Hoje',
      headerSub: 'Recuperação acima de execução',
      ctaLabel: 'Recuperação em foco',
      ctaIcon: Heart,
      ctaClass: 'bg-secondary text-muted-foreground border border-border',
      showCta: false,
      accentBorder: 'border-blue-500/20',
      accentBg: 'bg-card',
      bannerClass: 'border-zone-orange/30 bg-zone-orange/5 text-zone-orange',
      bannerText: 'Sua carga já chegou num ponto em que mais treino tende a render menos recuperação amanhã.',
      bannerIcon: Zap,
    },
    RECOVERY_DAY: {
      headerTitle: 'Hoje',
      headerSub: 'Dia de recuperação',
      ctaLabel: 'Recuperação em foco',
      ctaIcon: Moon,
      ctaClass: 'bg-secondary text-muted-foreground border border-border',
      showCta: false,
      accentBorder: 'border-blue-500/15',
      accentBg: 'bg-card',
      bannerClass: 'border-blue-500/25 bg-blue-500/5 text-blue-300',
      bannerText: 'Hoje o melhor retorno vem de reduzir estresse, recuperar energia e dormir bem.',
      bannerIcon: Moon,
    },
  };

  // Desacoplado: herói entra em descanso só se VOCÊ escolheu (botão/toggle).
  // Fase automática (carga/prontidão) vira só sugestão (banner), sem sequestrar a decisão.
  const userRest = intent === 'recovery';
  const phase = userRest ? 'RECOVERY_DAY' : 'PLANNING';
  const advisoryPhase = (!userRest && Phase) ? (dayPhase ?? 'PLANNING') : 'PLANNING';

  const phaseCfg = PHASE_CONFIG[phase] ?? PHASE_CONFIG.PLANNING;
  const advisoryCfg = PHASE_CONFIG[advisoryPhase] ?? PHASE_CONFIG.PLANNING;
  const bannerCfg = userRest ? phaseCfg : advisoryCfg;
  const CtaIcon = phaseCfg.ctaIcon;

  const isRestMode = userRest;

  const dailyVerdict = useMemo(() => {
    return getDailyVerdict({
      checkin: enrichedCheckin,
      analysis,
      phase,
      intent,
      locked,
      displayedScore,
      prescriptionScore,
      deepSleepPct: rawCheckin?.deep_sleep_pct ?? null,
      totalStrain,
      todaySessions,
    });
  }, [
    enrichedCheckin,
    analysis,
    phase,
    intent,
    locked,
    displayedScore,
    prescriptionScore,
    rawCheckin?.deep_sleep_pct,
    totalStrain,
    todaySessions,
  ]);

const heroDynamicContext = useMemo(() => {
    return getHeroDynamicContext({
      checkin: enrichedCheckin,
      analysis,
      dailyVerdict,
      todaySessions,
      isRestMode,
    });
  }, [enrichedCheckin, analysis, dailyVerdict, todaySessions, isRestMode]);


const scheduledSport = todaySessions[0]?.sport ?? undefined;

  const { primary: primaryCards, secondary: secondaryCards } = useMemo(() => {
    if (!enrichedCheckin) return { primary: [], secondary: [] };

    const layout = buildCardLayout({
      phase,
      workoutIntensity: dailyVerdict?.workoutIntensity ?? 'unknown',
      scheduledSport,
      hasWorkoutSessions: todaySessions.length > 0,
      hasAnalysis: !!analysis,
      hasHrvAnomaly: !!analysis?.hrvAnomaly || ['acute', 'sustained'].includes(analysis?.healthSignals?.state),
      hasNarrative: !!analysis?.narrative,
      hasRecoveryDemandAlert: (enrichedCheckin?.recovery_demand || 0) > morningRecovery,
    });

    // 'current_state' (CurrentStateCard "Estado do corpo agora") foi consolidado
    // no card "Leitura de hoje" do herói — não renderizar separado.
    const strip = (arr) => (arr || []).filter((d) => d?.id !== 'current_state');
    layout.primary = strip(layout.primary);
    layout.secondary = strip(layout.secondary);

    // Durante a calibração (sem recovery confiável) não exibimos cards que
    // PRESCREVEM a partir do score (treino, narrativa, "porquê", estado, demanda).
    // Mantemos só os honestos: sinais crus da manhã, meta de sono, sessões,
    // anomalia de HRV (tem gate próprio) e o CTA de pós-treino.
    if (isCalibrating) {
      const ALLOW = new Set([
        'execution',        // o card-herói (anéis + Calibrando) — NUNCA remover
        'morning_recovery', 'sleep_forecast', 'training_sessions',
        'hrv_anomaly', 'post_workout_cta',
      ]);
      const keep = (arr) => (arr || []).filter((d) => ALLOW.has(d?.id));
      return { primary: keep(layout.primary), secondary: keep(layout.secondary) };
    }

    return layout;
  }, [
    enrichedCheckin,
    phase,
    dailyVerdict?.workoutIntensity,
    scheduledSport,
    todaySessions.length,
    analysis,
    morningRecovery,
    isCalibrating,
  ]);

  const orderedPrimaryCards = useMemo(() => {
    if (!primaryCards?.length) return [];

    const priority = {
      execution: 0,
      workout: 1,
    };

    return [...primaryCards].sort((a, b) => {
      const pa = priority[a.id] ?? 99;
      const pb = priority[b.id] ?? 99;
      return pa - pb;
    });
  }, [primaryCards]);

function renderCard(desc) {
    if (!desc || desc.action === 'exclude') return null;

    const workoutProps = {
      checkin: enrichedCheckin,
      actionableRecs: Array.isArray(analysis?.actionableRecs) ? analysis.actionableRecs : [],
      strainTarget,
      currentStrain: cappedStrain,
      analysis,
      userPrefs: user?.preferences || {},
      todaySessions,
      allSessions: sortedSessions,
      dailyVerdict,
    };

    switch (desc.id) {
      case 'execution':
        return (
          <>
          <ExecutionCard
            key="execution"
            displayedScore={displayedScore} enrichedCheckin={enrichedCheckin}
            strainVsTarget={strainVsTarget} isRestMode={isRestMode} phase={phase}
            phaseCfg={phaseCfg} isCalibrating={isCalibrating} dailyVerdict={dailyVerdict}
            calibratingNightsLeft={calibratingNightsLeft} heroDynamicContext={heroDynamicContext}
            baselineTier={baselineTier} priorHrvNights={priorHrvNights}
            readinessFaixa={readinessFaixa} ringTrends={ringTrends}
            recoveryBaseline={recoveryBaseline} cappedStrain={cappedStrain}
            todaySessions={todaySessions} strainTarget={strainTarget} analysis={analysis}
            sortedCheckins={sortedCheckins} today={today} targetZoneLabel={targetZoneLabel}
            recoveryDrivers={recoveryDrivers}
            CAPACITY_PT={CAPACITY_PT} AUTONOMIC_PT={AUTONOMIC_PT}
            capacityContradictionNote={capacityContradictionNote}
            setShowAddModal={setShowAddModal} CtaIcon={CtaIcon}
          />
          <TodayReadingCard
            displayedScore={displayedScore} enrichedCheckin={enrichedCheckin}
            cappedStrain={cappedStrain} strainTarget={strainTarget}
            targetZoneLabel={targetZoneLabel} CAPACITY_PT={CAPACITY_PT}
            AUTONOMIC_PT={AUTONOMIC_PT} analysis={analysis}
            sortedCheckins={sortedCheckins} today={today}
            isCalibrating={isCalibrating}
          />
          </>
        );

      case 'workout': {
        // ZONA "Treino -> resposta do corpo" (decisao A da Etapa 3)
        // 1) Treino lancado hoje  -> pos-treino (WorkoutLoggedState)
        // 2) Senao, treino ontem  -> Impacto de ontem (resuminho + deltas no corpo)
        // 3) Senao                -> nada
        if (todaySessions.length > 0) {
          return (
            <section key="workout-wrapper" className="space-y-2">
              <p className="px-1 t-micro font-bold uppercase tracking-widest text-zone-green">
                Treino → resposta do corpo
              </p>
              <WorkoutLoggedState
                sessions={todaySessions}
                checkin={enrichedCheckin}
                analysis={analysis}
              />
            </section>
          );
        }

        const impactoOntem = (() => {
          const yDate = (() => {
            const d = new Date(today + 'T00:00:00');
            d.setDate(d.getDate() - 1);
            return d.toISOString().slice(0, 10);
          })();
          const yWorkout = sortedSessions
            .filter((x) => x.date === yDate)
            .sort((a, b) => (b.strain_score ?? 0) - (a.strain_score ?? 0))[0];
          if (!yWorkout) return null;

          const todayC = sortedCheckins[0];
          const yC = sortedCheckins[1];
          if (!todayC || !yC) return null;

          const parts = [];
          if (todayC.recovery_score != null && yC.recovery_score != null) {
            const d = Math.round(todayC.recovery_score - yC.recovery_score);
            parts.push({ k: 'Recovery', v: `${d >= 0 ? '+' : ''}${d}`, good: d >= 0 });
          }
          const tHrv = todayC.hrv ?? todayC.hrv_manual ?? null;
          const yHrv = yC.hrv ?? yC.hrv_manual ?? null;
          if (tHrv != null && yHrv != null && yHrv > 0) {
            const d = Math.round(((tHrv - yHrv) / yHrv) * 100);
            parts.push({ k: 'HRV', v: `${d >= 0 ? '+' : ''}${d}%`, good: d >= 0 });
          }
          if (todayC.sleep_hours != null && yC.sleep_hours != null) {
            const d = Math.round((todayC.sleep_hours - yC.sleep_hours) * 10) / 10;
            parts.push({ k: 'Sono', v: `${d >= 0 ? '+' : ''}${d}h`, good: d >= 0 });
          }
          if (!parts.length) return null;

          const resume = [
            yWorkout.sport,
            yWorkout.strain_score != null ? `Strain ${yWorkout.strain_score}` : null,
            yWorkout.heart_rate_avg ? `FC ${Math.round(yWorkout.heart_rate_avg)}` : null,
            yWorkout.training_effect_aerobic ? `Efeito ${yWorkout.training_effect_aerobic}` : null,
          ]
            .filter(Boolean)
            .join(' · ');

          return (
            <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-bold leading-tight">Impacto de ontem</p>
                  <p className="t-micro text-muted-foreground leading-tight mt-0.5">
                    {resume}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {parts.map((p) => (
                  <div
                    key={p.k}
                    className="rounded-xl bg-secondary/50 border border-border/40 px-2 py-2 text-center"
                  >
                    <p className="t-micro uppercase tracking-wider text-muted-foreground font-semibold">
                      {p.k}
                    </p>
                    <p
                      className={cn(
                        'text-base font-semibold font-mono leading-none mt-1',
                        p.good ? 'text-zone-green' : 'text-zone-amber'
                      )}
                    >
                      {p.v}
                    </p>
                  </div>
                ))}
              </div>
              <p className="t-micro text-muted-foreground/70 leading-relaxed">
                Como seu corpo respondeu hoje ao treino de ontem (vs. o dia anterior).
              </p>
            </div>
          );
        })();

        if (!impactoOntem) return null;

        return (
          <section key="workout-wrapper" className="space-y-2">
            <p className="px-1 t-micro font-bold uppercase tracking-widest text-primary">
              Treino → resposta do corpo
            </p>
            {impactoOntem}
          </section>
        );
      }

      case 'morning_recovery':
        return (
          <MorningRecoveryCard
            key="morning_recovery"
            checkin={enrichedCheckin}
            delta={recoveryDelta}
            recentCheckins={sortedCheckins.filter((c) => c.date !== today)}
          />
        );

      case 'sleep_forecast':
        return <SleepForecastCard key="sleep_forecast" checkin={enrichedCheckin} sleepDebt={analysis?.sleepDebt?.debt ?? 0} />;

      case 'training_sessions':
        return (
          <div
            key="training_sessions"
            className={cn('rounded-2xl border bg-card p-4', phaseCfg.accentBorder)}
          >
            <TrainingSessionsList
              checkin={enrichedCheckin}
              sessions={todaySessions}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.checkins(user?.email) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trainingSessions(user?.email) });
              }}
            />
          </div>
        );

      case 'narrative':
        return analysis?.narrative ? (
          <NarrativeCard key="narrative" narrative={analysis.narrative} />
        ) : null;

      case 'why_score':
        return analysis?.whyScore?.length > 0 ? (
          <WhyScoreCard
            key="why_score"
            whyScore={analysis.whyScore}
            recoveryScore={displayedScore}
          />
        ) : null;

      case 'hrv_anomaly':
        return (
          <HealthStatusCard
            key="hrv_anomaly"
            healthSignals={analysis?.healthSignals}
            variant="card"
          />
        );

      case 'recovery_demand':
        return (enrichedCheckin.recovery_demand || 0) > morningRecovery ? (
          <motion.div
            key="recovery_demand"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-zone-red/30 bg-zone-red/8 p-4 flex gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-zone-red shrink-0" />
            <div>
              <p className="text-sm font-semibold text-zone-red">
                Carga acima da recuperação disponível
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Demanda {enrichedCheckin.recovery_demand} vs recuperação da manhã {displayedScore}. Hoje vale proteger.
              </p>
            </div>
          </motion.div>
        ) : null;

      case 'post_workout_cta': {
  if (todaySessions.length === 0) return null;

  const hasPostWorkout =
    enrichedCheckin?.biocharge_post_workout > 0 ||
    enrichedCheckin?.delta_post != null ||
    String(enrichedCheckin?.notes || '').includes('[PÓS-TREINO]');

  
if (hasPostWorkout) {
  return null;
}


  return (
    <Link
      key="post_workout_cta"
      to="/checkin?mode=post"
      className="flex items-center justify-between p-4 rounded-2xl border border-primary/25 bg-primary/5 hover:bg-primary/10 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Flag className="w-5 h-5 text-primary shrink-0" />

        <div>
          <p className="text-sm font-semibold">
            Registrar pós-treino
          </p>

          <p className="text-xs text-muted-foreground">
            ~30s · RPE, energia e dor muscular para melhorar amanhã
          </p>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-primary shrink-0" />
    </Link>
  );
}

      default:
        return null;
    }
  }
 

const prefs = user?.preferences || {};
const missingSettings = [];
if (!prefs.birth_year) missingSettings.push('ano de nascimento');
if (!prefs.sex) missingSettings.push('sexo');
if (!prefs.height_cm) missingSettings.push('altura');
const settingsBanner = missingSettings.length > 0 ? (
  <Link
    to="/settings"
    className="block rounded-2xl border border-zone-amber/30 bg-zone-amber/10 p-4 hover:bg-zone-amber/15 transition-all"
  >
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-zone-amber/20 flex items-center justify-center shrink-0">
        <Settings className="w-4 h-4 text-zone-amber" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground/90">Complete suas configurações</p>
        <p className="t-micro text-muted-foreground leading-relaxed mt-0.5">
          Falta informar {missingSettings.join(', ')}. Necessário para Vitalidade, VO₂max e leituras honestas — toque para ajustar.
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-zone-amber/70 shrink-0 mt-1" />
    </div>
  </Link>
) : null;

if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (!enrichedCheckin) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto pt-2">
        {settingsBanner}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-[60vh] text-center px-6"
      >
        <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
          <Zap className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Sem check-in hoje</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Faça seu check-in para calcular seu recovery e decidir melhor o treino do dia.
        </p>
        <Link
          to="/checkin"
          className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-2xl font-semibold hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" /> Fazer check-in
        </Link>
      </motion.div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'space-y-4 max-w-2xl mx-auto transition-all duration-500',
        isSilentMode && 'opacity-90',
        isRestMode && 'saturate-[0.7]'
      )}
    >
      {settingsBanner}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="t-micro font-bold uppercase tracking-widest text-muted-foreground/70 mb-0.5">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Hoje</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{phaseCfg.headerSub}</p>

          {checkin?.created_at ? (
            <p className="t-micro text-muted-foreground flex items-center gap-1 mt-1">
              <span>Check-in às</span>
              <span className="font-medium text-foreground/60">
                {new Date(checkin.created_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </p>
          ) : checkin?.date ? (
            <p className="t-micro text-muted-foreground mt-1">Check-in de hoje registrado</p>
          ) : null}
        </div>

      </div>

      {bannerCfg.bannerText && (
        <motion.div
          key={advisoryPhase + (userRest ? '-rest' : '-adv')}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('rounded-2xl border px-4 py-3 text-xs font-medium flex items-start gap-2', bannerCfg.bannerClass)}
        >
          {bannerCfg.bannerIcon && <bannerCfg.bannerIcon className="w-4 h-4 shrink-0 mt-px" />}
          <span>{bannerCfg.bannerText}</span>
        </motion.div>
      )}

      <QuickIntentEdit />

      {deepSleepAlert && !deepSleepAlertDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-blue-500/25 bg-blue-500/8 px-4 py-3 flex items-start gap-3"
        >
          <Moon className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-200 flex-1 leading-relaxed">{deepSleepAlert}</p>
          <button
            onClick={() => setDeepSleepAlertDismissed(true)}
            className="text-blue-400/60 hover:text-blue-300 transition-colors shrink-0"
            aria-label="Fechar alerta"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      <LongevityOnboardingCard />
      
      {orderedPrimaryCards.map((desc) => desc == null ? null : (
        <React.Fragment key={desc.id}>{renderCard(desc)}</React.Fragment>
      ))}

      <FatLossCard checkins={sortedCheckins} />

           {/* (Removido) TomorrowHookCard: previsão templated + fadiga-retardada causal +
          gancho "volte amanhã". A meta de sono real fica no SleepForecastCard. */}


      {(analysis?.whyScore?.length > 0 || analysis?.narrative) && (
        <Link
          to="/insights"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 tap-target"
        >
          Quer entender o que está guiando seu recovery?
          <span className="text-primary font-medium">→ Ver padrões</span>
        </Link>
      )}

      <SecondaryMetrics count={
        secondaryCards.filter((d) => d.action !== 'exclude').length +
        (analysis?.healthSignals?.state === 'normal' ? 1 : 0)
      }>
        {secondaryCards.map((desc) => desc == null ? null : (
          <React.Fragment key={desc.id}>{renderCard(desc)}</React.Fragment>
        ))}
        <HealthStatusCard healthSignals={analysis?.healthSignals} variant="line" />
      </SecondaryMetrics>

      {analysisError && (
        <p className="t-micro text-zone-amber/80 px-1">
          Alguns insights avançados não foram carregados agora. Você ainda pode usar a recomendação principal do dia.
        </p>
      )}

      <AnimatePresence>
        {showAddModal && (
          <AddTrainingModal
            checkin={enrichedCheckin}
            existingSessions={todaySessions}
            onClose={() => setShowAddModal(false)}
            onAdded={() => {
              setShowAddModal(false);
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.checkins(user?.email) });
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trainingSessions(user?.email) });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
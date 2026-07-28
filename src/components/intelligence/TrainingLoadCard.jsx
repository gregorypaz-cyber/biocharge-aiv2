import { motion } from 'framer-motion';
import { Activity, Gauge, Moon } from 'lucide-react';

const RISK_CONFIG = {
  low: {
    label: 'Controlada',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/20',
    summary: 'Sua carga recente está dentro de uma faixa geralmente sustentável.',
  },
  moderate: {
    label: 'Atenção',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/5',
    border: 'border-yellow-500/20',
    summary: 'Sua carga recente está acima da zona mais confortável e pode começar a pesar na recuperação.',
  },
  high: {
    label: 'Alta',
    color: 'text-red-400',
    bg: 'bg-red-500/5',
    border: 'border-red-500/20',
    summary: 'Sua carga recente está num ponto em que fadiga e necessidade de proteção ficam mais prováveis.',
  },
};

function formatRatio(ratio) {
  if (ratio == null || Number.isNaN(ratio)) return '—';
  return Number(ratio).toFixed(2);
}

function getSleepDebtTone(debt) {
  if (debt > 5) return 'text-red-400';
  if (debt > 2) return 'text-yellow-400';
  return 'text-emerald-400';
}

export default function TrainingLoadCard({ trainingLoad, sleepDebt }) {
  if (!trainingLoad || trainingLoad.risk === 'insufficient_data' || trainingLoad.ratio == null) {
    return null;
  }

  const risk = RISK_CONFIG[trainingLoad.risk] || RISK_CONFIG.low;
  const debt = sleepDebt?.debt ?? 0;
  const avgSleep = sleepDebt?.avg ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="rounded-2xl border border-border/50 bg-card p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        <div>
          <p className="text-sm font-semibold">Carga recente</p>
          <p className="text-xs text-muted-foreground">
            Leitura técnica da relação entre volume recente e histórico.
          </p>
        </div>
      </div>

      {/* Main interpretation */}
      <div className={`rounded-xl border px-4 py-3 ${risk.bg} ${risk.border}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="t-micro uppercase tracking-wider text-muted-foreground mb-1">
              Interpretação atual
            </p>
            <p className={`text-sm font-semibold ${risk.color}`}>
              {risk.label}
            </p>
          </div>

          <div className="text-right">
            <p className="t-micro uppercase tracking-wider text-muted-foreground mb-1">
              Ratio A:C
            </p>
            <p className={`text-lg font-mono font-semibold ${risk.color}`}>
              {formatRatio(trainingLoad.ratio)}
            </p>
          </div>
        </div>

        <p className="text-xs text-foreground/85 leading-relaxed mt-3">
          {risk.summary}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-secondary/40 border border-border/40 p-3">
          <p className="t-micro uppercase tracking-wider text-muted-foreground mb-1">
            Últimos 7 dias
          </p>
          <p className="text-lg font-mono font-semibold">
            {trainingLoad.acute ?? '—'}
          </p>
          <p className="t-micro text-muted-foreground mt-1">
            carga aguda
          </p>
        </div>

        <div className="rounded-xl bg-secondary/40 border border-border/40 p-3">
          <p className="t-micro uppercase tracking-wider text-muted-foreground mb-1">
            Últimas 6 semanas
          </p>
          <p className="text-lg font-mono font-semibold">
            {trainingLoad.chronic ?? '—'}
          </p>
          <p className="t-micro text-muted-foreground mt-1">
            carga crônica
          </p>
        </div>

        <div className="rounded-xl bg-secondary/40 border border-border/40 p-3">
          <div className="flex items-center gap-1 mb-1">
            <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="t-micro uppercase tracking-wider text-muted-foreground">
              Status
            </p>
          </div>
          <p className={`text-sm font-semibold ${risk.color}`}>
            {risk.label}
          </p>
          <p className="t-micro text-muted-foreground mt-1">
            do momento
          </p>
        </div>
      </div>

      {/* Sleep debt link */}
      {debt > 0 && (
        <div className="rounded-xl bg-secondary/30 border border-border/30 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <Moon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="t-micro uppercase tracking-wider text-muted-foreground mb-1">
                Relação com o sono
              </p>
              <p className="text-xs text-foreground/85 leading-relaxed">
                Sua dívida de sono atual está em{' '}
                <span className={`font-mono font-semibold ${getSleepDebtTone(debt)}`}>
                  {debt.toFixed(1)}h
                </span>
                {avgSleep != null ? ` (média de ${avgSleep}h/noite)` : ''}. Isso pode amplificar o custo da carga recente.
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
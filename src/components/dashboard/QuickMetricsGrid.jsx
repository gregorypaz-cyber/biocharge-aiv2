import { motion } from 'framer-motion';
import { Moon, Heart, Zap, Dumbbell } from 'lucide-react';
import { parseLocalDate } from '@/lib/date-utils';

const ENERGY_EMOJIS = { 1: '😴', 2: '😐', 3: '🙂', 4: '😊', 5: '🔥' };
const ENERGY_LABELS = { 1: 'Esgotado', 2: 'Baixa', 3: 'Moderada', 4: 'Boa', 5: 'Alta' };

function MetricTile({ icon: Icon, iconColor, label, value, sub, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-border/60 bg-card p-4 flex flex-col gap-1.5"
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
        {label}
      </div>
      <p className="text-xl font-black font-mono" style={{ color: iconColor }}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}

export default function QuickMetricsGrid({ todayCheckin, lastSession }) {
  const sleepHours = todayCheckin?.sleep_hours;
  const sleepQuality = todayCheckin?.sleep_quality || todayCheckin?.mood;
  const hrv = todayCheckin?.hrv_manual || todayCheckin?.hrv;
  const energy = todayCheckin?.energy_level || todayCheckin?.energy;

  const sessionDate = lastSession?.date ? parseLocalDate(lastSession.date) : null;
  const sessionLabel = sessionDate
    ? sessionDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
    : '—';

  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricTile
        icon={Moon}
        iconColor="hsl(200,80%,55%)"
        label="Último sono"
        value={sleepHours ? `${sleepHours}h` : '—'}
        sub={sleepQuality ? `Qualidade ${sleepQuality}/5` : undefined}
        delay={0.05}
      />
      <MetricTile
        icon={Heart}
        iconColor="hsl(0,72%,60%)"
        label="Última HRV"
        value={hrv ? `${hrv}ms` : '—'}
        sub={hrv ? 'Manhã' : 'Sem dados'}
        delay={0.1}
      />
      <MetricTile
        icon={Zap}
        iconColor="hsl(45,93%,58%)"
        label="Energia hoje"
        value={energy ? `${ENERGY_EMOJIS[energy] || '—'} ${ENERGY_LABELS[energy] || ''}` : '—'}
        sub={energy ? `Nível ${energy}/5` : undefined}
        delay={0.15}
      />
      <MetricTile
        icon={Dumbbell}
        iconColor="hsl(280,65%,60%)"
        label="Último treino"
        value={lastSession?.sport || '—'}
        sub={lastSession ? sessionLabel : 'Nenhum registrado'}
        delay={0.2}
      />
    </div>
  );
}
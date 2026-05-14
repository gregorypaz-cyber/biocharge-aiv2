import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const tooltipStyle = {
  background: 'hsl(220,18%,9%)',
  border: '1px solid hsl(220,15%,16%)',
  borderRadius: '10px',
  fontSize: '11px',
  color: 'hsl(210,40%,90%)',
  padding: '6px 10px',
};

export default function MiniChart({ data, days = 14, showSleep = true, showFatigue = true }) {
  const chartData = [...data].reverse().slice(-days).map(c => ({
    date: c.date || '',
    readiness: c.readiness_score ?? c.recovery_score ?? null,
    sleep: c.sleep_quality ?? null,
    fatigue: c.fatigue_score ?? null,
  }));

  if (chartData.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div role="img" aria-label="Gráfico de tendência de prontidão, sono e fadiga" className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ bottom: 4 }}>
              <XAxis
                dataKey="date"
                tickFormatter={(d) => {
                  if (!d || d === 'auto') return '';
                  try {
                    const raw = String(d).slice(0, 10);
                    const dt = new Date(raw + 'T12:00:00');
                    if (isNaN(dt.getTime())) return '';
                    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                  } catch {
                    return '';
                  }
                }}
                tick={{ fontSize: 9, fill: 'hsl(210,20%,45%)' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
            <defs>
              <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142,70%,50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142,70%,50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(200,80%,55%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(200,80%,55%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fatigueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(45,93%,58%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(45,93%,58%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(215,15%,55%)' }} />
            <Area type="monotone" dataKey="readiness" stroke="hsl(142,70%,50%)" fill="url(#recGrad)" strokeWidth={2} dot={false} name="Prontidão" />
            {showSleep && (
              <Area type="monotone" dataKey="sleep" stroke="hsl(200,80%,55%)" fill="url(#sleepGrad)" strokeWidth={1.5} dot={false} name="Sono" />
            )}
            {showFatigue && (
              <Area type="monotone" dataKey="fatigue" stroke="hsl(45,93%,58%)" fill="url(#fatigueGrad)" strokeWidth={1.5} dot={false} name="Fadiga (desgaste)" />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full bg-[hsl(142,70%,50%)]" /> Prontidão
        </div>
        {showSleep && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-full bg-[hsl(200,80%,55%)]" /> Sono
          </div>
        )}
        {showFatigue && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-full bg-[hsl(45,93%,58%)]" /> Fadiga (desgaste)
          </div>
        )}
      </div>
      {showFatigue && (
        <p className="text-[10px] text-muted-foreground mt-1.5">Fadiga: valores altos = mais desgaste</p>
      )}
    </motion.div>
  );
}
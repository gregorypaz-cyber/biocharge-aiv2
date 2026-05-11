import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
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

export default function MiniChart({ data }) {
  const chartData = [...data].reverse().slice(-14).map(c => ({
    date: c.date ? format(new Date(c.date), 'dd/MM') : '',
    recovery: c.recovery_score,
    sleep: c.sleep_quality,
  }));

  if (chartData.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-border/60 bg-card p-5"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Prontidão — 14 dias</h3>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142,70%,50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142,70%,50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(200,80%,55%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(200,80%,55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(215,15%,55%)' }} />
            <Area type="monotone" dataKey="recovery" stroke="hsl(142,70%,50%)" fill="url(#recGrad)" strokeWidth={2} dot={false} name="Recovery" />
            <Area type="monotone" dataKey="sleep" stroke="hsl(200,80%,55%)" fill="url(#sleepGrad)" strokeWidth={1.5} dot={false} name="Sono" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full bg-[hsl(142,70%,50%)]" /> Prontidão
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full bg-[hsl(200,80%,55%)]" /> Sono
        </div>
      </div>
    </motion.div>
  );
}
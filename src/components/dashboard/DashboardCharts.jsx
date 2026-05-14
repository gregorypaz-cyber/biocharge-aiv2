import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function DashboardCharts({ data = [] }) {
  const chartData = [...data].reverse().slice(-7).map(d => ({
    date: d.date ? format(new Date(d.date), 'dd/MM') : '',
    recovery: d.recovery_score,
    sleep: d.sleep_score,
    fatigue: d.fatigue,
    hrv: d.hrv,
  }));

  if (chartData.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Tendência — Últimos 7 dias</h3>
      <div role="img" aria-label="Gráfico de evolução dos scores" className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 70%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 70%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="yellowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(45, 93%, 58%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(45, 93%, 58%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fill: 'hsl(215,15%,50%)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'hsl(215,15%,50%)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(220, 18%, 7%)',
                border: '1px solid hsl(220, 15%, 14%)',
                borderRadius: '12px',
                fontSize: '12px',
                color: 'hsl(210, 40%, 96%)',
              }}
            />
            <Area type="monotone" dataKey="recovery" stroke="hsl(142, 70%, 50%)" fill="url(#greenGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="sleep" stroke="hsl(45, 93%, 58%)" fill="url(#yellowGrad)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="fatigue" stroke="hsl(0, 72%, 55%)" strokeWidth={2} dot={false} strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-[hsl(142,70%,50%)] rounded" />
          <span className="text-muted-foreground">Recovery</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-[hsl(45,93%,58%)] rounded" />
          <span className="text-muted-foreground">Sono</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-[hsl(0,72%,55%)] rounded dashed" />
          <span className="text-muted-foreground">Fadiga</span>
        </div>
      </div>
    </motion.div>
  );
}
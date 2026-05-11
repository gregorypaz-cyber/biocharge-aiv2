import { motion } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer, Tooltip, Dot } from 'recharts';
import { calculateBioChargeScore, getBioChargeScoreInfo } from '@/lib/biocharge-utils';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.[0]) return null;
  const { date, score } = payload[0].payload;
  const info = getBioChargeScoreInfo(score);
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs">
      <p className="text-muted-foreground">{date}</p>
      <p className="font-black font-mono text-lg" style={{ color: info.color }}>{score}</p>
    </div>
  );
};

const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  const info = getBioChargeScoreInfo(payload.score);
  return <circle cx={cx} cy={cy} r={4} fill={info.color} stroke="hsl(220,18%,7%)" strokeWidth={2} />;
};

export default function ScoreChart({ checkins }) {
  if (!checkins || checkins.length < 2) return null;

  const data = [...checkins]
    .slice(0, 7)
    .reverse()
    .map(c => ({
      date: new Date(c.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }),
      score: calculateBioChargeScore(c, checkins),
    }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-2xl border border-border/60 bg-card p-5"
    >
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">BioCharge Score</p>
      <p className="text-[11px] text-muted-foreground mb-4">Últimos 7 dias</p>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="hsl(142,70%,50%)"
              strokeWidth={2.5}
              dot={<CustomDot />}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
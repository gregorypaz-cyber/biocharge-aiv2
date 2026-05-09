import { motion } from 'framer-motion';

export default function CircularGauge({ value = 0, max = 100, size = 160, strokeWidth = 10, color, label, sublabel }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);
  
  const gaugeColor = color || (pct >= 0.8 ? 'hsl(142, 70%, 50%)' : pct >= 0.6 ? 'hsl(45, 93%, 58%)' : 'hsl(0, 72%, 55%)');

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(220, 15%, 12%)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold text-foreground font-mono"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {Math.round(value)}
        </motion.span>
        {label && <span className="text-xs text-muted-foreground mt-1">{label}</span>}
      </div>
      {sublabel && <span className="text-xs text-muted-foreground mt-2">{sublabel}</span>}
    </div>
  );
}
import { motion } from 'framer-motion';
import { getZoneColor } from '@/lib/biocharge-utils';

export default function RecoveryRing({ value = 0, zone = 'yellow', size = 200, strokeWidth = 14 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / 100, 1);
  const offset = circumference * (1 - pct);
  const color = getZoneColor(zone);

  const glowId = `glow-${zone}-${size}`;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ filter: `drop-shadow(0 0 12px ${color}40)` }}>
        <defs>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(220,15%,10%)" strokeWidth={strokeWidth} />
        {/* Secondary ring */}
        <circle cx={size / 2} cy={size / 2} r={radius - strokeWidth - 4} fill="none" stroke="hsl(220,15%,8%)" strokeWidth={4} />
        {/* Main arc */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
          filter={`url(#${glowId})`}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6, type: 'spring' }}
          className="text-center"
        >
          <span className="block text-5xl font-black font-mono tracking-tight" style={{ color }}>
            {Math.round(value)}
          </span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Prontidão</span>
        </motion.div>
      </div>
    </div>
  );
}
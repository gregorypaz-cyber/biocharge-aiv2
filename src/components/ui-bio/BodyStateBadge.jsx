import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

const STATE_CONFIG = {
  Recovered:       { label: 'Recuperado',       color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   emoji: '💚' },
  Activated:       { label: 'Ativado',           color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  emoji: '⚡' },
  Balanced:        { label: 'Equilibrado',       color: '#14b8a6', bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.3)',  emoji: '⚖️' },
  Loaded:          { label: 'Carregado',         color: '#eab308', bg: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.3)',   emoji: '🔶' },
  Sympathetic_Load:{ label: 'Carga Simpática',   color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)',  emoji: '🌡️' },
  Fatigued:        { label: 'Fatigado',          color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   emoji: '😓' },
  Overreached:     { label: 'Sobrecarregado',    color: '#dc2626', bg: 'rgba(220,38,38,0.15)',   border: 'rgba(220,38,38,0.5)',   emoji: '🚨' },
};

export default function BodyStateBadge({ state, size = 'md', className }) {
  const config = STATE_CONFIG[state] || STATE_CONFIG.Balanced;
  const isAlert = state === 'Overreached';

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-3 py-1 gap-1.5',
    lg: 'text-sm px-4 py-1.5 gap-2',
  };

  return (
    <span
      className={cn('inline-flex items-center rounded-full font-semibold border', sizeClasses[size], className)}
      style={{ color: config.color, backgroundColor: config.bg, borderColor: config.border }}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
      {isAlert && <AlertTriangle className="w-3 h-3" />}
    </span>
  );
}

export { STATE_CONFIG };
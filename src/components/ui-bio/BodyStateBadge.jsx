import { cn } from '@/lib/utils';
import { AlertTriangle, Heart, Zap, Scale, Gauge, Thermometer, BatteryLow } from 'lucide-react';

// Emoji nunca em chrome (BRAND §5): o glifo de estado virou ícone Lucide.
// Cor/bg/border inalterados (o navegador normaliza o hex inline para rgb()).
const STATE_CONFIG = {
  Recovered:       { label: 'Recuperado',       color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   Icon: Heart },
  Activated:       { label: 'Ativado',           color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  Icon: Zap },
  Balanced:        { label: 'Equilibrado',       color: '#14b8a6', bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.3)',  Icon: Scale },
  Loaded:          { label: 'Carregado',         color: '#eab308', bg: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.3)',   Icon: Gauge },
  Sympathetic_Load:{ label: 'Carga Simpática',   color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)',  Icon: Thermometer },
  Fatigued:        { label: 'Fatigado',          color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   Icon: BatteryLow },
  Overreached:     { label: 'Sobrecarregado',    color: '#dc2626', bg: 'rgba(220,38,38,0.15)',   border: 'rgba(220,38,38,0.5)',   Icon: AlertTriangle },
};

export default function BodyStateBadge({ state, size = 'md', className }) {
  const config = STATE_CONFIG[state] || STATE_CONFIG.Balanced;
  const Icon = config.Icon;

  const sizeClasses = {
    sm: 't-micro px-2 py-0.5 gap-1',
    md: 'text-xs px-3 py-1 gap-1.5',
    lg: 'text-sm px-4 py-1.5 gap-2',
  };
  const iconClasses = { sm: 'w-3 h-3', md: 'w-3.5 h-3.5', lg: 'w-4 h-4' };

  return (
    <span
      className={cn('inline-flex items-center rounded-full font-semibold border', sizeClasses[size], className)}
      style={{ color: config.color, backgroundColor: config.bg, borderColor: config.border }}
    >
      <Icon className={cn(iconClasses[size], 'shrink-0')} />
      <span>{config.label}</span>
    </span>
  );
}

export { STATE_CONFIG };
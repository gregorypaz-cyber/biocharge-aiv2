import { cn } from '@/lib/utils';
import { ZoneDot } from './ZoneDot';

type Zone = 'green' | 'yellow' | 'red' | 'neutral';

interface ZoneBadgeProps {
  variant: Zone;
  label?: string;
  className?: string;
}

const variantText: Record<Zone, { text: string; color: string; bg: string; border: string }> = {
  green:   { text: 'Verde',     color: 'text-zone-green',   bg: 'bg-zone-green/12',   border: 'border-zone-green/20' },
  yellow:  { text: 'Amarelo',   color: 'text-zone-yellow',  bg: 'bg-zone-yellow/12',  border: 'border-zone-yellow/20' },
  red:     { text: 'Vermelho',  color: 'text-zone-red',     bg: 'bg-zone-red/12',     border: 'border-zone-red/20' },
  neutral: { text: 'Neutro',    color: 'text-muted-foreground', bg: 'bg-muted/40', border: 'border-border' },
};

/**
 * Pill de zona — substitui as ~10 implementações espalhadas.
 * Cor + texto: nunca apenas cor como único sinal (acessibilidade).
 */
export function ZoneBadge({ variant, label, className }: ZoneBadgeProps) {
  const { text, color, bg, border } = variantText[variant];
  const displayLabel = label ?? text;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5',
        'rounded-full border text-micro',
        bg, border, color,
        className,
      )}
    >
      <ZoneDot variant={variant} size={6} />
      {displayLabel}
    </span>
  );
}

import { cn } from '@/lib/utils';

type Zone = 'green' | 'yellow' | 'red' | 'neutral';

interface ZoneDotProps {
  variant: Zone;
  size?: number;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<Zone, { bg: string; label: string }> = {
  green:   { bg: 'bg-zone-green',   label: 'Verde' },
  yellow:  { bg: 'bg-zone-yellow',  label: 'Amarelo' },
  red:     { bg: 'bg-zone-red',     label: 'Vermelho' },
  neutral: { bg: 'bg-muted-foreground/40', label: 'Neutro' },
};

/**
 * Substitui 🟢🟡🔴 em toda UI.
 * Renderização CSS — sem inconsistência entre OS.
 * Cor nunca é o único sinal: sempre incluir aria-label.
 */
export function ZoneDot({ variant, size = 8, pulse = false, className }: ZoneDotProps) {
  const { bg, label } = variantStyles[variant];

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        'inline-block rounded-full shrink-0',
        bg,
        pulse && 'animate-pulse',
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}

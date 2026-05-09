import { cn } from '@/lib/utils';

const zoneStyles = {
  green: 'bg-[hsl(142,70%,50%)]/15 text-[hsl(142,70%,55%)] border-[hsl(142,70%,50%)]/30',
  yellow: 'bg-[hsl(45,93%,58%)]/15 text-[hsl(45,93%,63%)] border-[hsl(45,93%,58%)]/30',
  red: 'bg-[hsl(0,72%,55%)]/15 text-[hsl(0,72%,60%)] border-[hsl(0,72%,55%)]/30',
};

const zoneLabels = {
  green: 'Alta Recuperação',
  yellow: 'Moderado',
  red: 'Baixa Recuperação',
};

export default function StatusBadge({ zone, className }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border',
      zoneStyles[zone] || zoneStyles.yellow,
      className
    )}>
      <span className={cn(
        'w-2 h-2 rounded-full',
        zone === 'green' && 'bg-[hsl(142,70%,50%)]',
        zone === 'yellow' && 'bg-[hsl(45,93%,58%)]',
        zone === 'red' && 'bg-[hsl(0,72%,55%)]'
      )} />
      {zoneLabels[zone] || 'Indefinido'}
    </span>
  );
}
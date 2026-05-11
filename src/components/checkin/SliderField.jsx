import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export default function SliderField({ label, hint, value, onChange, min = 0, max = 100, step = 1, unit = '', icon: Icon }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
          <div>
            <span className="text-sm font-medium text-foreground">{label}</span>
            {hint && <p className="text-[10px] text-muted-foreground leading-tight">{hint}</p>}
          </div>
        </div>
        <span className="text-sm font-mono font-semibold text-primary">
          {value ?? '—'}{unit}
        </span>
      </div>
      <Slider
        value={[value ?? min]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
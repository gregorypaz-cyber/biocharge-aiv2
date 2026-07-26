import { Slider } from '@/components/ui/slider';

export default function SliderField({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  icon: Icon,
  lowLabel = null,
  midLabel = null,
  highLabel = null,
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground shrink-0" />}
          <div className="min-w-0">
            <span className="text-sm font-medium text-foreground">{label}</span>
            {hint && (
              <p className="t-micro text-muted-foreground leading-tight mt-0.5">
                {hint}
              </p>
            )}
          </div>
        </div>

        <span className="text-sm font-mono font-semibold text-primary shrink-0">
          {value ?? '—'}
          {unit}
        </span>
      </div>

      <div className="relative pt-1">
        {/* Zonas visuais */}
        <div className="absolute inset-x-0 top-[11px] h-1.5 rounded-full overflow-hidden pointer-events-none">
          <div className="grid grid-cols-3 h-full">
            <div className="bg-emerald-500/30" />
            <div className="bg-yellow-500/30" />
            <div className="bg-red-500/30" />
          </div>
        </div>

        <Slider
          value={[value ?? min]}
          onValueChange={([v]) => onChange(v)}
          min={min}
          max={max}
          step={step}
          className="w-full relative z-10"
        />
      </div>

      <div className="grid grid-cols-3 t-micro text-muted-foreground">
        <span className="text-left">{lowLabel || `${min}${unit}`}</span>
        <span className="text-center">{midLabel || ''}</span>
        <span className="text-right">{highLabel || `${max}${unit}`}</span>
      </div>
    </div>
  );
}
``
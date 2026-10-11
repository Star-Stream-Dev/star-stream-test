import { useRef, type PointerEvent } from 'react';
import { Slider } from '@/components/ui/slider';

interface ThemeColorWheelProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ThemeColorWheel({ label, value, onChange }: ThemeColorWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [hue, saturation, lightness] = value.split(' ').map(parseFloat);
  const angle = (hue - 90) * Math.PI / 180;

  const selectColor = (event: PointerEvent<HTMLDivElement>) => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    const bounds = wheel.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    const nextHue = Math.round((Math.atan2(y, x) * 180 / Math.PI + 450) % 360);
    const nextSaturation = Math.round(Math.min(100, Math.hypot(x, y) / (bounds.width / 2) * 100));
    onChange(`${nextHue} ${nextSaturation}% ${lightness}%`);
  };

  return (
    <div className="flex flex-col items-center gap-4 min-w-0">
      <div className="flex items-center justify-between w-full">
        <h4 className="font-medium text-foreground">{label}</h4>
        <span className="h-6 w-6 rounded-full border border-foreground/30 theme-color-sample" style={{ '--selected-color': value } as React.CSSProperties} />
      </div>
      <div
        ref={wheelRef}
        role="slider"
        tabIndex={0}
        aria-label={`${label} color wheel`}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={hue}
        aria-valuetext={`Hue ${hue}, saturation ${saturation} percent`}
        className="theme-color-wheel relative w-44 h-44 rounded-full touch-none cursor-crosshair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); selectColor(event); }}
        onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) selectColor(event); }}
        onKeyDown={(event) => {
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
            event.preventDefault();
            const nextHue = (hue + (event.key === 'ArrowRight' ? 3 : event.key === 'ArrowLeft' ? -3 : 0) + 360) % 360;
            const nextSat = Math.max(0, Math.min(100, saturation + (event.key === 'ArrowUp' ? 3 : event.key === 'ArrowDown' ? -3 : 0)));
            onChange(`${nextHue} ${nextSat}% ${lightness}%`);
          }
        }}
      >
        <span className="theme-wheel-handle absolute w-4 h-4 rounded-full pointer-events-none" style={{ left: `${50 + Math.cos(angle) * saturation * 0.46}%`, top: `${50 + Math.sin(angle) * saturation * 0.46}%` }} />
      </div>
      <div className="w-full space-y-3">
        <div className="flex justify-between text-xs text-muted-foreground"><span>Lightness</span><span>{lightness}%</span></div>
        <Slider aria-label={`${label} lightness`} value={[lightness]} min={20} max={80} step={1} onValueChange={([next]) => onChange(`${hue} ${saturation}% ${next}%`)} />
      </div>
    </div>
  );
}
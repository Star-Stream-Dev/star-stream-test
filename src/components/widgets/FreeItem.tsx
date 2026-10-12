import { useRef, type ReactNode } from 'react';

export interface FreeRect { x: number; y: number; w: number; h?: number } // px, viewport-relative

interface Props {
  rect: FreeRect;
  editing: boolean;
  onChange: (r: FreeRect) => void;
  onCommit: (r: FreeRect) => void;
  children: ReactNode;
  label?: string;
}

const MIN_W = 80;
const MIN_H = 40;

/** Rainmeter-style item: drag anywhere on screen, resize from the corner while editing. */
export const FreeItem = ({ rect, editing, onChange, onCommit, children, label }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef(rect);
  latest.current = rect;

  const start = (e: React.PointerEvent, mode: 'move' | 'resize') => {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const base = { x: box.left, y: box.top, w: box.width, h: box.height };
    const move = (ev: PointerEvent) => {
      ev.preventDefault();
      const vw = window.innerWidth, vh = window.innerHeight;
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      let next: FreeRect;
      if (mode === 'move') {
        next = {
          ...latest.current,
          x: Math.round(Math.max(0, Math.min(vw - Math.min(base.w, vw), base.x + dx))),
          y: Math.round(Math.max(0, Math.min(vh - 30, base.y + dy))),
        };
      } else {
        next = {
          ...latest.current,
          w: Math.round(Math.max(MIN_W, Math.min(vw - base.x, base.w + dx))),
          h: Math.round(Math.max(MIN_H, Math.min(vh - base.y, base.h + dy))),
        };
      }
      latest.current = next;
      onChange(next);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      onCommit(latest.current);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return (
    <div
      ref={ref}
      aria-label={label}
      onPointerDown={(e) => start(e, 'move')}
      style={{
        position: 'fixed',
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        pointerEvents: 'auto',
        touchAction: editing ? 'none' : undefined,
        cursor: editing ? 'move' : undefined,
      }}
      className={`rounded-2xl ${editing ? 'ring-2 ring-primary/60 ring-dashed select-none' : ''}`}
    >
      <div className={`w-full h-full overflow-auto ${editing ? 'pointer-events-none' : ''}`}>{children}</div>
      {editing && (
        <div
          role="slider"
          aria-label={`Resize ${label ?? 'item'}`}
          onPointerDown={(e) => start(e, 'resize')}
          className="absolute -right-2 -bottom-2 w-5 h-5 rounded-full bg-primary border-2 border-background cursor-nwse-resize"
        />
      )}
    </div>
  );
};

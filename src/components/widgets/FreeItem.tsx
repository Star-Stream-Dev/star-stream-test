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

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const MIN_W = 60;
const MIN_H = 30;

const HANDLES: { edge: Edge; cls: string; cursor: string }[] = [
  { edge: 'n', cls: 'left-4 right-4 -top-2 h-4', cursor: 'ns-resize' },
  { edge: 's', cls: 'left-4 right-4 -bottom-2 h-4', cursor: 'ns-resize' },
  { edge: 'e', cls: 'top-4 bottom-4 -right-2 w-4', cursor: 'ew-resize' },
  { edge: 'w', cls: 'top-4 bottom-4 -left-2 w-4', cursor: 'ew-resize' },
  { edge: 'nw', cls: '-left-3 -top-3 w-6 h-6', cursor: 'nwse-resize' },
  { edge: 'ne', cls: '-right-3 -top-3 w-6 h-6', cursor: 'nesw-resize' },
  { edge: 'sw', cls: '-left-3 -bottom-3 w-6 h-6', cursor: 'nesw-resize' },
  { edge: 'se', cls: '-right-3 -bottom-3 w-6 h-6', cursor: 'nwse-resize' },
];

/** Rainmeter-style item: drag anywhere, resize from any edge or corner while editing. */
export const FreeItem = ({ rect, editing, onChange, onCommit, children, label }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  const start = (e: React.PointerEvent, edge: Edge | 'move') => {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    // Base always comes from what's actually on screen, so nothing jumps or shrinks.
    const base = { x: box.left, y: box.top, w: box.width, h: box.height };
    const sx = e.clientX, sy = e.clientY;
    let latest: FreeRect = { x: base.x, y: base.y, w: base.w, h: rect.h };

    const move = (ev: PointerEvent) => {
      ev.preventDefault();
      const vw = window.innerWidth, vh = window.innerHeight;
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (edge === 'move') {
        latest = {
          x: Math.round(Math.max(-base.w + 40, Math.min(vw - 40, base.x + dx))),
          y: Math.round(Math.max(0, Math.min(vh - 30, base.y + dy))),
          w: base.w,
          h: rect.h,
        };
      } else {
        let { x, y, w, h } = base;
        if (edge.includes('e')) w = base.w + dx;
        if (edge.includes('s')) h = base.h + dy;
        if (edge.includes('w')) { w = base.w - dx; x = base.x + dx; }
        if (edge.includes('n')) { h = base.h - dy; y = base.y + dy; }
        if (w < MIN_W) { if (edge.includes('w')) x -= MIN_W - w; w = MIN_W; }
        if (h < MIN_H) { if (edge.includes('n')) y -= MIN_H - h; h = MIN_H; }
        const changesH = edge.includes('n') || edge.includes('s');
        latest = { x: Math.round(x), y: Math.round(Math.max(0, y)), w: Math.round(w), h: changesH ? Math.round(h) : rect.h };
      }
      onChange(latest);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      onCommit(latest);
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
      className={`rounded-2xl ${editing ? 'outline-dashed outline-2 outline-primary/70 select-none' : ''}`}
    >
      <div className={`w-full h-full overflow-hidden ${editing ? 'pointer-events-none' : ''}`}>{children}</div>
      {editing && HANDLES.map(hd => (
        <div
          key={hd.edge}
          aria-label={`Resize ${label ?? 'item'} ${hd.edge}`}
          onPointerDown={(e) => start(e, hd.edge)}
          style={{ cursor: hd.cursor, touchAction: 'none' }}
          className={`absolute ${hd.cls} ${hd.edge.length === 2 ? 'rounded-full bg-primary border-2 border-background' : ''}`}
        />
      ))}
    </div>
  );
};

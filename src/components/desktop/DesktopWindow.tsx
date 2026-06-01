import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react';
import type { DesktopTheme, DesktopWindow as WindowType } from './types';

interface DesktopWindowProps {
  window: WindowType;
  theme: DesktopTheme;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onFocus: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number, x?: number, y?: number) => void;
  children: React.ReactNode;
}

type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const MIN_W = 300;
const MIN_H = 200;

const EDGE_CURSORS: Record<ResizeEdge, string> = {
  n: 'cursor-n-resize', s: 'cursor-s-resize',
  e: 'cursor-e-resize', w: 'cursor-w-resize',
  ne: 'cursor-ne-resize', nw: 'cursor-nw-resize',
  se: 'cursor-se-resize', sw: 'cursor-sw-resize',
};

export function DesktopWindowComponent({
  window: win,
  theme,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onMove,
  onResize,
  children,
}: DesktopWindowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onFocus(win.id);
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - win.x, y: e.clientY - win.y };

    const handleMouseMove = (e: MouseEvent) => {
      onMove(win.id, e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [win.id, win.x, win.y, onFocus, onMove]);

  const handleResizeStart = useCallback((e: React.MouseEvent, edge: ResizeEdge) => {
    e.preventDefault();
    e.stopPropagation();
    onFocus(win.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = win.width;
    const startH = win.height;
    const startLeft = win.x;
    const startTop = win.y;

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      let newW = startW;
      let newH = startH;
      let newX = startLeft;
      let newY = startTop;

      if (edge.includes('e')) newW = Math.max(MIN_W, startW + dx);
      if (edge.includes('w')) {
        newW = Math.max(MIN_W, startW - dx);
        newX = startLeft + (startW - newW);
      }
      if (edge.includes('s')) newH = Math.max(MIN_H, startH + dy);
      if (edge.includes('n')) {
        newH = Math.max(MIN_H, startH - dy);
        newY = startTop + (startH - newH);
      }

      onResize(win.id, newW, newH, newX, newY);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [win.id, win.x, win.y, win.width, win.height, onFocus, onResize]);

  // Minimize animation state
  const [minimizeAnim, setMinimizeAnim] = useState<'idle' | 'minimizing' | 'restoring'>('idle');
  const prevMinimized = useRef(win.isMinimized);

  useEffect(() => {
    if (win.isMinimized && !prevMinimized.current) {
      setMinimizeAnim('minimizing');
      const t = setTimeout(() => setMinimizeAnim('idle'), 250);
      prevMinimized.current = true;
      return () => clearTimeout(t);
    }
    if (!win.isMinimized && prevMinimized.current) {
      setMinimizeAnim('restoring');
      const t = setTimeout(() => setMinimizeAnim('idle'), 250);
      prevMinimized.current = false;
      return () => clearTimeout(t);
    }
  }, [win.isMinimized]);

  const isHidden = win.isMinimized && minimizeAnim === 'idle';

  const minimizeStyle: React.CSSProperties = minimizeAnim === 'minimizing'
    ? { transform: 'scale(0.3) translateY(100%)', opacity: 0, transition: 'transform 0.25s ease-in, opacity 0.2s ease-in', pointerEvents: 'none' }
    : minimizeAnim === 'restoring'
    ? { animation: 'window-restore 0.25s ease-out forwards' }
    : isHidden
    ? { opacity: 0, pointerEvents: 'none', transform: 'translate(-99999px, -99999px)', transition: 'none' }
    : {};

  const style: React.CSSProperties = win.isMaximized
    ? { top: theme === 'macos' ? 28 : 0, left: 0, right: 0, bottom: theme === 'windows' ? 48 : 0, width: 'auto', height: 'auto', ...minimizeStyle }
    : { top: win.y, left: win.x, width: win.width, height: win.height, ...minimizeStyle };

  const resizeHandles = !win.isMaximized && (
    <>
      {/* Edges */}
      <div className={`absolute top-0 left-2 right-2 h-1 ${EDGE_CURSORS.n}`} onMouseDown={e => handleResizeStart(e, 'n')} />
      <div className={`absolute bottom-0 left-2 right-2 h-1 ${EDGE_CURSORS.s}`} onMouseDown={e => handleResizeStart(e, 's')} />
      <div className={`absolute left-0 top-2 bottom-2 w-1 ${EDGE_CURSORS.w}`} onMouseDown={e => handleResizeStart(e, 'w')} />
      <div className={`absolute right-0 top-2 bottom-2 w-1 ${EDGE_CURSORS.e}`} onMouseDown={e => handleResizeStart(e, 'e')} />
      {/* Corners */}
      <div className={`absolute top-0 left-0 w-3 h-3 ${EDGE_CURSORS.nw}`} onMouseDown={e => handleResizeStart(e, 'nw')} />
      <div className={`absolute top-0 right-0 w-3 h-3 ${EDGE_CURSORS.ne}`} onMouseDown={e => handleResizeStart(e, 'ne')} />
      <div className={`absolute bottom-0 left-0 w-3 h-3 ${EDGE_CURSORS.sw}`} onMouseDown={e => handleResizeStart(e, 'sw')} />
      <div className={`absolute bottom-0 right-0 w-3 h-3 ${EDGE_CURSORS.se}`} onMouseDown={e => handleResizeStart(e, 'se')} />
    </>
  );

  if (theme === 'macos') {
    const hideDefaultTitleBarMac = win.appId === 'code-editor';
    return (
      <div
        className="fixed rounded-xl overflow-visible shadow-2xl border border-white/10 flex flex-col"
        style={{ ...style, zIndex: win.zIndex }}
        onClick={() => onFocus(win.id)}
      >
        {resizeHandles}
        {!hideDefaultTitleBarMac && (
          <div
            className="h-8 bg-[hsl(220,15%,18%)] flex items-center px-3 gap-2 shrink-0 cursor-move select-none rounded-t-xl"
            onMouseDown={handleMouseDown}
          >
            <button onClick={(e) => { e.stopPropagation(); onClose(win.id); }} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400" />
            <button onClick={(e) => { e.stopPropagation(); onMinimize(win.id); }} className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400" />
            <button onClick={(e) => { e.stopPropagation(); onMaximize(win.id); }} className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400" />
            <span className="flex-1 text-center text-xs text-white/60 font-medium">{win.title}</span>
          </div>
        )}
        <div className={`flex-1 bg-[hsl(220,15%,10%)] overflow-auto ${hideDefaultTitleBarMac ? 'rounded-xl' : 'rounded-b-xl'}`}>{children}</div>
      </div>
    );
  }

  // Hide default title bar for code-editor (it has its own)
  const hideDefaultTitleBar = win.appId === 'code-editor';

  return (
    <div
      className="fixed rounded-lg overflow-visible shadow-2xl border border-white/10 flex flex-col"
      style={{ ...style, zIndex: win.zIndex }}
      onClick={() => onFocus(win.id)}
    >
      {resizeHandles}
      {!hideDefaultTitleBar && (
        <div
          className="h-8 bg-[hsl(220,15%,12%)] flex items-center px-3 shrink-0 cursor-move select-none rounded-t-lg"
          onMouseDown={handleMouseDown}
        >
          <span className="flex-1 text-xs text-foreground/80">{win.title}</span>
          <div className="flex items-center">
            <button onClick={(e) => { e.stopPropagation(); onMinimize(win.id); }} className="p-1.5 hover:bg-white/10 rounded-sm">
              <Minus className="w-3 h-3 text-muted-foreground" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onMaximize(win.id); }} className="p-1.5 hover:bg-white/10 rounded-sm">
              {win.isMaximized ? <Minimize2 className="w-3 h-3 text-muted-foreground" /> : <Maximize2 className="w-3 h-3 text-muted-foreground" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onClose(win.id); }} className="p-1.5 hover:bg-destructive rounded-sm">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}
      <div className={`flex-1 bg-[hsl(220,15%,8%)] overflow-auto ${hideDefaultTitleBar ? 'rounded-lg' : 'rounded-b-lg'}`}>{children}</div>
    </div>
  );
}

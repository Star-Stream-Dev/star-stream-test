export type WidgetType = 
  | 'clock'
  | 'welcome'
  | 'stats'
  | 'recent-games'
  | 'announcements'
  | 'messages'
  | 'activity'
  | 'text'
  | 'quick-links'
  | 'embed'
  | 'streak'
  | 'spacer';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title?: string;
  content?: string; // for text widgets
  colSpan?: 1 | 2 | 3 | 4; // grid columns
  visible: boolean;
  links?: { label: string; target: string }[]; // for quick-links
  url?: string; // for embed widgets
  height?: number; // for embed widgets (px)
  // Free-placement mode (aesthetic canvas): position on the home canvas
  x?: number; // left, % of canvas width
  y?: number; // top, px from canvas top
  w?: number; // width, % of canvas width
}

export const WIDGET_CATALOG: { type: WidgetType; label: string; icon: string; description: string; defaultColSpan: number }[] = [
  { type: 'clock', label: 'Clock', icon: '🕐', description: 'Shows current time and date', defaultColSpan: 2 },
  { type: 'welcome', label: 'Welcome Banner', icon: '👋', description: 'Greeting with username and role', defaultColSpan: 2 },
  { type: 'stats', label: 'Stats Grid', icon: '📊', description: 'Session time, total time, games played, streak', defaultColSpan: 4 },
  { type: 'recent-games', label: 'Recent Games', icon: '🎮', description: 'Shows recently played games', defaultColSpan: 2 },
  { type: 'announcements', label: 'Announcements', icon: '📢', description: 'Unread announcement count', defaultColSpan: 1 },
  { type: 'messages', label: 'Messages', icon: '💬', description: 'Unread direct messages', defaultColSpan: 2 },
  { type: 'activity', label: 'Activity', icon: '📅', description: 'Session count and avg. session length', defaultColSpan: 2 },
  { type: 'text', label: 'Text Box', icon: '📝', description: 'Custom text or notes', defaultColSpan: 2 },
  { type: 'quick-links', label: 'Quick Links', icon: '🔗', description: 'Custom navigation shortcuts', defaultColSpan: 2 },
  { type: 'embed', label: 'Embed Link', icon: '🌐', description: 'Embed any site or app by URL', defaultColSpan: 2 },
  { type: 'streak', label: 'Streak', icon: '🔥', description: 'Daily streak counter', defaultColSpan: 1 },
  { type: 'spacer', label: 'Spacer', icon: '⬜', description: 'Empty space for layout', defaultColSpan: 1 },
];


export const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'w-welcome', type: 'welcome', visible: true, colSpan: 2 },
  { id: 'w-clock', type: 'clock', visible: true, colSpan: 2 },
  { id: 'w-stats', type: 'stats', visible: true, colSpan: 4 },
  { id: 'w-recent-games', type: 'recent-games', visible: true, colSpan: 2 },
  { id: 'w-announcements', type: 'announcements', visible: true, colSpan: 1 },
  { id: 'w-streak', type: 'streak', visible: true, colSpan: 1 },
  { id: 'w-messages', type: 'messages', visible: true, colSpan: 2 },
  { id: 'w-activity', type: 'activity', visible: true, colSpan: 2 },
];

const LAYOUT_STORAGE_KEY = 'starstream_widget_layout';

export function loadLayout(userId: string): WidgetConfig[] {
  try {
    const saved = localStorage.getItem(`${LAYOUT_STORAGE_KEY}_${userId}`);
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_LAYOUT;
}

export function saveLayout(userId: string, layout: WidgetConfig[]) {
  localStorage.setItem(`${LAYOUT_STORAGE_KEY}_${userId}`, JSON.stringify(layout));
}

const FREE_MODE_KEY = 'starstream_widget_freemode';

export function loadFreeMode(userId: string): boolean {
  try {
    return localStorage.getItem(`${FREE_MODE_KEY}_${userId}`) === '1';
  } catch {
    return false;
  }
}

export function saveFreeMode(userId: string, enabled: boolean) {
  localStorage.setItem(`${FREE_MODE_KEY}_${userId}`, enabled ? '1' : '0');
}

/** Give every widget a sensible starting position for free-placement mode. */
export function seedFreePositions(layout: WidgetConfig[]): WidgetConfig[] {
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  return layout.map((w) => {
    if (w.x !== undefined && w.y !== undefined) return w;
    const width = Math.min(100, (w.colSpan || 1) * 25);
    if (x + width > 100) { x = 0; y += rowHeight + 16; rowHeight = 0; }
    const placed = { ...w, x, y, w: width };
    x += width;
    rowHeight = Math.max(rowHeight, w.type === 'embed' ? (w.height || 260) + 80 : 150);
    return placed;
  });
}

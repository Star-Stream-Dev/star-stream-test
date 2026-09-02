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

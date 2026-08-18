import { Monitor, Apple } from 'lucide-react';
import type { DesktopTheme } from './types';

interface SettingsAppProps {
  theme: DesktopTheme;
  onThemeChange: (theme: DesktopTheme) => void;
}

export function SettingsApp({ theme, onThemeChange }: SettingsAppProps) {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Star Stream Settings</h2>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Appearance</h3>
        <p className="text-xs text-muted-foreground">Choose your desktop environment style.</p>

        <div className="grid grid-cols-2 gap-4 mt-3">
          {/* Windows 11 */}
          <button
            onClick={() => onThemeChange('windows')}
            className={`p-4 rounded-xl border-2 transition-all ${
              theme === 'windows'
                ? 'border-primary bg-primary/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-full aspect-video rounded-lg bg-[hsl(220,20%,12%)] relative overflow-hidden">
                {/* Mini Windows preview */}
                <div className="absolute inset-x-0 bottom-0 h-3 bg-[hsl(220,20%,10%)] border-t border-white/10 flex items-center px-1">
                  <div className="w-2 h-2 rounded-sm bg-primary/50" />
                </div>
                <div className="absolute top-2 left-2 w-8 h-6 rounded-sm bg-white/10 border border-white/10" />
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-foreground" />
                <span className="text-sm font-medium text-foreground">Windows 11</span>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Bottom taskbar, rounded corners, Fluent design
              </p>
            </div>
          </button>

          {/* macOS */}
          <button
            onClick={() => onThemeChange('macos')}
            className={`p-4 rounded-xl border-2 transition-all ${
              theme === 'macos'
                ? 'border-primary bg-primary/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-full aspect-video rounded-lg bg-[hsl(220,20%,12%)] relative overflow-hidden">
                {/* Mini macOS preview */}
                <div className="absolute inset-x-0 top-0 h-2 bg-black/50 flex items-center px-1 gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-red-500" />
                  <div className="w-1 h-1 rounded-full bg-yellow-500" />
                  <div className="w-1 h-1 rounded-full bg-green-500" />
                </div>
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  <div className="w-3 h-3 rounded-md bg-white/10" />
                  <div className="w-3 h-3 rounded-md bg-white/10" />
                  <div className="w-3 h-3 rounded-md bg-white/10" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Apple className="w-4 h-4 text-foreground" />
                <span className="text-sm font-medium text-foreground">macOS</span>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Top menu bar, bottom dock, Aqua style
              </p>
            </div>
          </button>
        </div>
      </div>

      <div className="border-t border-white/10 pt-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">About</h3>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Star Stream v2.0</p>
          <p>Desktop Environment powered by React</p>
          <p>Inspired by NautilusOS — thank you for the inspiration!</p>
          <p className="text-primary">Created by p0tato and Dannygo ☀</p>
        </div>
      </div>
    </div>
  );
}

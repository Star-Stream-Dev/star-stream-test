import type { LucideIcon } from 'lucide-react';
import { LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DockItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface FloatingDockProps {
  items: DockItem[];
  activeSection: string;
  menuOpen: boolean;
  onNavigate: (id: string) => void;
  onMore: () => void;
}

export function FloatingDock({ items, activeSection, menuOpen, onNavigate, onMore }: FloatingDockProps) {
  return (
    <div className="floating-dock-zone" data-open={menuOpen || undefined}>
      <span className="floating-dock-handle" aria-hidden="true" />
      <nav aria-label="Main navigation" className="floating-dock flex items-center gap-0.5 p-1.5 border border-border/50 bg-card/90 backdrop-blur-xl rounded-full">
        {items.map(item => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={item.label}
                aria-current={activeSection === item.id ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
                className={`tutorial-${item.id}-nav dock-icon shrink-0 ${activeSection === item.id ? 'text-primary bg-primary/15' : 'text-muted-foreground hover:text-foreground'}`}>
                <item.icon className="!w-[18px] !h-[18px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{item.label}</TooltipContent>
          </Tooltip>
        ))}
        <span className="w-px h-5 bg-border/60 mx-1 shrink-0" aria-hidden="true" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More" aria-expanded={menuOpen} aria-controls="app-menu"
              onClick={onMore} className={`tutorial-sidebar-trigger dock-icon shrink-0 ${menuOpen || !items.some(item => item.id === activeSection) ? 'text-primary bg-primary/15' : 'text-muted-foreground hover:text-foreground'}`}>
              <LayoutGrid className="!w-[18px] !h-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">More</TooltipContent>
        </Tooltip>
      </nav>
    </div>
  );
}
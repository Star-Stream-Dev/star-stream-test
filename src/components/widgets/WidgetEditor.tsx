import { useState } from 'react';
import { X, Plus, GripVertical, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw, Save, Columns, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WidgetConfig } from './widgetTypes';
import { WIDGET_CATALOG, DEFAULT_LAYOUT } from './widgetTypes';

interface WidgetEditorProps {
  layout: WidgetConfig[];
  onChange: (layout: WidgetConfig[]) => void;
  onClose: () => void;
  onSave: () => void;
}

export function WidgetEditor({ layout, onChange, onClose, onSave }: WidgetEditorProps) {
  const [editingWidget, setEditingWidget] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);

  const moveWidget = (index: number, direction: -1 | 1) => {
    const newLayout = [...layout];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newLayout.length) return;
    [newLayout[index], newLayout[targetIndex]] = [newLayout[targetIndex], newLayout[index]];
    onChange(newLayout);
  };

  const removeWidget = (id: string) => {
    onChange(layout.filter(w => w.id !== id));
  };

  const toggleVisibility = (id: string) => {
    onChange(layout.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  };

  const updateWidget = (id: string, updates: Partial<WidgetConfig>) => {
    onChange(layout.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const addWidget = (type: string) => {
    const catalog = WIDGET_CATALOG.find(c => c.type === type);
    if (!catalog) return;
    const newWidget: WidgetConfig = {
      id: `w-${type}-${Date.now()}`,
      type: catalog.type,
      visible: true,
      colSpan: catalog.defaultColSpan as 1 | 2 | 3 | 4,
      title: type === 'text' ? 'My Note' : type === 'embed' ? 'My Embed' : undefined,
      content: type === 'text' ? 'Edit this text...' : undefined,
      links: type === 'quick-links' ? [{ label: '🎮 Games', target: 'games' }] : undefined,
      url: type === 'embed' ? '' : undefined,
      height: type === 'embed' ? 260 : undefined,

    };
    onChange([...layout, newWidget]);
    setShowCatalog(false);
  };

  const resetLayout = () => {
    onChange(DEFAULT_LAYOUT);
  };

  const handleSave = () => {
    onSave();
    onClose();
  };

  const editingItem = editingWidget ? layout.find(w => w.id === editingWidget) : null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">🛠️ Widget Editor</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetLayout} className="text-muted-foreground">
              <RotateCcw className="w-4 h-4 mr-1" /> Reset
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" /> Save
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {/* Widget list */}
            {layout.map((widget, index) => {
              const catalog = WIDGET_CATALOG.find(c => c.type === widget.type);
              return (
                <div
                  key={widget.id}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                    widget.visible ? 'bg-primary/5 border-primary/15' : 'bg-muted/30 border-border/50 opacity-60'
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  
                  <span className="text-lg flex-shrink-0">{catalog?.icon || '?'}</span>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {widget.title || catalog?.label || widget.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {widget.colSpan} col{(widget.colSpan || 1) > 1 ? 's' : ''} • {catalog?.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Column span selector */}
                    <select
                      value={widget.colSpan || 1}
                      onChange={(e) => updateWidget(widget.id, { colSpan: parseInt(e.target.value) as 1 | 2 | 3 | 4 })}
                      className="h-8 w-16 rounded-md border border-input bg-background text-xs px-1"
                    >
                      <option value={1}>1 col</option>
                      <option value={2}>2 col</option>
                      <option value={3}>3 col</option>
                      <option value={4}>4 col</option>
                    </select>

                    {/* Edit button for text/quick-links */}
                    {(widget.type === 'text' || widget.type === 'quick-links' || widget.type === 'embed') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingWidget(editingWidget === widget.id ? null : widget.id)}
                      >
                        <Type className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveWidget(index, -1)} disabled={index === 0}>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveWidget(index, 1)} disabled={index === layout.length - 1}>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleVisibility(widget.id)}>
                      {widget.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeWidget(widget.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Inline edit panel */}
            {editingItem && (editingItem.type === 'text') && (
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Edit Text Widget</h3>
                <Input
                  value={editingItem.title || ''}
                  onChange={(e) => updateWidget(editingItem.id, { title: e.target.value })}
                  placeholder="Widget title"
                  className="text-sm"
                />
                <Textarea
                  value={editingItem.content || ''}
                  onChange={(e) => updateWidget(editingItem.id, { content: e.target.value })}
                  placeholder="Write your text here..."
                  rows={4}
                  className="text-sm"
                />
              </div>
            )}

            {editingItem && editingItem.type === 'embed' && (
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Edit Embed Widget</h3>
                <Input
                  value={editingItem.title || ''}
                  onChange={(e) => updateWidget(editingItem.id, { title: e.target.value })}
                  placeholder="Title (e.g. My Dashboard)"
                  className="text-sm"
                />
                <Input
                  value={editingItem.url || ''}
                  onChange={(e) => updateWidget(editingItem.id, { url: e.target.value })}
                  placeholder="https://example.com"
                  className="text-sm"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Height</span>
                  <Input
                    type="number"
                    min={120}
                    max={900}
                    value={editingItem.height ?? 260}
                    onChange={(e) => updateWidget(editingItem.id, { height: Math.max(120, Math.min(900, parseInt(e.target.value) || 260)) })}
                    className="text-sm w-28"
                  />
                  <span className="text-xs text-muted-foreground">px</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Some sites (Google, YouTube watch pages) block embedding. Use share/embed URLs when available.
                </p>
              </div>
            )}


            {editingItem && (editingItem.type === 'quick-links') && (
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Edit Quick Links</h3>
                {(editingItem.links || []).map((link, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={link.label}
                      onChange={(e) => {
                        const newLinks = [...(editingItem.links || [])];
                        newLinks[i] = { ...newLinks[i], label: e.target.value };
                        updateWidget(editingItem.id, { links: newLinks });
                      }}
                      placeholder="Label (e.g. 🎮 Games)"
                      className="text-sm flex-1"
                    />
                    <select
                      value={link.target}
                      onChange={(e) => {
                        const newLinks = [...(editingItem.links || [])];
                        newLinks[i] = { ...newLinks[i], target: e.target.value };
                        updateWidget(editingItem.id, { links: newLinks });
                      }}
                      className="h-10 rounded-md border border-input bg-background text-sm px-2 w-36"
                    >
                      <option value="games">Games</option>
                      <option value="chatroom">Chatroom</option>
                      <option value="announcements">Announcements</option>
                      <option value="music">Music</option>
                      <option value="youtube">YouTube</option>
                      <option value="proxy">Proxy</option>
                      <option value="settings">Settings</option>
                      <option value="bugs">Bugs</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => {
                        const newLinks = (editingItem.links || []).filter((_, idx) => idx !== i);
                        updateWidget(editingItem.id, { links: newLinks });
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newLinks = [...(editingItem.links || []), { label: 'New Link', target: 'games' }];
                    updateWidget(editingItem.id, { links: newLinks });
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Link
                </Button>
              </div>
            )}

            {/* Add widget section */}
            {showCatalog ? (
              <div className="p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">Add Widget</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowCatalog(false)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {WIDGET_CATALOG.map(item => (
                    <button
                      key={item.type}
                      onClick={() => addWidget(item.type)}
                      className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
                    >
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCatalog(true)}
                className="w-full p-4 rounded-xl border border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add Widget</span>
              </button>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

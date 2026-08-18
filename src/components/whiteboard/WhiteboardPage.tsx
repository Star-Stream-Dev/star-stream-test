import { useState } from 'react';
import { Paintbrush, Users, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommunityWhiteboard } from './CommunityWhiteboard';
import { RoomWhiteboard } from './RoomWhiteboard';

export const WhiteboardPage = () => {
  const [mode, setMode] = useState<'select' | 'community' | 'room'>('select');

  if (mode === 'community') {
    return (
      <div className="h-[calc(100vh-80px)] flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30">
          <Button variant="ghost" size="sm" onClick={() => setMode('select')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Paintbrush className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Community Whiteboard</span>
        </div>
        <div className="flex-1 min-h-0">
          <CommunityWhiteboard />
        </div>
      </div>
    );
  }

  if (mode === 'room') {
    return (
      <div className="h-[calc(100vh-80px)] flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30">
          <Button variant="ghost" size="sm" onClick={() => setMode('select')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Lock className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Private Room</span>
        </div>
        <div className="flex-1 min-h-0">
          <RoomWhiteboard />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-8 p-8">
      <div className="text-center">
        <Paintbrush className="w-16 h-16 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-foreground mb-2">Whiteboard</h1>
        <p className="text-muted-foreground max-w-md">
          Draw, sketch, and collaborate in real-time with others.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Community */}
        <button
          onClick={() => setMode('community')}
          className="group rounded-2xl p-6 border border-border/30 bg-muted/10 hover:bg-primary/10 hover:border-primary/30 transition-all text-left"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-colors">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Community</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            A shared whiteboard for everyone in Star Stream. Each user gets a unique assigned color so you can see who drew what.
          </p>
        </button>

        {/* Private Room */}
        <button
          onClick={() => setMode('room')}
          className="group rounded-2xl p-6 border border-border/30 bg-muted/10 hover:bg-primary/10 hover:border-primary/30 transition-all text-left"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-colors">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Private Room</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Create a private room with a shareable code. Only people with the code can join and draw together.
          </p>
        </button>
      </div>
    </div>
  );
};

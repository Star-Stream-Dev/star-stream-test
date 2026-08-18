import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface TerminalProps {
  onExit: () => void;
}

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
}

const HELP_TEXT = `
Available Commands:
───────────────────────────────────
  help          Show this help menu
  clear         Clear the terminal
  whoami        Display current user info
  users         List all registered users
  uptime        Show session uptime
  version       Show Star Stream version
  sysinfo       Display system information
  games         List available games
  announce      Show latest announcements
  date          Show current date & time
  echo [text]   Print text to terminal
  ping          Test connection latency
  neofetch      Display system info (styled)
  history       Show command history
  exit          Exit Developer Mode
───────────────────────────────────
`;

export function SolarTerminal({ onExit }: TerminalProps) {
  const { user, isAdmin } = useAuth();
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'system', text: '╔══════════════════════════════════════════╗' },
    { type: 'system', text: '║       Star Stream Developer Terminal     ║' },
    { type: 'system', text: '║            Version 3.0                   ║' },
    { type: 'system', text: '╚══════════════════════════════════════════╝' },
    { type: 'output', text: '' },
    { type: 'output', text: `Welcome, ${user?.username || 'user'}! Type "help" for available commands.` },
    { type: 'output', text: '' },
  ]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [sessionStart] = useState(Date.now());
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addLines = useCallback((newLines: TerminalLine[]) => {
    setLines(prev => [...prev, ...newLines]);
  }, []);

  const formatUptime = () => {
    const elapsed = Date.now() - sessionStart;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const handleCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);

    addLines([{ type: 'input', text: `${user?.username || 'user'}@starstream:~$ ${trimmed}` }]);

    const [command, ...args] = trimmed.toLowerCase().split(' ');

    switch (command) {
      case 'help':
        addLines(HELP_TEXT.split('\n').map(line => ({ type: 'output' as const, text: line })));
        break;

      case 'clear':
        setLines([]);
        break;

      case 'whoami':
        addLines([
          { type: 'output', text: `Username: ${user?.username}` },
          { type: 'output', text: `User ID:  ${user?.id}` },
          { type: 'output', text: `Role:     ${user?.role || 'user'}` },
          { type: 'output', text: `Admin:    ${isAdmin ? 'Yes' : 'No'}` },
        ]);
        break;

      case 'users': {
        try {
          const { data } = await supabase.rpc('get_all_app_users');
          if (data && data.length > 0) {
            addLines([
              { type: 'output', text: 'Registered Users:' },
              { type: 'output', text: '─'.repeat(40) },
              ...data.map((u: any) => ({ type: 'output' as const, text: `  ${u.username}` })),
              { type: 'output', text: `\nTotal: ${data.length} users` },
            ]);
          } else {
            addLines([{ type: 'output', text: 'No users found.' }]);
          }
        } catch {
          addLines([{ type: 'error', text: 'Error fetching users.' }]);
        }
        break;
      }

      case 'uptime':
        addLines([{ type: 'output', text: `Session uptime: ${formatUptime()}` }]);
        break;

      case 'version':
        addLines([
          { type: 'output', text: 'Star Stream v2.0' },
          { type: 'output', text: 'Built with React + TypeScript + Vite' },
          { type: 'output', text: 'Created by p0tato and Dannygo' },
        ]);
        break;

      case 'sysinfo':
        addLines([
          { type: 'output', text: '┌─ System Information ─────────────────┐' },
          { type: 'output', text: `│  OS:        Star Stream              │` },
          { type: 'output', text: `│  Version:   2.0                      │` },
          { type: 'output', text: `│  Browser:   ${navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Unknown'}` },
          { type: 'output', text: `│  Platform:  ${navigator.platform}` },
          { type: 'output', text: `│  Language:  ${navigator.language}` },
          { type: 'output', text: `│  Uptime:    ${formatUptime()}` },
          { type: 'output', text: `│  Memory:    ${(navigator as any).deviceMemory ? (navigator as any).deviceMemory + ' GB' : 'N/A'}` },
          { type: 'output', text: '└──────────────────────────────────────┘' },
        ]);
        break;

      case 'games': {
        try {
          const { data } = await supabase.from('games').select('title, category').order('title');
          if (data && data.length > 0) {
            addLines([
              { type: 'output', text: 'Available Games:' },
              { type: 'output', text: '─'.repeat(40) },
              ...data.map((g: any) => ({ type: 'output' as const, text: `  [${g.category}] ${g.title}` })),
              { type: 'output', text: `\nTotal: ${data.length} games` },
            ]);
          } else {
            addLines([{ type: 'output', text: 'No games found.' }]);
          }
        } catch {
          addLines([{ type: 'error', text: 'Error fetching games.' }]);
        }
        break;
      }

      case 'announce': {
        try {
          const { data } = await supabase.from('announcements').select('title, content').order('created_at', { ascending: false }).limit(3);
          if (data && data.length > 0) {
            const announceLines: TerminalLine[] = [
              { type: 'output', text: 'Latest Announcements:' },
              { type: 'output', text: '─'.repeat(40) },
            ];
            data.forEach((a: any) => {
              announceLines.push({ type: 'output', text: `  ★ ${a.title}` });
              announceLines.push({ type: 'output', text: `    ${a.content.substring(0, 80)}${a.content.length > 80 ? '...' : ''}` });
              announceLines.push({ type: 'output', text: '' });
            });
            addLines(announceLines);
          } else {
            addLines([{ type: 'output', text: 'No announcements found.' }]);
          }
        } catch {
          addLines([{ type: 'error', text: 'Error fetching announcements.' }]);
        }
        break;
      }

      case 'date':
        addLines([{ type: 'output', text: new Date().toString() }]);
        break;

      case 'echo':
        addLines([{ type: 'output', text: args.join(' ') || '' }]);
        break;

      case 'ping':
        addLines([{ type: 'output', text: 'Pinging starstream servers...' }]);
        setTimeout(() => {
          const latency = Math.floor(Math.random() * 50 + 10);
          addLines([{ type: 'output', text: `Reply from starstream: time=${latency}ms` }]);
        }, 500);
        break;

      case 'neofetch':
        addLines([
          { type: 'output', text: '' },
          { type: 'output', text: '    ╭──────────╮     ' + `${user?.username}@starstream` },
          { type: 'output', text: '    │  ☀  ☀  ☀ │     ─────────────────' },
          { type: 'output', text: '    │    ☀☀    │     OS:      Star Stream v2.0' },
          { type: 'output', text: '    │  ☀    ☀  │     Host:    Web Browser' },
          { type: 'output', text: '    │    ☀☀    │     Kernel:  React 18.3' },
          { type: 'output', text: '    │  ☀  ☀  ☀ │     Shell:   SolarTerminal' },
          { type: 'output', text: '    ╰──────────╯     Role:    ' + (user?.role || 'user') },
          { type: 'output', text: '                     Uptime:  ' + formatUptime() },
          { type: 'output', text: '' },
        ]);
        break;

      case 'history':
        if (commandHistory.length === 0) {
          addLines([{ type: 'output', text: 'No command history.' }]);
        } else {
          addLines(commandHistory.map((c, i) => ({ type: 'output' as const, text: `  ${i + 1}  ${c}` })));
        }
        break;

      case 'exit':
        onExit();
        break;

      default:
        addLines([{ type: 'error', text: `Command not found: ${command}. Type "help" for available commands.` }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[400] bg-[hsl(220,20%,8%)] flex flex-col font-mono cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[hsl(220,20%,12%)] border-b border-primary/20">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="text-xs text-muted-foreground">Star Stream Terminal — Developer Mode</span>
        <button onClick={onExit} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          [EXIT]
        </button>
      </div>

      {/* Terminal output */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--primary)) transparent' }}
      >
        {lines.map((line, i) => (
          <div key={i} className={
            line.type === 'input' ? 'text-primary' :
            line.type === 'error' ? 'text-destructive' :
            line.type === 'system' ? 'text-primary font-bold' :
            'text-muted-foreground'
          }>
            {line.text || '\u00A0'}
          </div>
        ))}

        {/* Input line */}
        <div className="flex items-center gap-0">
          <span className="text-primary shrink-0">{user?.username || 'user'}@starstream:~$ </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-foreground caret-primary"
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}

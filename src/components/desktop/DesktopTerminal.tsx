import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { FileSystemNode } from './types';
import { handleGitCommand, handleAsyncGitCommand, isAsyncGitCommand } from './terminalGit';

interface DesktopTerminalProps {
  fileSystem: Record<string, FileSystemNode>;
  onFileSystemChange: (fs: Record<string, FileSystemNode>) => void;
}

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system' | 'ascii';
  text: string;
}

const PARROT_FRAMES = [
  `    \\o/
     |
    / \\`,
  `   _o_
    /|\\
    / \\`,
  `    o
   /|\\
   | |`,
];

const HELP_TEXT = `Available Commands:
═══════════════════════════════════
  help              Show this help menu
  clear / cls       Clear the terminal
  whoami            Display current user info
  users             List all registered users
  uptime            Show session uptime
  version           Show Star Stream version
  sysinfo           Display system information
  neofetch          Display system info (styled)
  games             List available games
  announce          Show latest announcements
  date              Show current date & time
  echo [text]       Print text to terminal
  ping [host]       Test connection latency
  history           Show command history
  
  --- File System ---
  ls / dir          List directory contents
  cd [path]         Change directory
  pwd               Print working directory
  cat [file]        Display file contents
  mkdir [name]      Create a directory
  touch [name]      Create an empty file
  rm [name]         Remove a file or directory
  
  --- Network ---
  curl parrot.live  Party parrot animation
  curl [url]        Fetch URL content
  wget [url]        Download URL content
  ifconfig          Show network info
  
  --- Git ---
  git init          Initialize a git repository
  git status        Show working tree status
  git add [file]    Stage files (use . for all)
  git commit -m ""  Commit staged changes
  git log           Show commit history
  git branch        List/create branches
  git checkout      Switch branches
  git diff          Show file differences
  git remote        Manage remotes
  git push/pull     Simulate push/pull
  git clone [url]   Clone a repository
  
  --- Misc ---
  cowsay [text]     ASCII cow says text
  fortune           Random fortune
  matrix            Matrix rain effect
  exit              Exit terminal
═══════════════════════════════════`;

const FORTUNES = [
  "The best way to predict the future is to create it.",
  "Code is like humor. When you have to explain it, it's bad.",
  "First, solve the problem. Then, write the code.",
  "Any sufficiently advanced bug is indistinguishable from a feature.",
  "It works on my machine. ¯\\_(ツ)_/¯",
  "There are only 10 types of people: those who understand binary and those who don't.",
  "The only way to learn a new programming language is by writing programs in it.",
  "Talk is cheap. Show me the code.",
];

export function DesktopTerminal({ fileSystem, onFileSystemChange }: DesktopTerminalProps) {
  const { user, isAdmin } = useAuth();
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'ascii', text: '  /$$$$$$  /$$$$$$  /$$        /$$$$$$  /$$$$$$$  /$$   /$$  /$$$$$$  /$$    /$$ /$$$$$$' },
    { type: 'ascii', text: ' /$$__  $$/$$__  $$| $$       /$$__  $$| $$__  $$| $$$ | $$ /$$__  $$| $$   | $$|____  $$' },
    { type: 'ascii', text: '| $$  \\__/ $$  \\ $$| $$      | $$  \\ $$| $$  \\ $$| $$$$| $$| $$  \\ $$| $$   | $$  /$$$$$$$' },
    { type: 'ascii', text: '|  $$$$$$ | $$  | $$| $$      | $$$$$$$$| $$$$$$$/| $$ $$ $$| $$  | $$|  $$ /$$/  /$$__  $$' },
    { type: 'ascii', text: ' \\____  $$| $$  | $$| $$      | $$__  $$| $$__  $$| $$  $$$$| $$  | $$ \\  $$$$/  | $$  \\ $$' },
    { type: 'ascii', text: ' /$$  \\ $$| $$  | $$| $$      | $$  | $$| $$  \\ $$| $$\\  $$$| $$  | $$  \\  $$/   | $$  | $$' },
    { type: 'ascii', text: '|  $$$$$$/|  $$$$$$/| $$$$$$$$| $$  | $$| $$  | $$| $$ \\  $$|  $$$$$$/   \\  /    |  $$$$$$$' },
    { type: 'ascii', text: ' \\______/  \\______/ |________/|__/  |__/|__/  |__/|__/  \\__/ \\______/     \\/      \\_______/' },
    { type: 'system', text: '' },
    { type: 'system', text: 'Star Stream Terminal v3.0' },
    { type: 'output', text: `Welcome, ${user?.username || 'user'}! Type "help" for commands.` },
    { type: 'output', text: '' },
  ]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentPath, setCurrentPath] = useState<string[]>(['home', 'user']);
  const [sessionStart] = useState(Date.now());
  const [showMatrix, setShowMatrix] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const addLines = useCallback((newLines: TerminalLine[]) => {
    setLines(prev => [...prev, ...newLines]);
  }, []);

  const formatUptime = () => {
    const elapsed = Date.now() - sessionStart;
    const s = Math.floor(elapsed / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  const getDir = (path: string[]): Record<string, FileSystemNode> | null => {
    let current = fileSystem;
    for (const seg of path) {
      const node = current[seg];
      if (node?.type === 'directory' && node.children) {
        current = node.children;
      } else return null;
    }
    return current;
  };

  const resolvePath = (target: string): string[] => {
    if (target === '/') return [];
    const parts = target.startsWith('/') ? target.split('/').filter(Boolean) : [...currentPath, ...target.split('/').filter(Boolean)];
    const resolved: string[] = [];
    for (const p of parts) {
      if (p === '..') resolved.pop();
      else if (p !== '.') resolved.push(p);
    }
    return resolved;
  };

  const updateFs = (path: string[], name: string, node: FileSystemNode | null) => {
    const newFs = JSON.parse(JSON.stringify(fileSystem));
    let current = newFs;
    for (const seg of path) {
      if (current[seg]?.children) current = current[seg].children;
      else return;
    }
    if (node === null) delete current[name];
    else current[name] = node;
    onFileSystemChange(newFs);
  };

  const handleCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);
    addLines([{ type: 'input', text: `${user?.username || 'user'}@starstream:${currentPath.length ? '/' + currentPath.join('/') : '/'}$ ${trimmed}` }]);

    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    const argStr = args.join(' ');

    switch (command) {
      case 'help':
        addLines(HELP_TEXT.split('\n').map(l => ({ type: 'output' as const, text: l })));
        break;

      case 'clear': case 'cls':
        setLines([]);
        break;

      case 'whoami':
        addLines([
          { type: 'output', text: `Username: ${user?.username}` },
          { type: 'output', text: `Role:     ${user?.role || 'user'}` },
          { type: 'output', text: `Admin:    ${isAdmin ? 'Yes' : 'No'}` },
          { type: 'output', text: `Home:     /home/user` },
        ]);
        break;

      case 'users': {
        try {
          const { data } = await supabase.rpc('get_all_app_users');
          if (data?.length) {
            addLines([
              { type: 'output', text: 'Registered Users:' },
              ...data.map((u: any) => ({ type: 'output' as const, text: `  ${u.username}` })),
              { type: 'output', text: `Total: ${data.length}` },
            ]);
          } else addLines([{ type: 'output', text: 'No users found.' }]);
        } catch { addLines([{ type: 'error', text: 'Error fetching users.' }]); }
        break;
      }

      case 'uptime':
        addLines([{ type: 'output', text: `Session uptime: ${formatUptime()}` }]);
        break;

      case 'version':
        addLines([
          { type: 'output', text: 'Star Stream v2.0' },
          { type: 'output', text: 'Built with React + TypeScript + Vite' },
          { type: 'output', text: 'Inspired by NautilusOS' },
        ]);
        break;

      case 'sysinfo':
        addLines([
          { type: 'output', text: `OS:       Star Stream 2.0` },
          { type: 'output', text: `Browser:  ${navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other'}` },
          { type: 'output', text: `Platform: ${navigator.platform}` },
          { type: 'output', text: `Language: ${navigator.language}` },
          { type: 'output', text: `Uptime:   ${formatUptime()}` },
          { type: 'output', text: `Memory:   ${(navigator as any).deviceMemory ? (navigator as any).deviceMemory + ' GB' : 'N/A'}` },
        ]);
        break;

      case 'neofetch':
        addLines([
          { type: 'ascii', text: '    ╭──────────╮     ' + `${user?.username}@starstream` },
          { type: 'ascii', text: '    │  ☀  ☀  ☀ │     ─────────────────' },
          { type: 'ascii', text: '    │    ☀☀    │     OS:      Star Stream v2.0' },
          { type: 'ascii', text: '    │  ☀    ☀  │     Host:    Web Browser' },
          { type: 'ascii', text: '    │    ☀☀    │     Kernel:  React 18' },
          { type: 'ascii', text: '    │  ☀  ☀  ☀ │     Shell:   SolarTerminal' },
          { type: 'ascii', text: '    ╰──────────╯     Uptime:  ' + formatUptime() },
        ]);
        break;

      case 'games': {
        try {
          const { data } = await supabase.from('games').select('title, category').order('title');
          if (data?.length) {
            addLines([
              { type: 'output', text: 'Available Games:' },
              ...data.map((g: any) => ({ type: 'output' as const, text: `  [${g.category}] ${g.title}` })),
              { type: 'output', text: `Total: ${data.length}` },
            ]);
          } else addLines([{ type: 'output', text: 'No games found.' }]);
        } catch { addLines([{ type: 'error', text: 'Error fetching games.' }]); }
        break;
      }

      case 'announce': {
        try {
          const { data } = await supabase.from('announcements').select('title, content').order('created_at', { ascending: false }).limit(3);
          if (data?.length) {
            const out: TerminalLine[] = [{ type: 'output', text: 'Latest Announcements:' }];
            data.forEach((a: any) => {
              out.push({ type: 'output', text: `  ★ ${a.title}` });
              out.push({ type: 'output', text: `    ${a.content.substring(0, 80)}...` });
            });
            addLines(out);
          } else addLines([{ type: 'output', text: 'No announcements.' }]);
        } catch { addLines([{ type: 'error', text: 'Error fetching announcements.' }]); }
        break;
      }

      case 'date':
        addLines([{ type: 'output', text: new Date().toString() }]);
        break;

      case 'echo':
        addLines([{ type: 'output', text: argStr }]);
        break;

      case 'ping': {
        const host = args[0] || 'starstream';
        addLines([{ type: 'output', text: `PING ${host}...` }]);
        setTimeout(() => {
          for (let i = 0; i < 4; i++) {
            const lat = Math.floor(Math.random() * 50 + 10);
            addLines([{ type: 'output', text: `Reply from ${host}: time=${lat}ms ttl=64` }]);
          }
          addLines([{ type: 'output', text: `--- ${host} ping statistics ---\n4 packets transmitted, 4 received, 0% packet loss` }]);
        }, 300);
        break;
      }

      case 'history':
        if (commandHistory.length === 0) addLines([{ type: 'output', text: 'No history.' }]);
        else addLines(commandHistory.map((c, i) => ({ type: 'output' as const, text: `  ${i + 1}  ${c}` })));
        break;

      // File system commands
      case 'pwd':
        addLines([{ type: 'output', text: '/' + currentPath.join('/') }]);
        break;

      case 'ls': case 'dir': {
        const targetPath = args[0] ? resolvePath(args[0]) : currentPath;
        const dir = getDir(targetPath);
        if (!dir) { addLines([{ type: 'error', text: `No such directory: ${args[0] || '.'}` }]); break; }
        const entries = Object.entries(dir);
        if (entries.length === 0) { addLines([{ type: 'output', text: '(empty)' }]); break; }
        addLines(entries.map(([name, node]) => ({
          type: 'output' as const,
          text: `${node.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--'}  ${node.type === 'directory' ? '<DIR>' : (node.content?.length || 0).toString().padStart(5)}  ${name}${node.type === 'directory' ? '/' : ''}`
        })));
        break;
      }

      case 'cd': {
        if (!args[0] || args[0] === '~') { setCurrentPath(['home', 'user']); break; }
        const target = resolvePath(args[0]);
        if (target.length === 0) { setCurrentPath([]); break; }
        const dir = getDir(target);
        if (dir !== null) setCurrentPath(target);
        else addLines([{ type: 'error', text: `No such directory: ${args[0]}` }]);
        break;
      }

      case 'cat': {
        if (!args[0]) { addLines([{ type: 'error', text: 'Usage: cat <filename>' }]); break; }
        const dir = getDir(currentPath);
        const file = dir?.[args[0]];
        if (!file) { addLines([{ type: 'error', text: `No such file: ${args[0]}` }]); break; }
        if (file.type === 'directory') { addLines([{ type: 'error', text: `${args[0]} is a directory` }]); break; }
        addLines((file.content || '').split('\n').map(l => ({ type: 'output' as const, text: l })));
        break;
      }

      case 'mkdir': {
        if (!args[0]) { addLines([{ type: 'error', text: 'Usage: mkdir <dirname>' }]); break; }
        updateFs(currentPath, args[0], { name: args[0], type: 'directory', createdAt: new Date().toISOString(), children: {} });
        addLines([{ type: 'output', text: `Directory created: ${args[0]}` }]);
        break;
      }

      case 'touch': {
        if (!args[0]) { addLines([{ type: 'error', text: 'Usage: touch <filename>' }]); break; }
        updateFs(currentPath, args[0], { name: args[0], type: 'file', content: '', createdAt: new Date().toISOString() });
        addLines([{ type: 'output', text: `File created: ${args[0]}` }]);
        break;
      }

      case 'rm': {
        if (!args[0]) { addLines([{ type: 'error', text: 'Usage: rm <name>' }]); break; }
        const dir = getDir(currentPath);
        if (!dir?.[args[0]]) { addLines([{ type: 'error', text: `No such file or directory: ${args[0]}` }]); break; }
        updateFs(currentPath, args[0], null);
        addLines([{ type: 'output', text: `Removed: ${args[0]}` }]);
        break;
      }

      case 'curl': {
        if (!args[0]) { addLines([{ type: 'error', text: 'Usage: curl <url>' }]); break; }
        if (args[0] === 'parrot.live') {
          addLines([{ type: 'output', text: '🦜 Party Parrot!' }]);
          let frame = 0;
          const interval = setInterval(() => {
            addLines(PARROT_FRAMES[frame % PARROT_FRAMES.length].split('\n').map(l => ({ type: 'ascii' as const, text: l })));
            frame++;
            if (frame >= 9) clearInterval(interval);
          }, 400);
          break;
        }
        addLines([
          { type: 'output', text: `Fetching ${args[0]}...` },
          { type: 'output', text: `HTTP/1.1 200 OK` },
          { type: 'output', text: `Content-Type: text/html` },
          { type: 'output', text: `<html><body>Response from ${args[0]}</body></html>` },
        ]);
        break;
      }

      case 'wget': {
        if (!args[0]) { addLines([{ type: 'error', text: 'Usage: wget <url>' }]); break; }
        const filename = args[0].split('/').pop() || 'download';
        addLines([
          { type: 'output', text: `--${new Date().toISOString()}--  ${args[0]}` },
          { type: 'output', text: `Resolving ${args[0]}... connected.` },
          { type: 'output', text: `HTTP request sent, awaiting response... 200 OK` },
          { type: 'output', text: `Saving to: '${filename}'` },
          { type: 'output', text: `${filename}        100%[==================>]   1.2K  --.-KB/s    in 0s` },
        ]);
        updateFs(currentPath, filename, { name: filename, type: 'file', content: `Downloaded from ${args[0]}`, createdAt: new Date().toISOString() });
        break;
      }

      case 'ifconfig':
        addLines([
          { type: 'output', text: 'eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500' },
          { type: 'output', text: '        inet 192.168.1.' + Math.floor(Math.random() * 254 + 1) + '  netmask 255.255.255.0' },
          { type: 'output', text: '        inet6 fe80::1  prefixlen 64  scopeid 0x20' },
          { type: 'output', text: `        ether ${Array.from({length:6},()=>Math.floor(Math.random()*256).toString(16).padStart(2,'0')).join(':')}` },
          { type: 'output', text: '' },
          { type: 'output', text: 'lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536' },
          { type: 'output', text: '        inet 127.0.0.1  netmask 255.0.0.0' },
        ]);
        break;

      case 'cowsay': {
        const text = argStr || 'Moo!';
        const border = '_'.repeat(text.length + 2);
        addLines([
          { type: 'ascii', text: ` ${border}` },
          { type: 'ascii', text: `< ${text} >` },
          { type: 'ascii', text: ` ${'-'.repeat(text.length + 2)}` },
          { type: 'ascii', text: '        \\   ^__^' },
          { type: 'ascii', text: '         \\  (oo)\\_______' },
          { type: 'ascii', text: '            (__)\\       )\\/\\' },
          { type: 'ascii', text: '                ||----w |' },
          { type: 'ascii', text: '                ||     ||' },
        ]);
        break;
      }

      case 'fortune':
        addLines([{ type: 'output', text: FORTUNES[Math.floor(Math.random() * FORTUNES.length)] }]);
        break;

      case 'matrix':
        setShowMatrix(true);
        addLines([{ type: 'output', text: 'Matrix rain activated... Press any key to stop.' }]);
        setTimeout(() => setShowMatrix(false), 5000);
        break;

      case 'exit':
        addLines([{ type: 'output', text: 'Use the window close button to exit the terminal.' }]);
        break;

      case 'git': {
        if (isAsyncGitCommand(args)) {
          addLines([{ type: 'system', text: `$ git ${args.join(' ')}` }]);
          handleAsyncGitCommand(args, currentPath, fileSystem, user?.username || 'user', user?.id || '', updateFs, getDir, addLines);
        } else {
          const result = handleGitCommand(args, currentPath, fileSystem, user?.username || 'user', updateFs, getDir);
          if (result.length > 0) addLines(result);
        }
        break;
      }

      default:
        addLines([{ type: 'error', text: `Command not found: ${command}. Type "help" for available commands.` }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMatrix && e.key !== 'Enter') { setShowMatrix(false); return; }
    if (e.key === 'Enter') { handleCommand(input); setInput(''); }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const i = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(i);
        setInput(commandHistory[i]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const i = historyIndex + 1;
        if (i >= commandHistory.length) { setHistoryIndex(-1); setInput(''); }
        else { setHistoryIndex(i); setInput(commandHistory[i]); }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple autocomplete for file/dir names
      const dir = getDir(currentPath);
      if (dir && input) {
        const lastWord = input.split(' ').pop() || '';
        const matches = Object.keys(dir).filter(k => k.startsWith(lastWord));
        if (matches.length === 1) {
          const words = input.split(' ');
          words[words.length - 1] = matches[0];
          setInput(words.join(' '));
        }
      }
    }
  };

  const prompt = `${user?.username || 'user'}@starstream:${currentPath.length ? '/' + currentPath.join('/') : '/'}$ `;

  return (
    <div
      className="h-full flex flex-col font-mono text-sm bg-[hsl(220,20%,5%)] cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {showMatrix && (
        <div className="absolute inset-0 bg-black/90 z-10 flex items-center justify-center overflow-hidden">
          <div className="text-green-400 text-xs font-mono animate-pulse text-center">
            {'01001101 01000001 01010100 01010010 01001001 01011000\n'.repeat(20)}
          </div>
        </div>
      )}
      <div ref={terminalRef} className="flex-1 overflow-y-auto p-3 leading-relaxed" style={{ scrollbarWidth: 'thin' }}>
        {lines.map((line, i) => (
          <div key={i} className={
            line.type === 'input' ? 'text-primary' :
            line.type === 'error' ? 'text-destructive' :
            line.type === 'system' ? 'text-primary font-bold' :
            line.type === 'ascii' ? 'text-green-400' :
            'text-muted-foreground'
          }>
            {line.text || '\u00A0'}
          </div>
        ))}
        <div className="flex items-center gap-0">
          <span className="text-primary shrink-0">{prompt}</span>
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

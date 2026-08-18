import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  Files, Search, GitBranch, Play, Settings, ChevronRight, ChevronDown, 
  File, Folder, FolderOpen, X, Plus, MoreHorizontal, Terminal,
  Code2, FileText, FileJson, FileCode, Hash, Minus, Maximize2, Minimize2,
  PanelBottom, SplitSquareVertical, LayoutGrid, Bell, GitCommit,
  AlertCircle, CheckCircle2, Info, TriangleAlert, Bug
} from 'lucide-react';
import type { FileSystemNode } from './types';

interface CodeEditorProps {
  fileSystem: Record<string, FileSystemNode>;
  onFileSystemChange: (fs: Record<string, FileSystemNode>) => void;
  onOpenTerminal?: () => void;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}

interface OpenTab {
  path: string;
  name: string;
  content: string;
  modified: boolean;
  language: string;
}

// Simple syntax highlighting
function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown',
    sh: 'shell', bash: 'shell', txt: 'plaintext', log: 'plaintext',
    yml: 'yaml', yaml: 'yaml', xml: 'xml', sql: 'sql',
    rs: 'rust', go: 'go', c: 'c', cpp: 'cpp', h: 'c', java: 'java',
  };
  return map[ext] || 'plaintext';
}

function getFileIcon(filename: string, isOpen?: boolean) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['js', 'jsx'].includes(ext)) return <FileCode className="w-4 h-4 text-yellow-400 shrink-0" />;
  if (['ts', 'tsx'].includes(ext)) return <FileCode className="w-4 h-4 text-blue-400 shrink-0" />;
  if (['json'].includes(ext)) return <FileJson className="w-4 h-4 text-yellow-300 shrink-0" />;
  if (['html', 'xml'].includes(ext)) return <Code2 className="w-4 h-4 text-orange-400 shrink-0" />;
  if (['css', 'scss'].includes(ext)) return <Hash className="w-4 h-4 text-purple-400 shrink-0" />;
  if (['md'].includes(ext)) return <FileText className="w-4 h-4 text-blue-300 shrink-0" />;
  if (['py'].includes(ext)) return <FileCode className="w-4 h-4 text-green-400 shrink-0" />;
  return <File className="w-4 h-4 text-muted-foreground shrink-0" />;
}

// Tokenize for syntax highlighting
function tokenizeLine(line: string, language: string): { text: string; className: string }[] {
  const tokens: { text: string; className: string }[] = [];
  
  if (language === 'plaintext') {
    tokens.push({ text: line, className: 'text-[#d4d4d4]' });
    return tokens;
  }

  // Simple regex-based tokenizer
  const patterns: [RegExp, string][] = [
    // Comments
    [/^(\/\/.*)/, 'text-[#6a9955]'],
    [/^(#.*)/, 'text-[#6a9955]'],
    // Strings
    [/^("(?:[^"\\]|\\.)*")/, 'text-[#ce9178]'],
    [/^('(?:[^'\\]|\\.)*')/, 'text-[#ce9178]'],
    [/^(`(?:[^`\\]|\\.)*`)/, 'text-[#ce9178]'],
    // Numbers
    [/^(\b\d+\.?\d*\b)/, 'text-[#b5cea8]'],
    // Keywords
    [/^(\b(?:const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|new|this|try|catch|throw|switch|case|break|continue|typeof|instanceof|in|of|void|null|undefined|true|false|def|self|print|elif|pass|raise|with|as|lambda|yield|global|nonlocal|assert|del|None|True|False|and|or|not|is)\b)/, 'text-[#569cd6]'],
    // Types / built-ins
    [/^(\b(?:string|number|boolean|any|void|never|object|Array|Promise|Map|Set|Record|interface|type|enum|extends|implements|abstract|public|private|protected|static|readonly|override|declare|module|namespace)\b)/, 'text-[#4ec9b0]'],
    // Function calls
    [/^(\b[a-zA-Z_]\w*(?=\s*\())/, 'text-[#dcdcaa]'],
    // Properties after dot
    [/^(\.[a-zA-Z_]\w*)/, 'text-[#9cdcfe]'],
    // Brackets/operators
    [/^([{}()\[\];,.:=<>!&|?+\-*/%~^@])/, 'text-[#d4d4d4]'],
    // Identifiers
    [/^([a-zA-Z_]\w*)/, 'text-[#9cdcfe]'],
    // Whitespace
    [/^(\s+)/, ''],
    // Anything else
    [/^(.)/, 'text-[#d4d4d4]'],
  ];

  let remaining = line;
  let safety = 0;
  while (remaining.length > 0 && safety < 500) {
    safety++;
    let matched = false;
    for (const [pattern, className] of patterns) {
      const match = remaining.match(pattern);
      if (match) {
        tokens.push({ text: match[1], className });
        remaining = remaining.slice(match[1].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ text: remaining[0], className: 'text-[#d4d4d4]' });
      remaining = remaining.slice(1);
    }
  }
  return tokens;
}

// Collect all file paths from filesystem
function collectFiles(node: Record<string, FileSystemNode>, prefix: string = ''): { path: string; name: string; type: 'file' | 'directory'; depth: number; children?: ReturnType<typeof collectFiles> }[] {
  const entries: any[] = [];
  const sorted = Object.entries(node).sort(([, a], [, b]) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const [key, val] of sorted) {
    const path = prefix ? `${prefix}/${key}` : key;
    if (val.type === 'directory') {
      entries.push({
        path, name: val.name, type: 'directory',
        children: val.children ? collectFiles(val.children, path) : [],
      });
    } else {
      entries.push({ path, name: val.name, type: 'file' });
    }
  }
  return entries;
}

function getNodeAtPath(fs: Record<string, FileSystemNode>, path: string): FileSystemNode | null {
  const parts = path.split('/');
  let current: any = fs;
  for (let i = 0; i < parts.length; i++) {
    const node = current[parts[i]];
    if (!node) return null;
    if (i === parts.length - 1) return node;
    current = node.children || {};
  }
  return null;
}

function setNodeContent(fs: Record<string, FileSystemNode>, path: string, content: string): Record<string, FileSystemNode> {
  const newFs = JSON.parse(JSON.stringify(fs));
  const parts = path.split('/');
  let current: any = newFs;
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]].children;
  }
  if (current[parts[parts.length - 1]]) {
    current[parts[parts.length - 1]].content = content;
    current[parts[parts.length - 1]].modifiedAt = new Date().toISOString();
    current[parts[parts.length - 1]].size = new Blob([content]).size;
  }
  return newFs;
}

function createFileAtPath(fs: Record<string, FileSystemNode>, dirPath: string, fileName: string): Record<string, FileSystemNode> {
  const newFs = JSON.parse(JSON.stringify(fs));
  const parts = dirPath.split('/').filter(Boolean);
  let current: any = newFs;
  for (const part of parts) {
    if (!current[part]) return newFs;
    current = current[part].children;
  }
  current[fileName] = {
    name: fileName,
    type: 'file',
    content: '',
    createdAt: new Date().toISOString(),
    size: 0,
  };
  return newFs;
}

export function CodeEditor({ fileSystem, onFileSystemChange, onOpenTerminal, onClose, onMinimize, onMaximize, isMaximized }: CodeEditorProps) {
  const [activeTab, setActiveTab] = useState(0); // activity bar tab
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeFileTab, setActiveFileTab] = useState<number>(-1);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['home', 'home/user']));
  const [showTerminalPanel, setShowTerminalPanel] = useState(false);
  const [bottomPanelTab, setBottomPanelTab] = useState<'problems' | 'output' | 'debug' | 'terminal'>('terminal');
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['Welcome to SolarCode Terminal', '']);
  const [terminalInput, setTerminalInput] = useState('');
  const [problemsOutput] = useState<string[]>(['No problems detected.']);
  const [outputLog] = useState<string[]>(['[SolarCode] Ready.']);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ path: string; line: number; text: string }[]>([]);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [showWelcome, setShowWelcome] = useState(true);
  const [creatingFile, setCreatingFile] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  const fileTree = useMemo(() => collectFiles(fileSystem), [fileSystem]);

  const currentTab = activeFileTab >= 0 && activeFileTab < openTabs.length ? openTabs[activeFileTab] : null;

  const openFile = useCallback((path: string, name: string) => {
    const existing = openTabs.findIndex(t => t.path === path);
    if (existing >= 0) {
      setActiveFileTab(existing);
      setShowWelcome(false);
      return;
    }
    const node = getNodeAtPath(fileSystem, path);
    if (!node || node.type !== 'file') return;
    const lang = getLanguage(name);
    const tab: OpenTab = { path, name, content: node.content || '', modified: false, language: lang };
    setOpenTabs(prev => [...prev, tab]);
    setActiveFileTab(openTabs.length);
    setShowWelcome(false);
  }, [openTabs, fileSystem]);

  const closeTab = useCallback((index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenTabs(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (activeFileTab >= next.length) setActiveFileTab(next.length - 1);
      else if (activeFileTab > index) setActiveFileTab(activeFileTab - 1);
      if (next.length === 0) setShowWelcome(true);
      return next;
    });
  }, [activeFileTab]);

  const updateContent = useCallback((content: string) => {
    if (activeFileTab < 0) return;
    setOpenTabs(prev => prev.map((t, i) => i === activeFileTab ? { ...t, content, modified: true } : t));
  }, [activeFileTab]);

  const saveFile = useCallback(() => {
    if (!currentTab) return;
    const newFs = setNodeContent(fileSystem, currentTab.path, currentTab.content);
    onFileSystemChange(newFs);
    setOpenTabs(prev => prev.map((t, i) => i === activeFileTab ? { ...t, modified: false } : t));
  }, [currentTab, fileSystem, onFileSystemChange, activeFileTab]);

  const saveAllFiles = useCallback(() => {
    let fs = fileSystem;
    openTabs.forEach(tab => {
      if (tab.modified) {
        fs = setNodeContent(fs, tab.path, tab.content);
      }
    });
    onFileSystemChange(fs);
    setOpenTabs(prev => prev.map(t => ({ ...t, modified: false })));
  }, [openTabs, fileSystem, onFileSystemChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (e.shiftKey) saveAllFiles();
        else saveFile();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '`') {
        e.preventDefault();
        setShowTerminalPanel(p => !p);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setShowSidebar(p => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveFile, saveAllFiles]);

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  // Search across files
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    const results: { path: string; line: number; text: string }[] = [];
    const searchNode = (node: Record<string, FileSystemNode>, prefix: string) => {
      for (const [key, val] of Object.entries(node)) {
        const path = prefix ? `${prefix}/${key}` : key;
        if (val.type === 'file' && val.content) {
          val.content.split('\n').forEach((line, i) => {
            if (line.toLowerCase().includes(query.toLowerCase())) {
              results.push({ path, line: i + 1, text: line.trim() });
            }
          });
        }
        if (val.type === 'directory' && val.children) {
          searchNode(val.children, path);
        }
      }
    };
    searchNode(fileSystem, '');
    setSearchResults(results.slice(0, 100));
  }, [fileSystem]);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    const prompt = 'user@starstream:~$ ';
    setTerminalOutput(prev => [...prev, `${prompt}${cmd}`]);
    
    if (cmd === 'clear') {
      setTerminalOutput([]);
    } else if (cmd === 'help') {
      setTerminalOutput(prev => [...prev, 'Available: clear, help, ls, pwd, echo, date']);
    } else if (cmd === 'pwd') {
      setTerminalOutput(prev => [...prev, '/home/user']);
    } else if (cmd === 'date') {
      setTerminalOutput(prev => [...prev, new Date().toString()]);
    } else if (cmd.startsWith('echo ')) {
      setTerminalOutput(prev => [...prev, cmd.slice(5)]);
    } else if (cmd === 'ls') {
      const userDir = fileSystem.home?.children?.user?.children;
      if (userDir) {
        const items = Object.keys(userDir).join('  ');
        setTerminalOutput(prev => [...prev, items]);
      }
    } else if (cmd) {
      setTerminalOutput(prev => [...prev, `command not found: ${cmd}`]);
    }
    setTerminalInput('');
  };

  const handleCreateFile = (dirPath: string) => {
    if (!newFileName.trim()) { setCreatingFile(null); return; }
    const newFs = createFileAtPath(fileSystem, dirPath, newFileName.trim());
    onFileSystemChange(newFs);
    setCreatingFile(null);
    setNewFileName('');
    // Auto-expand the directory
    setExpandedDirs(prev => { const s = new Set(prev); s.add(dirPath); return s; });
  };

  const renderFileTree = (entries: ReturnType<typeof collectFiles>, depth: number = 0) => {
    return entries.map(entry => {
      if (entry.type === 'directory') {
        const isExpanded = expandedDirs.has(entry.path);
        return (
          <div key={entry.path}>
            <div
              className="flex items-center gap-1 px-2 py-[2px] cursor-pointer hover:bg-[#2a2d2e] text-[#cccccc] text-[13px] group"
              style={{ paddingLeft: 8 + depth * 12 }}
              onClick={() => toggleDir(entry.path)}
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              {isExpanded ? <FolderOpen className="w-4 h-4 text-[#dcb67a] shrink-0" /> : <Folder className="w-4 h-4 text-[#dcb67a] shrink-0" />}
              <span className="truncate">{entry.name}</span>
              <button
                className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#3c3c3c] rounded"
                onClick={(e) => { e.stopPropagation(); setCreatingFile(entry.path); setNewFileName(''); }}
                title="New File"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {isExpanded && entry.children && (
              <div>
                {creatingFile === entry.path && (
                  <div className="flex items-center gap-1 px-2" style={{ paddingLeft: 20 + depth * 12 }}>
                    <File className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      autoFocus
                      className="bg-[#3c3c3c] text-[#cccccc] text-[13px] px-1 py-0 border border-[#007acc] outline-none rounded-sm flex-1 min-w-0"
                      value={newFileName}
                      onChange={e => setNewFileName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreateFile(entry.path); if (e.key === 'Escape') setCreatingFile(null); }}
                      onBlur={() => handleCreateFile(entry.path)}
                    />
                  </div>
                )}
                {renderFileTree(entry.children!, depth + 1)}
              </div>
            )}
          </div>
        );
      }
      return (
        <div
          key={entry.path}
          className={`flex items-center gap-1 px-2 py-[2px] cursor-pointer text-[13px] truncate ${
            currentTab?.path === entry.path ? 'bg-[#37373d] text-white' : 'text-[#cccccc] hover:bg-[#2a2d2e]'
          }`}
          style={{ paddingLeft: 22 + depth * 12 }}
          onClick={() => openFile(entry.path, entry.name)}
        >
          {getFileIcon(entry.name)}
          <span className="truncate">{entry.name}</span>
        </div>
      );
    });
  };

  // Editor content lines
  const lines = currentTab ? currentTab.content.split('\n') : [];

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateContent(e.target.value);
  };

  const handleTextareaSelect = () => {
    if (!editorRef.current) return;
    const textarea = editorRef.current;
    const text = textarea.value;
    const pos = textarea.selectionStart;
    const before = text.substring(0, pos);
    const lineNum = before.split('\n').length;
    const colNum = pos - before.lastIndexOf('\n');
    setCursorPos({ line: lineNum, col: colNum });
  };

  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = editorRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      updateContent(newVal);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      }, 0);
    }
  };

  const activityBarItems = [
    { icon: Files, label: 'Explorer', id: 0 },
    { icon: Search, label: 'Search', id: 1 },
    { icon: GitBranch, label: 'Source Control', id: 2 },
    { icon: Play, label: 'Run and Debug', id: 3 },
  ];

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] overflow-hidden" style={{ fontFamily: "'Consolas', 'Courier New', monospace" }}>
      {/* Title bar / Menu bar with window controls */}
      <div className="flex items-center h-[30px] bg-[#323233] px-2 text-[12px] text-[#cccccc] shrink-0 border-b border-[#252526]">
        <Code2 className="w-4 h-4 text-[#007acc] mr-2 shrink-0" />
        <div className="flex items-center gap-3">
          <span className="opacity-70 hover:opacity-100 cursor-default">File</span>
          <span className="opacity-70 hover:opacity-100 cursor-default">Edit</span>
          <span className="opacity-70 hover:opacity-100 cursor-default">Selection</span>
          <span className="opacity-70 hover:opacity-100 cursor-default">View</span>
          <span className="opacity-70 hover:opacity-100 cursor-default">Go</span>
          <span className="opacity-70 hover:opacity-100 cursor-default">Run</span>
          <span className="opacity-70 hover:opacity-100 cursor-default">Terminal</span>
          <span className="opacity-70 hover:opacity-100 cursor-default">Help</span>
        </div>
        <div className="flex-1 text-center text-[12px] opacity-60">
          {currentTab ? `${currentTab.name} — SolarCode` : 'SolarCode'}
        </div>
        {/* Window controls */}
        <div className="flex items-center shrink-0">
          {onMinimize && (
            <button onClick={onMinimize} className="p-1.5 hover:bg-white/10 rounded-sm" title="Minimize">
              <Minus className="w-3.5 h-3.5 text-[#cccccc]" />
            </button>
          )}
          {onMaximize && (
            <button onClick={onMaximize} className="p-1.5 hover:bg-white/10 rounded-sm" title={isMaximized ? 'Restore' : 'Maximize'}>
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5 text-[#cccccc]" /> : <Maximize2 className="w-3.5 h-3.5 text-[#cccccc]" />}
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1.5 hover:bg-[#e81123] rounded-sm" title="Close">
              <X className="w-3.5 h-3.5 text-[#cccccc]" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <div className="w-12 bg-[#333333] flex flex-col items-center py-1 shrink-0 border-r border-[#252526]">
          {activityBarItems.map(item => (
            <button
              key={item.id}
              className={`w-12 h-12 flex items-center justify-center relative ${
                activeTab === item.id 
                  ? 'text-white before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[2px] before:h-6 before:bg-white' 
                  : 'text-[#858585] hover:text-white'
              }`}
              onClick={() => { setActiveTab(item.id); setShowSidebar(true); }}
              title={item.label}
            >
              <item.icon className="w-6 h-6" />
            </button>
          ))}
          
          <div className="flex-1" />
          
          <button
            className="w-12 h-12 flex items-center justify-center text-[#858585] hover:text-white"
            onClick={() => setShowTerminalPanel(p => !p)}
            title="Terminal"
          >
            <Terminal className="w-6 h-6" />
          </button>
          <button
            className="w-12 h-12 flex items-center justify-center text-[#858585] hover:text-white"
            onClick={onOpenTerminal}
            title="Open Full Terminal"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="bg-[#252526] border-r border-[#1e1e1e] overflow-hidden flex flex-col shrink-0" style={{ width: sidebarWidth }}>
            {activeTab === 0 && (
              <>
                <div className="px-4 py-2 text-[11px] font-semibold tracking-wider text-[#bbbbbb] uppercase">
                  Explorer
                </div>
                <div className="px-4 py-1 text-[11px] font-semibold tracking-wider text-[#cccccc] uppercase flex items-center gap-1">
                  <ChevronDown className="w-3 h-3" />
                  STAR STREAM-FS
                  <div className="ml-auto flex gap-0.5">
                    <button
                      className="p-0.5 hover:bg-[#3c3c3c] rounded"
                      onClick={() => { setCreatingFile('home/user'); setNewFileName(''); }}
                      title="New File"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-[#424242]">
                  {renderFileTree(fileTree)}
                </div>
                <div className="border-t border-[#1e1e1e]">
                  <div className="px-4 py-1 text-[11px] font-semibold tracking-wider text-[#cccccc] uppercase cursor-pointer hover:bg-[#2a2d2e]">
                    <ChevronRight className="w-3 h-3 inline mr-1" />
                    OUTLINE
                  </div>
                  <div className="px-4 py-1 text-[11px] font-semibold tracking-wider text-[#cccccc] uppercase cursor-pointer hover:bg-[#2a2d2e]">
                    <ChevronRight className="w-3 h-3 inline mr-1" />
                    TIMELINE
                  </div>
                </div>
              </>
            )}
            
            {activeTab === 1 && (
              <>
                <div className="px-4 py-2 text-[11px] font-semibold tracking-wider text-[#bbbbbb] uppercase">
                  Search
                </div>
                <div className="px-3 py-1">
                  <input
                    className="w-full bg-[#3c3c3c] text-[#cccccc] text-[13px] px-2 py-1 border border-[#3c3c3c] focus:border-[#007acc] outline-none rounded-sm"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); performSearch(e.target.value); }}
                  />
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#424242] px-2 py-1">
                  {searchResults.length > 0 && (
                    <div className="text-[12px] text-[#bbbbbb] px-2 py-1">{searchResults.length} results</div>
                  )}
                  {searchResults.map((r, i) => (
                    <div
                      key={i}
                      className="px-2 py-1 text-[12px] cursor-pointer hover:bg-[#2a2d2e] rounded"
                      onClick={() => {
                        const name = r.path.split('/').pop() || '';
                        openFile(r.path, name);
                      }}
                    >
                      <div className="text-[#cccccc] truncate">{r.path.split('/').pop()}</div>
                      <div className="text-[#858585] truncate text-[11px]">{r.text}</div>
                      <div className="text-[#858585] text-[10px]">{r.path} : {r.line}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {activeTab === 2 && (
              <>
                <div className="px-4 py-2 text-[11px] font-semibold tracking-wider text-[#bbbbbb] uppercase">
                  Source Control
                </div>
                <div className="flex-1 flex items-center justify-center text-[13px] text-[#858585] px-4 text-center">
                  <div>
                    <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>Connected to Star Stream Terminal Git</p>
                    <p className="text-[11px] mt-1 opacity-60">Open the full terminal for git commands</p>
                  </div>
                </div>
              </>
            )}
            
            {activeTab === 3 && (
              <>
                <div className="px-4 py-2 text-[11px] font-semibold tracking-wider text-[#bbbbbb] uppercase">
                  Run and Debug
                </div>
                <div className="flex-1 flex items-center justify-center text-[13px] text-[#858585] px-4 text-center">
                  <div>
                    <Play className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>Run scripts from the integrated terminal</p>
                    <button
                      className="mt-2 px-3 py-1 bg-[#007acc] text-white rounded text-[12px] hover:bg-[#006bb3]"
                      onClick={() => setShowTerminalPanel(true)}
                    >
                      Open Terminal
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Main editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="h-[35px] bg-[#252526] flex items-end overflow-x-auto shrink-0 scrollbar-none">
            {openTabs.map((tab, i) => (
              <div
                key={tab.path}
                className={`flex items-center gap-1.5 px-3 h-[35px] text-[13px] cursor-pointer border-r border-[#252526] shrink-0 group ${
                  i === activeFileTab
                    ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]'
                    : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2d2d2d] border-t-2 border-t-transparent'
                }`}
                onClick={() => { setActiveFileTab(i); setShowWelcome(false); }}
              >
                {getFileIcon(tab.name)}
                <span className="truncate max-w-[120px]">{tab.name}</span>
                {tab.modified && <span className="w-2 h-2 rounded-full bg-white/60 shrink-0" />}
                <button
                  className="p-0.5 rounded hover:bg-[#3c3c3c] opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => closeTab(i, e)}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Editor content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {showWelcome && openTabs.length === 0 ? (
              /* Welcome tab */
              <div className="flex-1 overflow-y-auto bg-[#1e1e1e] p-8">
                <div className="max-w-2xl mx-auto">
                  <h1 className="text-[28px] font-light text-white mb-1">SolarCode</h1>
                  <p className="text-[14px] text-[#858585] mb-8">Editing evolved</p>
                  
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h2 className="text-[16px] text-white mb-3">Start</h2>
                      <div className="space-y-1.5">
                        <button
                          className="text-[13px] text-[#3794ff] hover:underline flex items-center gap-2"
                          onClick={() => { setCreatingFile('home/user'); setNewFileName(''); setActiveTab(0); setShowSidebar(true); }}
                        >
                          <Plus className="w-4 h-4" /> New File...
                        </button>
                        <button
                          className="text-[13px] text-[#3794ff] hover:underline flex items-center gap-2"
                          onClick={() => { setActiveTab(0); setShowSidebar(true); }}
                        >
                          <Folder className="w-4 h-4" /> Open Folder...
                        </button>
                      </div>
                      
                      <h2 className="text-[16px] text-white mt-6 mb-3">Recent</h2>
                      <p className="text-[13px] text-[#858585]">
                        Browse the file explorer to open files
                      </p>
                    </div>
                    
                    <div>
                      <h2 className="text-[16px] text-white mb-3">Shortcuts</h2>
                      <div className="space-y-2 text-[13px]">
                        <div className="flex justify-between text-[#cccccc]">
                          <span>Save</span>
                          <kbd className="bg-[#3c3c3c] px-1.5 py-0.5 rounded text-[11px]">Ctrl+S</kbd>
                        </div>
                        <div className="flex justify-between text-[#cccccc]">
                          <span>Toggle Sidebar</span>
                          <kbd className="bg-[#3c3c3c] px-1.5 py-0.5 rounded text-[11px]">Ctrl+B</kbd>
                        </div>
                        <div className="flex justify-between text-[#cccccc]">
                          <span>Toggle Terminal</span>
                          <kbd className="bg-[#3c3c3c] px-1.5 py-0.5 rounded text-[11px]">Ctrl+`</kbd>
                        </div>
                        <div className="flex justify-between text-[#cccccc]">
                          <span>Save All</span>
                          <kbd className="bg-[#3c3c3c] px-1.5 py-0.5 rounded text-[11px]">Ctrl+Shift+S</kbd>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : currentTab ? (
              /* Code editor */
              <div className="flex-1 overflow-hidden relative">
                {/* Syntax highlighted display */}
                <div className="absolute inset-0 overflow-auto font-mono text-[13px] leading-[20px] scrollbar-thin scrollbar-thumb-[#424242]">
                  <div className="flex min-h-full">
                    {/* Line numbers */}
                    <div className="bg-[#1e1e1e] text-[#858585] text-right select-none pr-4 pl-4 pt-0 shrink-0 sticky left-0 z-10" style={{ minWidth: 60 }}>
                      {lines.map((_, i) => (
                        <div key={i} className={`leading-[20px] ${cursorPos.line === i + 1 ? 'text-[#cccccc]' : ''}`}>
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    {/* Code with highlighting overlay */}
                    <div className="flex-1 relative min-w-0">
                      {/* Highlighted layer */}
                      <div className="absolute inset-0 pointer-events-none whitespace-pre pl-2 pt-0" aria-hidden>
                        {lines.map((line, i) => (
                          <div key={i} className={`leading-[20px] ${cursorPos.line === i + 1 ? 'bg-[#2a2d2e]' : ''}`}>
                            {tokenizeLine(line, currentTab.language).map((token, j) => (
                              <span key={j} className={token.className}>{token.text || ' '}</span>
                            ))}
                            {line === '' && '\u00A0'}
                          </div>
                        ))}
                      </div>
                      {/* Actual textarea */}
                      <textarea
                        ref={editorRef}
                        className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-white resize-none outline-none whitespace-pre overflow-hidden pl-2 pt-0 font-mono text-[13px] leading-[20px]"
                        value={currentTab.content}
                        onChange={handleTextareaChange}
                        onSelect={handleTextareaSelect}
                        onKeyDown={handleTabKey}
                        onKeyUp={handleTextareaSelect}
                        onClick={handleTextareaSelect}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-[#1e1e1e]" />
            )}

            {/* Integrated Bottom Panel (VS Code style) */}
            {showTerminalPanel && (
              <div className="h-[220px] bg-[#1e1e1e] border-t border-[#3c3c3c] flex flex-col shrink-0">
                {/* Panel tab bar */}
                <div className="flex items-center h-[35px] bg-[#252526] px-0 shrink-0 border-b border-[#1e1e1e]">
                  <div className="flex items-center h-full">
                    {(['problems', 'output', 'debug', 'terminal'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setBottomPanelTab(tab)}
                        className={`px-3 h-full text-[11px] uppercase tracking-wider font-medium transition-colors ${
                          bottomPanelTab === tab
                            ? 'text-white border-b border-b-white bg-transparent'
                            : 'text-[#858585] hover:text-[#cccccc] border-b border-b-transparent'
                        }`}
                      >
                        {tab === 'debug' ? 'Debug Console' : tab}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1" />
                  <div className="flex items-center gap-0.5 px-2">
                    <button className="p-1 hover:bg-[#3c3c3c] rounded" title="Maximize Panel">
                      <Maximize2 className="w-3.5 h-3.5 text-[#858585]" />
                    </button>
                    <button className="p-1 hover:bg-[#3c3c3c] rounded" onClick={() => setShowTerminalPanel(false)} title="Close Panel">
                      <X className="w-3.5 h-3.5 text-[#858585]" />
                    </button>
                  </div>
                </div>

                {/* Panel content */}
                <div className="flex-1 overflow-y-auto px-3 py-1 text-[13px] font-mono scrollbar-thin scrollbar-thumb-[#424242]">
                  {bottomPanelTab === 'problems' && (
                    <div className="text-[#cccccc]">
                      {problemsOutput.map((line, i) => (
                        <div key={i} className="leading-[20px] flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                  {bottomPanelTab === 'output' && (
                    <div className="text-[#cccccc]">
                      {outputLog.map((line, i) => (
                        <div key={i} className="leading-[20px]">{line}</div>
                      ))}
                    </div>
                  )}
                  {bottomPanelTab === 'debug' && (
                    <div className="text-[#858585] leading-[20px]">
                      <span className="text-[#569cd6]">Debug Console</span> — No active debug session.
                    </div>
                  )}
                  {bottomPanelTab === 'terminal' && (
                    <div onClick={() => terminalInputRef.current?.focus()}>
                      {terminalOutput.map((line, i) => (
                        <div key={i} className="leading-[20px] text-[#cccccc]">{line}</div>
                      ))}
                      <form onSubmit={handleTerminalSubmit} className="flex items-center">
                        <span className="text-[#6a9955]">user@starstream</span>
                        <span className="text-[#cccccc]">:</span>
                        <span className="text-[#569cd6]">~</span>
                        <span className="text-[#cccccc]">$ </span>
                        <input
                          ref={terminalInputRef}
                          className="flex-1 bg-transparent outline-none text-[#cccccc] ml-1"
                          value={terminalInput}
                          onChange={e => setTerminalInput(e.target.value)}
                          autoFocus
                        />
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-[22px] bg-[#007acc] flex items-center px-2 text-[12px] text-white shrink-0 gap-4">
        <div className="flex items-center gap-1">
          <GitBranch className="w-3.5 h-3.5" />
          <span>main</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5"><AlertCircle className="w-3 h-3" /> 0</span>
          <span className="flex items-center gap-0.5"><Info className="w-3 h-3" /> 0</span>
        </div>
        <div className="flex-1" />
        {currentTab && (
          <>
            <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
            <span>Spaces: 2</span>
            <span>UTF-8</span>
            <span>{currentTab.language}</span>
          </>
        )}
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Prettier</span>
        <Bell className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

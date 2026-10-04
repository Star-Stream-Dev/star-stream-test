import { useCallback, useEffect, useRef, useState } from 'react';
import { Monitor, Download, RefreshCw, Maximize, Copy, KeyRound, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface StreamInfo {
  stream_token: string;
  tunnel_url: string | null;
  is_online: boolean;
  last_heartbeat: string | null;
}

const CLOUDFLARED_PATH = '%USERPROFILE%\\Downloads\\cloudflared-windows-amd64.exe';

function buildLauncher(token: string) {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const rpc = `${url}/rest/v1/rpc/update_stream_tunnel`;
  const lines = [
    '@echo off',
    'setlocal EnableDelayedExpansion',
    'title Star Stream Desktop Launcher',
    `set "TOKEN=${token}"`,
    `set "RPC=${rpc}"`,
    `set "APIKEY=${key}"`,
    `set "CLOUDFLARED=${CLOUDFLARED_PATH}"`,
    'set "LOG=%TEMP%\\starstream-tunnel.log"',
    'echo ==== Star Stream Desktop Launcher ====',
    '',
    'rem --- Sunshine ---',
    'tasklist /FI "IMAGENAME eq sunshine.exe" | find /I "sunshine.exe" >nul',
    'if errorlevel 1 (',
    '  if exist "C:\\Program Files\\Sunshine\\sunshine.exe" (',
    '    echo Starting Sunshine...',
    '    start "" /D "C:\\Program Files\\Sunshine" "C:\\Program Files\\Sunshine\\sunshine.exe"',
    '  ) else ( echo [!] Sunshine not found - install it from https://github.com/LizardByte/Sunshine )',
    ') else ( echo Sunshine already running. )',
    '',
    'rem --- Moonlight Web Stream ---',
    'set "MLW="',
    'if exist "%~dp0web-server.exe" set "MLW=%~dp0web-server.exe"',
    'if not defined MLW for /f "delims=" %%F in (\'where /r "%USERPROFILE%\\Downloads" web-server.exe 2^>nul\') do if not defined MLW set "MLW=%%F"',
    'if not defined MLW for /f "delims=" %%F in (\'where /r "%USERPROFILE%\\Desktop" web-server.exe 2^>nul\') do if not defined MLW set "MLW=%%F"',
    'tasklist /FI "IMAGENAME eq web-server.exe" | find /I "web-server.exe" >nul',
    'if errorlevel 1 (',
    '  if defined MLW (',
    '    echo Starting Moonlight Web: !MLW!',
    '    for %%D in ("!MLW!") do start "Moonlight Web" /D "%%~dpD" "!MLW!"',
    '  ) else ( echo [!] Moonlight Web Stream web-server.exe not found in Downloads or Desktop. )',
    ') else ( echo Moonlight Web already running. )',
    'timeout /t 3 /nobreak >nul',
    '',
    'rem --- Cloudflared ---',
    'if not exist "%CLOUDFLARED%" (',
    '  echo Downloading cloudflared-windows-amd64.exe to Downloads...',
    '  powershell -NoProfile -Command "Invoke-WebRequest -Uri \'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe\' -OutFile \\"$env:USERPROFILE\\Downloads\\cloudflared-windows-amd64.exe\\""',
    ')',
    'if exist "%LOG%" del "%LOG%"',
    'echo Starting tunnel...',
    'start "Star Stream Tunnel" /MIN "%CLOUDFLARED%" tunnel --url http://localhost:8080 --logfile "%LOG%"',
    '',
    'set "TUNNEL="',
    'for /L %%i in (1,1,60) do (',
    '  if not defined TUNNEL (',
    '    timeout /t 1 /nobreak >nul',
    '    for /f "delims=" %%U in (\'powershell -NoProfile -Command "if(Test-Path $env:LOG){(Select-String -Path $env:LOG -Pattern \'https://[a-z0-9-]+\\.trycloudflare\\.com\' | Select-Object -First 1).Matches.Value}"\') do set "TUNNEL=%%U"',
    '  )',
    ')',
    'if not defined TUNNEL ( echo [!] Could not get tunnel URL. & pause & exit /b 1 )',
    'echo Tunnel: %TUNNEL%',
    'call :post "\\"%TUNNEL%\\"" true',
    'echo.',
    'echo Your desktop is LIVE on Star Stream. Keep this window open.',
    'echo Press Ctrl+C or close this window to stop streaming.',
    '',
    ':loop',
    'timeout /t 60 /nobreak >nul',
    'tasklist /FI "IMAGENAME eq cloudflared-windows-amd64.exe" | find /I "cloudflared" >nul',
    'if errorlevel 1 ( call :post null false & echo Tunnel stopped. & pause & exit /b 0 )',
    'call :post "\\"%TUNNEL%\\"" true',
    'goto loop',
    '',
    ':post',
    'curl.exe -s -o nul -X POST "%RPC%" -H "apikey: %APIKEY%" -H "Authorization: Bearer %APIKEY%" -H "Content-Type: application/json" -d "{\\"p_stream_token\\":\\"%TOKEN%\\",\\"p_tunnel_url\\":%~1,\\"p_is_online\\":%~2}"',
    'exit /b 0',
  ];
  return lines.join('\r\n');
}

export function CloudDesktop() {
  const { sessionToken } = useAuth();
  const [info, setInfo] = useState<StreamInfo | null>(null);
  const [manual, setManual] = useState('');
  const [frameKey, setFrameKey] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!sessionToken) return;
    const { data, error } = await supabase.rpc('get_my_desktop_stream' as any, { p_session_token: sessionToken });
    if (error) { console.error(error); return; }
    const row = (data as StreamInfo[] | null)?.[0];
    if (row) setInfo(prev => {
      if (prev?.tunnel_url !== row.tunnel_url) setFrameKey(k => k + 1);
      return row;
    });
  }, [sessionToken]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const download = () => {
    if (!info) return;
    const blob = new Blob([buildLauncher(info.stream_token)], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'StarStream-Launcher.bat';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const regenerate = async () => {
    if (!sessionToken || !confirm('Old launchers will stop working. Continue?')) return;
    const { error } = await supabase.rpc('regenerate_my_stream_token' as any, { p_session_token: sessionToken });
    if (error) return toast.error(error.message);
    toast.success('New key created — download the launcher again.');
    load();
  };

  const saveManual = async () => {
    if (!sessionToken) return;
    const { error } = await supabase.rpc('set_my_stream_url' as any, { p_session_token: sessionToken, p_tunnel_url: manual.trim() });
    if (error) return toast.error(error.message);
    toast.success('Link saved');
    setManual('');
    load();
  };

  const online = !!info?.is_online && !!info?.tunnel_url;

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-wrap items-center gap-3">
        <Monitor className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Desktop</h2>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${online ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {online ? '● Online' : '○ Host offline'}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {online && <>
            <Button size="sm" variant="outline" onClick={() => setFrameKey(k => k + 1)}><RefreshCw className="w-4 h-4 mr-1" />Reload</Button>
            <Button size="sm" variant="outline" onClick={() => frameRef.current?.requestFullscreen?.()}><Maximize className="w-4 h-4 mr-1" />Fullscreen</Button>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(info!.tunnel_url!); toast.success('Copied'); }}><Copy className="w-4 h-4 mr-1" />Copy link</Button>
          </>}
          <Button size="sm" onClick={download} disabled={!info}><Download className="w-4 h-4 mr-1" />Download Launcher</Button>
        </div>
      </div>

      {online ? (
        <div ref={frameRef} className="flex-1 min-h-[60vh] rounded-xl overflow-hidden border border-border bg-card">
          <iframe key={frameKey} src={info!.tunnel_url!} title="Remote Desktop" className="w-full h-full min-h-[60vh]"
            allow="fullscreen; gamepad; autoplay; clipboard-read; clipboard-write; keyboard-map; pointer-lock" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 text-sm text-muted-foreground">
          <p className="text-foreground font-medium">Stream your own PC here in 3 steps:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Install <b>Sunshine</b> and extract <b>Moonlight Web Stream</b> into Downloads or Desktop (pair them once).</li>
            <li>Keep <code className="text-primary">cloudflared-windows-amd64.exe</code> in your Downloads folder (the launcher downloads it if missing).</li>
            <li>Click <b>Download Launcher</b> and double-click it. This page goes live automatically — no copying links.</li>
          </ol>
          <p className="text-xs">The launcher contains your personal key. Don't share it.</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-2">
        <Link2 className="w-4 h-4 text-muted-foreground" />
        <Input value={manual} onChange={e => setManual(e.target.value)} placeholder="Or paste a link manually (https://...)" className="flex-1 min-w-[200px]" />
        <Button size="sm" variant="outline" onClick={saveManual} disabled={!manual.trim()}>Save</Button>
        <Button size="sm" variant="ghost" onClick={regenerate}><KeyRound className="w-4 h-4 mr-1" />New key</Button>
      </div>
    </div>
  );
}

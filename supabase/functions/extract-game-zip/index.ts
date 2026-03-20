import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const formData = await req.formData();
    const sessionToken = formData.get('session_token') as string;
    const gameId = formData.get('game_id') as string;
    const zipFile = formData.get('zip_file') as File;

    if (!sessionToken || !gameId || !zipFile) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify session and admin role
    const { data: userId, error: sessionError } = await supabase.rpc('verify_session', {
      p_session_token: sessionToken,
    });
    if (sessionError || !userId) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin',
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Only admins can upload game files' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read and extract ZIP
    const arrayBuffer = await zipFile.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const basePath = `games/${gameId}`;

    // Delete existing files for this game first
    const { data: existingFiles } = await supabase.storage
      .from('game-files')
      .list(basePath, { limit: 1000 });

    if (existingFiles && existingFiles.length > 0) {
      const filePaths = existingFiles.map(f => `${basePath}/${f.name}`);
      await supabase.storage.from('game-files').remove(filePaths);
    }

    // Find the root directory - check if ZIP has a single root folder
    const entries = Object.keys(zip.files);
    let prefix = '';
    
    // Check if all files are under a single directory
    const topLevel = new Set<string>();
    for (const entry of entries) {
      const parts = entry.split('/');
      if (parts[0]) topLevel.add(parts[0]);
    }
    
    // If there's a single top-level directory containing index.html, strip it
    if (topLevel.size === 1) {
      const singleDir = Array.from(topLevel)[0];
      const hasIndexInDir = entries.some(e => e === `${singleDir}/index.html`);
      if (hasIndexInDir) {
        prefix = `${singleDir}/`;
      }
    }

    let uploadedCount = 0;
    const errors: string[] = [];

    for (const [relativePath, file] of Object.entries(zip.files)) {
      if (file.dir) continue;
      
      // Strip prefix if found
      let cleanPath = relativePath;
      if (prefix && cleanPath.startsWith(prefix)) {
        cleanPath = cleanPath.slice(prefix.length);
      }
      if (!cleanPath) continue;

      try {
        const content = await file.async('uint8array');
        const storagePath = `${basePath}/${cleanPath}`;
        
        // Determine content type
        const ext = cleanPath.split('.').pop()?.toLowerCase() || '';
        const contentTypes: Record<string, string> = {
          'html': 'text/html',
          'htm': 'text/html',
          'js': 'application/javascript',
          'mjs': 'application/javascript',
          'css': 'text/css',
          'json': 'application/json',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'svg': 'image/svg+xml',
          'webp': 'image/webp',
          'woff': 'font/woff',
          'woff2': 'font/woff2',
          'ttf': 'font/ttf',
          'otf': 'font/otf',
          'mp3': 'audio/mpeg',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp4': 'video/mp4',
          'webm': 'video/webm',
          'wasm': 'application/wasm',
          'data': 'application/octet-stream',
        };
        const contentType = contentTypes[ext] || 'application/octet-stream';

        const { error: uploadError } = await supabase.storage
          .from('game-files')
          .upload(storagePath, content, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          errors.push(`${cleanPath}: ${uploadError.message}`);
        } else {
          uploadedCount++;
        }
      } catch (e) {
        errors.push(`${cleanPath}: ${e.message}`);
      }
    }

    // Get the public URL for the hosted path
    const { data: { publicUrl } } = supabase.storage
      .from('game-files')
      .getPublicUrl(`${basePath}/index.html`);

    return new Response(JSON.stringify({
      success: true,
      uploaded: uploadedCount,
      errors: errors.length > 0 ? errors : undefined,
      hosted_path: publicUrl,
      base_path: basePath,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

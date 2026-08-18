import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GITHUB_API = 'https://api.github.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const pat = Deno.env.get('GITHUB_PAT');
  if (!pat) {
    return new Response(JSON.stringify({ error: 'GITHUB_PAT not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { action, owner, repo, branch, path, content, message, sha, user_id } = body;

    // Verify the caller is an admin user
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: user_id,
      _role: 'admin',
    });

    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Only admins can use the GitHub API' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = {
      'Authorization': `token ${pat}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Star Stream-Terminal',
    };

    if (action === 'clone' || action === 'pull') {
      let targetBranch = branch || 'main';
      if (!branch) {
        const repoRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers });
        if (!repoRes.ok) {
          const err = await repoRes.text();
          return new Response(JSON.stringify({ error: `Repository not found: ${err}` }), {
            status: repoRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const repoData = await repoRes.json();
        targetBranch = repoData.default_branch || 'main';
      }

      const treeRes = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`,
        { headers }
      );
      if (!treeRes.ok) {
        const err = await treeRes.text();
        return new Response(JSON.stringify({ error: `Failed to fetch tree: ${err}` }), {
          status: treeRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const treeData = await treeRes.json();

      const blobs = treeData.tree
        .filter((item: any) => item.type === 'blob' && (item.size || 0) < 100000)
        .slice(0, 200);

      const files: Record<string, string> = {};
      for (let i = 0; i < blobs.length; i += 10) {
        const batch = blobs.slice(i, i + 10);
        const results = await Promise.all(
          batch.map(async (blob: any) => {
            try {
              const blobRes = await fetch(blob.url, { headers });
              if (!blobRes.ok) { await blobRes.text(); return null; }
              const blobData = await blobRes.json();
              if (blobData.encoding === 'base64') {
                const decoded = atob(blobData.content.replace(/\n/g, ''));
                if (decoded.includes('\0')) return null;
                return { path: blob.path, content: decoded };
              }
              return { path: blob.path, content: blobData.content || '' };
            } catch {
              return null;
            }
          })
        );
        for (const r of results) {
          if (r) files[r.path] = r.content;
        }
      }

      return new Response(JSON.stringify({
        files,
        branch: targetBranch,
        truncated: treeData.truncated || blobs.length < treeData.tree.filter((i: any) => i.type === 'blob').length,
        totalFiles: treeData.tree.filter((i: any) => i.type === 'blob').length,
        fetchedFiles: Object.keys(files).length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'push') {
      if (!path || content === undefined || !message) {
        return new Response(JSON.stringify({ error: 'path, content, and message are required for push' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const pushBody: any = {
        message,
        content: btoa(content),
        branch: branch || 'main',
      };
      if (sha) pushBody.sha = sha;

      const pushRes = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
        { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(pushBody) }
      );
      const pushData = await pushRes.json();
      if (!pushRes.ok) {
        return new Response(JSON.stringify({ error: `Push failed: ${JSON.stringify(pushData)}` }), {
          status: pushRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        sha: pushData.content?.sha,
        commit: pushData.commit?.sha,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_sha') {
      const shaRes = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch || 'main'}`,
        { headers }
      );
      if (!shaRes.ok) {
        const text = await shaRes.text();
        return new Response(JSON.stringify({ error: text, status: shaRes.status }), {
          status: shaRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const shaData = await shaRes.json();
      return new Response(JSON.stringify({ sha: shaData.sha }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

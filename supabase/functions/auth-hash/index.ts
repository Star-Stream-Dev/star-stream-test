import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PBKDF2 with random salt
async function hashPasswordPBKDF2(password: string, salt?: Uint8Array): Promise<{ hash: string; salt: string }> {
  const enc = new TextEncoder();
  const actualSalt = salt || crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: actualSalt as ArrayBuffer, iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  const hashArray = Array.from(new Uint8Array(derived));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = Array.from(actualSalt).map(b => b.toString(16).padStart(2, '0')).join('');

  return { hash: hashHex, salt: saltHex };
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Legacy SHA-256 for migration comparison
async function legacySHA256(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a cryptographically secure session token
function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, username, password, admin_id, session_token, user_id, new_password, invite_code } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Helper: verify session token and return user_id
    const verifySession = async (token: string): Promise<string> => {
      const { data, error } = await supabase
        .from("user_sessions")
        .select("user_id")
        .eq("session_token", token)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      
      if (error || !data) {
        throw new Error("Invalid or expired session");
      }
      return data.user_id;
    };

    if (action === "login") {
      // Look up user
      const { data: userData, error: userError } = await supabase
        .from("app_users")
        .select("id, username, password_hash, password_salt")
        .eq("username", username)
        .maybeSingle();

      if (userError || !userData) {
        return new Response(JSON.stringify({ error: "Invalid username or password" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let matched = false;

      if (userData.password_salt) {
        // New PBKDF2 hash
        const saltBytes = hexToBytes(userData.password_salt);
        const { hash } = await hashPasswordPBKDF2(password, saltBytes);
        matched = hash === userData.password_hash;
      } else {
        // Legacy SHA-256 — check and migrate
        const legacyHash = await legacySHA256(password);
        matched = legacyHash === userData.password_hash;

        if (matched) {
          // Migrate to PBKDF2
          const { hash, salt } = await hashPasswordPBKDF2(password);
          await supabase
            .from("app_users")
            .update({ password_hash: hash, password_salt: salt })
            .eq("id", userData.id);
        }
      }

      if (!matched) {
        return new Response(JSON.stringify({ error: "Invalid username or password" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.id)
        .maybeSingle();

      // Create session token
      const sessionTokenValue = generateSessionToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

      await supabase.from("user_sessions").insert({
        user_id: userData.id,
        session_token: sessionTokenValue,
        expires_at: expiresAt,
      });

      return new Response(JSON.stringify({
        user_id: userData.id,
        username: userData.username,
        role: roleData?.role || "user",
        session_token: sessionTokenValue,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "create_user") {
      // Verify admin via session token
      const verifiedUserId = await verifySession(session_token);
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: verifiedUserId, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Only admins can create users" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { hash, salt } = await hashPasswordPBKDF2(password);
      const { data: newUser, error: createError } = await supabase
        .from("app_users")
        .insert({ username, password_hash: hash, password_salt: salt, created_by: verifiedUserId })
        .select("id")
        .single();

      if (createError) throw createError;

      await supabase.from("user_roles").insert({ user_id: newUser.id, role: "user" });

      return new Response(JSON.stringify({ user_id: newUser.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "update_password") {
      // Verify admin via session token
      const verifiedUserId = await verifySession(session_token);
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: verifiedUserId, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Only admins can update passwords" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { hash, salt } = await hashPasswordPBKDF2(new_password);
      await supabase
        .from("app_users")
        .update({ password_hash: hash, password_salt: salt })
        .eq("id", user_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "setup_admin") {
      // Check no admin exists
      const { data: adminExists } = await supabase.rpc("admin_exists");
      if (adminExists) {
        return new Response(JSON.stringify({ error: "Admin already exists" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { hash, salt } = await hashPasswordPBKDF2(password);
      const { data: newUser, error: createError } = await supabase
        .from("app_users")
        .insert({ username, password_hash: hash, password_salt: salt })
        .select("id")
        .single();

      if (createError) throw createError;

      await supabase.from("user_roles").insert({ user_id: newUser.id, role: "admin" });

      // Create session token for the new admin
      const sessionTokenValue = generateSessionToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      await supabase.from("user_sessions").insert({
        user_id: newUser.id,
        session_token: sessionTokenValue,
        expires_at: expiresAt,
      });

      return new Response(JSON.stringify({
        user_id: newUser.id, username, role: "admin",
        session_token: sessionTokenValue,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "create_admin") {
      // Create additional admin - requires valid admin session
      const verifiedUserId = await verifySession(session_token);
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: verifiedUserId, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Only admins can create admin users" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { hash, salt } = await hashPasswordPBKDF2(password);
      const { data: newUser, error: createError } = await supabase
        .from("app_users")
        .insert({ username, password_hash: hash, password_salt: salt, created_by: verifiedUserId })
        .select("id")
        .single();

      if (createError) throw createError;

      await supabase.from("user_roles").insert({ user_id: newUser.id, role: "admin" });

      return new Response(JSON.stringify({ user_id: newUser.id, username, role: "admin" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "logout") {
      // Invalidate session token
      if (session_token) {
        await supabase
          .from("user_sessions")
          .delete()
          .eq("session_token", session_token);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (action === "signup_with_invite") {
      const cleanUsername = typeof username === "string" ? username.trim() : "";
      const cleanCode = typeof invite_code === "string" ? invite_code.trim().toLowerCase() : "";

      if (!cleanCode) {
        return new Response(JSON.stringify({ error: "Missing invite code" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (cleanUsername.length < 3 || cleanUsername.length > 32 || !/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
        return new Response(JSON.stringify({ error: "Username must be 3-32 characters (letters, numbers, _ . -)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (typeof password !== "string" || password.length < 6 || password.length > 200) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { hash, salt } = await hashPasswordPBKDF2(password);
      const { data: redeemed, error: redeemError } = await supabase.rpc("redeem_invite_link", {
        p_code: cleanCode,
        p_username: cleanUsername,
        p_password_hash: hash,
        p_password_salt: salt,
      });

      if (redeemError || !redeemed || redeemed.length === 0) {
        return new Response(JSON.stringify({ error: redeemError?.message || "Could not redeem invite link" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newUserId = redeemed[0].user_id;
      const sessionTokenValue = generateSessionToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("user_sessions").insert({
        user_id: newUserId,
        session_token: sessionTokenValue,
        expires_at: expiresAt,
      });

      return new Response(JSON.stringify({
        user_id: newUserId,
        username: redeemed[0].username,
        role: "user",
        session_token: sessionTokenValue,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

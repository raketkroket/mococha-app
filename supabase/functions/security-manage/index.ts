import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateRecoveryCode(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (const b of bytes) code += chars[b % chars.length];
  return code.slice(0, 5) + "-" + code.slice(5, 10) + "-" + code.slice(10, 15) + "-" + code.slice(15, 20);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Server not configured." }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return jsonResponse({ error: "Not authenticated." }, 401);

    // Create client with the user's token to verify auth
    const userClient = createClient(supabaseUrl, req.headers.get("apikey") ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: "Not authenticated." }, 401);
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? "";

    // Service role client for privileged operations
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = (await req.json()) as { action: string; code?: string; factorId?: string };
    const { action } = body;

    // 1. Generate recovery codes
    if (action === "generate_recovery_codes") {
      // Delete all old codes first
      await admin.from("recovery_codes").delete().eq("user_id", userId);

      const codes: string[] = [];
      const hashes: { user_id: string; code_hash: string }[] = [];

      for (let i = 0; i < 10; i++) {
        const code = generateRecoveryCode();
        const hash = await sha256(code);
        codes.push(code);
        hashes.push({ user_id: userId, code_hash: hash });
      }

      await admin.from("recovery_codes").insert(hashes);

      await admin.from("security_settings").upsert({
        user_id: userId,
        recovery_codes_generated_at: new Date().toISOString(),
        last_security_update: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      await admin.from("security_events").insert({
        user_id: userId,
        event_type: "recovery_codes_generated",
        success: true,
      });

      // Send notification
      await sendSecurityNotification(admin, userId, userEmail, "recovery_codes_generated");

      return jsonResponse({ codes });
    }

    // 2. Verify recovery code
    if (action === "verify_recovery_code") {
      const code = body.code?.trim().toUpperCase();
      if (!code) return jsonResponse({ error: "Geen code opgegeven." }, 400);

      const hash = await sha256(code);
      const { data: records } = await admin
        .from("recovery_codes")
        .select("id, used_at")
        .eq("user_id", userId)
        .eq("code_hash", hash)
        .is("used_at", null)
        .maybeSingle();

      if (!records) {
        await admin.from("security_events").insert({
          user_id: userId,
          event_type: "recovery_code_failed",
          success: false,
        });
        return jsonResponse({ error: "Ongeldige of al gebruikte code." }, 400);
      }

      await admin.from("recovery_codes")
        .update({ used_at: new Date().toISOString(), used_by: userId })
        .eq("id", records.id);

      await admin.from("security_events").insert({
        user_id: userId,
        event_type: "recovery_code_used",
        success: true,
      });

      await sendSecurityNotification(admin, userId, userEmail, "recovery_code_used");

      return jsonResponse({ success: true });
    }

    // 3. List sessions
    if (action === "list_sessions") {
      const { data, error } = await admin.auth.admin.listSessions(userId);
      if (error) return jsonResponse({ error: "Sessies ophalen mislukt." }, 500);
      const sessions = (data?.sessions ?? []).map((s: Record<string, unknown>) => ({
        id: s.id,
        created_at: s.created_at,
        updated_at: s.updated_at,
        user_agent: (s.user_agent as string)?.slice(0, 100) ?? "Onbekend apparaat",
      }));
      return jsonResponse({ sessions });
    }

    // 4. Revoke other sessions
    if (action === "revoke_other_sessions") {
      const { data: sessionInfo } = await userClient.auth.getSession();
      const currentSessionId = sessionInfo.session?.user?.id;

      const { data: sessionsData } = await admin.auth.admin.listSessions(userId);
      for (const session of sessionsData?.sessions ?? []) {
        if (session.id !== currentSessionId) {
          await admin.auth.admin.signOut(userId, session.id);
        }
      }

      await admin.from("security_events").insert({
        user_id: userId,
        event_type: "sessions_revoked",
        success: true,
      });

      await sendSecurityNotification(admin, userId, userEmail, "sessions_revoked");

      return jsonResponse({ success: true });
    }

    // 5. Delete account (sensitive action)
    if (action === "delete_account") {
      const { error: delError } = await admin.auth.admin.deleteUser(userId);
      if (delError) return jsonResponse({ error: "Account verwijderen mislukt." }, 500);

      await admin.from("security_events").insert({
        user_id: userId,
        event_type: "account_deleted",
        success: true,
      });

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Unknown action." }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
});

async function sendSecurityNotification(
  admin: ReturnType<typeof createClient>,
  userId: string,
  userEmail: string,
  eventType: string,
): Promise<void> {
  const messages: Record<string, { title: string; body: string }> = {
    recovery_codes_generated: {
      title: "Herstelcodes gegenereerd",
      body: "Je hebt nieuwe herstelcodes gegenereerd. Bewaar ze veilig.",
    },
    recovery_code_used: {
      title: "Herstelcode gebruikt",
      body: "Er is een herstelcode gebruikt voor je account. Neem contact op als dit niet jij was.",
    },
    sessions_revoked: {
      title: "Alle sessies uitgelogd",
      body: "Je bent op alle andere apparaten uitgelogd.",
    },
  };

  const msg = messages[eventType];
  if (!msg) return;

  await admin.from("party_notifications").insert({
    user_id: userId,
    title: msg.title,
    body: msg.body,
  });

  // Try to send email if Resend is configured
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromAddress = Deno.env.get("EMAIL_FROM_ADDRESS") ?? "noreply@mococha.nl";
  const baseUrl = Deno.env.get("APP_BASE_URL") ?? "https://mococha-app.vercel.app";

  if (resendKey && userEmail) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `MOCOCHA <${fromAddress}>`,
          to: [userEmail],
          subject: msg.title,
          text: `${msg.title}\n\n${msg.body}\n\nMet vriendelijke groet,\nMOCOCHA`,
        }),
      });
    } catch {
      // Email is best-effort
    }
  }
}

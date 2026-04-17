import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const EMAIL_FROM = Deno.env.get("EMAIL_FROM")!;
const APP_URL = Deno.env.get("APP_URL")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function renderEmail({
  preheader,
  heading,
  body,
  ctaLabel,
  ctaUrl,
}: {
  preheader: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>LFG</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'IBM Plex Sans',-apple-system,system-ui,sans-serif;color:#e5e5e5;">
  <span style="display:none;opacity:0;color:transparent;">${preheader}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;border:0.5px solid #2a2a2a;background:#111;">
        <tr><td style="padding:32px 32px 24px 32px;border-bottom:0.5px solid #2a2a2a;">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.1em;color:#E8C547;text-transform:uppercase;">LFG</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px 0;font-weight:500;font-size:22px;line-height:1.3;color:#fff;">${heading}</h1>
          <div style="font-weight:300;font-size:15px;line-height:1.6;color:#b5b5b5;">${body}</div>
          ${
            ctaLabel && ctaUrl
              ? `
          <div style="margin-top:32px;">
            <a href="${ctaUrl}" style="display:inline-block;padding:14px 24px;background:#E8C547;color:#0a0a0a;text-decoration:none;font-weight:500;font-size:14px;font-family:'IBM Plex Mono',monospace;letter-spacing:0.05em;text-transform:uppercase;">${ctaLabel}</a>
          </div>`
              : ""
          }
        </td></tr>
        <tr><td style="padding:24px 32px;border-top:0.5px solid #2a2a2a;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#666;letter-spacing:0.05em;">
          LFG — Find your people. Show up. Run.<br>
          <a href="${APP_URL}/profile/edit" style="color:#666;text-decoration:underline;">Manage notification preferences</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
  return res.ok;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ok() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  try {
    const payload = await req.json();
    const { type, table, record, old_record } = payload;

    // === workout_participants table ===
    if (table === "workout_participants") {
      // INSERT with status=pending → request received (email host)
      if (type === "INSERT" && record.status === "pending") {
        const { data: workout } = await supabase
          .from("workouts")
          .select("id, name, workout_date, creator_id")
          .eq("id", record.workout_id)
          .single();

        const { data: requester } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", record.user_id)
          .single();

        // Fetch host email from auth.users (not profiles — profiles has no email column)
        const { data: hostAuth } = await supabase.auth.admin.getUserById(workout.creator_id);
        const { data: hostProfile } = await supabase
          .from("profiles")
          .select("email_notifications")
          .eq("id", workout.creator_id)
          .single();

        const hostEmail = hostAuth?.user?.email;
        if (!hostEmail || hostProfile?.email_notifications?.request_received === false)
          return ok();

        await sendEmail(
          hostEmail,
          `New join request — ${workout.name}`,
          renderEmail({
            preheader: `${requester?.full_name || "A runner"} wants to join your workout`,
            heading: `${requester?.full_name || "A runner"} wants to join`,
            body: `<strong style="color:#fff;">${workout.name}</strong><br>${fmtDate(workout.workout_date)}<br><br>Approve or decline from your workout page.`,
            ctaLabel: "Review request",
            ctaUrl: `${APP_URL}/workout/${workout.id}`,
          })
        );
      }

      // UPDATE: pending → accepted/rejected → email requester
      if (
        type === "UPDATE" &&
        old_record.status === "pending" &&
        record.status !== "pending"
      ) {
        const { data: workout } = await supabase
          .from("workouts")
          .select("id, name, workout_date, location")
          .eq("id", record.workout_id)
          .single();

        // Fetch requester email from auth.users
        const { data: requesterAuth } = await supabase.auth.admin.getUserById(record.user_id);
        const { data: requesterProfile } = await supabase
          .from("profiles")
          .select("full_name, email_notifications")
          .eq("id", record.user_id)
          .single();

        const requesterEmail = requesterAuth?.user?.email;
        if (!requesterEmail) return ok();

        if (
          record.status === "accepted" &&
          requesterProfile?.email_notifications?.request_accepted !== false
        ) {
          await sendEmail(
            requesterEmail,
            `You're in — ${workout.name}`,
            renderEmail({
              preheader: "Your request was accepted",
              heading: `You're confirmed for ${workout.name}`,
              body: `${fmtDate(workout.workout_date)}${workout.location ? `<br>${workout.location}` : ""}<br><br>See you there.`,
              ctaLabel: "View workout",
              ctaUrl: `${APP_URL}/workout/${workout.id}`,
            })
          );
        } else if (
          record.status === "rejected" &&
          requesterProfile?.email_notifications?.request_declined !== false
        ) {
          await sendEmail(
            requesterEmail,
            `Request declined — ${workout.name}`,
            renderEmail({
              preheader: "Your request was not accepted",
              heading: "Your request wasn't accepted",
              body: `Unfortunately the host couldn't fit you into <strong style="color:#fff;">${workout.name}</strong> this time. Plenty of other runs happening — find one that fits.`,
              ctaLabel: "Browse workouts",
              ctaUrl: APP_URL,
            })
          );
        }
      }
    }

    // === workouts table — cancellation ===
    if (
      table === "workouts" &&
      type === "UPDATE" &&
      !old_record.cancelled_at &&
      record.cancelled_at
    ) {
      const { data: participants } = await supabase
        .from("workout_participants")
        .select("user_id")
        .eq("workout_id", record.id)
        .eq("status", "accepted");

      for (const p of participants ?? []) {
        const { data: userAuth } = await supabase.auth.admin.getUserById(p.user_id);
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("email_notifications")
          .eq("id", p.user_id)
          .single();

        const email = userAuth?.user?.email;
        if (!email || userProfile?.email_notifications?.workout_cancelled === false)
          continue;

        await sendEmail(
          email,
          `Cancelled — ${record.name}`,
          renderEmail({
            preheader: "A workout you joined was cancelled",
            heading: `${record.name} was cancelled`,
            body: `The host cancelled this workout (${fmtDate(record.workout_date)}). No action needed on your end.`,
            ctaLabel: "Find another run",
            ctaUrl: APP_URL,
          })
        );
      }
    }

    return ok();
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

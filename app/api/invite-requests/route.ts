import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { sendInviteRequestNotification } from "@/lib/notifications/email";
import { createInviteEmailActionToken } from "@/lib/invite-request-email-actions";

type InviteRequestPayload = {
  email?: string;
  message?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getAppBaseUrl() {
  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  return base.replace(/\/+$/, "");
}

export async function POST(request: Request) {
  let payload: InviteRequestPayload;

  try {
    payload = (await request.json()) as InviteRequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = payload.email?.trim().toLowerCase();
  const message = payload.message?.trim();

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  if (!message || message.length < 10 || message.length > 2000) {
    return NextResponse.json(
      { error: "Message must be between 10 and 2000 characters." },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("invite_requests")
      .insert({
        email,
        message,
      })
      .select("id, status, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      const baseUrl = getAppBaseUrl();
      const approveToken = createInviteEmailActionToken(data.id, "approve");
      const denyToken = createInviteEmailActionToken(data.id, "deny");
      const approveUrl = `${baseUrl}/api/admin/invite-requests/email-action?requestId=${encodeURIComponent(
        data.id,
      )}&action=approve&token=${encodeURIComponent(approveToken)}`;
      const denyUrl = `${baseUrl}/api/admin/invite-requests/email-action?requestId=${encodeURIComponent(
        data.id,
      )}&action=deny&token=${encodeURIComponent(denyToken)}`;

      await sendInviteRequestNotification({
        requesterEmail: email,
        message,
        requestId: data.id,
        createdAt: data.created_at,
        approveUrl,
        denyUrl,
      });
    } catch (emailError) {
      console.error("Failed to send invite request notification email:", emailError);
    }

    return NextResponse.json({ inviteRequest: data }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server configuration error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

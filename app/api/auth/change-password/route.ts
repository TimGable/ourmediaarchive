import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/supabase/app-user";

export async function POST(request: Request) {
  const authContext = await getAuthContext(request);

  if (!authContext) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const payload = (body ?? {}) as {
    currentPassword?: unknown;
    newPassword?: unknown;
  };
  const currentPassword =
    typeof payload.currentPassword === "string" ? payload.currentPassword : "";
  const newPassword = typeof payload.newPassword === "string" ? payload.newPassword : "";

  if (!currentPassword) {
    return NextResponse.json({ error: "Current password is required." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    const verifier = createSupabaseServerClient();
    const { error: signInError } = await verifier.auth.signInWithPassword({
      email: authContext.email,
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authContext.authUserId,
      { password: newPassword },
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

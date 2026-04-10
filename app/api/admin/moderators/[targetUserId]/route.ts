import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { ensureAppUser, getAuthContext } from "@/lib/supabase/app-user";

type Params = {
  params: Promise<{ targetUserId: string }>;
};

async function setModeratorRole(request: Request, params: Params, isModerator: boolean) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { userId, isAdmin } = await ensureAppUser(auth.authUserId, auth.email);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { targetUserId } = await params.params;
  if (!targetUserId) {
    return NextResponse.json({ error: "Missing target user id." }, { status: 400 });
  }

  if (targetUserId === userId) {
    return NextResponse.json({ error: "You cannot change your own moderator role here." }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: updated, error } = await supabase
    .from("users")
    .update({ is_moderator: isModerator })
    .eq("id", targetUserId)
    .select("id, is_moderator")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!updated?.id) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    userId: updated.id,
    isModerator: Boolean(updated.is_moderator),
  });
}

export async function POST(request: Request, context: Params) {
  return setModeratorRole(request, context, true);
}

export async function DELETE(request: Request, context: Params) {
  return setModeratorRole(request, context, false);
}

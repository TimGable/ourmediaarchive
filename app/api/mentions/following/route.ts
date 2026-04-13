"use server";

import { NextResponse } from "next/server";
import { ensureAppUser, getAuthContext } from "@/lib/supabase/app-user";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const MAX_RESULTS = 20;

function escapeILikeValue(input: string) {
  return input.replace(/[%_]/g, (char) => `\\${char}`);
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { userId } = await ensureAppUser(auth.authUserId, auth.email);
    const supabase = createSupabaseServiceRoleClient();

    const { data: followRows, error: followError } = await supabase
      .from("follows")
      .select("artist_user_id")
      .eq("follower_user_id", userId);

    if (followError) {
      return NextResponse.json({ error: followError.message }, { status: 500 });
    }

    const followedIds = [
      ...new Set(
        (followRows ?? [])
          .map((row) => row.artist_user_id)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    if (followedIds.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = String(searchParams.get("query") || "").trim();
    const hasQuery = rawQuery.length > 0;
    const searchPattern = hasQuery ? `${escapeILikeValue(rawQuery.toLowerCase())}%` : null;

    let profilesQuery = supabase
      .from("profiles")
      .select("user_id, username, display_name")
      .in("user_id", followedIds);

    if (hasQuery && searchPattern) {
      profilesQuery = profilesQuery.or(
        `username.ilike.${searchPattern},display_name.ilike.${searchPattern}`,
      );
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const suggestions = (profiles ?? [])
      .filter((profile) => Boolean(profile.username))
      .map((profile) => ({
        userId: profile.user_id,
        username: profile.username,
        displayName: profile.display_name || null,
      }))
      .sort((a, b) => {
        const aLabel = (a.displayName || a.username).toLowerCase();
        const bLabel = (b.displayName || b.username).toLowerCase();
        return aLabel.localeCompare(bLabel);
      })
      .slice(0, MAX_RESULTS);

    return NextResponse.json({ suggestions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

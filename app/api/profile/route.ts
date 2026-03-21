import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  ensureAppUser,
  ensureProfile,
  getAuthContext,
} from "@/lib/supabase/app-user";

type PatchProfilePayload = {
  username?: string;
  displayName?: string;
  bio?: string;
  categoryTags?: ("music" | "visual" | "video")[];
};

const SIGNED_URL_TTL_SECONDS = 60 * 60;

async function buildProfileResponse(userId: string, isAdmin: boolean) {
  const supabase = createSupabaseServiceRoleClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, display_name, bio, avatar_asset_id")
    .eq("user_id", userId)
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: categories, error: categoriesError } = await supabase
    .from("profile_categories")
    .select("category")
    .eq("user_id", userId);

  if (categoriesError) {
    throw new Error(categoriesError.message);
  }

  let avatarUrl: string | null = null;
  if (profile.avatar_asset_id) {
    const { data: avatarAsset, error: avatarAssetError } = await supabase
      .from("media_assets")
      .select("bucket, object_key")
      .eq("id", profile.avatar_asset_id)
      .maybeSingle();

    if (avatarAssetError) {
      throw new Error(avatarAssetError.message);
    }

    if (avatarAsset?.bucket && avatarAsset.object_key) {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(avatarAsset.bucket)
        .createSignedUrl(avatarAsset.object_key, SIGNED_URL_TTL_SECONDS);

      if (!signedError) {
        avatarUrl = signedData?.signedUrl ?? null;
      }
    }
  }

  const [{ count: followerCount, error: followerCountError }, { count: followingCount, error: followingCountError }] =
    await Promise.all([
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("artist_user_id", userId),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_user_id", userId),
    ]);

  if (followerCountError) {
    throw new Error(followerCountError.message);
  }

  if (followingCountError) {
    throw new Error(followingCountError.message);
  }

  return {
    userId,
    username: profile.username,
    displayName: profile.display_name,
    bio: profile.bio,
    avatarUrl,
    categoryTags: (categories ?? []).map((row) => row.category),
    followerCount: followerCount || 0,
    followingCount: followingCount || 0,
    isAdmin,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { userId, isAdmin } = await ensureAppUser(auth.authUserId, auth.email);
    await ensureProfile(userId, auth.email);
    const profile = await buildProfileResponse(userId, isAdmin);

    return NextResponse.json({
      profile,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let payload: PatchProfilePayload;

  try {
    payload = (await request.json()) as PatchProfilePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { userId, isAdmin } = await ensureAppUser(auth.authUserId, auth.email);
    await ensureProfile(userId, auth.email);

    const supabase = createSupabaseServiceRoleClient();
    const updates: Record<string, string> = {};

    if (typeof payload.username === "string") {
      const username = payload.username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,32}$/.test(username)) {
        return NextResponse.json(
          { error: "Username must match ^[a-z0-9_]{3,32}$." },
          { status: 400 },
        );
      }

      const { data: existingUsername, error: existingUsernameError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", username)
        .maybeSingle();

      if (existingUsernameError) {
        return NextResponse.json({ error: existingUsernameError.message }, { status: 500 });
      }
      if (existingUsername?.user_id && existingUsername.user_id !== userId) {
        return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
      }

      updates.username = username;
    }

    if (typeof payload.displayName === "string") {
      const displayName = payload.displayName.trim();
      if (!displayName) {
        return NextResponse.json({ error: "Display name cannot be empty." }, { status: 400 });
      }
      updates.display_name = displayName;
    }

    if (typeof payload.bio === "string") {
      updates.bio = payload.bio.trim();
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    if (Array.isArray(payload.categoryTags)) {
      const normalized = Array.from(
        new Set(
          payload.categoryTags.filter(
            (tag): tag is "music" | "visual" | "video" =>
              tag === "music" || tag === "visual" || tag === "video",
          ),
        ),
      );

      const { error: deleteError } = await supabase
        .from("profile_categories")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      if (normalized.length > 0) {
        const rows = normalized.map((category) => ({ user_id: userId, category }));
        const { error: insertError } = await supabase.from("profile_categories").insert(rows);
        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
      }
    }

    const profile = await buildProfileResponse(userId, isAdmin);

    return NextResponse.json({
      profile,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

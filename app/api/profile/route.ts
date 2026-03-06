import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";

type PatchProfilePayload = {
  username?: string;
  displayName?: string;
  bio?: string;
  categoryTags?: ("music" | "visual" | "video")[];
};

type AuthContext = {
  authUserId: string;
  email: string;
};

function extractBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function toBaseUsername(email: string) {
  const localPart = email.split("@")[0] ?? "user";
  const cleaned = localPart.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return cleaned.slice(0, 24) || "user";
}

async function getAuthContext(request: Request): Promise<AuthContext | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  const authClient = createSupabaseServerClient();
  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user?.id || !data.user.email) return null;

  return {
    authUserId: data.user.id,
    email: data.user.email.toLowerCase(),
  };
}

async function ensureAppUser(authUserId: string, email: string) {
  const supabase = createSupabaseServiceRoleClient();

  const { data: byEmail, error: byEmailError } = await supabase
    .from("users")
    .select("id, auth_user_id, is_admin")
    .eq("email", email)
    .maybeSingle();

  if (byEmailError) {
    throw new Error(byEmailError.message);
  }

  if (byEmail?.id) {
    if (byEmail.auth_user_id && byEmail.auth_user_id !== authUserId) {
      throw new Error("Email is already linked to a different auth account.");
    }

    if (!byEmail.auth_user_id) {
      const { data: updated, error: updateError } = await supabase
        .from("users")
        .update({ auth_user_id: authUserId })
        .eq("id", byEmail.id)
        .select("id, is_admin")
        .single();

      if (updateError || !updated?.id) {
        throw new Error(updateError?.message ?? "Failed to link app user.");
      }

      return {
        userId: updated.id as string,
        isAdmin: Boolean(updated.is_admin),
      };
    }

    return {
      userId: byEmail.id as string,
      isAdmin: Boolean(byEmail.is_admin),
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("users")
    .insert({
      auth_user_id: authUserId,
      email,
    })
    .select("id, is_admin")
    .single();

  if (insertError || !inserted?.id) {
    throw new Error(insertError?.message ?? "Failed to ensure app user.");
  }

  return {
    userId: inserted.id as string,
    isAdmin: Boolean(inserted.is_admin),
  };
}

async function ensureProfile(userId: string, email: string) {
  const supabase = createSupabaseServiceRoleClient();

  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, bio")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (existing) return existing;

  const username = `${toBaseUsername(email)}_${userId.slice(0, 8)}`;
  const displayName = email.split("@")[0] ?? "new user";

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      username,
      display_name: displayName,
      bio: "",
    })
    .select("user_id, username, display_name, bio")
    .single();

  if (insertError) throw new Error(insertError.message);
  return inserted;
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { userId, isAdmin } = await ensureAppUser(auth.authUserId, auth.email);
    const profile = await ensureProfile(userId, auth.email);

    const supabase = createSupabaseServiceRoleClient();
    const { data: categories, error: categoriesError } = await supabase
      .from("profile_categories")
      .select("category")
      .eq("user_id", userId);

    if (categoriesError) {
      return NextResponse.json({ error: categoriesError.message }, { status: 500 });
    }

    return NextResponse.json({
      profile: {
        userId,
        username: profile.username,
        displayName: profile.display_name,
        bio: profile.bio,
        categoryTags: (categories ?? []).map((row) => row.category),
        isAdmin,
      },
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, display_name, bio")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const { data: categories, error: categoriesError } = await supabase
      .from("profile_categories")
      .select("category")
      .eq("user_id", userId);

    if (categoriesError) {
      return NextResponse.json({ error: categoriesError.message }, { status: 500 });
    }

    return NextResponse.json({
      profile: {
        userId,
        username: profile.username,
        displayName: profile.display_name,
        bio: profile.bio,
        categoryTags: (categories ?? []).map((row) => row.category),
        isAdmin,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

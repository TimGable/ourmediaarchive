import { NextResponse } from "next/server";
import {
  ensureAppUser,
  ensureProfile,
  getAuthContext,
} from "@/lib/supabase/app-user";
import { createMentionNotifications } from "@/lib/mentions";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const MAX_COMMENT_LENGTH = 1000;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

async function createSignedAvatarUrl(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  asset: {
    bucket: string;
    object_key: string;
  },
) {
  const { data, error } = await supabase.storage
    .from(asset.bucket)
    .createSignedUrl(asset.object_key, SIGNED_URL_TTL_SECONDS);

  if (error) {
    return null;
  }

  return data?.signedUrl ?? null;
}

async function buildPostPayload(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  postId: string,
  currentUserId: string | null,
  canModerate: boolean,
) {
  const { data: post, error: postError } = await supabase
    .from("announcement_posts")
    .select("id, author_user_id, body, created_at")
    .eq("id", postId)
    .maybeSingle();

  if (postError) {
    throw new Error(postError.message);
  }

  if (!post) {
    return null;
  }

  const [
    { data: likes, error: likesError },
    { data: viewerLike, error: viewerLikeError },
    { data: comments, error: commentsError },
  ] = await Promise.all([
    supabase
      .from("announcement_likes")
      .select("user_id")
      .eq("announcement_post_id", postId),
    currentUserId
      ? supabase
          .from("announcement_likes")
          .select("announcement_post_id")
          .eq("announcement_post_id", postId)
          .eq("user_id", currentUserId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("announcement_comments")
      .select("id, user_id, body, is_deleted, created_at")
      .eq("announcement_post_id", postId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true }),
  ]);

  if (likesError) throw new Error(likesError.message);
  if (viewerLikeError) throw new Error(viewerLikeError.message);
  if (commentsError) throw new Error(commentsError.message);

  const profileUserIds = [
    post.author_user_id,
    ...new Set((comments ?? []).map((comment) => comment.user_id).filter(Boolean)),
  ];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, avatar_asset_id")
    .in("user_id", profileUserIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const avatarAssetIds = [...new Set((profiles ?? []).map((profile) => profile.avatar_asset_id).filter(Boolean))];
  const avatarUrlsByAssetId = new Map<string, string | null>();

  if (avatarAssetIds.length > 0) {
    const { data: avatarAssets, error: avatarAssetsError } = await supabase
      .from("media_assets")
      .select("id, bucket, object_key")
      .in("id", avatarAssetIds);

    if (avatarAssetsError) {
      throw new Error(avatarAssetsError.message);
    }

    for (const asset of avatarAssets ?? []) {
      avatarUrlsByAssetId.set(asset.id, await createSignedAvatarUrl(supabase, asset));
    }
  }

  const profileByUserId = new Map(
    (profiles ?? []).map((profile) => [
      profile.user_id,
      {
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_asset_id
          ? avatarUrlsByAssetId.get(profile.avatar_asset_id) ?? null
          : null,
      },
    ]),
  );

  return {
    id: post.id,
    body: post.body,
    createdAt: post.created_at,
    canDelete: canModerate || currentUserId === post.author_user_id,
    author: profileByUserId.get(post.author_user_id) ?? null,
    likeCount: (likes ?? []).length,
    commentCount: (comments ?? []).length,
    isLiked: Boolean(viewerLike),
    comments: (comments ?? []).map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.created_at,
      canDelete: canModerate || currentUserId === comment.user_id,
      author: profileByUserId.get(comment.user_id) ?? null,
    })),
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ postId: string }> },
) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { userId, isAdmin, isModerator } = await ensureAppUser(auth.authUserId, auth.email);
    await ensureProfile(userId, auth.email);
    const canModerate = Boolean(isAdmin || isModerator);
    const { postId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const action = body?.action;
    const supabase = createSupabaseServiceRoleClient();

    if (action === "toggle-like") {
      const { data: existingLike, error: existingLikeError } = await supabase
        .from("announcement_likes")
        .select("announcement_post_id")
        .eq("announcement_post_id", postId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingLikeError) {
        throw new Error(existingLikeError.message);
      }

      if (existingLike) {
        const { error } = await supabase
          .from("announcement_likes")
          .delete()
          .eq("announcement_post_id", postId)
          .eq("user_id", userId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("announcement_likes").insert({
          announcement_post_id: postId,
          user_id: userId,
        });
        if (error) throw new Error(error.message);
      }
    } else if (action === "comment") {
      const commentBody = String(body?.body || "").trim();
      if (!commentBody) {
        return NextResponse.json({ error: "Write a reply before posting." }, { status: 400 });
      }
      if (commentBody.length > MAX_COMMENT_LENGTH) {
        return NextResponse.json(
          { error: `Replies must be ${MAX_COMMENT_LENGTH} characters or fewer.` },
          { status: 400 },
        );
      }

      const { error } = await supabase.from("announcement_comments").insert({
        announcement_post_id: postId,
        user_id: userId,
        body: commentBody,
      });
      if (error) throw new Error(error.message);

      try {
        await createMentionNotifications({
          supabase,
          actorUserId: userId,
          body: commentBody,
          data: {
            source: "announcement_reply",
          },
        });
      } catch (notificationError) {
        console.error("Failed to create announcement reply mention notifications:", notificationError);
      }
    } else {
      return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }

    const payload = await buildPostPayload(supabase, postId, userId, canModerate);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ postId: string }> },
) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { userId, isAdmin, isModerator } = await ensureAppUser(auth.authUserId, auth.email);
    const canModerate = Boolean(isAdmin || isModerator);
    const { postId } = await context.params;
    const supabase = createSupabaseServiceRoleClient();
    const url = new URL(request.url);
    const commentId = url.searchParams.get("commentId");

    if (commentId) {
      const { data: comment, error: commentError } = await supabase
        .from("announcement_comments")
        .select("id, user_id")
        .eq("id", commentId)
        .eq("announcement_post_id", postId)
        .maybeSingle();

      if (commentError) throw new Error(commentError.message);
      if (!comment) {
        return NextResponse.json({ error: "Reply not found." }, { status: 404 });
      }
      if (!canModerate && comment.user_id !== userId) {
        return NextResponse.json({ error: "You can only remove your own replies." }, { status: 403 });
      }

      const { error } = await supabase
        .from("announcement_comments")
        .delete()
        .eq("id", commentId)
        .eq("announcement_post_id", postId);
      if (error) throw new Error(error.message);

      const payload = await buildPostPayload(supabase, postId, userId, canModerate);
      return NextResponse.json(payload);
    }

    const { data: post, error: postError } = await supabase
      .from("announcement_posts")
      .select("id, author_user_id")
      .eq("id", postId)
      .maybeSingle();

    if (postError) throw new Error(postError.message);
    if (!post) {
      return NextResponse.json({ error: "Announcement not found." }, { status: 404 });
    }
    if (!canModerate && post.author_user_id !== userId) {
      return NextResponse.json({ error: "You cannot delete this announcement." }, { status: 403 });
    }

    const { error } = await supabase.from("announcement_posts").delete().eq("id", postId);
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, postId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

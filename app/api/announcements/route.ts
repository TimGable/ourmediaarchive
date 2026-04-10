import { NextResponse } from "next/server";
import {
  ensureAppUser,
  ensureProfile,
  getAuthContext,
} from "@/lib/supabase/app-user";
import { createMentionNotifications } from "@/lib/mentions";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const MAX_ANNOUNCEMENT_LENGTH = 3000;
const MAX_POSTS = 40;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

type AnnouncementProfileRow = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_asset_id: string | null;
};

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

async function buildAnnouncementsPayload(request: Request) {
  const supabase = createSupabaseServiceRoleClient();
  const auth = await getAuthContext(request);

  let currentUserId: string | null = null;
  let canPost = false;

  if (auth) {
    const ensuredUser = await ensureAppUser(auth.authUserId, auth.email);
    await ensureProfile(ensuredUser.userId, auth.email);
    currentUserId = ensuredUser.userId;
    canPost = Boolean(ensuredUser.isAdmin || ensuredUser.isModerator);
  }

  const { data: posts, error: postsError } = await supabase
    .from("announcement_posts")
    .select("id, author_user_id, body, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(MAX_POSTS);

  if (postsError) {
    throw new Error(postsError.message);
  }

  const postIds = (posts ?? []).map((post) => post.id);
  const authorUserIds = [...new Set((posts ?? []).map((post) => post.author_user_id).filter(Boolean))];

  const [
    { data: likes, error: likesError },
    { data: comments, error: commentsError },
    { data: viewerLikes, error: viewerLikesError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    postIds.length > 0
      ? supabase.from("announcement_likes").select("announcement_post_id, user_id").in("announcement_post_id", postIds)
      : Promise.resolve({ data: [], error: null }),
    postIds.length > 0
      ? supabase
          .from("announcement_comments")
          .select("id, announcement_post_id, user_id, body, is_deleted, created_at")
          .in("announcement_post_id", postIds)
          .eq("is_deleted", false)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    currentUserId && postIds.length > 0
      ? supabase
          .from("announcement_likes")
          .select("announcement_post_id")
          .in("announcement_post_id", postIds)
          .eq("user_id", currentUserId)
      : Promise.resolve({ data: [], error: null }),
    authorUserIds.length > 0
      ? supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_asset_id")
          .in("user_id", authorUserIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (likesError) throw new Error(likesError.message);
  if (commentsError) throw new Error(commentsError.message);
  if (viewerLikesError) throw new Error(viewerLikesError.message);
  if (profilesError) throw new Error(profilesError.message);

  const commentAuthorIds = [...new Set((comments ?? []).map((comment) => comment.user_id).filter(Boolean))];
  const missingCommentAuthorIds = commentAuthorIds.filter(
    (userId) => !(profiles ?? []).some((profile) => profile.user_id === userId),
  );

  let commentProfiles: AnnouncementProfileRow[] = [];
  if (missingCommentAuthorIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_asset_id")
      .in("user_id", missingCommentAuthorIds);
    if (error) {
      throw new Error(error.message);
    }
    commentProfiles = data ?? [];
  }

  const allProfiles = [...(profiles ?? []), ...commentProfiles];
  const avatarAssetIds = [...new Set(allProfiles.map((profile) => profile.avatar_asset_id).filter(Boolean))];

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
    allProfiles.map((profile) => [
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

  const likeCounts = new Map<string, number>();
  for (const like of likes ?? []) {
    likeCounts.set(
      like.announcement_post_id,
      (likeCounts.get(like.announcement_post_id) ?? 0) + 1,
    );
  }

  const commentsByPostId = new Map<
    string,
    Array<{
      id: string;
      body: string;
      createdAt: string;
      canDelete: boolean;
      author: { username: string; displayName: string; avatarUrl: string | null } | null;
    }>
  >();
  for (const comment of comments ?? []) {
    const entry = {
      id: comment.id,
      body: comment.body,
      createdAt: comment.created_at,
      canDelete: currentUserId === comment.user_id || canPost,
      author: profileByUserId.get(comment.user_id) ?? null,
    };
    commentsByPostId.set(comment.announcement_post_id, [
      ...(commentsByPostId.get(comment.announcement_post_id) ?? []),
      entry,
    ]);
  }

  const likedPostIds = new Set((viewerLikes ?? []).map((row) => row.announcement_post_id));

  return {
    canPost,
    posts: (posts ?? []).map((post) => ({
      id: post.id,
      body: post.body,
      createdAt: post.created_at,
      canDelete: canPost || currentUserId === post.author_user_id,
      author: profileByUserId.get(post.author_user_id) ?? null,
      likeCount: likeCounts.get(post.id) ?? 0,
      commentCount: (commentsByPostId.get(post.id) ?? []).length,
      isLiked: likedPostIds.has(post.id),
      comments: commentsByPostId.get(post.id) ?? [],
    })),
  };
}

export async function GET(request: Request) {
  try {
    const payload = await buildAnnouncementsPayload(request);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { userId, isAdmin, isModerator } = await ensureAppUser(auth.authUserId, auth.email);
    await ensureProfile(userId, auth.email);

    if (!isAdmin && !isModerator) {
      return NextResponse.json({ error: "Only moderators can post announcements." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const message = String(body?.body || "").trim();

    if (!message) {
      return NextResponse.json({ error: "Write an announcement before posting." }, { status: 400 });
    }

    if (message.length > MAX_ANNOUNCEMENT_LENGTH) {
      return NextResponse.json(
        { error: `Announcements must be ${MAX_ANNOUNCEMENT_LENGTH} characters or fewer.` },
        { status: 400 },
      );
    }

    const supabase = createSupabaseServiceRoleClient();
    const { error: insertError } = await supabase.from("announcement_posts").insert({
      author_user_id: userId,
      body: message,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    try {
      await createMentionNotifications({
        supabase,
        actorUserId: userId,
        body: message,
        data: {
          source: "announcement",
        },
      });
    } catch (notificationError) {
      console.error("Failed to create announcement mention notifications:", notificationError);
    }

    const payload = await buildAnnouncementsPayload(request);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

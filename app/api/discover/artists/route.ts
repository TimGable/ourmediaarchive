import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const VALID_CATEGORIES = new Set(["music", "visual", "video"]);
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function formatReleaseType(value: string | null) {
  if (value === "ep") {
    return "EP";
  }

  if (value === "album") {
    return "Album";
  }

  return "Single";
}

function formatTrackDuration(durationMs: number | null) {
  if (!durationMs || durationMs <= 0) {
    return "--:--";
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash || 1;
}

function createSeededRandom(seed: number) {
  let current = seed >>> 0;
  return () => {
    current = (current * 1664525 + 1013904223) >>> 0;
    return current / 4294967296;
  };
}

function buildWaveformData(seedSource: string) {
  const random = createSeededRandom(hashString(seedSource));
  return Array.from({ length: 36 }, (_, index) => {
    const base = 24 + random() * 52;
    const shaped = index % 7 === 0 ? base * 0.7 : base;
    return Math.max(10, Math.min(92, Math.round(shaped)));
  });
}

async function createSignedAssetUrl(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  bucket: string | null,
  objectKey: string | null,
) {
  if (!bucket || !objectKey) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectKey, SIGNED_URL_TTL_SECONDS);

  if (error) {
    return null;
  }

  return data?.signedUrl ?? null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = String(searchParams.get("category") || "music").trim().toLowerCase();

    if (!VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();

    const { data: mediaItems, error: mediaItemsError } = await supabase
      .from("media_items")
      .select(
        "id, owner_user_id, media_kind, music_release_type, title, description, duration_ms, published_at, primary_asset_id",
      )
      .eq("media_kind", category)
      .eq("state", "ready")
      .eq("visibility", "public")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(200);

    if (mediaItemsError) {
      return NextResponse.json({ error: mediaItemsError.message }, { status: 500 });
    }

    const items = mediaItems ?? [];
    if (items.length === 0) {
      return NextResponse.json({ artists: [] });
    }

    const userIds = Array.from(new Set(items.map((item) => item.owner_user_id)));
    const primaryAssetIds = items
      .map((item) => item.primary_asset_id)
      .filter((value): value is string => Boolean(value));
    const mediaItemIds = items.map((item) => item.id);

    const [{ data: profiles, error: profilesError }, { data: thumbnails, error: thumbnailsError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, username, display_name, bio, avatar_asset_id")
          .in("user_id", userIds),
        supabase
          .from("media_assets")
          .select("id, media_item_id, bucket, object_key")
          .in("media_item_id", mediaItemIds)
          .eq("role", "thumbnail"),
      ]);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    if (thumbnailsError) {
      return NextResponse.json({ error: thumbnailsError.message }, { status: 500 });
    }

    const avatarAssetIds = (profiles ?? [])
      .map((profile) => profile.avatar_asset_id)
      .filter((value): value is string => Boolean(value));

    const uniqueAssetIds = Array.from(new Set([...primaryAssetIds, ...avatarAssetIds]));
    let assets: { id: string; bucket: string; object_key: string }[] = [];
    if (uniqueAssetIds.length > 0) {
      const { data: assetRows, error: assetsError } = await supabase
        .from("media_assets")
        .select("id, bucket, object_key")
        .in("id", uniqueAssetIds);

      if (assetsError) {
        return NextResponse.json({ error: assetsError.message }, { status: 500 });
      }

      assets = assetRows ?? [];
    }

    const [{ data: followerRows, error: followerRowsError }, { data: followingRows, error: followingRowsError }] =
      await Promise.all([
        supabase.from("follows").select("artist_user_id").in("artist_user_id", userIds),
        supabase.from("follows").select("follower_user_id").in("follower_user_id", userIds),
      ]);

    if (followerRowsError) {
      return NextResponse.json({ error: followerRowsError.message }, { status: 500 });
    }

    if (followingRowsError) {
      return NextResponse.json({ error: followingRowsError.message }, { status: 500 });
    }

    const assetRows = assets;
    const thumbnailRows = thumbnails ?? [];

    const signedAssetEntries = await Promise.all(
      assetRows.map(async (asset) => [
        asset.id,
        await createSignedAssetUrl(supabase, asset.bucket, asset.object_key),
      ]),
    );
    const signedThumbnailEntries = await Promise.all(
      thumbnailRows.map(async (asset) => [
        asset.media_item_id,
        await createSignedAssetUrl(supabase, asset.bucket, asset.object_key),
      ]),
    );

    const assetUrlById = new Map<string, string | null>(signedAssetEntries);
    const thumbnailUrlByItemId = new Map<string, string | null>(signedThumbnailEntries);

    const followerCountByArtistId = new Map<string, number>();
    for (const row of followerRows ?? []) {
      followerCountByArtistId.set(
        row.artist_user_id,
        (followerCountByArtistId.get(row.artist_user_id) || 0) + 1,
      );
    }

    const followingCountByUserId = new Map<string, number>();
    for (const row of followingRows ?? []) {
      followingCountByUserId.set(
        row.follower_user_id,
        (followingCountByUserId.get(row.follower_user_id) || 0) + 1,
      );
    }

    const itemsByUserId = new Map<string, typeof items>();
    for (const item of items) {
      if (!itemsByUserId.has(item.owner_user_id)) {
        itemsByUserId.set(item.owner_user_id, []);
      }
      itemsByUserId.get(item.owner_user_id)?.push(item);
    }

    const artists = (profiles ?? [])
      .map((profile) => {
        const artistItems = itemsByUserId.get(profile.user_id) || [];
        if (artistItems.length === 0) {
          return null;
        }

        const avatarUrl = profile.avatar_asset_id
          ? assetUrlById.get(profile.avatar_asset_id) ?? null
          : null;

        const releases = artistItems.map((item) => {
          const audioUrl = item.primary_asset_id ? assetUrlById.get(item.primary_asset_id) ?? null : null;
          const coverArtUrl = thumbnailUrlByItemId.get(item.id) ?? avatarUrl ?? "";

          return {
            id: item.id,
            title: item.title,
            description: item.description,
            type: formatReleaseType(item.music_release_type),
            coverArt: coverArtUrl,
            tracks: [
              {
                id: item.id,
                title: item.title,
                audioUrl: audioUrl || "",
                duration: formatTrackDuration(item.duration_ms),
                waveformData: buildWaveformData(`${item.id}:${item.title}`),
              },
            ],
          };
        });

        return {
          id: profile.user_id,
          username: profile.username,
          name: profile.display_name,
          avatar: avatarUrl || "",
          bio: profile.bio,
          featuredImage: releases[0]?.coverArt || avatarUrl || "",
          releaseCount: releases.length,
          followerCount: followerCountByArtistId.get(profile.user_id) || 0,
          followingCount: followingCountByUserId.get(profile.user_id) || 0,
          isFollowing: false,
          releases,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ artists });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

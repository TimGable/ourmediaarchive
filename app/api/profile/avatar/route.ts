import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  ensureAppUser,
  ensureProfile,
  getAuthContext,
} from "@/lib/supabase/app-user";
import { getSupabaseStorageBucket } from "@/lib/supabase/config";
import { ensureStorageBucketExists } from "@/lib/supabase/storage";

const MAX_AVATAR_SIZE_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const BLOCKED_MIME_TYPES = new Set(["image/svg+xml"]);

function sanitizeFileName(fileName: string) {
  const normalized = fileName.trim().toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-");
  const collapsed = normalized.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return collapsed || "avatar.bin";
}

function buildAvatarObjectKey(params: {
  userId: string;
  assetId: string;
  fileName: string;
}) {
  return `u/${params.userId}/profile/avatar/${params.assetId}/v1/original/${params.fileName}`;
}

function isAllowedAvatarMimeType(mimeType: string) {
  return mimeType.startsWith("image/") && !BLOCKED_MIME_TYPES.has(mimeType);
}

async function loadCurrentAvatarAsset(userId: string) {
  const supabase = createSupabaseServiceRoleClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("avatar_asset_id")
    .eq("user_id", userId)
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile.avatar_asset_id) {
    return null;
  }

  const { data: asset, error: assetError } = await supabase
    .from("media_assets")
    .select("id, bucket, object_key")
    .eq("id", profile.avatar_asset_id)
    .maybeSingle();

  if (assetError) {
    throw new Error(assetError.message);
  }

  return asset;
}

async function deleteAvatarAsset(asset: { id: string; bucket: string; object_key: string } | null) {
  if (!asset) {
    return;
  }

  const supabase = createSupabaseServiceRoleClient();
  await supabase.storage.from(asset.bucket).remove([asset.object_key]);
  await supabase.from("media_assets").delete().eq("id", asset.id);
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data." }, { status: 400 });
  }

  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { userId } = await ensureAppUser(auth.authUserId, auth.email);
    await ensureProfile(userId, auth.email);

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "An image file is required." }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "The selected image is empty." }, { status: 400 });
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Avatar images must be 10 MB or smaller." },
        { status: 400 },
      );
    }

    if (!isAllowedAvatarMimeType(file.type || "")) {
      return NextResponse.json(
        { error: "Please choose a JPG, PNG, WEBP, GIF, AVIF, or other standard image file." },
        { status: 400 },
      );
    }

    const currentAvatarAsset = await loadCurrentAvatarAsset(userId);
    const supabase = createSupabaseServiceRoleClient();
    const bucket = getSupabaseStorageBucket();
    await ensureStorageBucketExists(bucket);
    const assetId = crypto.randomUUID();
    const safeFileName = sanitizeFileName(file.name || "avatar.bin");
    const objectKey = buildAvatarObjectKey({
      userId,
      assetId,
      fileName: safeFileName,
    });
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(bucket).upload(objectKey, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json(
        { error: `Failed to upload avatar to storage: ${uploadError.message}` },
        { status: 500 },
      );
    }

    const { error: assetInsertError } = await supabase.from("media_assets").insert({
      id: assetId,
      owner_user_id: userId,
      role: "avatar",
      storage_provider: "supabase",
      bucket,
      object_key: objectKey,
      file_name: safeFileName,
      mime_type: file.type || "application/octet-stream",
      file_size_bytes: file.size,
    });

    if (assetInsertError) {
      await supabase.storage.from(bucket).remove([objectKey]);
      return NextResponse.json({ error: assetInsertError.message }, { status: 500 });
    }

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ avatar_asset_id: assetId })
      .eq("user_id", userId);

    if (profileUpdateError) {
      await supabase.from("media_assets").delete().eq("id", assetId);
      await supabase.storage.from(bucket).remove([objectKey]);
      return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });
    }

    const { data: signedData } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectKey, SIGNED_URL_TTL_SECONDS);

    if (currentAvatarAsset) {
      await deleteAvatarAsset(currentAvatarAsset);
    }

    return NextResponse.json(
      {
        avatar: {
          id: assetId,
          url: signedData?.signedUrl ?? null,
          fileName: safeFileName,
          mimeType: file.type || "application/octet-stream",
          fileSizeBytes: file.size,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { userId } = await ensureAppUser(auth.authUserId, auth.email);
    await ensureProfile(userId, auth.email);

    const currentAvatarAsset = await loadCurrentAvatarAsset(userId);
    if (!currentAvatarAsset) {
      return NextResponse.json({ avatar: null });
    }

    const supabase = createSupabaseServiceRoleClient();
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ avatar_asset_id: null })
      .eq("user_id", userId);

    if (profileUpdateError) {
      return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });
    }

    await deleteAvatarAsset(currentAvatarAsset);

    return NextResponse.json({ avatar: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { createSupabaseServiceRoleClient } from "./server";

export async function ensureStorageBucketExists(bucketName: string) {
  const supabase = createSupabaseServiceRoleClient();

  const { data: existingBucket, error: lookupError } = await supabase.storage.getBucket(bucketName);
  if (!lookupError && existingBucket) {
    return;
  }

  const lookupMessage = lookupError?.message?.toLowerCase() || "";
  const isMissingBucket =
    lookupMessage.includes("not found") || lookupMessage.includes("does not exist");

  if (lookupError && !isMissingBucket) {
    throw new Error(`Failed to inspect storage bucket: ${lookupError.message}`);
  }

  const { error: createError } = await supabase.storage.createBucket(bucketName, {
    public: false,
  });

  if (createError && !createError.message?.toLowerCase().includes("already exists")) {
    throw new Error(`Failed to create storage bucket: ${createError.message}`);
  }
}

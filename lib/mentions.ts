import { createAppNotification } from "@/lib/notifications/app-notifications";
import type { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const MENTION_PATTERN = /@([a-z0-9_]{3,32})/gi;

export function extractMentionUsernames(text: string) {
  const usernames = new Set<string>();

  for (const match of String(text || "").matchAll(MENTION_PATTERN)) {
    if (match[1]) {
      usernames.add(match[1].toLowerCase());
    }
  }

  return [...usernames];
}

export async function createMentionNotifications(input: {
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>;
  actorUserId: string;
  body: string;
  mediaItemId?: string | null;
  commentId?: string | null;
  data?: Record<string, unknown>;
}) {
  const usernames = extractMentionUsernames(input.body);
  if (usernames.length === 0) {
    return;
  }

  const { data: profiles, error } = await input.supabase
    .from("profiles")
    .select("user_id, username")
    .in("username", usernames);

  if (error) {
    throw new Error(error.message);
  }

  await Promise.all(
    (profiles ?? []).map((profile) =>
      createAppNotification({
        recipientUserId: profile.user_id,
        actorUserId: input.actorUserId,
        type: "mention",
        mediaItemId: input.mediaItemId ?? null,
        commentId: input.commentId ?? null,
        data: {
          mentionedUsername: profile.username,
          bodyPreview:
            input.body.length > 120 ? `${input.body.slice(0, 117)}...` : input.body,
          ...(input.data ?? {}),
        },
      }),
    ),
  );
}

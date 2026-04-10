"use client";

import Link from "next/link";
import { buildPublicProfilePath } from "@/lib/media-slugs";

const MENTION_PATTERN = /@([a-z0-9_]{3,32})/gi;

export function MentionText({ text }) {
  const value = String(text || "");
  const parts = [];
  let lastIndex = 0;

  for (const match of value.matchAll(MENTION_PATTERN)) {
    const matchText = match[0];
    const username = match[1]?.toLowerCase();
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      parts.push(value.slice(lastIndex, matchIndex));
    }

    parts.push(
      <Link
        key={`${username}-${matchIndex}`}
        href={buildPublicProfilePath(username)}
        className="font-medium text-white underline decoration-white/25 underline-offset-4 transition-colors hover:text-gray-300 hover:decoration-white/60"
      >
        {matchText}
      </Link>,
    );

    lastIndex = matchIndex + matchText.length;
  }

  if (lastIndex < value.length) {
    parts.push(value.slice(lastIndex));
  }

  return <>{parts}</>;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MentionSuggestion = {
  userId: string;
  username: string;
  displayName: string | null;
};

export function useFollowMentionSuggestions() {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/mentions/following?query=${encodeURIComponent(query || "")}`,
        {
          signal: controller.signal,
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (controller.signal.aborted) {
        return;
      }

      if (!response.ok) {
        setSuggestions([]);
        return;
      }

      setSuggestions(
        Array.isArray(payload?.suggestions) ? payload.suggestions : [],
      );
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      setSuggestions([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    abortRef.current?.abort();
    setSuggestions([]);
    setLoading(false);
  }, []);

  return {
    suggestions,
    loading,
    fetchSuggestions,
    clearSuggestions,
  };
}

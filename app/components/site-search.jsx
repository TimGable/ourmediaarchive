"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search, UserCircle2, Music, ImageIcon, Video, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { PAGE_TRANSITION, SOFT_BUTTON_HOVER, SOFT_BUTTON_TAP, SOFT_PANEL_REVEAL } from "@/lib/motion";

function SearchResultRow({ icon, title, subtitle, previewUrl, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition-colors hover:border-white/10 hover:bg-white/[0.04]"
      whileHover={SOFT_BUTTON_HOVER}
      whileTap={SOFT_BUTTON_TAP}
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
        {previewUrl ? (
          <img src={previewUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          icon
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white">{title}</p>
        <p className="mt-1 truncate text-xs uppercase tracking-[0.16em] text-gray-500">{subtitle}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-gray-500" />
    </motion.button>
  );
}

export function SiteSearch({ className = "", compact = false }) {
  const router = useRouter();
  const rootRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({
    artists: [],
    media: { music: [], visual: [], video: [] },
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const trimmedQuery = query.trim();
  const hasResults = useMemo(() => {
    return (
      results.artists.length > 0 ||
      results.media.music.length > 0 ||
      results.media.visual.length > 0 ||
      results.media.video.length > 0
    );
  }, [results]);

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setResults({ artists: [], media: { music: [], visual: [], video: [] } });
      setError("");
      return undefined;
    }

    setIsLoading(true);
    setError("");

    const timer = setTimeout(async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload?.error || "Search failed.");
        setResults({ artists: [], media: { music: [], visual: [], video: [] } });
        setIsLoading(false);
        return;
      }

      setResults({
        artists: Array.isArray(payload?.artists) ? payload.artists : [],
        media: {
          music: Array.isArray(payload?.media?.music) ? payload.media.music : [],
          visual: Array.isArray(payload?.media?.visual) ? payload.media.visual : [],
          video: Array.isArray(payload?.media?.video) ? payload.media.video : [],
        },
      });
      setIsLoading(false);
      setIsOpen(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const openPath = (path) => {
    setIsOpen(false);
    setQuery("");
    router.push(path);
  };

  const submitSearch = () => {
    if (trimmedQuery.length < 2) {
      return;
    }

    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
  };

  const inputClassName = compact
    ? "h-12 rounded-[1.35rem] px-4"
    : "h-14 rounded-[1.65rem] px-5";

  return (
    <div ref={rootRef} className={`relative w-full ${className}`.trim()}>
      <form
        className="relative"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
      >
        <button
          type="submit"
          aria-label="Search"
          className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition-colors hover:text-white"
        >
          <Search className="h-4 w-4" />
        </button>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (trimmedQuery.length >= 2) {
              setIsOpen(true);
            }
          }}
          placeholder="search artists and posts"
          className={`w-full border border-white/15 bg-black/45 pl-12 pr-4 text-sm text-white outline-none transition-all duration-300 placeholder:text-gray-500 focus:border-white/35 focus:bg-black/65 ${inputClassName}`}
        />
      </form>

      <AnimatePresence>
        {isOpen && trimmedQuery.length >= 2 ? (
          <motion.div
            className="pointer-events-auto absolute left-0 right-0 top-[calc(100%+0.75rem)] z-[9999] overflow-hidden rounded-[1.65rem] border border-white/10 bg-black p-3 shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
            {...SOFT_PANEL_REVEAL}
            transition={PAGE_TRANSITION}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
          >
            {isLoading ? (
              <div className="px-3 py-6 text-sm text-gray-400">searching...</div>
            ) : error ? (
              <div className="px-3 py-6 text-sm text-red-400">{error}</div>
            ) : !hasResults ? (
              <div className="px-3 py-6 text-sm text-gray-400">no results found.</div>
            ) : (
              <div className="space-y-4">
                {results.artists.length > 0 ? (
                  <div>
                    <p className="mb-2 px-3 text-[11px] uppercase tracking-[0.22em] text-gray-500">artists</p>
                    <div className="space-y-1">
                      {results.artists.map((artist) => (
                        <SearchResultRow
                          key={artist.userId}
                          previewUrl={artist.avatarUrl}
                          icon={<UserCircle2 className="h-5 w-5 text-gray-400" />}
                          title={artist.displayName || artist.username}
                          subtitle={`@${artist.username}`}
                          onClick={() => openPath(artist.path)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {[
                  ["music", "music", <Music className="h-5 w-5 text-gray-400" key="music" />],
                  ["visual", "visual art", <ImageIcon className="h-5 w-5 text-gray-400" key="visual" />],
                  ["video", "video", <Video className="h-5 w-5 text-gray-400" key="video" />],
                ].map(([key, label, icon]) =>
                  results.media[key].length > 0 ? (
                    <div key={key}>
                      <p className="mb-2 px-3 text-[11px] uppercase tracking-[0.22em] text-gray-500">{label}</p>
                      <div className="space-y-1">
                        {results.media[key].map((item) => (
                          <SearchResultRow
                            key={item.id}
                            previewUrl={item.previewUrl}
                            icon={icon}
                            title={item.title}
                            subtitle={`${item.artist?.displayName || item.artist?.username || "artist"} / ${label}`}
                            onClick={() => openPath(item.path)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

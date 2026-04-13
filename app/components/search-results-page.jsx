"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, ImageIcon, Music, Search, UserCircle2, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { PublicRouteShell } from "./public-route-shell";
import { ArchiveLoadingState } from "./archive-loading-state";
import { PAGE_TRANSITION, SOFT_BUTTON_HOVER, SOFT_BUTTON_TAP, SOFT_PANEL_REVEAL } from "@/lib/motion";
import { rememberCurrentPathReturn } from "@/lib/public-navigation";

const SEARCH_BACK_NAV_DELAY_MS = 260;

function SearchCard({ title, subtitle, previewUrl, icon, onClick, large = false }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-4 border border-white/15 bg-white/[0.03] text-left transition-colors hover:border-white/30 hover:bg-white/[0.06] ${large ? "p-5 md:p-6" : "p-4"}`}
      whileHover={SOFT_BUTTON_HOVER}
      whileTap={SOFT_BUTTON_TAP}
    >
      <div className={`flex flex-shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-white/[0.04] ${large ? "h-16 w-16 rounded-2xl" : "h-12 w-12 rounded-xl"}`}>
        {previewUrl ? (
          <img src={previewUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          icon
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-white ${large ? "text-base md:text-lg" : "text-sm"}`}>{title}</p>
        <p className="mt-1 truncate text-xs uppercase tracking-[0.16em] text-gray-500">{subtitle}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-gray-500" />
    </motion.button>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-gray-500">{title}</p>
      {children}
    </section>
  );
}

export function SearchResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = String(searchParams.get("q") || "").trim();
  const [results, setResults] = useState({
    artists: [],
    media: { music: [], visual: [], video: [] },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadResults() {
      if (query.length < 2) {
        if (!mounted) return;
        setResults({ artists: [], media: { music: [], visual: [], video: [] } });
        setLoading(false);
        setError("");
        return;
      }

      setLoading(true);
      setError("");

      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const payload = await response.json().catch(() => ({}));

      if (!mounted) {
        return;
      }

      if (!response.ok) {
        setError(payload?.error || "Search failed.");
        setResults({ artists: [], media: { music: [], visual: [], video: [] } });
        setLoading(false);
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
      setLoading(false);
    }

    loadResults();
    return () => {
      mounted = false;
    };
  }, [query]);

  const topResults = useMemo(() => {
    const artistResults = results.artists.slice(0, 3).map((artist) => ({
      id: `artist-${artist.userId}`,
      title: artist.displayName || artist.username,
      subtitle: `artist / @${artist.username}`,
      previewUrl: artist.avatarUrl,
      path: artist.path,
      icon: <UserCircle2 className="h-5 w-5 text-gray-400" />,
      score: 3,
    }));

    const mediaResults = [...results.media.music, ...results.media.visual, ...results.media.video]
      .slice(0, 6)
      .map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: `${item.artist?.displayName || item.artist?.username || "artist"} / ${item.mediaKind}`,
        previewUrl: item.previewUrl,
        path: item.path,
        icon:
          item.mediaKind === "music" ? (
            <Music className="h-5 w-5 text-gray-400" />
          ) : item.mediaKind === "video" ? (
            <Video className="h-5 w-5 text-gray-400" />
          ) : (
            <ImageIcon className="h-5 w-5 text-gray-400" />
          ),
        score:
          item.title.toLowerCase() === query.toLowerCase()
            ? 5
            : item.title.toLowerCase().startsWith(query.toLowerCase())
              ? 4
              : 2,
      }));

    return [...mediaResults, ...artistResults]
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [results, query]);

  const hasResults =
    topResults.length > 0 ||
    results.artists.length > 0 ||
    results.media.music.length > 0 ||
    results.media.visual.length > 0 ||
    results.media.video.length > 0;

  const handleOpenResult = (path) => {
    rememberCurrentPathReturn();
    router.push(path);
  };

  const handleBack = () => {
    if (isNavigatingBack) {
      return;
    }

    setIsNavigatingBack(true);
    window.setTimeout(() => {
      router.back();
    }, SEARCH_BACK_NAV_DELAY_MS);
  };

  return (
    <PublicRouteShell>
      <motion.div
        className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12"
        initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
        animate={
          isNavigatingBack
            ? { opacity: 0, y: -10, filter: "blur(8px)" }
            : { opacity: 1, y: 0, filter: "blur(0px)" }
        }
        transition={PAGE_TRANSITION}
      >
        <motion.button
          type="button"
          onClick={handleBack}
          className="mb-8 inline-block text-gray-400 transition-colors hover:text-white touch-manipulation"
          whileHover={{ x: -3, ...SOFT_BUTTON_HOVER }}
          whileTap={SOFT_BUTTON_TAP}
        >
          <span className="inline-block" aria-hidden="true">{"\u2190"}</span>
          <span className="ml-2">back</span>
        </motion.button>

        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={PAGE_TRANSITION}
        >
          <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-gray-500">search</p>
          <h1 className="text-3xl tracking-tight md:text-4xl">results for "{query || "..."}"</h1>
        </motion.div>

        {loading ? <ArchiveLoadingState className="max-w-6xl" /> : null}

        {!loading && error ? (
          <div className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        ) : null}

        {!loading && !error && !hasResults ? (
          <div className="border border-white/10 bg-white/[0.03] px-6 py-10 text-sm text-gray-400">
            no results found.
          </div>
        ) : null}

        {!loading && !error && hasResults ? (
          <motion.div {...SOFT_PANEL_REVEAL} transition={PAGE_TRANSITION}>
            {topResults.length > 0 ? (
              <Section title="top results">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {topResults.map((item) => (
                    <SearchCard
                      key={item.id}
                      large
                      title={item.title}
                      subtitle={item.subtitle}
                      previewUrl={item.previewUrl}
                      icon={item.icon}
                      onClick={() => handleOpenResult(item.path)}
                    />
                  ))}
                </div>
              </Section>
            ) : null}

            {results.artists.length > 0 ? (
              <Section title="artists">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {results.artists.map((artist) => (
                    <SearchCard
                      key={artist.userId}
                      title={artist.displayName || artist.username}
                      subtitle={`@${artist.username}`}
                      previewUrl={artist.avatarUrl}
                      icon={<UserCircle2 className="h-5 w-5 text-gray-400" />}
                      onClick={() => handleOpenResult(artist.path)}
                    />
                  ))}
                </div>
              </Section>
            ) : null}

            {[
              ["music", "music", <Music className="h-5 w-5 text-gray-400" key="music" />],
              ["visual", "visual art", <ImageIcon className="h-5 w-5 text-gray-400" key="visual" />],
              ["video", "video", <Video className="h-5 w-5 text-gray-400" key="video" />],
            ].map(([key, label, icon]) =>
              results.media[key].length > 0 ? (
                <Section key={key} title={label}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {results.media[key].map((item) => (
                      <SearchCard
                        key={item.id}
                        title={item.title}
                        subtitle={`${item.artist?.displayName || item.artist?.username || "artist"} / ${label}`}
                        previewUrl={item.previewUrl}
                        icon={icon}
                        onClick={() => handleOpenResult(item.path)}
                      />
                    ))}
                  </div>
                </Section>
              ) : null,
            )}
          </motion.div>
        ) : null}
      </motion.div>
    </PublicRouteShell>
  );
}

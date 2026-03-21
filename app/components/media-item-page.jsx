import { motion } from "motion/react";
import { Edit2, Music2, Palette, Pause, Play, Video } from "lucide-react";
import { Waveform } from "./waveform";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash || 1;
}

function createSeededRandom(seed) {
  let current = seed >>> 0;
  return () => {
    current = (current * 1664525 + 1013904223) >>> 0;
    return current / 4294967296;
  };
}

function buildWaveformData(seedSource) {
  const random = createSeededRandom(hashString(seedSource));
  return Array.from({ length: 96 }, (_, index) => {
    const base = 20 + random() * 62;
    const shaped = index % 11 === 0 ? base * 0.72 : base;
    return Math.max(10, Math.min(95, Math.round(shaped)));
  });
}

function kindLabel(mediaKind) {
  if (mediaKind === "music") {
    return "music release";
  }

  if (mediaKind === "visual") {
    return "visual piece";
  }

  return "video release";
}

export function MediaItemPage({
  item,
  isPlaying,
  isActive,
  currentTime,
  duration,
  onBack,
  onEdit,
  onPlayPause,
  onSeek,
  formatUploadDate,
  formatFileSize,
  formatReleaseType,
}) {
  const waveformData = buildWaveformData(`${item.id}:${item.asset?.fileName || item.title}`);
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="border border-white/20 bg-black/35 p-6 md:p-8"
    >
      <div className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <motion.button
            type="button"
            onClick={onBack}
            className="mb-4 text-sm text-gray-400 transition-colors hover:text-white"
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.97 }}
          >
            <span aria-hidden="true">{"\u2190"}</span>
            <span className="ml-2">back to uploads</span>
          </motion.button>
          <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-gray-500">
            {kindLabel(item.mediaKind)}
          </p>
          <h3 className="max-w-4xl text-3xl leading-tight md:text-5xl">{item.title}</h3>
          {item.description && (
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-400 md:text-base">
              {item.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onEdit(item)}
          className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-gray-400 transition-colors hover:border-white/40 hover:text-white"
        >
          <Edit2 className="h-4 w-4" />
          <span>edit upload</span>
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_20rem]">
        <div className="overflow-hidden border border-white/10 bg-white/[0.03]">
          {item.mediaKind === "music" && (
            <div className="grid min-h-[26rem] md:grid-cols-[20rem_minmax(0,1fr)]">
              <div className="aspect-square border-b border-white/10 bg-white/[0.04] md:aspect-auto md:h-full md:border-b-0 md:border-r">
                {item.coverAsset?.url ? (
                  <img
                    src={item.coverAsset.url}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-[18rem] items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))]">
                    <Music2 className="h-16 w-16 text-white/35" />
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between p-6 md:p-8">
                <div>
                  <div className="mb-5 flex flex-wrap gap-2">
                    {item.releaseType && (
                      <span className="border border-white/15 bg-white/[0.03] px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-gray-300">
                        {formatReleaseType(item.releaseType)}
                      </span>
                    )}
                    <span className="border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-gray-500">
                      {item.visibility.replace("_", " ")}
                    </span>
                  </div>

                  <div className="mb-6 flex items-center gap-4">
                    <motion.button
                      type="button"
                      onClick={() => onPlayPause(item)}
                      disabled={!item.asset?.url}
                      className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/[0.03] transition-colors hover:border-white/50 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                      whileTap={{ scale: 0.94 }}
                    >
                      {isPlaying && isActive ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="ml-0.5 h-5 w-5" />
                      )}
                    </motion.button>
                    <div>
                      <p className="text-sm uppercase tracking-[0.18em] text-gray-500">
                        {isActive ? (isPlaying ? "now playing" : "paused") : "ready to play"}
                      </p>
                      <p className="mt-1 text-sm text-gray-300">
                        {item.asset?.mimeType?.replace("/", " / ") || "audio"}
                      </p>
                    </div>
                  </div>

                  <div className="relative overflow-hidden border border-white/10 bg-white/[0.02] px-4 py-5">
                    <Waveform
                      data={waveformData}
                      isPlaying={isPlaying && isActive}
                      height={84}
                      progress={isActive ? progress : 0}
                      currentTime={isActive ? currentTime : 0}
                      duration={isActive ? duration : 0}
                      onSeek={isActive ? onSeek : undefined}
                      seekLabel={`Seek ${item.title}`}
                      disabled={!isActive}
                    />
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-gray-500">
                  <span>{isActive ? formatTime(currentTime) : "0:00"}</span>
                  <span>{isActive ? formatTime(duration) : "--:--"}</span>
                </div>
              </div>
            </div>
          )}

          {item.mediaKind === "visual" && (
            <div className="bg-black">
              {item.asset?.url ? (
                <img
                  src={item.asset.url}
                  alt={item.title}
                  className="max-h-[70vh] w-full object-contain"
                />
              ) : (
                <div className="flex min-h-[28rem] items-center justify-center">
                  <Palette className="h-16 w-16 text-white/25" />
                </div>
              )}
            </div>
          )}

          {item.mediaKind === "video" && (
            <div className="bg-black">
              {item.asset?.url ? (
                <video controls className="max-h-[70vh] w-full bg-black">
                  <source src={item.asset.url} type={item.asset.mimeType} />
                </video>
              ) : (
                <div className="flex min-h-[28rem] items-center justify-center">
                  <Video className="h-16 w-16 text-white/25" />
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="border border-white/10 bg-white/[0.03] p-5 md:p-6">
          <p className="mb-5 text-[11px] uppercase tracking-[0.22em] text-gray-500">
            metadata
          </p>

          <div className="space-y-5 text-sm">
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-gray-500">availability</p>
              <p className="text-gray-200">{item.visibility.replace("_", " ")}</p>
            </div>

            {item.mediaKind === "music" && item.releaseType && (
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-gray-500">release type</p>
                <p className="text-gray-200">{formatReleaseType(item.releaseType)}</p>
              </div>
            )}

            <div>
              <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-gray-500">uploaded</p>
              <p className="text-gray-200">{formatUploadDate(item.createdAt)}</p>
            </div>

            {item.asset?.fileName && (
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-gray-500">file</p>
                <p className="break-all text-gray-200">{item.asset.fileName}</p>
              </div>
            )}

            {item.asset?.fileSizeBytes && (
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-gray-500">size</p>
                <p className="text-gray-200">{formatFileSize(item.asset.fileSizeBytes)}</p>
              </div>
            )}

            {item.asset?.mimeType && (
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-gray-500">format</p>
                <p className="text-gray-200">{item.asset.mimeType}</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

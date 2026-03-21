import { useMemo } from "react";
import { motion } from "motion/react";
import { Edit2, Ellipsis, ListPlus, Music2, Pause, Play, Share2 } from "lucide-react";
import { Waveform } from "./waveform";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

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
  return Array.from({ length: 72 }, (_, index) => {
    const base = 22 + random() * 58;
    const shaped = index % 9 === 0 ? base * 0.65 : base;
    return Math.max(10, Math.min(95, Math.round(shaped)));
  });
}

export function MusicReleasePlayer({
  item,
  isActive,
  isPlaying,
  onOpen,
  onPlayPause,
  onAddToQueue,
  onShare,
  onEdit,
  currentTime,
  duration,
  onSeek,
  formatFileSize,
  formatUploadDate,
  formatReleaseType,
}) {
  const waveformData = useMemo(
    () => buildWaveformData(`${item.id}:${item.asset?.fileName || item.title}`),
    [item.asset?.fileName, item.id, item.title],
  );
  const progress = duration > 0 ? currentTime / duration : 0;

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);
    return `${minutes}:${remainder.toString().padStart(2, "0")}`;
  };

  return (
    <div className="overflow-hidden border border-white/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
      <div className="flex flex-col md:flex-row">
        <div className="relative aspect-square w-full overflow-hidden border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] md:w-48 md:border-b-0 md:border-r">
          {item.coverAsset?.url ? (
            <img
              src={item.coverAsset.url}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))]">
              <Music2 className="h-14 w-14 text-white/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.2))]" />
        </div>

        <div className="flex-1 p-5 md:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                {item.releaseType && (
                  <span className="border border-white/15 bg-white/[0.03] px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-gray-300">
                    {formatReleaseType(item.releaseType)}
                  </span>
                )}
                <span className="border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-gray-500">
                  {item.visibility.replace("_", " ")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="text-left text-xl leading-tight transition-colors hover:text-gray-300"
              >
                {item.title}
              </button>
              {item.description && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">{item.description}</p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center border border-white/15 text-gray-400 transition-colors hover:border-white/40 hover:text-white"
                  aria-label={`Open track options for ${item.title}`}
                >
                  <Ellipsis className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="border-white/15 bg-black text-white"
              >
                <DropdownMenuItem onClick={() => onAddToQueue(item)} className="text-white focus:bg-white/10 focus:text-white">
                  <ListPlus className="h-4 w-4 text-gray-400" />
                  <span>add to queue</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onShare(item)} className="text-white focus:bg-white/10 focus:text-white">
                  <Share2 className="h-4 w-4 text-gray-400" />
                  <span>share track</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid gap-5">
            <div className="flex items-center gap-4">
              <motion.button
                type="button"
                onClick={() => onPlayPause(item)}
                disabled={!item.asset?.url}
                className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.03] text-white transition-transform hover:scale-[1.03] hover:border-white/50 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                whileTap={{ scale: 0.94 }}
              >
                {isPlaying && isActive ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5" />
                )}
              </motion.button>

              <div className="min-w-0 flex-1">
                <div className="relative mb-2 overflow-hidden border border-white/10 bg-white/[0.02] px-3 py-3">
                  <Waveform
                    data={waveformData}
                    isPlaying={isPlaying && isActive}
                    height={52}
                    progress={isActive ? progress : 0}
                    currentTime={isActive ? currentTime : 0}
                    duration={isActive ? duration : 0}
                    onSeek={isActive ? onSeek : undefined}
                    seekLabel={`Seek ${item.title}`}
                    disabled={!isActive}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-gray-500">
                  <span>{isActive ? formatTime(currentTime) : "ready to play"}</span>
                  <span>{isActive ? formatTime(duration) : item.asset?.mimeType?.replace("/", " / ") || "audio"}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
                <span>Uploaded {formatUploadDate(item.createdAt)}</span>
                {item.asset?.fileName && <span>{item.asset.fileName}</span>}
                {item.asset?.fileSizeBytes && <span>{formatFileSize(item.asset.fileSizeBytes)}</span>}
              </div>

              <button
                type="button"
                onClick={() => onEdit(item)}
                className="ml-auto inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-gray-400 transition-colors hover:border-white/40 hover:text-white"
              >
                <Edit2 className="h-4 w-4" />
                <span>edit upload</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

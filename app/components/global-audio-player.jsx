import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Music2, Pause, Play, Volume2, VolumeX, X } from "lucide-react";

function formatTime(time) {
  if (Number.isNaN(time) || !Number.isFinite(time) || time < 0) {
    return "0:00";
  }

  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function GlobalAudioPlayer({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  onPlayPause,
  onTrackEnd,
  canSkipPrevious,
  canSkipNext,
  onSkipPrevious,
  onSkipNext,
  onClose,
  onTimeChange,
  onDurationChange,
  onSeek,
  onVolumeChange,
  onMuteToggle,
}) {
  const audioRef = useRef(null);
  const coverArt = currentTrack?.release?.coverArt;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    if (isPlaying) {
      audioRef.current.play().catch(() => {});
      return;
    }

    audioRef.current.pause();
  }, [isPlaying, currentTrack?.track?.audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/92 backdrop-blur-xl"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <audio
        ref={audioRef}
        src={currentTrack.track.audioUrl}
        onTimeUpdate={() => onTimeChange(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => onDurationChange(audioRef.current?.duration || 0)}
        onEnded={onTrackEnd}
      />

      <div className="relative h-1 w-full bg-white/5">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={(event) => onSeek(Number(event.target.value), audioRef.current)}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          aria-label={`Seek ${currentTrack.track.title}`}
        />
        <div className="absolute left-0 top-0 h-full bg-white transition-[width]" style={{ width: `${progress}%` }} />
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="h-14 w-14 flex-shrink-0 overflow-hidden border border-white/10 bg-white/5">
            {coverArt ? (
              <img
                src={coverArt}
                alt={currentTrack.release.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
                <Music2 className="h-5 w-5 text-white/60" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm tracking-wide">{currentTrack.track.title}</p>
            <p className="truncate text-xs uppercase tracking-[0.16em] text-gray-500">
              {currentTrack.artist.name}
              {currentTrack.release.title ? ` / ${currentTrack.release.title}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          <span className="hidden w-12 text-right text-xs text-gray-500 md:block">
            {formatTime(currentTime)}
          </span>

          <motion.button
            onClick={onSkipPrevious}
            disabled={!canSkipPrevious}
            className="flex h-10 w-10 items-center justify-center border border-white/15 text-gray-400 transition-colors hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            whileHover={{ scale: canSkipPrevious ? 1.03 : 1 }}
            whileTap={{ scale: canSkipPrevious ? 0.94 : 1 }}
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.button>

          <motion.button
            onClick={onPlayPause}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 transition-all hover:border-white/60 hover:bg-white/5"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.94 }}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="ml-0.5 h-5 w-5" />
            )}
          </motion.button>

          <motion.button
            onClick={onSkipNext}
            disabled={!canSkipNext}
            className="flex h-10 w-10 items-center justify-center border border-white/15 text-gray-400 transition-colors hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            whileHover={{ scale: canSkipNext ? 1.03 : 1 }}
            whileTap={{ scale: canSkipNext ? 0.94 : 1 }}
          >
            <ChevronRight className="h-4 w-4" />
          </motion.button>

          <span className="hidden w-12 text-xs text-gray-500 md:block">{formatTime(duration)}</span>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <motion.button
            onClick={onMuteToggle}
            className="text-gray-400 transition-colors hover:text-white"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </motion.button>

          <div className="relative h-8 w-28">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(event) => onVolumeChange(Number(event.target.value))}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              aria-label="Adjust volume"
            />
            <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/10" />
            <div
              className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-white"
              style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
            />
            <div
              className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-black bg-white"
              style={{ left: `calc(${(isMuted ? 0 : volume) * 100}% - 5px)` }}
            />
          </div>
        </div>

        <div className="ml-auto flex min-w-[3.5rem] items-center justify-end gap-3 text-right text-[11px] uppercase tracking-[0.18em] text-gray-500">
          <span>{formatTime(currentTime)}</span>

          <button
            type="button"
            onClick={onClose}
            className="hidden h-10 w-10 items-center justify-center border border-white/15 text-gray-400 transition-colors hover:border-white/40 hover:text-white md:flex"
          >
            <X className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="block border border-white/15 px-2 py-1 text-[10px] text-gray-400 transition-colors hover:border-white/40 hover:text-white md:hidden"
          >
            close
          </button>
        </div>
      </div>
    </motion.div>
  );
}

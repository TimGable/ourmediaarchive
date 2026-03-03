import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

export function GlobalAudioPlayer({ currentTrack, isPlaying, onPlayPause, onTrackEnd }) {
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (vol > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/90 backdrop-blur-lg"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack.track.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={onTrackEnd}
      />

      {/* Progress bar */}
      <div className="relative w-full h-1 bg-white/10 group cursor-pointer">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <motion.div
          className="absolute left-0 top-0 h-full bg-white"
          style={{ width: `${progress}%` }}
        />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${progress}%`, marginLeft: '-6px' }}
        />
      </div>

      <div className="px-6 py-4">
        <div className="flex items-center gap-6">
          {/* Album Art & Track Info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <motion.div
              className="w-14 h-14 flex-shrink-0 overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900"
              whileHover={{ scale: 1.05 }}
            >
              <img
                src={currentTrack.release.coverArt}
                alt={currentTrack.release.title}
                className="w-full h-full object-cover"
              />
            </motion.div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm">{currentTrack.track.title}</h4>
              <p className="text-xs text-gray-400 truncate">{currentTrack.artist.name} • {currentTrack.release.title}</p>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 w-12 text-right">{formatTime(currentTime)}</span>
            
            <motion.button
              onClick={onPlayPause}
              className="w-12 h-12 flex items-center justify-center border border-white/20 hover:border-white/60 hover:bg-white/10 transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </motion.button>

            <span className="text-xs text-gray-400 w-12">{formatTime(duration)}</span>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3">
            <motion.button
              onClick={toggleMute}
              className="text-gray-400 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </motion.button>
            
            <div className="relative w-24 h-1 bg-white/10 group cursor-pointer">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div
                className="absolute left-0 top-0 h-full bg-white transition-all"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${(isMuted ? 0 : volume) * 100}%`, marginLeft: '-6px' }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

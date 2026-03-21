import { motion } from "motion/react";

export function Waveform({
  data,
  isPlaying,
  height = 40,
  progress = 0,
  currentTime = 0,
  duration = 0,
  onSeek,
  seekLabel,
  disabled = false,
}) {
  const barWidth = 2;
  const gap = 1;
  const totalWidth = data.length * (barWidth + gap);
  const isSeekDisabled = disabled || !onSeek || !duration;

  return (
    <div className="relative w-full overflow-hidden" style={{ height: `${height}px` }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
      >
        {data.map((value, index) => {
          const barHeight = (value / 100) * height;
          const y = (height - barHeight) / 2;
          const x = index * (barWidth + gap);
          const isPlayed = progress > 0 && (x / totalWidth) <= progress;

          return (
            <motion.rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={isPlayed ? "white" : "rgba(255, 255, 255, 0.3)"}
              initial={{ scaleY: 0.5 }}
              animate={{
                scaleY: isPlaying ? [0.5, 1, 0.5] : 0.5,
              }}
              transition={{
                duration: 0.8,
                delay: index * 0.01,
                repeat: isPlaying ? Infinity : 0,
                repeatType: "reverse",
              }}
            />
          );
        })}
      </svg>

      {onSeek && (
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          value={currentTime}
          onChange={(event) => onSeek(Number(event.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          disabled={isSeekDisabled}
          aria-label={seekLabel || "Seek track"}
        />
      )}
    </div>
  );
}

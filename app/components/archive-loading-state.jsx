"use client";

import { motion } from "motion/react";
import { PAGE_TRANSITION } from "@/lib/motion";
import { ViewportPortal } from "./viewport-portal";

function clampProgress(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function ArchiveLoadingState({
  label = "loading",
  progress = 0,
  className = "",
}) {
  const safeProgress = clampProgress(progress);
  const bars = [0, 1, 2, 3];

  return (
    <ViewportPortal>
      <motion.div
        className="pointer-events-none fixed inset-0 z-50 grid place-items-center px-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={PAGE_TRANSITION}
      >
        <div className={`relative flex items-center justify-center ${className}`.trim()}>
          <div className="archive-loader-glow absolute h-16 w-16 rounded-full bg-white/14 blur-2xl md:h-20 md:w-20" />
          <div className="archive-loader-ring absolute h-12 w-12 rounded-full border border-white/12 blur-lg md:h-16 md:w-16" />
          <div className="relative flex h-10 items-end gap-1.5 md:h-12 md:gap-2">
            {bars.map((barIndex) => (
              <div
                key={barIndex}
                className="archive-loader-bar relative w-1.5 overflow-hidden rounded-full bg-white/[0.08] md:w-2"
                style={{
                  animationDelay: `${barIndex * 0.08}s`,
                  height: `${18 + (barIndex % 2 === 0 ? 8 : 0)}px`,
                }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.9),rgba(255,255,255,0.2),rgba(255,255,255,0.03))]" />
                <div className="absolute inset-[1px] rounded-full shadow-[0_0_18px_rgba(255,255,255,0.2)]" />
              </div>
            ))}
          </div>
          <span className="sr-only">
            {label} {safeProgress}%
          </span>
        </div>
      </motion.div>
    </ViewportPortal>
  );
}

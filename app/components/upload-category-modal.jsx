"use client";

import { motion } from "motion/react";
import { Music, Palette, Video, X } from "lucide-react";
import { ViewportPortal } from "./viewport-portal";
import { PAGE_TRANSITION, SOFT_BUTTON_HOVER, SOFT_BUTTON_TAP, SOFT_PANEL_REVEAL } from "@/lib/motion";

const CATEGORY_META = {
  music: {
    label: "music",
    description: "upload songs, singles, EPs, and albums",
    icon: Music,
  },
  visual: {
    label: "visual",
    description: "upload artwork and photography",
    icon: Palette,
  },
  video: {
    label: "video",
    description: "upload films and moving-image work",
    icon: Video,
  },
};

const DEFAULT_CATEGORIES = ["music", "visual", "video"];

export function UploadCategoryModal({ categoryTags = [], onSelect, onClose }) {
  const uploadCategories = categoryTags.length > 0 ? categoryTags : DEFAULT_CATEGORIES;
  const availableCategories = uploadCategories
    .map((tag) => CATEGORY_META[tag])
    .filter(Boolean);

  return (
    <ViewportPortal>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-2xl border border-white/20 bg-black p-6 md:p-8"
          {...SOFT_PANEL_REVEAL}
          transition={PAGE_TRANSITION}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl">choose upload category</h3>
              <p className="mt-2 text-sm text-gray-400">
                Select which type of content you want to add to your archive.
              </p>
            </div>

            <motion.button
              type="button"
              onClick={onClose}
              className="border border-white/20 p-2 text-gray-400 transition-colors hover:text-white"
              aria-label="Close upload category modal"
              whileHover={SOFT_BUTTON_HOVER}
              whileTap={SOFT_BUTTON_TAP}
            >
              <X className="h-4 w-4" />
            </motion.button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {availableCategories.map((category) => {
              const Icon = category.icon;

              return (
                <motion.button
                  key={category.label}
                  type="button"
                  onClick={() => onSelect(category.label)}
                  className="border border-white/15 bg-white/[0.03] p-5 text-left transition-colors hover:border-white/35 hover:bg-white/[0.07]"
                  whileHover={SOFT_BUTTON_HOVER}
                  whileTap={SOFT_BUTTON_TAP}
                >
                  <Icon className="mb-4 h-8 w-8 text-white/80" strokeWidth={1.6} />
                  <div className="text-lg uppercase tracking-[0.12em] text-white">{category.label}</div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{category.description}</p>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </ViewportPortal>
  );
}

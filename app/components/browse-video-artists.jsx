import { motion } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback.tsx";

export function BrowseVideoArtists({ onArtistClick, onBack }) {
  // Empty array - will be populated from Supabase
  const videoArtists = [];

  return (
    <div>
      {/* Back button - Top Left */}
      <motion.button
        onClick={onBack}
        className="mb-6 md:mb-8 text-gray-400 hover:text-white transition-colors relative group inline-block touch-manipulation"
        whileHover={{ x: -5 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="inline-block">←</span>
        <span className="ml-2">back</span>
        <motion.div
          className="absolute -bottom-1 left-0 h-px bg-white"
          initial={{ width: 0 }}
          whileHover={{ width: "100%" }}
          transition={{ duration: 0.3 }}
        />
      </motion.button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 md:mb-12"
      >
        <h2 className="text-3xl md:text-4xl tracking-tight mb-3 md:mb-4">video artists</h2>
        <p className="text-gray-400 tracking-wide text-sm md:text-base">
          {videoArtists.length} artists sharing their work
        </p>
      </motion.div>

      {/* Empty State */}
      {videoArtists.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center py-16 md:py-20 px-4"
        >
          <p className="text-gray-400 text-base md:text-lg">no video artists available yet</p>
          <p className="text-gray-500 text-xs md:text-sm mt-2">artists will appear here once they create profiles</p>
        </motion.div>
      )}

      {/* Artists Grid */}
      {videoArtists.length > 0 && (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {videoArtists.map((artist, index) => (
            <motion.div
              key={artist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.5 }}
              className="group cursor-pointer touch-manipulation active:scale-95"
              onClick={() => onArtistClick(artist)}
              whileHover={{ y: -8 }}
            >
              {/* Featured Video Thumbnail */}
              <div className="relative aspect-video mb-4 overflow-hidden border border-white/10 group-hover:border-white/30 transition-colors">
                <ImageWithFallback
                  src={artist.featuredThumbnail}
                  alt={`${artist.name}'s video`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-0 h-0 border-t-6 md:border-t-8 border-t-transparent border-l-8 md:border-l-12 border-l-white border-b-6 md:border-b-8 border-b-transparent ml-1" />
                  </div>
                </div>
              </div>

              {/* Artist Info */}
              <div className="flex items-center gap-3 md:gap-4 mb-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border border-white/20 flex-shrink-0">
                  <ImageWithFallback
                    src={artist.avatar}
                    alt={artist.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg tracking-wide group-hover:text-white/80 transition-colors truncate">
                    {artist.name}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-400">{artist.videoCount} videos</p>
                </div>
              </div>

              <p className="text-gray-400 text-xs md:text-sm tracking-wide line-clamp-2">
                {artist.bio}
              </p>

              {/* Hover Underline */}
              <motion.div
                className="h-px bg-white mt-4"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
                style={{ originX: 0 }}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
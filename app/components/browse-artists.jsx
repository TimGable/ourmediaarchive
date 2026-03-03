import { motion } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback.tsx";

export function BrowseArtists({ onArtistClick, onBack }) {
  // Empty array - will be populated from Supabase
  const musicArtists = [];

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
        <h2 className="text-3xl md:text-4xl tracking-tight mb-3 md:mb-4">music artists</h2>
        <p className="text-gray-400 tracking-wide text-sm md:text-base">
          {musicArtists.length} artists sharing their work
        </p>
      </motion.div>

      {/* Empty State */}
      {musicArtists.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center py-16 md:py-20 px-4"
        >
          <p className="text-gray-400 text-base md:text-lg">no music artists available yet</p>
          <p className="text-gray-500 text-xs md:text-sm mt-2">artists will appear here once they create profiles</p>
        </motion.div>
      )}

      {/* Artists Grid */}
      {musicArtists.length > 0 && (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {musicArtists.map((artist, index) => (
            <motion.div
              key={artist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.5 }}
              className="group cursor-pointer touch-manipulation active:scale-95"
              onClick={() => onArtistClick(artist)}
              whileHover={{ y: -8 }}
            >
              {/* Featured Image */}
              <div className="relative aspect-[4/3] mb-4 overflow-hidden border border-white/10 group-hover:border-white/30 transition-colors">
                <ImageWithFallback
                  src={artist.featuredImage}
                  alt={`${artist.name}'s work`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                  <p className="text-xs md:text-sm text-gray-400">{artist.releaseCount} releases</p>
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
import { motion } from "motion/react";
import { Music, Palette, Video } from "lucide-react";

export function CategorySelector({ onCategorySelect, onBack, showBackButton = true }) {
  const categories = [
    {
      id: 'music',
      title: 'music',
      description: 'explore music artists',
      icon: Music,
    },
    {
      id: 'visual',
      title: 'visual',
      description: 'explore visual artists',
      icon: Palette,
    },
    {
      id: 'video',
      title: 'video',
      description: 'explore video artists',
      icon: Video,
    },
  ];

  return (
    <div>
      {/* Back button - Top Left */}
      {showBackButton && onBack && (
        <motion.button
          onClick={onBack}
          className="mb-8 md:mb-12 text-gray-400 hover:text-white transition-colors relative group inline-block touch-manipulation"
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
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12 md:mb-16 text-center"
      >
        <h2 className="text-3xl md:text-4xl lg:text-5xl tracking-tight mb-4">browse artists</h2>
        <p className="text-gray-400 tracking-wide text-base md:text-lg">choose a category</p>
      </motion.div>

      {/* Categories Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 max-w-6xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        {categories.map((category, index) => {
          const Icon = category.icon;
          return (
            <motion.button
              key={category.id}
              onClick={() => onCategorySelect(category.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.5 }}
              className="group relative touch-manipulation active:scale-95"
              whileHover={{ y: -8 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative border border-white/10 group-hover:border-white/30 transition-all duration-300 p-8 md:p-12">
                {/* Icon */}
                <motion.div
                  className="mb-4 md:mb-6 flex justify-center"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Icon className="w-12 h-12 md:w-16 md:h-16 text-white/80" strokeWidth={1.5} />
                </motion.div>

                {/* Title */}
                <h3 className="text-2xl md:text-3xl tracking-wide mb-2 md:mb-3 group-hover:text-white/90 transition-colors">
                  {category.title}
                </h3>

                {/* Description */}
                <p className="text-gray-400 text-xs md:text-sm tracking-wide">
                  {category.description}
                </p>

                {/* Hover underline */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-px bg-white"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

import { motion } from "motion/react";
import { Play, Pause, Heart, MessageCircle, Share2, MoreVertical, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { useState } from "react";

export function Feed({ onArtistClick, onPlayTrack }) {
  // TODO: Fetch feed items from Supabase based on followed artists
  const [feedItems, setFeedItems] = useState([]);

  const handleLike = (itemId) => {
    setFeedItems(items =>
      items.map(item =>
        item.id === itemId
          ? {
              ...item,
              isLiked: !item.isLiked,
              likes: item.isLiked ? item.likes - 1 : item.likes + 1,
            }
          : item
      )
    );
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'visual':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <VideoIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // If no feed items, show empty state
  if (feedItems.length === 0) {
    return (
      <motion.div
        className="text-center py-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-gray-400 text-lg md:text-xl">
          start following artists to see their work here
        </p>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 md:space-y-8">
      {feedItems.map((item, index) => (
        <motion.div
          key={item.id}
          className="border border-white/10 bg-black/30 backdrop-blur-sm overflow-hidden hover:border-white/20 transition-colors"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
        >
          {/* Header - Artist Info */}
          <div className="p-4 flex items-center justify-between border-b border-white/10">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => onArtistClick?.(item.artistId)}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 flex-shrink-0">
                <img
                  src={item.artistAvatar}
                  alt={item.artistName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-white group-hover:text-gray-300 transition-colors">
                  {item.artistName}
                </p>
                <p className="text-xs text-gray-500">{item.uploadedAt}</p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-white transition-colors p-2 touch-manipulation">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* Media Content */}
          <div className="relative aspect-square bg-black/50 overflow-hidden group cursor-pointer">
            <img
              src={item.coverArt}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            
            {/* Type Badge */}
            {item.type !== 'music' && (
              <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm border border-white/20 px-3 py-1.5 flex items-center gap-2">
                {getTypeIcon(item.type)}
                <span className="text-xs uppercase tracking-wider">{item.type}</span>
              </div>
            )}

            {/* Play Button Overlay for Music */}
            {item.type === 'music' && (
              <motion.div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onPlayTrack?.(item.id)}
              >
                <motion.button
                  className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Play className="w-8 h-8 ml-1" fill="currentColor" />
                </motion.button>
              </motion.div>
            )}
          </div>

          {/* Footer - Interactions & Info */}
          <div className="p-4 space-y-3">
            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <motion.button
                onClick={() => handleLike(item.id)}
                className={`flex items-center gap-2 transition-colors touch-manipulation ${
                  item.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-white'
                }`}
                whileTap={{ scale: 0.9 }}
              >
                <Heart
                  className="w-6 h-6"
                  fill={item.isLiked ? 'currentColor' : 'none'}
                />
                <span className="text-sm">{item.likes}</span>
              </motion.button>

              <motion.button
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors touch-manipulation"
                whileTap={{ scale: 0.9 }}
              >
                <MessageCircle className="w-6 h-6" />
                <span className="text-sm">{item.comments}</span>
              </motion.button>

              <motion.button
                className="text-gray-400 hover:text-white transition-colors ml-auto touch-manipulation"
                whileTap={{ scale: 0.9 }}
              >
                <Share2 className="w-6 h-6" />
              </motion.button>
            </div>

            {/* Title and Description */}
            <div>
              <h3 className="text-lg font-medium mb-1">{item.title}</h3>
              {item.description && (
                <p className="text-gray-400 text-sm leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

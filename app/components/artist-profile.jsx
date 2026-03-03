import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Play, Pause, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { Waveform } from "./waveform";

export function ArtistProfile({ artist, onBack, onPlayTrack, currentTrack, isPlaying }) {
  const [expandedRelease, setExpandedRelease] = useState(null);
  const [isFollowing, setIsFollowing] = useState(artist.isFollowing || false);
  const [followerCount, setFollowerCount] = useState(artist.followerCount || 0);

  const handleFollowToggle = () => {
    // TODO: Call Supabase to update follow status
    setIsFollowing(!isFollowing);
    setFollowerCount(isFollowing ? followerCount - 1 : followerCount + 1);
  };

  const isTrackPlaying = (trackId) => {
    return currentTrack?.track.id === trackId && isPlaying;
  };

  const handleTrackClick = (track, release) => {
    onPlayTrack(track, release, artist);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Back button */}
      <motion.button
        onClick={onBack}
        className="mb-8 text-gray-400 hover:text-white transition-colors relative group inline-block"
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

      {/* Artist Header */}
      <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8 mb-12">
        <motion.div
          className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <img
            src={artist.avatar}
            alt={artist.name}
            className="w-full h-full object-cover"
          />
        </motion.div>
        
        <motion.div
          className="flex-1 w-full"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl md:text-5xl mb-3">{artist.name}</h1>
              
              {/* Follower Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                <span>
                  <span className="text-white font-medium">{followerCount}</span> followers
                </span>
                {artist.followingCount !== undefined && (
                  <span>
                    <span className="text-white font-medium">{artist.followingCount}</span> following
                  </span>
                )}
              </div>
            </div>

            {/* Follow Button */}
            <motion.button
              onClick={handleFollowToggle}
              className={`px-6 md:px-8 py-2.5 md:py-3 border transition-all duration-300 touch-manipulation ${
                isFollowing
                  ? 'border-white/40 bg-white text-black hover:bg-white/90'
                  : 'border-white/40 bg-transparent hover:border-white/60 hover:bg-white/5'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-sm md:text-base tracking-wide">
                {isFollowing ? 'following' : 'follow'}
              </span>
            </motion.button>
          </div>

          <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-2xl">{artist.bio}</p>
        </motion.div>
      </div>

      {/* Releases */}
      <div className="space-y-6">
        <h2 className="text-2xl mb-6">releases</h2>
        
        {artist.releases.length === 0 ? (
          <p className="text-gray-400">no releases yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artist.releases.map((release, index) => (
              <motion.div
                key={release.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1, duration: 0.4 }}
                className="border border-white/20 overflow-hidden hover:border-white/40 transition-all duration-300"
              >
                {/* Cover Art */}
                <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
                  <img
                    src={release.coverArt}
                    alt={release.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    <span className="bg-black/80 backdrop-blur-sm px-3 py-1 text-xs uppercase tracking-wider">
                      {release.type}
                    </span>
                  </div>
                </div>

                {/* Release Info */}
                <div className="p-6">
                  <h3 className="text-xl mb-2">{release.title}</h3>
                  <p className="text-gray-400 text-sm mb-4">{release.description}</p>
                  
                  {/* Toggle Tracklist Button */}
                  <motion.button
                    onClick={() => setExpandedRelease(expandedRelease === release.id ? null : release.id)}
                    className="text-sm text-gray-400 hover:text-white transition-colors mb-4"
                    whileHover={{ x: 5 }}
                  >
                    {expandedRelease === release.id ? '− hide tracks' : '+ view tracks'}
                  </motion.button>

                  {/* Tracklist */}
                  <AnimatePresence>
                    {expandedRelease === release.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 pt-4 border-t border-white/10">
                          {release.tracks.map((track, trackIndex) => (
                            <motion.div
                              key={track.id}
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: trackIndex * 0.05 }}
                              className="group"
                            >
                              <div className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors rounded">
                                {/* Play Button */}
                                <motion.button
                                  onClick={() => handleTrackClick(track, release)}
                                  className="w-8 h-8 flex items-center justify-center border border-white/20 hover:border-white/60 hover:bg-white/10 transition-all flex-shrink-0"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  {isTrackPlaying(track.id) ? (
                                    <Pause className="w-4 h-4" />
                                  ) : (
                                    <Play className="w-4 h-4 ml-0.5" />
                                  )}
                                </motion.button>

                                {/* Track Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-sm truncate">{track.title}</span>
                                    <span className="text-xs text-gray-500 flex-shrink-0">{track.duration}</span>
                                  </div>
                                  
                                  {/* Waveform */}
                                  <Waveform
                                    data={track.waveformData}
                                    isPlaying={isTrackPlaying(track.id)}
                                    height={30}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

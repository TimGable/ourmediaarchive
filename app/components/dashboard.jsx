import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BrowseArtists } from "./browse-artists";
import { ArtistProfile } from "./artist-profile";
import { GlobalAudioPlayer } from "./global-audio-player";
import { MyProfile } from "./my-profile";
import { BrowseVisualArtists } from "./browse-visual-artists";
import { BrowseVideoArtists } from "./browse-video-artists";
import { CategorySelector } from "./category-selector";
import { Feed } from "./feed";
import { Menu, X } from "lucide-react";
import { InteractiveBackground } from "./interactive-background";
import { AdminPanel } from "./admin-panel";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function isGeneratedUsername(username) {
  return typeof username === "string" && /_[a-f0-9]{8}$/.test(username);
}

function createProfileQueueEntry(item, artist) {
  return {
    track: {
      id: item.id,
      title: item.title,
      audioUrl: item.asset.url,
    },
    release: {
      id: item.id,
      title: item.title,
      coverArt: item.coverAsset?.url || "",
    },
    artist: {
      name: artist?.name || "artist",
      username: artist?.username || "",
    },
  };
}

export function Dashboard({ onSignOut }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [currentView, setCurrentView] = useState('home');
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playbackQueue, setPlaybackQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [forceProfileSetup, setForceProfileSetup] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadAccess() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) return;

      const response = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) return;

      const payload = await response.json();
      if (!mounted) return;

      setIsAdmin(Boolean(payload?.profile?.isAdmin));

      const setupRequired = isGeneratedUsername(payload?.profile?.username);
      setForceProfileSetup(setupRequired);
      if (setupRequired) {
        setCurrentView("profile");
      }
    }

    loadAccess();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const handleArtistClick = (artist) => {
    setSelectedArtist(artist);
    setCurrentView('artist');
  };

  const handlePlayTrack = (track, release, artist) => {
    setPlaybackQueue([]);
    setQueueIndex(-1);
    setCurrentTrack({ track, release, artist });
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
  };

  const handlePlayProfileTrack = (item, artist, queueItems) => {
    if (!item?.asset?.url) {
      return;
    }

    if (currentTrack?.track?.id === item.id) {
      setIsPlaying((current) => !current);
      return;
    }

    const queue = (queueItems || [])
      .filter((queueItem) => queueItem?.asset?.url)
      .map((queueItem) => createProfileQueueEntry(queueItem, artist));

    const nextQueueIndex = queue.findIndex((entry) => entry.track.id === item.id);
    if (nextQueueIndex === -1) {
      return;
    }

    setPlaybackQueue(queue);
    setQueueIndex(nextQueueIndex);
    setCurrentTrack(queue[nextQueueIndex] || null);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleAddProfileTrackToQueue = (item, artist, queueItems) => {
    if (!item?.asset?.url) {
      return "invalid";
    }

    const nextEntry = createProfileQueueEntry(item, artist);

    if (!currentTrack) {
      setPlaybackQueue([nextEntry]);
      setQueueIndex(0);
      setCurrentTrack(nextEntry);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return "added";
    }

    const queueSource = playbackQueue.length > 0
      ? playbackQueue
      : (queueItems || [])
          .filter((queueItem) => queueItem?.asset?.url)
          .map((queueItem) => createProfileQueueEntry(queueItem, artist));

    if (queueSource.some((entry) => entry.track.id === item.id)) {
      return "exists";
    }

    setPlaybackQueue([...queueSource, nextEntry]);
    return "added";
  };

  const handleDeletedProfileTrack = (mediaItemId) => {
    const removedIndex = playbackQueue.findIndex((entry) => entry.track.id === mediaItemId);
    const nextQueue = playbackQueue.filter((entry) => entry.track.id !== mediaItemId);

    setPlaybackQueue(nextQueue);

    if (currentTrack?.track?.id === mediaItemId) {
      setIsPlaying(false);
      setCurrentTrack(null);
      setQueueIndex(-1);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    if (removedIndex !== -1 && removedIndex < queueIndex) {
      setQueueIndex((currentIndex) => Math.max(0, currentIndex - 1));
      return;
    }

    if (nextQueue.length === 0) {
      setQueueIndex(-1);
    }
  };

  const handleProfileMediaItemUpdated = (item) => {
    if (!item?.id) {
      return;
    }

    setPlaybackQueue((currentQueue) =>
      currentQueue.map((entry) =>
        entry.track.id === item.id
          ? {
              ...entry,
              track: {
                ...entry.track,
                title: item.title,
                audioUrl: item.asset?.url || entry.track.audioUrl,
              },
              release: {
                ...entry.release,
                title: item.title,
                coverArt: item.coverAsset?.url || entry.release.coverArt,
              },
            }
          : entry,
      ),
    );

    setCurrentTrack((current) => {
      if (current?.track?.id !== item.id) {
        return current;
      }

      return {
        ...current,
        track: {
          ...current.track,
          title: item.title,
          audioUrl: item.asset?.url || current.track.audioUrl,
        },
        release: {
          ...current.release,
          title: item.title,
          coverArt: item.coverAsset?.url || current.release.coverArt,
        },
      };
    });
  };

  const handleClosePlayer = () => {
    setIsPlaying(false);
    setCurrentTrack(null);
    setPlaybackQueue([]);
    setQueueIndex(-1);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleSeekTrack = (time, audioElement) => {
    setCurrentTime(time);
    if (audioElement) {
      audioElement.currentTime = time;
    }
  };

  const handleVolumeChange = (nextVolume) => {
    setVolume(nextVolume);
    if (nextVolume > 0) {
      setIsMuted(false);
    }
  };

  const handleSkipTrack = (direction) => {
    const nextIndex = queueIndex + direction;
    if (nextIndex < 0 || nextIndex >= playbackQueue.length) {
      return;
    }

    setQueueIndex(nextIndex);
    setCurrentTrack(playbackQueue[nextIndex]);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
  };

  const canLeaveProfileSetup = !forceProfileSetup;

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <div className="relative min-h-screen pb-32">
        {/* Interactive Background */}
        <InteractiveBackground />

        {/* Content */}
        <div className="relative z-10">
          {/* Navigation */}
          <motion.nav
            className="border-b border-white/10 bg-black/50 backdrop-blur-sm"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 flex items-center justify-between">
              <motion.h1
                className="text-xl md:text-2xl tracking-wide cursor-pointer"
                onClick={() => {
                  if (!canLeaveProfileSetup) return;
                  setCurrentView('home');
                  setShowMobileMenu(false);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                our media archive
              </motion.h1>
              
              {/* Desktop Navigation */}
              <div className="hidden lg:flex gap-8 items-center">
                {isAdmin && (
                  <motion.button
                    onClick={() => {
                      if (!canLeaveProfileSetup) return;
                      setCurrentView('admin');
                    }}
                    className="text-gray-400 hover:text-white transition-colors relative group"
                    whileHover={{ y: -2 }}
                  >
                    administrator page
                    <motion.div
                      className="absolute -bottom-1 left-0 right-0 h-px bg-white"
                      initial={{ scaleX: 0 }}
                      whileHover={{ scaleX: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.button>
                )}
                <motion.button
                    onClick={() => {
                      if (!canLeaveProfileSetup) return;
                      setSelectedArtist(null);
                      setCurrentView('profile');
                    }}
                  className="text-gray-400 hover:text-white transition-colors relative group"
                  whileHover={{ y: -2 }}
                >
                  my profile
                  <motion.div
                    className="absolute -bottom-1 left-0 right-0 h-px bg-white"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.button>
                <motion.button
                  onClick={() => setShowSignOutConfirm(true)}
                  className="text-gray-400 hover:text-white transition-colors relative group"
                  whileHover={{ y: -2 }}
                >
                  sign out
                  <motion.div
                    className="absolute -bottom-1 left-0 right-0 h-px bg-white"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.button>
              </div>

              {/* Mobile Menu Button */}
              <motion.button
                className="lg:hidden w-10 h-10 flex items-center justify-center touch-manipulation"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                whileTap={{ scale: 0.9 }}
              >
                {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
              </motion.button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
              {showMobileMenu && (
                <motion.div
                  className="lg:hidden border-t border-white/10 bg-black/90 backdrop-blur-lg"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                >
                  <div className="px-4 py-4 space-y-2">
                    {isAdmin && (
                      <motion.button
                        onClick={() => {
                          if (!canLeaveProfileSetup) return;
                          setCurrentView('admin');
                          setShowMobileMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/10 hover:border-white/20 touch-manipulation"
                        whileTap={{ scale: 0.98 }}
                      >
                        administrator page
                      </motion.button>
                    )}
                    <motion.button
                      onClick={() => {
                        setSelectedArtist(null);
                        setCurrentView('profile');
                        setShowMobileMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/10 hover:border-white/20 touch-manipulation"
                      whileTap={{ scale: 0.98 }}
                    >
                      my profile
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setShowSignOutConfirm(true);
                        setShowMobileMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors border border-red-500/40 hover:border-red-500/60 touch-manipulation"
                      whileTap={{ scale: 0.98 }}
                    >
                      sign out
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.nav>

          {/* Main Content Area */}
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
            {currentView === 'home' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {/* Welcome Header */}
                <div className="text-center mb-8 md:mb-12">
                  <h2 className="text-3xl md:text-4xl mb-6">welcome</h2>
                  
                  {/* Browse Artists Button */}
                  <motion.button
                  onClick={() => setCurrentView('categories')}
                  disabled={!canLeaveProfileSetup}
                  className="border border-white/40 px-6 md:px-8 py-3 hover:border-white/60 hover:bg-white/5 transition-all duration-300 group relative touch-manipulation inline-block"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-sm md:text-base tracking-wide">browse artists</span>
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                      initial={{ scaleX: 0 }}
                      whileHover={{ scaleX: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.button>
                </div>

                {/* Feed Section */}
                <Feed 
                  onArtistClick={(artistId) => {
                    // TODO: Fetch artist data and navigate to their profile
                    console.log('Navigate to artist:', artistId);
                  }}
                  onPlayTrack={(itemId) => {
                    // TODO: Load and play track
                    console.log('Play track:', itemId);
                  }}
                />
              </motion.div>
            )}

            {currentView === 'categories' && (
              <CategorySelector
                onCategorySelect={(category) => {
                  if (!canLeaveProfileSetup) return;
                  if (category === 'music') setCurrentView('browse-music');
                  else if (category === 'visual') setCurrentView('browse-visual');
                  else if (category === 'video') setCurrentView('browse-video');
                }}
                onBack={() => {
                  if (!canLeaveProfileSetup) return;
                  setCurrentView('home');
                }}
              />
            )}

            {currentView === 'browse-music' && (
              <BrowseArtists 
                onArtistClick={handleArtistClick}
                onBack={() => setCurrentView('categories')}
              />
            )}

            {currentView === 'browse-visual' && (
              <BrowseVisualArtists 
                onArtistClick={(artist) => {
                  // Visual artist profiles would be handled here
                  console.log('Visual artist clicked:', artist);
                }}
                onBack={() => setCurrentView('categories')}
              />
            )}

            {currentView === 'browse-video' && (
              <BrowseVideoArtists 
                onArtistClick={(artist) => {
                  // Video artist profiles would be handled here
                  console.log('Video artist clicked:', artist);
                }}
                onBack={() => setCurrentView('categories')}
              />
            )}

            {currentView === 'profile' && (
              <MyProfile
                forceSetup={forceProfileSetup}
                onSetupComplete={() => setForceProfileSetup(false)}
                onBack={() => setCurrentView('home')}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayProfileTrack}
                onAddTrackToQueue={handleAddProfileTrackToQueue}
                onTrackDeleted={handleDeletedProfileTrack}
                onMediaItemUpdated={handleProfileMediaItemUpdated}
                currentTime={currentTime}
                duration={duration}
                onSeekTrack={handleSeekTrack}
              />
            )}

            {currentView === 'admin' && isAdmin && (
              <AdminPanel onBack={() => setCurrentView('home')} />
            )}

            {currentView === 'artist' && selectedArtist && (
              <ArtistProfile 
                artist={selectedArtist} 
                onBack={() => setCurrentView('browse-music')}
                onPlayTrack={handlePlayTrack}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                onSeekTrack={handleSeekTrack}
              />
            )}
          </div>
        </div>

        {/* Global Audio Player */}
        {currentTrack && (
          <GlobalAudioPlayer
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            isMuted={isMuted}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onTrackEnd={() => {
              if (queueIndex >= 0 && queueIndex < playbackQueue.length - 1) {
                handleSkipTrack(1);
                return;
              }
              setIsPlaying(false);
              setCurrentTime(0);
            }}
            canSkipPrevious={queueIndex > 0}
            canSkipNext={queueIndex >= 0 && queueIndex < playbackQueue.length - 1}
            onSkipPrevious={() => handleSkipTrack(-1)}
            onSkipNext={() => handleSkipTrack(1)}
            onClose={handleClosePlayer}
            onTimeChange={setCurrentTime}
            onDurationChange={setDuration}
            onSeek={handleSeekTrack}
            onVolumeChange={handleVolumeChange}
            onMuteToggle={() => setIsMuted((current) => !current)}
          />
        )}
      </div>

      {/* Sign Out Confirmation */}
      {showSignOutConfirm && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowSignOutConfirm(false)}
        >
          <motion.div 
            className="bg-black border-2 border-white/20 p-10 max-w-md w-full mx-4"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl mb-4 tracking-wide">are you sure?</h3>
            <p className="text-gray-400 mb-8 tracking-wide">you&apos;ll need to sign back in to access your profile</p>
            
            <div className="flex gap-4">
              <motion.button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 px-6 py-4 border border-white/40 hover:border-white/60 hover:bg-white/5 transition-all duration-300 relative group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-base tracking-wide">cancel</span>
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>
              
              <motion.button
                onClick={async () => {
                  await onSignOut();
                  setShowSignOutConfirm(false);
                }}
                className="flex-1 px-6 py-4 border border-red-500/60 hover:border-red-500 hover:bg-red-500/10 transition-all duration-300 relative group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-base tracking-wide text-red-400 group-hover:text-red-300">sign out</span>
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

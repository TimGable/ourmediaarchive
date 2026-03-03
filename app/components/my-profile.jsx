import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, Plus, X, Edit2, ChevronRight, Music, Palette, Video, Check, Settings } from "lucide-react";
import { ChangePasswordModal } from "./change-password-modal";

export function MyProfile({ onBack }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  // TODO: Fetch user profile data from Supabase
  const [profileData, setProfileData] = useState({
    username: '',
    displayName: '',
    bio: '',
    avatar: '',
    categoryTags: [],
  });

  // TODO: Fetch user releases from Supabase
  const releases = [];

  const toggleCategoryTag = (tag) => {
    if (profileData.categoryTags.includes(tag)) {
      setProfileData({
        ...profileData,
        categoryTags: profileData.categoryTags.filter(t => t !== tag)
      });
    } else {
      setProfileData({
        ...profileData,
        categoryTags: [...profileData.categoryTags, tag]
      });
    }
  };

  const handleSaveProfile = () => {
    // TODO: Save to Supabase
    setIsEditing(false);
  };

  const categories = [
    { id: 'music', label: 'Music', icon: Music, description: 'audio releases & tracks' },
    { id: 'visual', label: 'Visual', icon: Palette, description: 'artwork & photography' },
    { id: 'video', label: 'Video', icon: Video, description: 'films & motion graphics' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Back button */}
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

      <div className="flex items-center justify-between mb-8 md:mb-12">
        <h2 className="text-3xl md:text-4xl">my profile</h2>
        
        {/* Edit Profile Button - Only show in view mode */}
        {!isEditing && (
          <motion.button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 border border-white/40 px-4 md:px-6 py-2.5 md:py-3 hover:border-white/60 hover:bg-white/10 transition-all duration-300 touch-manipulation"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden md:inline">edit profile</span>
            <span className="md:hidden">edit</span>
          </motion.button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          // EDIT MODE
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Profile Edit Section */}
            <div className="border border-white/20 p-4 md:p-8 mb-12">
              <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8 mb-8">
                {/* Avatar Upload */}
                <div className="flex-shrink-0 mx-auto md:mx-0">
                  <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-2 border-white/20 overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center group cursor-pointer hover:border-white/40 transition-all relative touch-manipulation">
                    {profileData.avatar ? (
                      <>
                        <img
                          src={profileData.avatar}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="w-6 h-6 md:w-8 md:h-8" />
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-6 md:p-8">
                        <Upload className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-gray-500" />
                        <p className="text-xs text-gray-500">upload avatar</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1 w-full">
                  {/* Username Field */}
                  <div className="mb-6">
                    <label className="block text-sm text-gray-400 mb-2">
                      username
                      <span className="text-gray-500 ml-2 text-xs">(unique identifier)</span>
                    </label>
                    <input
                      type="text"
                      value={profileData.username}
                      onChange={(e) => setProfileData({ ...profileData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      placeholder="username"
                      className="w-full bg-transparent border border-white/20 px-4 py-3 focus:border-white/60 focus:outline-none transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      lowercase letters, numbers, and underscores only
                    </p>
                  </div>

                  {/* Display Name Field */}
                  <div className="mb-6">
                    <label className="block text-sm text-gray-400 mb-2">
                      display name
                      <span className="text-gray-500 ml-2 text-xs">(band, collective, or your name)</span>
                    </label>
                    <input
                      type="text"
                      value={profileData.displayName}
                      onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                      placeholder="display name"
                      className="w-full bg-transparent border border-white/20 px-4 py-3 focus:border-white/60 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm text-gray-400 mb-2">bio</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      placeholder="add your bio..."
                      rows={4}
                      className="w-full bg-transparent border border-white/20 px-4 py-3 focus:border-white/60 focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  <div className="flex gap-4">
                    <motion.button
                      onClick={handleSaveProfile}
                      className="border border-white/40 px-8 py-3 hover:border-white/60 hover:bg-white/10 transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      save profile
                    </motion.button>
                    <motion.button
                      onClick={() => setIsEditing(false)}
                      className="border border-white/20 px-8 py-3 hover:border-white/40 hover:bg-white/5 transition-all duration-300 text-gray-400"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      cancel
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Category Tags Section */}
              <div className="border-t border-white/10 pt-8 mt-8">
                <h4 className="text-lg mb-2">content categories</h4>
                <p className="text-sm text-gray-400 mb-6">
                  select the type(s) of content you create. your profile will appear in these browse categories.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const isSelected = profileData.categoryTags.includes(category.id);
                    
                    return (
                      <motion.button
                        key={category.id}
                        onClick={() => toggleCategoryTag(category.id)}
                        className={`relative border-2 p-6 transition-all duration-300 group touch-manipulation ${
                          isSelected 
                            ? 'border-white bg-white/10' 
                            : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* Check indicator */}
                        {isSelected && (
                          <motion.div
                            className="absolute top-3 right-3"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          >
                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-black" strokeWidth={3} />
                            </div>
                          </motion.div>
                        )}

                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                          <Icon className={`w-10 h-10 transition-colors ${
                            isSelected ? 'text-white' : 'text-gray-400'
                          }`} strokeWidth={1.5} />
                        </div>

                        {/* Label */}
                        <h5 className={`text-lg mb-1 transition-colors ${
                          isSelected ? 'text-white' : 'text-gray-300'
                        }`}>
                          {category.label}
                        </h5>

                        {/* Description */}
                        <p className="text-xs text-gray-500">
                          {category.description}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Selected tags preview */}
                {profileData.categoryTags.length > 0 && (
                  <motion.div
                    className="mt-6 p-4 border border-white/10 bg-white/5"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="text-sm text-gray-400 mb-2">your content will appear in:</p>
                    <div className="flex gap-2 flex-wrap">
                      {profileData.categoryTags.map((tag) => {
                        const category = categories.find(c => c.id === tag);
                        const Icon = category?.icon;
                        return (
                          <div key={tag} className="flex items-center gap-2 px-3 py-1.5 border border-white/20 bg-white/5">
                            {Icon && <Icon className="w-4 h-4" />}
                            <span className="text-sm">{category?.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Security Section */}
              <div className="border-t border-white/10 pt-6 mt-6">
                <h4 className="text-lg text-gray-400 mb-4">security</h4>
                <motion.button
                  onClick={() => setShowChangePassword(true)}
                  className="border border-white/40 px-6 py-2 hover:border-white/60 hover:bg-white/10 transition-all duration-300 text-sm relative group touch-manipulation"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="tracking-wide">change password</span>
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : (
          // VIEW MODE (Public Profile View)
          <motion.div
            key="view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Public Profile View */}
            <div className="border border-white/20 p-6 md:p-12 mb-12">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-8">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-2 border-white/20 overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    {profileData.avatar ? (
                      <img
                        src={profileData.avatar}
                        alt={profileData.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-6xl md:text-8xl text-gray-600">
                        {profileData.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-3xl md:text-4xl mb-2">{profileData.displayName}</h3>
                  <p className="text-gray-400 mb-4">@{profileData.username}</p>
                  
                  {/* Category Tags */}
                  {profileData.categoryTags.length > 0 && (
                    <div className="flex gap-2 flex-wrap justify-center md:justify-start mb-6">
                      {profileData.categoryTags.map((tag) => {
                        const category = categories.find(c => c.id === tag);
                        const Icon = category?.icon;
                        return (
                          <div key={tag} className="flex items-center gap-2 px-3 py-1.5 border border-white/40 bg-white/5">
                            {Icon && <Icon className="w-4 h-4" />}
                            <span className="text-sm">{category?.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-gray-300 leading-relaxed max-w-2xl">
                    {profileData.bio}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Section - Shows in both modes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-2xl md:text-3xl mb-8">your content</h3>

        {/* Upload Sections for Each Selected Category */}
        {profileData.categoryTags.length > 0 ? (
          <div className="space-y-12">
            {/* Music Upload Section */}
            {profileData.categoryTags.includes('music') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Music className="w-6 h-6" />
                    <h4 className="text-xl">music releases</h4>
                  </div>
                  <motion.button
                    className="flex items-center gap-2 border border-white/40 px-4 md:px-6 py-2.5 md:py-3 hover:border-white/60 hover:bg-white/10 transition-all duration-300 text-sm md:text-base touch-manipulation"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>upload track</span>
                  </motion.button>
                </div>

                {releases.length === 0 ? (
                  <div className="border border-white/20 border-dashed p-12 md:p-16 text-center">
                    <Music className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-400 text-base md:text-lg mb-2">no music releases yet</p>
                    <p className="text-gray-500 text-sm mb-6">
                      upload your first single, ep, or album
                    </p>
                    <motion.button
                      className="border border-white/40 px-6 md:px-8 py-2.5 md:py-3 hover:border-white/60 hover:bg-white/10 transition-all duration-300 inline-flex items-center gap-2 touch-manipulation"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>upload your first track</span>
                    </motion.button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Music releases will be mapped here */}
                  </div>
                )}
              </motion.div>
            )}

            {/* Visual Upload Section */}
            {profileData.categoryTags.includes('visual') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Palette className="w-6 h-6" />
                    <h4 className="text-xl">visual art</h4>
                  </div>
                  <motion.button
                    className="flex items-center gap-2 border border-white/40 px-4 md:px-6 py-2.5 md:py-3 hover:border-white/60 hover:bg-white/10 transition-all duration-300 text-sm md:text-base touch-manipulation"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>upload artwork</span>
                  </motion.button>
                </div>

                <div className="border border-white/20 border-dashed p-12 md:p-16 text-center">
                  <Palette className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-400 text-base md:text-lg mb-2">no visual art yet</p>
                  <p className="text-gray-500 text-sm mb-6">
                    share your photography, illustrations, or digital art
                  </p>
                  <motion.button
                    className="border border-white/40 px-6 md:px-8 py-2.5 md:py-3 hover:border-white/60 hover:bg-white/10 transition-all duration-300 inline-flex items-center gap-2 touch-manipulation"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>upload your first piece</span>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Video Upload Section */}
            {profileData.categoryTags.includes('video') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Video className="w-6 h-6" />
                    <h4 className="text-xl">video content</h4>
                  </div>
                  <motion.button
                    className="flex items-center gap-2 border border-white/40 px-4 md:px-6 py-2.5 md:py-3 hover:border-white/60 hover:bg-white/10 transition-all duration-300 text-sm md:text-base touch-manipulation"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>upload video</span>
                  </motion.button>
                </div>

                <div className="border border-white/20 border-dashed p-12 md:p-16 text-center">
                  <Video className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-400 text-base md:text-lg mb-2">no videos yet</p>
                  <p className="text-gray-500 text-sm mb-6">
                    upload films, music videos, or motion graphics
                  </p>
                  <motion.button
                    className="border border-white/40 px-6 md:px-8 py-2.5 md:py-3 hover:border-white/60 hover:bg-white/10 transition-all duration-300 inline-flex items-center gap-2 touch-manipulation"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>upload your first video</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          <motion.div
            className="border border-white/20 border-dashed p-12 md:p-16 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Upload className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400 text-base md:text-lg mb-2">select content categories first</p>
            <p className="text-gray-500 text-sm">
              choose music, visual, or video in edit mode to start uploading content
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => {
            setShowChangePassword(false);
            // Show success message (could add a toast notification here)
            alert('password updated successfully');
          }}
        />
      )}
    </motion.div>
  );
}

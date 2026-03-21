import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, Plus, Edit2, Music, Palette, Video, Check } from "lucide-react";
import { ChangePasswordModal } from "./change-password-modal";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { UploadContentModal } from "./upload-content-modal";
import { MusicReleasePlayer } from "./music-release-player";
import { EditUploadModal } from "./edit-upload-modal";
import { MediaItemPage } from "./media-item-page";

function isGeneratedUsername(username) {
  return typeof username === "string" && /_[a-f0-9]{8}$/.test(username);
}

export function MyProfile({
  onBack,
  forceSetup = false,
  onSetupComplete,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onAddTrackToQueue,
  onTrackDeleted,
  onMediaItemUpdated,
  currentTime,
  duration,
  onSeekTrack,
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const avatarInputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(forceSetup);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingMediaItem, setEditingMediaItem] = useState(null);
  const [selectedMediaItem, setSelectedMediaItem] = useState(null);
  const [uploadKind, setUploadKind] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUpdatingMedia, setIsUpdatingMedia] = useState(false);
  const [deletingMediaItemId, setDeletingMediaItemId] = useState(null);
  const [profileNotice, setProfileNotice] = useState({ type: "", message: "" });
  const [contentNotice, setContentNotice] = useState({ type: "", message: "" });
  const [mediaItems, setMediaItems] = useState([]);
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    displayName: '',
    bio: '',
    avatar: '',
    followerCount: 0,
    followingCount: 0,
    categoryTags: [],
  });
  const isEditMode = forceSetup || isEditing;
  const musicItems = mediaItems.filter((item) => item.mediaKind === "music");
  const visualItems = mediaItems.filter((item) => item.mediaKind === "visual");
  const videoItems = mediaItems.filter((item) => item.mediaKind === "video");
  const avatarFallback = (profileData.displayName || profileData.username || "?")
    .charAt(0)
    .toUpperCase();
  const activeMusicItemId = currentTrack?.track?.id || null;
  const artistIdentity = {
    name: profileData.displayName || profileData.username || "artist",
    username: profileData.username,
  };

  useEffect(() => {
    if (!selectedMediaItem) {
      return;
    }

    const nextSelectedItem = mediaItems.find((item) => item.id === selectedMediaItem.id);
    if (!nextSelectedItem) {
      setSelectedMediaItem(null);
      return;
    }

    if (nextSelectedItem !== selectedMediaItem) {
      setSelectedMediaItem(nextSelectedItem);
    }
  }, [mediaItems, selectedMediaItem]);

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

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setIsLoadingProfile(true);
      setIsLoadingMedia(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      if (!session?.access_token) {
        setProfileNotice({ type: "error", message: "Session expired. Please sign in again." });
        setIsLoadingProfile(false);
        setIsLoadingMedia(false);
        return;
      }

      const [authUser, profileResponse, mediaResponse] = await Promise.all([
        supabase.auth.getUser(),
        fetch("/api/profile", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }),
        fetch("/api/media", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }),
      ]);

      if (!mounted) return;

      const currentEmail = authUser?.data?.user?.email || "";
      if (!profileResponse.ok) {
        const payload = await profileResponse.json().catch(() => ({}));
        setProfileNotice({ type: "error", message: payload?.error || "Failed to load profile." });
        setIsLoadingProfile(false);
        setIsLoadingMedia(false);
        return;
      }

      const payload = await profileResponse.json();
      const apiProfile = payload?.profile;

      setProfileData((prev) => ({
        ...prev,
        username: apiProfile?.username || "",
        displayName: apiProfile?.displayName || "",
        bio: apiProfile?.bio || "",
        avatar: apiProfile?.avatarUrl || "",
        followerCount: apiProfile?.followerCount || 0,
        followingCount: apiProfile?.followingCount || 0,
        categoryTags: apiProfile?.categoryTags || [],
        email: currentEmail,
      }));

      if (!mediaResponse.ok) {
        const mediaPayload = await mediaResponse.json().catch(() => ({}));
        setContentNotice({
          type: "error",
          message: mediaPayload?.error || "Failed to load your uploaded content.",
        });
        setMediaItems([]);
      } else {
        const mediaPayload = await mediaResponse.json();
        setMediaItems(mediaPayload?.items || []);
      }

      setIsLoadingProfile(false);
      setIsLoadingMedia(false);
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const handleSaveProfile = async () => {
    setProfileNotice({ type: "", message: "" });
    setIsSaving(true);

    const normalizedUsername = profileData.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,32}$/.test(normalizedUsername)) {
      setProfileNotice({
        type: "error",
        message: "Username must be 3-32 characters using lowercase letters, numbers, or underscores.",
      });
      setIsSaving(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setProfileNotice({ type: "error", message: "Could not verify your session. Please sign in again." });
      setIsSaving(false);
      return;
    }

    const profileResponse = await fetch("/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        username: normalizedUsername,
        displayName: profileData.displayName.trim() || normalizedUsername,
        bio: profileData.bio,
        categoryTags: profileData.categoryTags,
      }),
    });

    const profilePayload = await profileResponse.json().catch(() => ({}));
    if (!profileResponse.ok) {
      const rawError = String(profilePayload?.error || "");
      const uniqueUsername = rawError.toLowerCase().includes("profiles_username_key");
      setProfileNotice({
        type: "error",
        message: uniqueUsername
          ? "That username is already taken. Please choose another."
          : profilePayload?.error || "Failed to save profile.",
      });
      setIsSaving(false);
      return;
    }

    setProfileData((prev) => ({
      ...prev,
      username: profilePayload?.profile?.username || prev.username,
      displayName: profilePayload?.profile?.displayName || prev.displayName,
      bio: profilePayload?.profile?.bio || "",
      avatar: profilePayload?.profile?.avatarUrl ?? prev.avatar,
      followerCount: profilePayload?.profile?.followerCount ?? prev.followerCount,
      followingCount: profilePayload?.profile?.followingCount ?? prev.followingCount,
      categoryTags: profilePayload?.profile?.categoryTags || [],
    }));

    const { data: userData, error: getUserError } = await supabase.auth.getUser();
    if (getUserError || !userData?.user) {
      setProfileNotice({ type: "success", message: "Profile saved." });
      setIsEditing(false);
      setIsSaving(false);
      return;
    }

    const currentEmail = userData.user.email || "";
    const nextEmail = profileData.email.trim().toLowerCase();

    if (nextEmail && nextEmail !== currentEmail) {
      const { error: emailUpdateError } = await supabase.auth.updateUser({ email: nextEmail });
      if (emailUpdateError) {
        setProfileNotice({ type: "error", message: emailUpdateError.message || "Failed to update email." });
        setIsSaving(false);
        return;
      }

      setProfileNotice({
        type: "success",
        message: "Profile saved. Check your inbox to confirm the email change.",
      });
    } else {
      setProfileNotice({ type: "success", message: "Profile saved." });
    }

    if (forceSetup && !isGeneratedUsername(normalizedUsername)) {
      onSetupComplete?.();
    }

    setIsEditing(false);
    setIsSaving(false);
  };

  const categories = [
    { id: 'music', label: 'Music', icon: Music, description: 'audio releases & tracks' },
    { id: 'visual', label: 'Visual', icon: Palette, description: 'artwork & photography' },
    { id: 'video', label: 'Video', icon: Video, description: 'films & motion graphics' },
  ];

  const openUploadModal = (mediaKind) => {
    setContentNotice({ type: "", message: "" });
    setUploadKind(mediaKind);
    setShowUploadModal(true);
  };

  const openAvatarPicker = () => {
    if (isUploadingAvatar) return;
    avatarInputRef.current?.click();
  };

  const closeUploadModal = () => {
    if (isUploading) return;
    setShowUploadModal(false);
    setUploadKind(null);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatUploadDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString();
  };

  const formatReleaseType = (value) => {
    if (value === "ep") return "EP";
    if (value === "album") return "Album";
    return "Single";
  };

  const handleAvatarSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsUploadingAvatar(true);
    setProfileNotice({ type: "", message: "" });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setProfileNotice({
          type: "error",
          message: "Session expired. Please sign in again before uploading an avatar.",
        });
        return;
      }

      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setProfileNotice({
          type: "error",
          message: payload?.error || "Failed to upload avatar.",
        });
        return;
      }

      setProfileData((prev) => ({
        ...prev,
        avatar: payload?.avatar?.url || "",
      }));
      setProfileNotice({
        type: "success",
        message: "Avatar updated.",
      });
    } catch (error) {
      setProfileNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to upload avatar.",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    setProfileNotice({ type: "", message: "" });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setProfileNotice({
          type: "error",
          message: "Session expired. Please sign in again before removing your avatar.",
        });
        return;
      }

      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setProfileNotice({
          type: "error",
          message: payload?.error || "Failed to remove avatar.",
        });
        return;
      }

      setProfileData((prev) => ({
        ...prev,
        avatar: "",
      }));
      setProfileNotice({
        type: "success",
        message: "Avatar removed.",
      });
    } catch (error) {
      setProfileNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to remove avatar.",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUploadContent = async ({
    mediaKind,
    releaseType,
    title,
    description,
    visibility,
    file,
    files,
    trackTitles,
    coverArt,
  }) => {
    setIsUploading(true);
    setContentNotice({ type: "", message: "" });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setContentNotice({
          type: "error",
          message: "Session expired. Please sign in again before uploading.",
        });
        return;
      }

      const body = new FormData();
      body.append("mediaKind", mediaKind);
      if (mediaKind === "music" && releaseType) {
        body.append("releaseType", releaseType);
      }
      body.append("title", title);
      body.append("description", description);
      body.append("visibility", visibility);
      if (mediaKind === "music" && releaseType && releaseType !== "single") {
        for (const nextFile of files || []) {
          body.append("file", nextFile);
        }
        for (const trackTitle of trackTitles || []) {
          body.append("trackTitle", trackTitle);
        }
      } else if (file) {
        body.append("file", file);
      }
      if (mediaKind === "music" && coverArt) {
        body.append("coverArt", coverArt);
      }

      const response = await fetch("/api/media", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setContentNotice({
          type: "error",
          message: payload?.error || "Upload failed.",
        });
        return;
      }

      const newItems = Array.isArray(payload.items)
        ? payload.items
        : payload.item
          ? [payload.item]
          : [];
      setMediaItems((current) => [...newItems, ...current]);
      setContentNotice({
        type: "success",
        message:
          mediaKind === "music" && releaseType !== "single" && newItems.length > 1
            ? `${newItems.length} tracks uploaded to ${title}.`
            : mediaKind === "music" && releaseType
              ? `${title} uploaded as a ${formatReleaseType(releaseType).toLowerCase()}.`
              : `${title} uploaded successfully.`,
      });
      setShowUploadModal(false);
      setUploadKind(null);
    } catch (error) {
      setContentNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Upload failed.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMediaItem = async (mediaItemId) => {
    setDeletingMediaItemId(mediaItemId);
    setContentNotice({ type: "", message: "" });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setContentNotice({
          type: "error",
          message: "Session expired. Please sign in again before deleting content.",
        });
        return;
      }

      const response = await fetch(`/api/media?id=${encodeURIComponent(mediaItemId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setContentNotice({
          type: "error",
          message: payload?.error || "Failed to delete content.",
        });
        return;
      }

      setMediaItems((current) => current.filter((item) => item.id !== mediaItemId));
      if (currentTrack?.track?.id === mediaItemId) {
        onTrackDeleted?.(mediaItemId);
      }
      if (editingMediaItem?.id === mediaItemId) {
        setEditingMediaItem(null);
      }
      if (selectedMediaItem?.id === mediaItemId) {
        setSelectedMediaItem(null);
      }
      setContentNotice({
        type: "success",
        message: "Content deleted.",
      });
    } catch (error) {
      setContentNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to delete content.",
      });
    } finally {
      setDeletingMediaItemId(null);
    }
  };

  const handleSaveMediaItem = async ({ id, title, description, visibility }) => {
    setIsUpdatingMedia(true);
    setContentNotice({ type: "", message: "" });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setContentNotice({
          type: "error",
          message: "Session expired. Please sign in again before editing content.",
        });
        return;
      }

      const response = await fetch("/api/media", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id,
          title,
          description,
          visibility,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setContentNotice({
          type: "error",
          message: payload?.error || "Failed to update content.",
        });
        return;
      }

      setMediaItems((current) =>
        current.map((item) => (item.id === id ? payload.item : item)),
      );
      if (selectedMediaItem?.id === id) {
        setSelectedMediaItem(payload.item);
      }
      onMediaItemUpdated?.(payload.item);
      setEditingMediaItem(null);
      setContentNotice({
        type: "success",
        message: "Upload updated.",
      });
    } catch (error) {
      setContentNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to update content.",
      });
    } finally {
      setIsUpdatingMedia(false);
    }
  };

  const handlePlayMusicItem = (item) => {
    if (!item?.asset?.url || !onPlayTrack) {
      return;
    }

    onPlayTrack(item, artistIdentity, musicItems);
  };

  const handleSeekMusicItem = (item, nextTime) => {
    if (activeMusicItemId !== item.id || !onSeekTrack) {
      return;
    }

    onSeekTrack(nextTime);
  };

  const openEditUploadModal = (item) => {
    setEditingMediaItem(item);
  };

  const handleAddMusicItemToQueue = (item) => {
    if (!item?.asset?.url || !onAddTrackToQueue) {
      return;
    }

    const result = onAddTrackToQueue(item, artistIdentity, musicItems);
    setContentNotice({
      type: "success",
      message: result === "exists" ? "Track is already in the queue." : "Track added to queue.",
    });
  };

  const handleShareMusicItem = async (item) => {
    const shareText = `${item.title} by ${artistIdentity.name}`;
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}#track-${item.id}`
        : "";

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareText,
          text: shareText,
          url: shareUrl || undefined,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl ? `${shareText}\n${shareUrl}` : shareText);
        setContentNotice({
          type: "success",
          message: "Track details copied to your clipboard.",
        });
        return;
      }

      setContentNotice({
        type: "error",
        message: "Sharing is not available in this browser.",
      });
    } catch (error) {
      setContentNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to share track.",
      });
    }
  };

  const openMediaItemPage = (item) => {
    setSelectedMediaItem(item);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {!forceSetup && (
        <motion.button
          onClick={onBack}
          className="mb-6 md:mb-8 text-gray-400 hover:text-white transition-colors relative group inline-block touch-manipulation"
          whileHover={{ x: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="inline-block" aria-hidden="true">{"\u2190"}</span>
          <span className="ml-2">back</span>
          <motion.div
            className="absolute -bottom-1 left-0 h-px bg-white"
            initial={{ width: 0 }}
            whileHover={{ width: "100%" }}
            transition={{ duration: 0.3 }}
          />
        </motion.button>
      )}

      <div className="flex items-center justify-between mb-8 md:mb-12">
        <h2 className="text-3xl md:text-4xl">my profile</h2>
        
        {/* Edit Profile Button - Only show in view mode */}
        {!isEditMode && (
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

      {profileNotice.message && (
        <div
          className={`mb-6 border px-4 py-3 text-sm ${
            profileNotice.type === "error"
              ? "border-red-500/40 bg-red-500/10 text-red-400"
              : "border-green-500/40 bg-green-500/10 text-green-400"
          }`}
        >
          {profileNotice.message}
        </div>
      )}

      {forceSetup && (
        <div className="mb-6 border border-white/20 bg-white/5 px-4 py-3 text-sm text-gray-300">
          Account setup: choose a unique @username to continue. Bio and profile image are optional.
        </div>
      )}

      {isLoadingProfile && (
        <div className="mb-6 border border-white/20 bg-white/5 px-4 py-3 text-sm text-gray-400">
          loading profile...
        </div>
      )}

      <AnimatePresence mode="wait">
        {isEditMode ? (
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
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarSelected}
                  />
                  <button
                    type="button"
                    onClick={openAvatarPicker}
                    disabled={isUploadingAvatar}
                    className="group relative flex h-32 w-32 touch-manipulation items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-gradient-to-br from-gray-800 to-gray-900 transition-all hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-70 md:h-48 md:w-48"
                  >
                    {profileData.avatar ? (
                      <>
                        <img
                          src={profileData.avatar}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="text-center">
                            <Upload className="mx-auto h-6 w-6 md:h-8 md:w-8" />
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/80">
                              {isUploadingAvatar ? "uploading..." : "change"}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-6 md:p-8">
                        <Upload className="mx-auto mb-2 h-6 w-6 text-gray-500 md:h-8 md:w-8" />
                        <p className="text-xs text-gray-500">
                          {isUploadingAvatar ? "uploading..." : "upload avatar"}
                        </p>
                      </div>
                    )}
                  </button>
                  <div className="mt-3 text-center md:text-left">
                    <button
                      type="button"
                      onClick={openAvatarPicker}
                      disabled={isUploadingAvatar}
                      className="text-xs uppercase tracking-[0.18em] text-gray-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {profileData.avatar ? "replace image" : "choose image"}
                    </button>
                    {profileData.avatar && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        disabled={isUploadingAvatar}
                        className="ml-4 text-xs uppercase tracking-[0.18em] text-gray-500 transition-colors hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        remove
                      </button>
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
                    <label className="block text-sm text-gray-400 mb-2">
                      email
                      <span className="text-gray-500 ml-2 text-xs">(used for sign in)</span>
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      placeholder="email address"
                      className="w-full bg-transparent border border-white/20 px-4 py-3 focus:border-white/60 focus:outline-none transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      changing email may require confirmation via inbox.
                    </p>
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
                      disabled={isSaving}
                      className="border border-white/40 px-8 py-3 hover:border-white/60 hover:bg-white/10 transition-all duration-300"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isSaving ? "saving..." : "save profile"}
                    </motion.button>
                    {!forceSetup && (
                      <motion.button
                        onClick={() => {
                          setIsEditing(false);
                          setProfileNotice({ type: "", message: "" });
                        }}
                        className="border border-white/20 px-8 py-3 hover:border-white/40 hover:bg-white/5 transition-all duration-300 text-gray-400"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        cancel
                      </motion.button>
                    )}
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
                        {avatarFallback}
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-3xl md:text-4xl mb-2">{profileData.displayName}</h3>
                  <p className="text-gray-400 mb-4">@{profileData.username}</p>
                  {profileData.email && <p className="text-gray-500 mb-4">{profileData.email}</p>}

                  <div className="mb-4 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400 md:justify-start">
                    <span>
                      <span className="text-white font-medium">{profileData.followerCount}</span> followers
                    </span>
                    <span>
                      <span className="text-white font-medium">{profileData.followingCount}</span> following
                    </span>
                  </div>
                  
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

        {contentNotice.message && (
          <div
            className={`mb-6 border px-4 py-3 text-sm ${
              contentNotice.type === "error"
                ? "border-red-500/40 bg-red-500/10 text-red-400"
                : "border-green-500/40 bg-green-500/10 text-green-400"
            }`}
          >
            {contentNotice.message}
          </div>
        )}

        {isLoadingMedia && (
          <div className="mb-6 border border-white/20 bg-white/5 px-4 py-3 text-sm text-gray-400">
            loading uploaded content...
          </div>
        )}

        {/* Upload Sections for Each Selected Category */}
        {profileData.categoryTags.length > 0 ? (
          selectedMediaItem ? (
            <MediaItemPage
              item={selectedMediaItem}
              isPlaying={isPlaying}
              isActive={activeMusicItemId === selectedMediaItem.id}
              currentTime={activeMusicItemId === selectedMediaItem.id ? currentTime : 0}
              duration={activeMusicItemId === selectedMediaItem.id ? duration : 0}
              onBack={() => setSelectedMediaItem(null)}
              onEdit={openEditUploadModal}
              onPlayPause={handlePlayMusicItem}
              onSeek={(nextTime) => handleSeekMusicItem(selectedMediaItem, nextTime)}
              formatUploadDate={formatUploadDate}
              formatFileSize={formatFileSize}
              formatReleaseType={formatReleaseType}
            />
          ) : (
            <div className="space-y-12">
              {profileData.categoryTags.includes("music") && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Music className="w-6 h-6" />
                      <h4 className="text-xl">music releases</h4>
                    </div>
                    <motion.button
                      onClick={() => openUploadModal("music")}
                      className="flex items-center gap-2 border border-white/40 px-4 py-2.5 text-sm transition-all duration-300 hover:border-white/60 hover:bg-white/10 md:px-6 md:py-3 md:text-base touch-manipulation"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>upload release</span>
                    </motion.button>
                  </div>

                  {musicItems.length === 0 ? (
                    <div className="border border-white/20 border-dashed p-12 text-center md:p-16">
                      <Music className="mx-auto mb-4 h-10 w-10 text-gray-500 md:h-12 md:w-12" />
                      <p className="mb-2 text-base text-gray-400 md:text-lg">no music releases yet</p>
                      <p className="mb-6 text-sm text-gray-500">
                        upload your first single, EP, or album
                      </p>
                      <motion.button
                        onClick={() => openUploadModal("music")}
                        className="inline-flex items-center gap-2 border border-white/40 px-6 py-2.5 transition-all duration-300 hover:border-white/60 hover:bg-white/10 md:px-8 md:py-3 touch-manipulation"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Plus className="w-4 h-4" />
                        <span>upload your first release</span>
                      </motion.button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {musicItems.map((item) => (
                        <MusicReleasePlayer
                          key={item.id}
                          item={item}
                        isActive={activeMusicItemId === item.id}
                        isPlaying={isPlaying}
                        onOpen={openMediaItemPage}
                        onPlayPause={handlePlayMusicItem}
                        onAddToQueue={handleAddMusicItemToQueue}
                        onShare={handleShareMusicItem}
                        onEdit={openEditUploadModal}
                        currentTime={activeMusicItemId === item.id ? currentTime : 0}
                        duration={activeMusicItemId === item.id ? duration : 0}
                          onSeek={(nextTime) => handleSeekMusicItem(item, nextTime)}
                          formatFileSize={formatFileSize}
                          formatUploadDate={formatUploadDate}
                          formatReleaseType={formatReleaseType}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {profileData.categoryTags.includes("visual") && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Palette className="w-6 h-6" />
                      <h4 className="text-xl">visual art</h4>
                    </div>
                    <motion.button
                      onClick={() => openUploadModal("visual")}
                      className="flex items-center gap-2 border border-white/40 px-4 py-2.5 text-sm transition-all duration-300 hover:border-white/60 hover:bg-white/10 md:px-6 md:py-3 md:text-base touch-manipulation"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>upload artwork</span>
                    </motion.button>
                  </div>

                  {visualItems.length === 0 ? (
                    <div className="border border-white/20 border-dashed p-12 text-center md:p-16">
                      <Palette className="mx-auto mb-4 h-10 w-10 text-gray-500 md:h-12 md:w-12" />
                      <p className="mb-2 text-base text-gray-400 md:text-lg">no visual art yet</p>
                      <p className="mb-6 text-sm text-gray-500">
                        share your photography, illustrations, or digital art
                      </p>
                      <motion.button
                        onClick={() => openUploadModal("visual")}
                        className="inline-flex items-center gap-2 border border-white/40 px-6 py-2.5 transition-all duration-300 hover:border-white/60 hover:bg-white/10 md:px-8 md:py-3 touch-manipulation"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Plus className="w-4 h-4" />
                        <span>upload your first piece</span>
                      </motion.button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {visualItems.map((item) => (
                        <div key={item.id} className="border border-white/20 bg-white/5 p-5">
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => openMediaItemPage(item)}
                                className="text-left text-lg transition-colors hover:text-gray-300"
                              >
                                {item.title}
                              </button>
                              <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-gray-500">
                                {item.visibility.replace("_", " ")}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => openEditUploadModal(item)}
                              className="flex items-center gap-2 border border-white/15 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-gray-400 transition-colors hover:border-white/40 hover:text-white"
                            >
                              <Edit2 className="h-4 w-4" />
                              <span>edit upload</span>
                            </button>
                          </div>
                          {item.asset?.url ? (
                            <img
                              src={item.asset.url}
                              alt={item.title}
                              className="mb-4 aspect-square w-full object-cover"
                            />
                          ) : (
                            <div className="mb-4 aspect-square w-full bg-white/5" />
                          )}
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <span className="text-xs text-gray-500">{formatUploadDate(item.createdAt)}</span>
                          </div>
                          {item.description && (
                            <p className="text-sm leading-relaxed text-gray-400">{item.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {profileData.categoryTags.includes("video") && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Video className="w-6 h-6" />
                      <h4 className="text-xl">video content</h4>
                    </div>
                    <motion.button
                      onClick={() => openUploadModal("video")}
                      className="flex items-center gap-2 border border-white/40 px-4 py-2.5 text-sm transition-all duration-300 hover:border-white/60 hover:bg-white/10 md:px-6 md:py-3 md:text-base touch-manipulation"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>upload video</span>
                    </motion.button>
                  </div>

                  {videoItems.length === 0 ? (
                    <div className="border border-white/20 border-dashed p-12 text-center md:p-16">
                      <Video className="mx-auto mb-4 h-10 w-10 text-gray-500 md:h-12 md:w-12" />
                      <p className="mb-2 text-base text-gray-400 md:text-lg">no videos yet</p>
                      <p className="mb-6 text-sm text-gray-500">
                        upload films, music videos, or motion graphics
                      </p>
                      <motion.button
                        onClick={() => openUploadModal("video")}
                        className="inline-flex items-center gap-2 border border-white/40 px-6 py-2.5 transition-all duration-300 hover:border-white/60 hover:bg-white/10 md:px-8 md:py-3 touch-manipulation"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Plus className="w-4 h-4" />
                        <span>upload your first video</span>
                      </motion.button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {videoItems.map((item) => (
                        <div key={item.id} className="border border-white/20 bg-white/5 p-5">
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => openMediaItemPage(item)}
                                className="text-left text-lg transition-colors hover:text-gray-300"
                              >
                                {item.title}
                              </button>
                              <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-gray-500">
                                {item.visibility.replace("_", " ")}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => openEditUploadModal(item)}
                              className="flex items-center gap-2 border border-white/15 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-gray-400 transition-colors hover:border-white/40 hover:text-white"
                            >
                              <Edit2 className="h-4 w-4" />
                              <span>edit upload</span>
                            </button>
                          </div>
                          {item.asset?.url ? (
                            <video controls className="mb-4 aspect-video w-full bg-black">
                              <source src={item.asset.url} type={item.asset.mimeType} />
                            </video>
                          ) : (
                            <div className="mb-4 aspect-video w-full bg-white/5" />
                          )}
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <span className="text-xs text-gray-500">{formatUploadDate(item.createdAt)}</span>
                          </div>
                          {item.description && (
                            <p className="text-sm leading-relaxed text-gray-400">{item.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )
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

      {showUploadModal && uploadKind && (
        <UploadContentModal
          mediaKind={uploadKind}
          isSubmitting={isUploading}
          onClose={closeUploadModal}
          onSubmit={handleUploadContent}
        />
      )}

      {editingMediaItem && (
        <EditUploadModal
          item={editingMediaItem}
          isSubmitting={isUpdatingMedia}
          isDeleting={deletingMediaItemId === editingMediaItem.id}
          onClose={() => {
            if (isUpdatingMedia || deletingMediaItemId === editingMediaItem.id) {
              return;
            }
            setEditingMediaItem(null);
          }}
          onSave={handleSaveMediaItem}
          onDelete={handleDeleteMediaItem}
        />
      )}
    </motion.div>
  );
}


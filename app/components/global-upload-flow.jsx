"use client";

import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { UploadCategoryModal } from "./upload-category-modal";
import { UploadContentModal } from "./upload-content-modal";
import { UploadProgressModal } from "./upload-progress-modal";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { uploadFormDataWithProgress } from "@/lib/upload-request";

export function GlobalUploadFlow({
  isOpen,
  categoryTags = [],
  onClose,
  onUploaded,
}) {
  const [uploadKind, setUploadKind] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const closeFlow = () => {
    if (isUploading) {
      return;
    }

    setUploadKind(null);
    onClose?.();
  };

  const handleSelectCategory = (mediaKind) => {
    setUploadKind(mediaKind);
  };

  const handleSubmit = async ({
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
    setUploadProgress(1);

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Session expired. Please sign in again before uploading.");
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

      const payload = await uploadFormDataWithProgress({
        url: "/api/media",
        token: session.access_token,
        body,
        onProgress: setUploadProgress,
      });

      onUploaded?.(payload);
      setUploadKind(null);
      onClose?.();
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && !uploadKind ? (
        <UploadCategoryModal
          categoryTags={categoryTags}
          onClose={closeFlow}
          onSelect={handleSelectCategory}
        />
      ) : null}

      {isOpen && uploadKind ? (
        <UploadContentModal
          mediaKind={uploadKind}
          isSubmitting={isUploading}
          onClose={closeFlow}
          onSubmit={handleSubmit}
        />
      ) : null}

      {isUploading ? <UploadProgressModal progress={uploadProgress} /> : null}
    </AnimatePresence>
  );
}

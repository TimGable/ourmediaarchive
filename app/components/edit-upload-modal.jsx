import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, X } from "lucide-react";

const VISIBILITY_OPTIONS = [
  { value: "private", label: "private" },
  { value: "invite_only", label: "invite only" },
  { value: "unlisted", label: "unlisted" },
  { value: "public", label: "public" },
];

export function EditUploadModal({
  item,
  isSubmitting,
  isDeleting,
  onClose,
  onSave,
  onDelete,
}) {
  const [title, setTitle] = useState(item?.title || "");
  const [description, setDescription] = useState(item?.description || "");
  const [visibility, setVisibility] = useState(item?.visibility || "invite_only");
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(item?.title || "");
    setDescription(item?.description || "");
    setVisibility(item?.visibility || "invite_only");
    setError("");
  }, [item]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("A title is required.");
      return;
    }

    await onSave({
      id: item.id,
      title: title.trim(),
      description: description.trim(),
      visibility,
    });
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => {
        if (!isSubmitting && !isDeleting) {
          onClose();
        }
      }}
    >
      <motion.div
        className="w-full max-w-xl border border-white/20 bg-black p-6 md:p-8"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl">edit upload</h3>
            <p className="mt-2 text-sm text-gray-400">
              Update the title, description, and availability for this upload.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isDeleting}
            className="border border-white/20 p-2 text-gray-400 transition-colors hover:text-white disabled:opacity-50"
            aria-label="Close edit upload modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-gray-400">title</label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              className="w-full border border-white/20 bg-transparent px-4 py-3 text-white outline-none transition-colors focus:border-white/60"
              disabled={isSubmitting || isDeleting}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-400">description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={4000}
              rows={4}
              className="w-full resize-none border border-white/20 bg-transparent px-4 py-3 text-white outline-none transition-colors focus:border-white/60"
              disabled={isSubmitting || isDeleting}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-400">availability</label>
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
              className="w-full border border-white/20 bg-black px-4 py-3 text-white outline-none transition-colors focus:border-white/60"
              disabled={isSubmitting || isDeleting}
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="border border-red-500/20 bg-red-500/5 px-4 py-4">
            <div className="mb-3 flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-red-300" />
              <div>
                <p className="text-sm text-red-200">Delete this upload</p>
                <p className="mt-1 text-xs text-gray-400">
                  This permanently removes the file and its metadata from your archive.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              disabled={isSubmitting || isDeleting}
              className="border border-red-500/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-red-300 transition-colors hover:border-red-400 hover:bg-red-500/10 disabled:opacity-50"
            >
              {isDeleting ? "deleting..." : "delete upload"}
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isDeleting}
              className="flex-1 border border-white/20 px-4 py-3 text-gray-300 transition-colors hover:border-white/40 hover:text-white disabled:opacity-50"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className="flex-1 border border-white/40 px-4 py-3 transition-colors hover:border-white/60 hover:bg-white/10 disabled:opacity-50"
            >
              {isSubmitting ? "saving..." : "save changes"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ViewportPortal } from "./viewport-portal";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ChangePasswordModal({
  onClose,
  onSuccess,
  isFirstTimeLogin = false,
  accountEmail = "",
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState(accountEmail);
  const [resetNotice, setResetNotice] = useState({ type: "", message: "" });
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isFirstTimeLogin && !currentPassword) {
      setError("current password is required");
      return;
    }

    if (newPassword.length < 8) {
      setError("password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("passwords don't match");
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isFirstTimeLogin) {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (sessionError || !accessToken) {
          setError("your session expired. sign in again, then try changing your password.");
          return;
        }

        const response = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          setError(payload?.error || "failed to update password");
          return;
        }
      } else {
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) {
          setError(updateError.message || "failed to update password");
          return;
        }
      }

      onSuccess();
    } catch (submitError) {
      console.error("Failed to change password:", submitError);
      setError("failed to update password. please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendResetLink = async (event) => {
    event?.preventDefault();
    setResetNotice({ type: "", message: "" });

    const normalizedEmail = String(resetEmail || "").trim().toLowerCase();
    if (!normalizedEmail) {
      setResetNotice({ type: "error", message: "enter your account email first" });
      return;
    }

    setIsSendingReset(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setResetNotice({
          type: "error",
          message: payload?.error || "failed to send reset link",
        });
        return;
      }

      setResetNotice({
        type: "success",
        message: payload?.message || "password reset email sent. check your inbox and spam folder.",
      });
    } catch (resetError) {
      console.error("Failed to send reset password email:", resetError);
      setResetNotice({
        type: "error",
        message: "failed to send reset link. please try again.",
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <ViewportPortal>
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={!isFirstTimeLogin ? onClose : undefined}
    >
      <motion.div 
        className="bg-black border-2 border-white/20 p-10 max-w-lg w-full mx-4"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl mb-2 tracking-wide">
          {isFirstTimeLogin ? 'set your password' : 'change password'}
        </h3>
        <p className="text-gray-400 mb-8 tracking-wide text-sm">
          {isFirstTimeLogin 
            ? 'please create a new password for your account' 
            : 'update your account password'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Password (only if not first time) */}
          {!isFirstTimeLogin && (
            <div>
              <label className="block text-sm text-gray-400 mb-2 tracking-wide">
                current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-transparent border-b-2 border-white/20 focus:border-white/60 outline-none py-2 text-base transition-colors tracking-wide"
                disabled={isSubmitting}
                required
              />
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="block text-sm text-gray-400 mb-2 tracking-wide">
              new password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-transparent border-b-2 border-white/20 focus:border-white/60 outline-none py-2 text-base transition-colors tracking-wide"
              placeholder="minimum 8 characters"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm text-gray-400 mb-2 tracking-wide">
              confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-transparent border-b-2 border-white/20 focus:border-white/60 outline-none py-2 text-base transition-colors tracking-wide"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <motion.p 
              className="text-red-400 text-sm tracking-wide"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            {!isFirstTimeLogin && (
              <motion.button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 border border-white/40 hover:border-white/60 hover:bg-white/5 transition-all duration-300 relative group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitting}
              >
                <span className="text-base tracking-wide">cancel</span>
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>
            )}
            
            <motion.button
              type="submit"
              className={`${isFirstTimeLogin ? 'w-full' : 'flex-1'} px-6 py-4 border-2 border-white hover:bg-white/5 transition-all duration-300 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed`}
              whileHover={!isSubmitting ? { scale: 1.02 } : {}}
              whileTap={!isSubmitting ? { scale: 0.98 } : {}}
              disabled={isSubmitting}
            >
              <motion.div 
                className="absolute inset-0 bg-white"
                initial={{ scaleX: 0 }}
                whileHover={!isSubmitting ? { scaleX: 1 } : {}}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                style={{ originX: 0 }}
              />
              <motion.span 
                className="relative z-10 text-base tracking-wide"
              >
                {isSubmitting ? 'updating...' : isFirstTimeLogin ? 'set password' : 'update password'}
              </motion.span>
            </motion.button>
          </div>

          {!isFirstTimeLogin && (
            <div className="border-t border-white/10 pt-5">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword((value) => !value);
                  setResetNotice({ type: "", message: "" });
                  setResetEmail((value) => value || accountEmail);
                }}
                className="text-sm text-gray-400 underline-offset-4 transition-colors hover:text-white hover:underline"
                disabled={isSubmitting || isSendingReset}
              >
                forgot password?
              </button>

              {showForgotPassword && (
                <motion.div
                  className="mt-4 space-y-4"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="text-sm leading-relaxed text-gray-400">
                    enter your account email and we&apos;ll send you a reset password link.
                  </p>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    className="w-full bg-transparent border-b-2 border-white/20 focus:border-white/60 outline-none py-2 text-base transition-colors tracking-wide"
                    placeholder="email address"
                    disabled={isSendingReset}
                    required
                  />
                  {resetNotice.message && (
                    <p
                      className={`text-sm tracking-wide ${
                        resetNotice.type === "success" ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {resetNotice.message}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleSendResetLink}
                    disabled={isSendingReset}
                    className="border border-white/30 px-4 py-2 text-sm transition-colors hover:border-white/60 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSendingReset ? "sending..." : "send reset link"}
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </form>
      </motion.div>
    </motion.div>
    </ViewportPortal>
  );
}

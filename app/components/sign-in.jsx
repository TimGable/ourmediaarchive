import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { InteractiveBackground } from "./interactive-background";

export function SignIn({ onBack, onSignIn, onForgotPassword, onRequestInvite }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showForgotPasswordForm, setShowForgotPasswordForm] = useState(false);
  const [authError, setAuthError] = useState("");
  const [forgotPasswordNotice, setForgotPasswordNotice] = useState({ type: "", message: "" });
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (!isShaking) return;
    const timeout = setTimeout(() => setIsShaking(false), 420);
    return () => clearTimeout(timeout);
  }, [isShaking]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setForgotPasswordNotice({ type: "", message: "" });
    setIsSubmitting(true);
    try {
      const result = await onSignIn(email, password);
      if (!result?.success) {
        setAuthError(result?.error || "Sign-in attempt failed. Please try again.");
        setIsShaking(true);
      }
    } catch {
      setAuthError("Sign-in attempt failed. Please try again.");
      setIsShaking(true);
    }
    setIsSubmitting(false);
  };

  const handleForgotPassword = async () => {
    setAuthError("");
    setForgotPasswordNotice({ type: "", message: "" });
    setIsResettingPassword(true);

    try {
      const result = await onForgotPassword?.(email);
      if (!result?.success) {
        setForgotPasswordNotice({
          type: "error",
          message: result?.error || "Failed to send password reset email.",
        });
      } else {
        setForgotPasswordNotice({
          type: "success",
          message:
            result?.message || "Password reset email sent. Check your inbox and spam folder.",
        });
      }
    } catch {
      setForgotPasswordNotice({
        type: "error",
        message: "Failed to send password reset email.",
      });
    }

    setIsResettingPassword(false);
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <div className="relative min-h-screen flex items-center justify-center">
        <InteractiveBackground />

        <div className="relative z-10 w-full max-w-md mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              x: isShaking ? [0, -10, 10, -8, 8, -4, 4, 0] : 0,
            }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.button
              onClick={onBack}
              className="mb-8 md:mb-12 text-gray-400 hover:text-white transition-colors relative group touch-manipulation"
              whileHover={{ x: -5 }}
              whileTap={{ scale: 0.95 }}
              disabled={isSubmitting}
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

            <motion.div
              className="mb-10 md:mb-12 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <h1 className="text-3xl md:text-4xl mb-2">sign in</h1>
            </motion.div>

            <motion.form
              onSubmit={handleSubmit}
              className="space-y-5 md:space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <label htmlFor="email" className="block text-sm text-gray-400 mb-2 tracking-wide">
                  email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (authError) {
                      setAuthError("");
                      setIsShaking(false);
                    }
                    if (forgotPasswordNotice.message) {
                      setForgotPasswordNotice({ type: "", message: "" });
                    }
                  }}
                  className="w-full bg-transparent border border-white/20 px-4 py-3 md:py-4 text-white focus:border-white/60 focus:outline-none transition-all duration-300 hover:border-white/40 text-base"
                  placeholder="you@example.com"
                  required
                  disabled={isSubmitting}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <label htmlFor="password" className="block text-sm text-gray-400 mb-2 tracking-wide">
                  password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (authError) {
                      setAuthError("");
                      setIsShaking(false);
                    }
                  }}
                  className="w-full bg-transparent border border-white/20 px-4 py-3 md:py-4 text-white focus:border-white/60 focus:outline-none transition-all duration-300 hover:border-white/40 text-base"
                  placeholder="********"
                  required
                  disabled={isSubmitting}
                />
              </motion.div>

              <motion.button
                type="submit"
                className="w-full border-2 border-white px-6 md:px-8 py-4 hover:bg-white hover:text-black transition-all duration-300 mt-6 md:mt-8 touch-manipulation active:scale-95 disabled:opacity-60"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitting}
              >
                <span className="text-base md:text-lg tracking-wide">
                  {isSubmitting ? "signing in..." : "sign in"}
                </span>
              </motion.button>

              {authError && (
                <p role="alert" className="text-sm text-red-400 tracking-wide border border-red-500/40 bg-red-500/10 px-3 py-2">
                  {authError}
                </p>
              )}

              {forgotPasswordNotice.message && (
                <p
                  role="status"
                  className={`text-sm tracking-wide border px-3 py-2 ${
                    forgotPasswordNotice.type === "error"
                      ? "border-red-500/40 bg-red-500/10 text-red-400"
                      : "border-green-500/40 bg-green-500/10 text-green-400"
                  }`}
                >
                  {forgotPasswordNotice.message}
                </p>
              )}

              <motion.div
                className="text-center pt-4 space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPasswordForm((current) => !current);
                    setForgotPasswordNotice({ type: "", message: "" });
                  }}
                  className="text-sm text-gray-400 hover:text-white transition-colors relative group touch-manipulation"
                  disabled={isSubmitting || isResettingPassword}
                >
                  forgot password?
                  <motion.div
                    className="absolute -bottom-1 left-0 right-0 h-px bg-white"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </button>

                {showForgotPasswordForm && (
                  <motion.div
                    className="border border-white/15 bg-white/5 p-4 text-left"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="mb-3 text-xs text-gray-400">
                      Enter your account email and we&apos;ll send you a password reset link.
                    </p>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isSubmitting || isResettingPassword}
                      className="w-full border border-white/30 px-4 py-3 text-sm transition-all duration-300 hover:border-white/60 hover:bg-white/10 disabled:opacity-50"
                    >
                      {isResettingPassword ? "sending reset email..." : "send reset email"}
                    </button>
                  </motion.div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onRequestInvite}
                    className="text-sm text-gray-400 hover:text-white transition-colors relative group touch-manipulation"
                    disabled={isSubmitting || isResettingPassword}
                  >
                    don&apos;t have an account? request an invite
                    <motion.div
                      className="absolute -bottom-1 left-0 right-0 h-px bg-white"
                      initial={{ scaleX: 0 }}
                      whileHover={{ scaleX: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  </button>
                </div>
              </motion.div>
            </motion.form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}


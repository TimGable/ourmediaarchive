import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { InteractiveBackground } from "./interactive-background";

export function RequestInvite({ onBack }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitWarning, setSubmitWarning] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !message) return;

    setIsSubmitting(true);
    setSubmitError("");
    setSubmitWarning("");

    try {
      const response = await fetch("/api/invite-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          message,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to submit invite request.");
      }

      if (data?.notificationError) {
        setSubmitWarning(
          `Your request was saved, but the owner notification email failed: ${data.notificationError}`,
        );
      }
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit invite request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center relative overflow-hidden">
      {/* Interactive Background */}
      <InteractiveBackground />

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-6">
        {/* Back Button */}
        <motion.button
          onClick={onBack}
          className="absolute top-0 left-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ x: -4 }}
        >
          <span className="text-2xl">←</span>
          <span className="tracking-wide">back</span>
          <motion.div
            className="absolute -bottom-1 left-0 right-0 h-px bg-white"
            initial={{ scaleX: 0 }}
            whileHover={{ scaleX: 1 }}
            transition={{ duration: 0.3 }}
          />
        </motion.button>

        {!isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-20"
          >
            <h1 className="text-4xl md:text-5xl mb-12 tracking-tight">request an invite</h1>

            <p className="mb-8 text-sm tracking-wide text-gray-400">
              if a previous invite request failed or never reached you, you can submit another request
              with the same email address.
            </p>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Email Input */}
              <div>
                <label className="block text-sm text-gray-400 mb-3 tracking-wide">
                  email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-white/20 focus:border-white/60 outline-none py-3 text-lg transition-colors tracking-wide"
                  placeholder="your@email.com"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Message Textarea */}
              <div>
                <label className="block text-sm text-gray-400 mb-3 tracking-wide">
                  why do you want to join?
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-transparent border-2 border-white/20 focus:border-white/60 outline-none p-4 text-lg transition-colors tracking-wide resize-none"
                  placeholder="why do you want to join?"
                  rows={8}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isSubmitting || !email || !message}
                className="w-full py-4 px-8 border-2 border-white disabled:border-white/30 disabled:text-white/30 disabled:cursor-not-allowed transition-all duration-300 relative overflow-hidden group"
                whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                whileTap={!isSubmitting ? { scale: 0.98 } : {}}
              >
                <motion.div 
                  className="absolute inset-0 bg-white"
                  initial={{ scaleX: 0 }}
                  whileHover={!isSubmitting ? { scaleX: 1 } : {}}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  style={{ originX: 0 }}
                />
                <motion.span 
                  className="relative z-10 text-xl tracking-wide"
                  animate={{ 
                    color: isSubmitting ? '#ffffff33' : '#ffffff'
                  }}
                >
                  {isSubmitting ? 'submitting...' : 'submit request'}
                </motion.span>
              </motion.button>

              {submitError && (
                <p className="text-red-400 text-sm tracking-wide">{submitError}</p>
              )}

              {submitWarning && (
                <p className="text-amber-300 text-sm tracking-wide">{submitWarning}</p>
              )}
            </form>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mt-20 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-8 border-2 border-white rounded-full flex items-center justify-center"
            >
              <span className="text-4xl">✓</span>
            </motion.div>
            
            <h2 className="text-3xl mb-4 tracking-tight">request submitted</h2>
            <p className="text-gray-400 mb-8 tracking-wide max-w-md mx-auto">
              we'll review your request and send you login credentials via email if approved. if you
              had an older pending request, this one replaced it.
            </p>

            {submitWarning && (
              <p className="mb-8 text-sm tracking-wide text-amber-300 max-w-md mx-auto">
                {submitWarning}
              </p>
            )}
            
            <motion.button
              onClick={onBack}
              className="px-8 py-3 border border-white/40 hover:border-white/60 hover:bg-white/5 transition-all duration-300 relative group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="tracking-wide">back to sign in</span>
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

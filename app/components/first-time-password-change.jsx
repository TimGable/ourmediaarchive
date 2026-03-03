import { useState } from "react";
import { motion } from "motion/react";
import { Lock, Eye, EyeOff, Check, X } from "lucide-react";
import { InteractiveBackground } from "./interactive-background";

export function FirstTimePasswordChange({ onComplete }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const passwordRequirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'Contains number', met: /[0-9]/.test(newPassword) },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!allRequirementsMet) {
      setError('Please meet all password requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    // TODO: Connect to Supabase to update password
    console.log('Password changed successfully');
    onComplete();
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 relative overflow-hidden">
      {/* Interactive Background */}
      <InteractiveBackground />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="border border-white/20 p-8 md:p-12 bg-black/50 backdrop-blur-sm">
          {/* Header */}
          <motion.div
            className="mb-8 text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 border-2 border-white/40 rounded-full mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-3xl mb-2">first-time setup</h2>
            <p className="text-gray-400 text-sm">
              please set a new password to secure your account
            </p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password Field */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">new password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-transparent border border-white/20 px-4 py-3 pr-12 focus:border-white/60 focus:outline-none transition-colors"
                  placeholder="enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors touch-manipulation"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: newPassword.length > 0 ? 1 : 0.5 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-xs text-gray-500 mb-2">password requirements:</p>
              {passwordRequirements.map((req, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    req.met 
                      ? 'bg-white border-white' 
                      : 'border-gray-600'
                  }`}>
                    {req.met && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                  </div>
                  <span className={`text-sm transition-colors ${
                    req.met ? 'text-white' : 'text-gray-500'
                  }`}>
                    {req.label}
                  </span>
                </motion.div>
              ))}
            </motion.div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">confirm password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent border border-white/20 px-4 py-3 pr-12 focus:border-white/60 focus:outline-none transition-colors"
                  placeholder="confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors touch-manipulation"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {/* Password Match Indicator */}
              {confirmPassword.length > 0 && (
                <motion.div
                  className="flex items-center gap-2 mt-2"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {passwordsMatch ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400">passwords match</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-400">passwords do not match</span>
                    </>
                  )}
                </motion.div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                className="border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-400"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={!allRequirementsMet || !passwordsMatch}
              className={`w-full py-4 border-2 transition-all duration-300 touch-manipulation ${
                allRequirementsMet && passwordsMatch
                  ? 'border-white hover:bg-white hover:text-black cursor-pointer'
                  : 'border-white/20 text-gray-500 cursor-not-allowed'
              }`}
              whileHover={allRequirementsMet && passwordsMatch ? { scale: 1.02 } : {}}
              whileTap={allRequirementsMet && passwordsMatch ? { scale: 0.98 } : {}}
            >
              <span className="tracking-wide">set password & continue</span>
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

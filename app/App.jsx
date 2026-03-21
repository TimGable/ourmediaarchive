"use client";

import { useEffect, useMemo, useState } from "react";
import { LandingPage } from "./components/landing-page";
import { Dashboard } from "./components/dashboard";
import { FirstTimePasswordChange } from "./components/first-time-password-change";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function App() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showFirstTimePasswordChange, setShowFirstTimePasswordChange] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setShowDashboard(Boolean(data.session));
      })
      .catch((error) => {
        console.error("Failed to initialize auth session:", error);
        if (!mounted) return;
        setShowDashboard(false);
      })
      .finally(() => {
        if (!mounted) return;
        setIsAuthReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setShowDashboard(Boolean(session));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Handle first-time password change completion
  const handleFirstTimePasswordComplete = () => {
    setShowFirstTimePasswordChange(false);
  };

  // Handle sign in
  const handleSignIn = async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const raw = (error.message || "").toLowerCase();
        if (raw.includes("invalid login credentials")) {
          return {
            success: false,
            error: "Sign-in attempt failed. Invalid email or password.",
          };
        }
        if (raw.includes("email not confirmed")) {
          return {
            success: false,
            error: "Sign-in attempt failed. Your email is not confirmed yet.",
          };
        }
        if (raw.includes("invalid api key") || raw.includes("api key")) {
          return {
            success: false,
            error: "Sign-in attempt failed. Authentication is temporarily unavailable.",
          };
        }
        return {
          success: false,
          error: "Sign-in attempt failed. Please try again.",
        };
      }

      const isFirstTimeLogin = false;
      if (isFirstTimeLogin) {
        setShowFirstTimePasswordChange(true);
      }

      return { success: true };
    } catch (error) {
      console.error("Unexpected sign-in failure:", error);
      return {
        success: false,
        error: "Sign-in attempt failed. Authentication is temporarily unavailable.",
      };
    }
  };

  const handleForgotPassword = async (email) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return {
        success: false,
        error: "Enter the email address for your account first.",
      };
    }

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/create-password`
        : undefined;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });

      if (error) {
        return {
          success: false,
          error: error.message || "Failed to send password reset email.",
        };
      }

      return {
        success: true,
        message: "Password reset email sent. Check your inbox and spam folder.",
      };
    } catch (error) {
      console.error("Unexpected forgot-password failure:", error);
      return {
        success: false,
        error: "Failed to send password reset email. Please try again.",
      };
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowDashboard(false);
  };

  if (!isAuthReady) return null;

  if (showDashboard) {
    return (
      <div className="size-full">
        {showFirstTimePasswordChange ? (
          <FirstTimePasswordChange onComplete={handleFirstTimePasswordComplete} />
        ) : (
          <Dashboard onSignOut={handleSignOut} />
        )}
      </div>
    );
  }

  return (
    <div className="size-full">
      <LandingPage onSignIn={handleSignIn} onForgotPassword={handleForgotPassword} />
    </div>
  );
}

"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { chatFetch } from "@/lib/chat-api";
import { ensureChatIdentity } from "@/lib/chat-crypto";

interface UserProfile {
  name?: string;
  username?: string;
  image: string;
  bio?: string;
  streakDays?: number;
  onboardedAt?: string | null;
  lastReflectionDate?: string | null;
}

export type SignInResult =
  | { ok: true; user: FirebaseUser }
  | { ok: false; reason: "popup-blocked" | "cancelled" | "network" | "unknown" };

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  /**
   * Google sign-in that reports why it failed and resolves only once the
   * MindFuel account exists, so a first post right after sign-in succeeds.
   */
  signInWithGoogle: () => Promise<SignInResult>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  showSignInModal: boolean;
  openSignInModal: () => void;
  closeSignInModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * End-to-end test seam. Only when a build sets NEXT_PUBLIC_E2E_AUTH=1 (never in
 * production) can a Playwright test decide what Google sign-in returns via
 * `window.__mindfuelE2E.signIn` ("ok" | "popup-blocked" | "cancelled").
 */
const E2E_AUTH = process.env.NEXT_PUBLIC_E2E_AUTH === "1";

function e2eUser(): FirebaseUser {
  return {
    uid: "e2e-user",
    displayName: "E2E Tester",
    email: "e2e@example.com",
    photoURL: null,
    getIdToken: async () => "e2e-token",
  } as unknown as FirebaseUser;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);

  const openSignInModal = useCallback(() => setShowSignInModal(true), []);
  // Resolves when the signed-in user's database record has been synced.
  const accountReady = React.useRef<{ uid: string; promise: Promise<void> } | null>(null);
  const closeSignInModal = useCallback(() => setShowSignInModal(false), []);

  // Function to fetch user profile from MongoDB
  const fetchUserProfile = async (firebaseId: string) => {
    try {
      const res = await fetch(`/api/users/${firebaseId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile({
          name: data.user.name,
          username: data.user.username,
          image: data.user.image || "",
          bio: data.user.bio,
          streakDays: data.user.streakDays,
          onboardedAt: data.user.onboardedAt ?? null,
          lastReflectionDate: data.user.lastReflectionDate ?? null,
        });
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (E2E_AUTH && !firebaseUser && sessionStorage.getItem("mindfuel:e2e-user")) {
        setUser(e2eUser());
        setProfile({ name: "E2E Tester", image: "", streakDays: 1, onboardedAt: null });
        setLoading(false);
        return;
      }
      // This is only a routing hint, not an authentication credential. It lets
      // middleware skip the landing page before Firebase restores on the client.
      document.cookie = firebaseUser
        ? `mindfuel_signed_in=1; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`
        : "mindfuel_signed_in=; Path=/; Max-Age=0; SameSite=Lax";
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        // Sync user with MongoDB asynchronously
        let markAccountReady: () => void = () => undefined;
        accountReady.current = {
          uid: firebaseUser.uid,
          promise: new Promise<void>((resolve) => {
            markAccountReady = resolve;
          }),
        };
        const syncUser = async () => {
          try {
            const hasSyncedThisSession = sessionStorage.getItem(`synced_${firebaseUser.uid}`);
            
            if (!hasSyncedThisSession) {
              const res = await fetch("/api/auth/sync", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  firebaseId: firebaseUser.uid,
                  email: firebaseUser.email,
                  name: firebaseUser.displayName,
                  image: firebaseUser.photoURL,
                }),
              });
              
              if (res.ok) {
                const data = await res.json();
                if (data.user) {
                  setProfile({
                    name: data.user.name,
                    username: data.user.username,
                    image: data.user.image || "",
                    bio: data.user.bio,
                    streakDays: data.user.streakDays,
                    onboardedAt: data.user.onboardedAt ?? null,
                    lastReflectionDate: data.user.lastReflectionDate ?? null,
                  });
                }
                sessionStorage.setItem(`synced_${firebaseUser.uid}`, "true");
              }
            } else {
              // Only fetch the profile if already synced this session
              await fetchUserProfile(firebaseUser.uid);
            }

            // The database record exists now; writes may proceed while the
            // slower chat-key work below continues.
            markAccountReady();

            // Publish this device's public chat key during the normal app
            // session. Recipients can then start an encrypted conversation
            // without requiring this user to visit Messages first.
            const identity = await ensureChatIdentity(firebaseUser.uid);
            const keyResponse = await chatFetch(firebaseUser, "/api/chat/keys", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publicKey: identity.publicKey }),
            });
            if (!keyResponse.ok && keyResponse.status !== 409) {
              console.error("Failed to register secure chat key:", keyResponse.status);
            }
          } catch (error) {
            console.error("Failed to sync user:", error);
          }
        };

        void syncUser().finally(() => markAccountReady());
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = async () => {
      if (user) {
        await fetchUserProfile(user.uid);
      }
    };

    window.addEventListener("userProfileUpdated", handleProfileUpdate as EventListener);
    return () =>
      window.removeEventListener("userProfileUpdated", handleProfileUpdate as EventListener);
  }, [user]);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const signInWithGoogle = useCallback(async (): Promise<SignInResult> => {
    if (E2E_AUTH) {
      const outcome = (window as Window & { __mindfuelE2E?: { signIn?: string } }).__mindfuelE2E?.signIn || "ok";
      if (outcome === "popup-blocked" || outcome === "cancelled") return { ok: false, reason: outcome };
      const fake = e2eUser();
      sessionStorage.setItem("mindfuel:e2e-user", "1");
      setUser(fake);
      setProfile({ name: "E2E Tester", image: "", streakDays: 0, onboardedAt: null });
      return { ok: true, user: fake };
    }
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged starts the account sync; wait for it (bounded) so
      // the caller can write immediately.
      for (let waited = 0; waited < 3_000 && accountReady.current?.uid !== credential.user.uid; waited += 50) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (accountReady.current?.uid === credential.user.uid) {
        await Promise.race([accountReady.current.promise, new Promise((resolve) => setTimeout(resolve, 8_000))]);
      }
      return { ok: true, user: credential.user };
    } catch (error) {
      const code = (error as { code?: string })?.code || "";
      if (code === "auth/popup-blocked") return { ok: false, reason: "popup-blocked" };
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request" || code === "auth/user-cancelled") {
        return { ok: false, reason: "cancelled" };
      }
      if (code === "auth/network-request-failed") return { ok: false, reason: "network" };
      console.error("Sign-in failed:", error);
      return { ok: false, reason: "unknown" };
    }
  }, []);

  const logout = async () => {
    try {
      // Stop this device's notifications for the account being signed out.
      try {
        const registration = await navigator.serviceWorker?.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe();
        }
      } catch {
        // Signing out must never fail because of push cleanup.
      }
      await signOut(auth);
      setProfile(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user.uid);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        profile, 
        loading, 
        login, 
        signInWithGoogle,
        logout, 
        refreshProfile,
        showSignInModal,
        openSignInModal,
        closeSignInModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

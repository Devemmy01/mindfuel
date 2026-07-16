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
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  showSignInModal: boolean;
  openSignInModal: () => void;
  closeSignInModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);

  const openSignInModal = useCallback(() => setShowSignInModal(true), []);
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
        });
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // This is only a routing hint, not an authentication credential. It lets
      // middleware skip the landing page before Firebase restores on the client.
      document.cookie = firebaseUser
        ? `mindfuel_signed_in=1; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`
        : "mindfuel_signed_in=; Path=/; Max-Age=0; SameSite=Lax";
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        // Sync user with MongoDB asynchronously
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
                  });
                }
                sessionStorage.setItem(`synced_${firebaseUser.uid}`, "true");
              }
            } else {
              // Only fetch the profile if already synced this session
              await fetchUserProfile(firebaseUser.uid);
            }

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

        syncUser();
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

  const logout = async () => {
    try {
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

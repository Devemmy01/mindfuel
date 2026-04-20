"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Loader2, User } from "lucide-react";

export default function ProfileRedirect() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(`/profile/${user.uid}`);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center space-y-6">
        <div className="w-20 h-20 bg-brand-green/10 border border-brand-green/20 rounded-full flex items-center justify-center">
          <User className="w-9 h-9 text-brand-green" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Your Profile</h1>
          <p className="text-muted-foreground text-[14px] max-w-[260px]">
            Sign in to view your profile and manage your thoughts.
          </p>
        </div>
        <button 
          onClick={login}
          className="px-8 py-3 text-white rounded-full font-bold text-[15px] shadow-brand-sm bg-[#00a855] cursor-pointer transition-colors press-scale"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  return null;
}

"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import Link from "next/link";
import PostCard from "@/components/PostCard";
import ProfilePictureEditor from "@/components/ProfilePictureEditor";
import { User as UserIcon, CalendarDays, Loader2, Grid3X3, List, X, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PostType, ProfileUser } from "@/types";

const profileTabs = ["Posts", "Liked", "Saved"] as const;
type ProfileTab = (typeof profileTabs)[number];

export default function DynamicProfilePage() {
  const { id: profileId } = useParams() as { id: string };
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [ownPostCount, setOwnPostCount] = useState(0);
  const [ownLikesCount, setOwnLikesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>("Posts");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Edit Profile State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editImage, setEditImage] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isProfilePicOpen, setIsProfilePicOpen] = useState(false);

  const isOwnProfile = currentUser?.uid === profileId;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Always fetch fresh profile data
        if (profileId) {
          const userRes = await fetch(`/api/users/${profileId}`);
          
          if (!userRes.ok) {
            // If it's the current user but not in DB yet, we can try to use currentUser info
            if (isOwnProfile && currentUser) {
              const fallbackUser: ProfileUser = {
                _id: "fallback",
                firebaseId: currentUser.uid,
                name: currentUser.displayName || "Unknown",
                image: currentUser.photoURL || "",
                createdAt: new Date().toISOString(),
                bio: "",
              };
              setProfileUser(fallbackUser);
              setEditName(fallbackUser.name);
              setEditBio("");
              setEditImage(fallbackUser.image || "");
            } else {
              throw new Error("User not found");
            }
          } else {
            const userData = await userRes.json();
            setProfileUser(userData.user);
            setEditName(userData.user.name || "");
            setEditBio(userData.user.bio || "");
            setEditImage(userData.user.image || "");

            // Also fetch total stats once
            const statsRes = await fetch(`/api/posts?userId=${profileId}`);
            const statsData = await statsRes.json();
            setOwnPostCount(statsData.posts?.length || 0);
            setOwnLikesCount(
              statsData.posts?.reduce(
                (acc: number, p: { likesCount: number }) => acc + p.likesCount,
                0
              ) || 0
            );
          }
        }

        // Fetch Content based on activeTab
        setPosts([]); // Clear immediately for better UX
        let postsData: PostType[] = [];
        if (activeTab === "Saved") {
          const res = await fetch(`/api/saves?userId=${profileId}`);
          const data = await res.json();
          // Transform saves to posts
          postsData = (data.saves || [])
            .map((s: { postId: PostType }) => s.postId)
            .filter(Boolean);
        } else if (activeTab === "Liked") {
          const res = await fetch(`/api/posts?userId=${profileId}&type=liked`);
          const data = await res.json();
          postsData = data.posts || [];
        } else {
          const res = await fetch(`/api/posts?userId=${profileId}`);
          const data = await res.json();
          postsData = data.posts || [];
        }
        setPosts(postsData);
      } catch (err) {
        console.error("Fetch profile failed", err);
      } finally {
        setLoading(false);
      }
    };

    if (profileId) fetchData();
  }, [profileId, activeTab]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseId: currentUser.uid,
          name: editName,
          bio: editBio,
          uploadedImage: editImage || "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Immediately update local state with the returned data
        setProfileUser(data.user);
        setEditName(data.user.name || "");
        setEditBio(data.user.bio || "");
        setEditImage(data.user.image || "");
        
        // Dispatch event for real-time updates
        window.dispatchEvent(
          new CustomEvent("userProfileUpdated", { detail: data.user })
        );
        
        // Close modal after a brief delay to ensure state is updated
        setTimeout(() => {
          setIsEditModalOpen(false);
          // Hard refresh the page after successful update
          window.location.reload();
        }, 300);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to update profile");
      }
    } catch (err) {
      console.error("Update profile failed", err);
      alert("Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading || (loading && !profileUser))
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-7 h-7 animate-spin text-brand-green" />
      </div>
    );

  if (!profileUser)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <h1 className="text-2xl font-bold mb-2">User not found</h1>
        <p className="text-muted-foreground mb-6">The profile you&apos;re looking for doesn&apos;t exist.</p>
        <button onClick={() => router.back()} className="text-brand-green font-bold">Go Back</button>
      </div>
    );

  const joinedDate = new Date(profileUser.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col w-full min-h-screen relative">
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-secondary/20 flex-shrink-0">
                <h3 className="text-lg font-bold">Edit Profile</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-secondary/60 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateProfile} className="p-6 space-y-5 overflow-y-auto flex-1 scrollbar-dark">
                <ProfilePictureEditor
                  currentImage={editImage}
                  userName={editName}
                  onImageChange={(image) => {
                    setEditImage(image);
                  }}
                />
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-muted-foreground ml-1">Display Name</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="frosted-input w-full px-4 h-12 text-[14px] outline-none border-none focus:ring-2 focus:ring-brand-green/30 rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-muted-foreground ml-1">Bio</label>
                  <textarea 
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Tell us about your thoughts..."
                    className="frosted-input w-full px-4 py-3 min-h-[100px] text-[14px] outline-none border-none focus:ring-2 focus:ring-brand-green/30 resize-none rounded-2xl"
                  />
                </div>
                <button 
                  disabled={isUpdating}
                  className="w-full py-4 text-white font-bold rounded-2xl bg-[#00a855] hover:bg-[#00a855]/80 disabled:opacity-50 transition-all shadow-brand-sm press-scale flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-40 glass-strong border-b border-border/60 flex items-center gap-4 px-4 py-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-1 rounded-xl hover:bg-secondary/60 transition-colors press-scale"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-[17px] tracking-tight leading-tight">{profileUser.name}</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {activeTab === "Posts" ? `${ownPostCount} thoughts` : `${posts.length} ${activeTab.toLowerCase()}`}
          </p>
        </div>
      </header>

      <div className="relative">
        <div className="w-full h-28 sm:h-36 bg-brand-green flex items-center justify-center border-b border-border/30 overflow-hidden relative">
          <img 
            src="/logoDarkbg.png" 
            alt="MindFuel" 
            className="opacity-90 drop-shadow-sm select-none pointer-events-none" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
        </div>
        <div className="absolute left-4 -bottom-14">
          <button
            onClick={() => setIsProfilePicOpen(true)}
            className="p-1 rounded-full bg-background shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          >
            {profileUser.image && !profileUser.image.startsWith("#") ? (
              <img
                src={profileUser.image}
                alt={profileUser.name}
                className="w-18 h-18 rounded-full object-cover ring-4 ring-background"
              />
            ) : (
              <div
                className="w-18 h-18 rounded-full flex items-center justify-center ring-4 ring-background shadow-inner"
                style={{
                  backgroundColor: "#0a0a0a",
                }}
              >
                <span className="text-3xl font-bold text-white selection:bg-transparent">
                  {profileUser.name[0]?.toUpperCase()}
                </span>
              </div>
            )}
          </button>
        </div>
        
        <AnimatePresence>
          {isProfilePicOpen && profileUser.image && !profileUser.image.startsWith("#") && (
            <div 
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsProfilePicOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative max-w-2xl max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setIsProfilePicOpen(false)}
                  className="absolute -top-12 right-0 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <img
                  src={profileUser.image}
                  alt={profileUser.name}
                  className="rounded-2xl object-contain max-h-[90vh] max-w-2xl"
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {isOwnProfile && (
           <div className="absolute right-4">
            <button onClick={() => setIsEditModalOpen(true)} className="px-5 py-2 bg-foreground text-background font-bold text-[13px] rounded-full hover:opacity-90 transition-opacity shadow-sm">
              Edit profile
            </button>
          </div>
        )}
      </div>

      <div className="px-4 pt-16 pb-4 border-b border-border">
        <h2 className="text-[22px] font-bold tracking-tight leading-tight">{profileUser.name}</h2>
        <p className="text-muted-foreground text-[14px] mt-0.5">@{profileUser.name.replace(/\s+/g, "").toLowerCase()}</p>
        
        {profileUser.bio && (
          <p className="text-[15px] text-foreground/90 mt-4 leading-relaxed whitespace-pre-wrap">{profileUser.bio}</p>
        )}

        <div className="flex items-center gap-5 mt-5">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-[16px]">{ownPostCount}</span>
            <span className="text-muted-foreground text-[13px]">Thoughts</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-[16px]">{ownLikesCount}</span>
            <span className="text-muted-foreground text-[13px]">Likes</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground text-[13px] ml-auto">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Joined {joinedDate}</span>
          </div>
        </div>
      </div>

      <div className="sticky top-[57px] z-30 glass-strong border-b border-border/60">
        <div className="flex">
          {profileTabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className="flex-1 flex justify-center py-4 relative outline-none hover:bg-secondary/30 transition-colors">
              <span className={`text-[14px] font-semibold transition-colors ${activeTab === tab ? "text-foreground" : "text-muted-foreground"}`}>{tab}</span>
              {activeTab === tab && <span className="tab-active-indicator" />}
            </button>
          ))}
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
          <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "text-brand-green" : "text-muted-foreground"}`}><List className="w-4 h-4" /></button>
          <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "text-brand-green" : "text-muted-foreground"}`}><Grid3X3 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex-1">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-green" /></div>
        ) : posts.length > 0 ? (
          <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 gap-3 p-3" : "flex flex-col"}>
            {posts.map((post, i) => (
              viewMode === "list" ? (
                <motion.div key={post._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}><PostCard post={post} /></motion.div>
              ) : (
                <motion.div key={post._id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
                  <Link href={`/post/${post._id}`} className="block aspect-square relative group">
                    <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-soft border border-border/50 p-4 flex items-center justify-center text-center" 
                      style={{ 
                        backgroundImage: post.backgroundStyle.type === "gradient" ? post.backgroundStyle.value : "none",
                        backgroundColor: post.backgroundStyle.type === "color" ? post.backgroundStyle.value : "transparent",
                        color: (post.backgroundStyle.value === "#ffffff" || post.backgroundStyle.value.toLowerCase() === "#f5f5dc") ? "#171717" : "#ffffff"
                      }}>
                      <p className="text-[12px] font-semibold leading-tight line-clamp-4">{post.text}</p>
                    </div>
                  </Link>
                </motion.div>
              )
            ))}
          </div>
        ) : (
          <div className="py-24 text-center px-6">
            <div className="w-16 h-16 bg-secondary/40 rounded-full flex items-center justify-center mx-auto mb-4"><UserIcon className="w-7 h-7 text-muted-foreground" /></div>
            <p className="font-bold text-lg">Nothing to show yet</p>
            <p className="text-muted-foreground text-[14px]">This user hasn&apos;t shared any thoughts.</p>
          </div>
        )}
      </div>
      <div className="pb-20 md:pb-0" />
    </div>
  );
}

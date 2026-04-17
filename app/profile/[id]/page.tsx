/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import Link from "next/link";
import PostCard from "@/components/PostCard";
import ProfilePictureEditor from "@/components/ProfilePictureEditor";
import { User as UserIcon, CalendarDays, Loader2, Grid3X3, List, X, ArrowLeft, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PostType, ProfileUser } from "@/types";

const profileTabs = ["Posts", "Liked", "Saved"] as const;
type ProfileTab = (typeof profileTabs)[number];

export default function DynamicProfilePage() {
  const { id: profileId } = useParams() as { id: string };
  const { user: currentUser, loading: authLoading, profile, logout } = useAuth();
  const router = useRouter();

  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [ownPostCount, setOwnPostCount] = useState(0);
  const [ownLikesCount, setOwnLikesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>("Posts");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
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
                name: profile?.name || currentUser.displayName || "Unknown",
                image: profile?.image || currentUser.photoURL || "",
                createdAt: new Date().toISOString(),
                bio: "",
              };
              setProfileUser(fallbackUser);
              setEditName(fallbackUser.name);
              setEditUsername(fallbackUser.username || fallbackUser.name.replace(/\s+/g, "").toLowerCase());
              setEditBio("");
              setEditImage(fallbackUser.image || "");
            } else {
              throw new Error("User not found");
            }
          } else {
            const userData = await userRes.json();
            setProfileUser(userData.user);
            setEditName(userData.user.name || "");
            setEditUsername(userData.user.username || userData.user.name.replace(/\s+/g, "").toLowerCase());
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
  }, [profileId, activeTab, currentUser, isOwnProfile, profile?.image, profile?.name]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !profileUser) return;
    // Check if anything actually changed
    const hasChanges = 
      editName !== profileUser.name || 
      editUsername !== (profileUser.username || "") || 
      editBio !== (profileUser.bio || "") || 
      editImage !== (profileUser.image || "");

    if (!hasChanges) {
      setIsEditModalOpen(false);
      setIsUpdating(false);
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseId: currentUser.uid,
          name: editName,
          username: editUsername.replace(/\s+/g, "").toLowerCase(),
          bio: editBio,
          uploadedImage: editImage || "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Immediately update local state with the returned data
        setProfileUser(data.user);
        setEditName(data.user.name || "");
        setEditUsername(data.user.username || data.user.name.replace(/\s+/g, "").toLowerCase());
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
                  <label className="text-[13px] font-bold text-muted-foreground ml-1">Username</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-[14px]">@</span>
                    <input 
                      type="text" 
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value.replace(/[^a-z0-9_.]/g, ""))}
                      placeholder="username"
                      required
                      className="frosted-input w-full pl-8 pr-4 h-12 text-[14px] outline-none border-none focus:ring-2 focus:ring-brand-green/30 rounded-2xl"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 ml-1">
                    At least 3 characters. Letters, numbers, underscores, and dots only.
                  </p>
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

      <header className="sticky top-0 z-40 glass-strong border-b border-border/60 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
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
        </div>
        {isOwnProfile && (
          <button
            onClick={() => logout()}
            className="lg:hidden p-2 rounded-xl text-muted-foreground hover:bg-secondary/60 hover:text-destructive transition-colors press-scale"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
          </button>
        )}
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
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-0 bg-black/90 backdrop-blur-md"
              onClick={() => setIsProfilePicOpen(false)}
            >
              <button
                onClick={() => setIsProfilePicOpen(false)}
                className="absolute top-6 right-6 z-[120] p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md border border-white/10 shadow-xl press-scale"
              >
                <X className="w-6 h-6" />
              </button>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full h-full flex items-center justify-center p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={profileUser.image}
                  alt={profileUser.name}
                  className="rounded-2xl object-contain max-h-[85vh] w-auto max-w-full shadow-2xl ring-1 ring-white/10"
                />
              </motion.div>
            </motion.div>
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
        <p className="text-muted-foreground text-[14px] mt-0.5">@{profileUser.username || profileUser.name.replace(/\s+/g, "").toLowerCase()}</p>
        
        {profileUser.bio && (
          <p className="text-[15px] text-foreground/90 mt-4 leading-relaxed whitespace-pre-wrap">{profileUser.bio}</p>
        )}

        <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-5">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-[16px]">{ownPostCount}</span>
            <span className="text-muted-foreground text-[13px]">Thoughts</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-[16px]">{ownLikesCount}</span>
            <span className="text-muted-foreground text-[13px]">Likes</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground text-[13px]">
            <CalendarDays className="w-3.5 h-3.5" />
            <span className="pt-1">Joined {joinedDate}</span>
          </div>
        </div>

        {/* Mobile Footers */}
        <div className="lg:hidden mt-6 pt-5 border-t border-border/40 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {["About", "Privacy", "Terms", "Cookies"].map((l) => (
              <Link href={`/${l.toLowerCase()}`} key={l} className="text-[11.5px] font-bold text-muted-foreground hover:text-brand-green transition-colors uppercase opacity-70">
                {l}
              </Link>
            ))}
          </div>
          <p className="text-[10px] font-bold text-muted-foreground opacity-40 tracking-wider text-left uppercase">
            MindFuel by Lumyn
          </p>
        </div>
      </div>

      <div className="sticky top-[57px] z-30 glass-strong border-b border-border/60 px-2 lg:px-4 flex justify-between items-center">
        <div className="flex flex-1 max-w-md">
          {profileTabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className="flex-1 flex justify-center py-4 relative outline-none hover:bg-secondary/30 transition-colors">
              <span className={`text-[13px] md:text-[14px] font-semibold transition-colors ${activeTab === tab ? "text-foreground" : "text-muted-foreground"}`}>{tab}</span>
              {activeTab === tab && <span className="tab-active-indicator" />}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-4 pl-3 border-l border-border/40">
          <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "text-brand-green bg-brand-green/10" : "text-muted-foreground hover:bg-secondary/50"}`}><List className="w-[18px] h-[18px] md:w-4 md:h-4" /></button>
          <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "text-brand-green bg-brand-green/10" : "text-muted-foreground hover:bg-secondary/50"}`}><Grid3X3 className="w-[18px] h-[18px] md:w-4 md:h-4" /></button>
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

      <div className="mobile-content-offset" />
    </div>
  );
}

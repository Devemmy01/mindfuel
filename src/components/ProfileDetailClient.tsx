"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import PostCard from "@/components/PostCard";
import ProfilePictureEditor from "@/components/ProfilePictureEditor";
import StreakDisplay from "@/components/StreakDisplay";
import ReflectionCalendar from "@/components/ReflectionCalendar";
import MilestonesGrid from "@/components/MilestonesGrid";
import { User as UserIcon, CalendarDays, Loader2, Grid3X3, List, X, ArrowLeft, LogOut, RefreshCw, Share2, Bell, Settings, Shield, HelpCircle, FileText, Info, UserPlus, UserCheck, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PostType, ProfileUser } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import InstallAppButton from "@/components/InstallAppButton";
import { getUserHandle } from "@/lib/userHandle";
import useSWR from "swr";

const profileTabs = ["Posts", "Liked", "Saved"] as const;
type ProfileTab = (typeof profileTabs)[number];
type FollowListType = "followers" | "following";
type FollowListUser = Pick<ProfileUser, "_id" | "firebaseId" | "name" | "username" | "image" | "bio">;
type FollowState = {
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  followsViewer: boolean;
};

const emptyFollowState: FollowState = {
  followersCount: 0,
  followingCount: 0,
  isFollowing: false,
  followsViewer: false,
};

const followStateFetcher = async (url: string): Promise<FollowState> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not load follow status");
  const data = await response.json();
  return {
    followersCount: data.followersCount || 0,
    followingCount: data.followingCount || 0,
    isFollowing: Boolean(data.isFollowing),
    followsViewer: Boolean(data.followsViewer),
  };
};

function FollowListRow({ user, onNavigate }: { user: FollowListUser; onNavigate: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link
      href={`/profile/${user.firebaseId}`}
      onClick={onNavigate}
      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/40"
    >
      {user.image && !user.image.startsWith("#") && !imageFailed ? (
        <Image
          src={user.image}
          alt={user.name}
          width={44}
          height={44}
          onError={() => setImageFailed(true)}
          className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-border"
        />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-sm font-bold text-brand-green ring-1 ring-brand-green/20">
          {user.name?.[0]?.toUpperCase() || "U"}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-[14px]">{user.name}</strong>
        <span className="block truncate text-[12px] text-muted-foreground">@{getUserHandle(user)}</span>
        {user.bio && <span className="mt-1 block truncate text-[12px] text-foreground/70">{user.bio}</span>}
      </span>
    </Link>
  );
}

export default function DynamicProfilePage({
  initialProfile,
  initialPostCount,
  initialPosts = [],
}: {
  initialProfile: ProfileUser;
  initialPostCount: number;
  initialPosts?: PostType[];
}) {
  const { id: profileId } = useParams() as { id: string };
  const { user: currentUser, loading: authLoading, logout, openSignInModal } = useAuth();
  const { showToast } = useToast();
  const { subscribeUser, isSubscribing } = usePushNotifications();
  const router = useRouter();

  const [profileUser, setProfileUser] = useState<ProfileUser | null>(initialProfile);
  const [posts, setPosts] = useState<PostType[]>(initialPosts);
  const [allUserPosts, setAllUserPosts] = useState<PostType[]>(initialPosts.filter((post) => !post.isRepost));
  const [ownPostCount, setOwnPostCount] = useState(initialPostCount);
  const [ownLikesCount, setOwnLikesCount] = useState(initialPosts.reduce((total, post) => total + (post.likesCount || 0), 0));
  const [streakDays, setStreakDays] = useState(initialProfile.streakDays || 0);
  const [loading, setLoading] = useState(initialPosts.length === 0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(initialPosts.length >= 20);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("Posts");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editImage, setEditImage] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isProfilePicOpen, setIsProfilePicOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followListType, setFollowListType] = useState<FollowListType | null>(null);
  const [followListUsers, setFollowListUsers] = useState<FollowListUser[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [followListError, setFollowListError] = useState(false);
  const [followListReload, setFollowListReload] = useState(0);

  const isOwnProfile = currentUser?.uid === profileId;
  const followStateKey = profileId
    ? `/api/follows?profileId=${profileId}${currentUser?.uid ? `&viewerId=${currentUser.uid}` : ""}`
    : null;
  const { data: followState = emptyFollowState, mutate: mutateFollowState } = useSWR<FollowState>(
    followStateKey,
    followStateFetcher,
    {
      dedupingInterval: 60_000,
      keepPreviousData: true,
      revalidateOnFocus: true,
    },
  );

  const toggleFollow = async () => {
    if (!currentUser) { openSignInModal(); return; }
    if (followLoading || isOwnProfile) return;
    setFollowLoading(true);
    const previous = followState;
    const optimistic = {
      ...followState,
      isFollowing: !followState.isFollowing,
      followersCount: Math.max(0, followState.followersCount + (followState.isFollowing ? -1 : 1)),
    };
    mutateFollowState(optimistic, false);
    try {
      const response = await fetch("/api/follows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ followerId: currentUser.uid, followingId: profileId }) });
      if (!response.ok) throw new Error("Follow failed");
      const data = await response.json();
      mutateFollowState({ ...optimistic, isFollowing: Boolean(data.isFollowing) }, false);
    } catch {
      mutateFollowState(previous, false);
      showToast("Could not update follow", "error");
    } finally { setFollowLoading(false); }
  };

  useEffect(() => {
    if (!followListType || !profileId) return;
    const controller = new AbortController();
    setFollowListLoading(true);
    setFollowListError(false);
    setFollowListUsers([]);

    fetch(`/api/follows?profileId=${profileId}&list=${followListType}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load follow list");
        return response.json();
      })
      .then((data) => setFollowListUsers(data.users || []))
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") setFollowListError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setFollowListLoading(false);
      });

    return () => controller.abort();
  }, [followListType, profileId, followListReload]);

  // Refresh profile metadata once per profile. Tab changes should never repeat
  // this request or the expensive history request.
  useEffect(() => {
    if (!profileId) return;
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/users/${profileId}`);
        if (response.ok) {
          const { user } = await response.json();
          setProfileUser(user);
          setStreakDays(user.streakDays || 0);
          setEditName(user.name || "");
          setEditUsername(user.username || user.name.replace(/\s+/g, "").toLowerCase());
          setEditBio(user.bio || "");
          setEditImage(user.image || "");
          return;
        }
        if (currentUser?.uid === profileId) {
          const fallbackUser: ProfileUser = {
            _id: "fallback",
            firebaseId: currentUser.uid,
            name: initialProfile.name || "Unknown",
            image: initialProfile.image || "",
            createdAt: new Date().toISOString(),
            bio: "",
          };
          setProfileUser(fallbackUser);
        }
      } catch (error) {
        console.error("Profile refresh failed", error);
      }
    };
    fetchProfile();
  }, [profileId, currentUser?.uid, initialProfile.name, initialProfile.image]);

  // One request per tab. The default Posts response also supplies calendar and
  // aggregate display data, eliminating the previous duplicate posts request.
  useEffect(() => {
    if (!profileId) return;
    const fetchTab = async () => {
      const canKeepVisiblePosts = activeTab === "Posts" && initialPosts.length > 0;
      setLoading(!canKeepVisiblePosts);
      setCurrentPage(1);
      setHasMorePosts(false);
      if (!canKeepVisiblePosts) setPosts([]);
      try {
        const viewer = currentUser?.uid ? `&currentUserId=${currentUser.uid}` : "";
        const endpoint = activeTab === "Saved"
          ? `/api/saves?userId=${profileId}&limit=30${viewer}`
          : activeTab === "Liked"
          ? `/api/posts?userId=${profileId}&type=liked&limit=30${viewer}`
          : `/api/posts?userId=${profileId}&limit=30${viewer}`;
        const response = await fetch(endpoint);
        const data = await response.json();
        const tabPosts: PostType[] = activeTab === "Saved"
          ? (data.saves || []).map((save: { postId: PostType }) => save.postId).filter(Boolean)
          : data.posts || [];
        setPosts(tabPosts);
        setHasMorePosts(Boolean(data.hasMore));

        if (activeTab === "Posts") {
          const originalPosts = tabPosts.filter((post) => !post.isRepost);
          setAllUserPosts(originalPosts);
          setOwnPostCount(data.total ?? tabPosts.length);
          setOwnLikesCount(originalPosts.reduce((total, post) => total + (post.likesCount || 0), 0));
        }
      } catch (error) {
        console.error("Profile tab fetch failed", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTab();
  }, [profileId, activeTab, currentUser?.uid, initialPosts.length]);

  const loadMorePosts = useCallback(async () => {
    if (!profileId || loading || loadingMore || !hasMorePosts) return;
    const nextPage = currentPage + 1;
    setLoadingMore(true);
    try {
      const viewer = currentUser?.uid ? `&currentUserId=${currentUser.uid}` : "";
      const endpoint = activeTab === "Saved"
        ? `/api/saves?userId=${profileId}&page=${nextPage}&limit=30${viewer}`
        : activeTab === "Liked"
        ? `/api/posts?userId=${profileId}&type=liked&page=${nextPage}&limit=30${viewer}`
        : `/api/posts?userId=${profileId}&page=${nextPage}&limit=30${viewer}`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Could not load more posts");
      const data = await response.json();
      const nextPosts: PostType[] = activeTab === "Saved"
        ? (data.saves || []).map((save: { postId: PostType }) => save.postId).filter(Boolean)
        : data.posts || [];
      setPosts((current) => {
        const seen = new Set(current.map((post, index) => post.isRepost
          ? `${post._id}:repost:${post.repostedBy?.firebaseId || index}`
          : `${post._id}:post`));
        return [...current, ...nextPosts.filter((post, index) => {
          const key = post.isRepost
            ? `${post._id}:repost:${post.repostedBy?.firebaseId || index}`
            : `${post._id}:post`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })];
      });
      if (activeTab === "Posts") {
        setAllUserPosts((current) => {
          const ids = new Set(current.map((post) => post._id.toString()));
          return [...current, ...nextPosts.filter((post) => !post.isRepost && !ids.has(post._id.toString()))];
        });
      }
      setCurrentPage(nextPage);
      setHasMorePosts(Boolean(data.hasMore));
    } catch (error) {
      console.error("Profile pagination failed", error);
    } finally {
      setLoadingMore(false);
    }
  }, [activeTab, currentPage, currentUser?.uid, hasMorePosts, loading, loadingMore, profileId]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMorePosts || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMorePosts();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMorePosts, loadMorePosts, loading, loadingMore]);

  const { containerRef, pullDistance, isRefreshing: isPullRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      setLoading(true);
      setPosts([]);
      try {
        const viewer = currentUser?.uid ? `&currentUserId=${currentUser.uid}` : "";
        const tabEndpoint = activeTab === "Saved"
          ? `/api/saves?userId=${profileId}&page=1&limit=30${viewer}`
          : activeTab === "Liked"
          ? `/api/posts?userId=${profileId}&type=liked&page=1&limit=30${viewer}`
          : `/api/posts?userId=${profileId}&page=1&limit=30${viewer}`;
        const [profileResponse, tabResponse] = await Promise.all([
          fetch(`/api/users/${profileId}`),
          fetch(tabEndpoint),
        ]);
        const [profileData, tabData] = await Promise.all([profileResponse.json(), tabResponse.json()]);
        if (profileResponse.ok && profileData.user) {
          setProfileUser(profileData.user);
          setStreakDays(profileData.user.streakDays || 0);
        }
        const refreshedPosts: PostType[] = activeTab === "Saved"
          ? (tabData.saves || []).map((save: { postId: PostType }) => save.postId).filter(Boolean)
          : tabData.posts || [];
        setPosts(refreshedPosts);
        setCurrentPage(1);
        setHasMorePosts(Boolean(tabData.hasMore));
        if (activeTab === "Posts") {
          const originals = refreshedPosts.filter((post) => !post.isRepost);
          setAllUserPosts(originals);
          setOwnPostCount(tabData.total ?? refreshedPosts.length);
          setOwnLikesCount(originals.reduce((total, post) => total + (post.likesCount || 0), 0));
        }
      } catch (err) {
        console.error("Pull refresh failed", err);
      } finally {
        setLoading(false);
      }
    },
  });

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

  if (loading && !profileUser)
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
    <div ref={containerRef} className="flex flex-col w-full min-h-screen relative">
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="modal-solid border border-border w-full max-w-md rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
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

      <AnimatePresence>
        {followListType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setFollowListType(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              onClick={(event) => event.stopPropagation()}
              className="modal-solid flex max-h-[75vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h3 className="text-[17px] font-bold">Connections</h3>
                <button
                  type="button"
                  onClick={() => setFollowListType(null)}
                  aria-label="Close connections"
                  className="rounded-full p-2 transition-colors hover:bg-secondary/60"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 border-b border-border">
                {(["followers", "following"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFollowListType(type)}
                    className={`relative py-3 text-[13px] font-bold capitalize transition-colors hover:bg-secondary/30 ${followListType === type ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {type} {type === "followers" ? followState.followersCount : followState.followingCount}
                    {followListType === type && <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-brand-green" />}
                  </button>
                ))}
              </div>
              <div className="min-h-52 overflow-y-auto scrollbar-hide">
                {followListLoading ? (
                  <div className="flex h-52 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-green" /></div>
                ) : followListError ? (
                  <div className="flex h-52 flex-col items-center justify-center gap-3 px-6 text-center">
                    <p className="text-sm text-muted-foreground">Couldn&apos;t load this list.</p>
                    <button type="button" onClick={() => setFollowListReload((value) => value + 1)} className="text-sm font-bold text-brand-green">Try again</button>
                  </div>
                ) : followListUsers.length === 0 ? (
                  <div className="flex h-52 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                    No {followListType} yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {followListUsers.map((user) => <FollowListRow key={user._id} user={user} onNavigate={() => setFollowListType(null)} />)}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
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
        <div className="flex items-center gap-1">
          {/* Mobile refresh */}
          <button
            onClick={() => { setPosts([]); setLoading(true); }}
            aria-label="Refresh profile"
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary/60 transition-colors press-scale"
          >
            <RefreshCw
              className={`w-4 h-4 text-muted-foreground ${
                isPullRefreshing || loading ? "animate-spin" : ""
              }`}
            />
          </button>
          <button
            onClick={() => setIsMobileSettingsOpen(true)}
            className="lg:hidden p-2 rounded-xl text-muted-foreground hover:bg-secondary/60 transition-colors press-scale"
            title="Options"
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
          </button>
        </div>
      </header>

      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {(pullDistance > 8 || isPullRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-16 left-0 right-0 z-50 flex justify-center pointer-events-none"
          >
            <div className="bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 shadow-card flex items-center gap-2">
              <RefreshCw
                className={`w-3.5 h-3.5 text-brand-green ${
                  isPullRefreshing ? "animate-spin" : ""
                }`}
                style={{
                  transform: isPullRefreshing
                    ? undefined
                    : `rotate(${Math.min(pullDistance * 3, 280)}deg)`,
                }}
              />
              {isPullRefreshing && (
                <span className="text-[12px] text-muted-foreground font-medium">Refreshing…</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guest Welcome Banner - Only for non-logged in users */}
      {!currentUser && !authLoading && (
        <div className="bg-brand-green/10 border-b border-brand-green/20 px-4 py-3 flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-green flex items-center justify-center">
              <Image src="/icon-192.png" width={20} height={20} alt="MindFuel" className="brightness-0 invert" />
            </div>
            <div>
              <p className="text-[13px] font-bold leading-none">MindFuel</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Share your reflections daily</p>
            </div>
          </div>
          <button onClick={() => openSignInModal()} className="px-4 py-1.5 bg-brand-green text-white text-[12px] font-bold rounded-full hover:bg-brand-green/90 transition-colors shadow-sm">
            Join Now
          </button>
        </div>
      )}

      <div className="relative">
        <div className="w-full h-28 sm:h-36 bg-brand-green flex items-center justify-center border-b border-border/30 overflow-hidden relative">
          <Image 
            src="/logoDarkbg.png" 
            alt="MindFuel" 
            width={160}
            height={48}
            className="opacity-90 drop-shadow-sm select-none pointer-events-none" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
          
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {isOwnProfile && (
              <button
                onClick={subscribeUser}
                disabled={isSubscribing}
                className={`p-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all active:scale-95 ${isSubscribing ? "opacity-50 cursor-not-allowed" : ""}`}
                title="Enable Daily Notifications"
              >
                {isSubscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </button>
            )}
            <button
              onClick={() => {
                const url = window.location.href;
                if (navigator.share) {
                  navigator.share({ title: `${profileUser.name} on MindFuel`, url });
                } else {
                  navigator.clipboard.writeText(url);
                  showToast("Profile link copied!", "success");
                }
              }}
              className="p-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all active:scale-95"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="absolute left-4 -bottom-14">
          {(() => {
            const avatarInner = profileUser.image && !profileUser.image.startsWith("#") && !imgError ? (
              <Image
                src={profileUser.image}
                alt={profileUser.name}
                width={72}
                height={72}
                unoptimized
                onError={() => setImgError(true)}
                className="w-18 h-18 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-18 h-18 rounded-full flex items-center justify-center shadow-inner"
                style={{ backgroundColor: "#0a0a0a" }}
              >
                <span className="text-3xl font-bold text-white selection:bg-transparent">
                  {profileUser.name[0]?.toUpperCase()}
                </span>
              </div>
            );

            return (
              <button
                onClick={() => setIsProfilePicOpen(true)}
                className="cursor-pointer rounded-full bg-background p-1"
                title={`View ${profileUser.name}'s profile picture`}
              >
                <div className="overflow-hidden rounded-full">
                  {avatarInner}
                </div>
              </button>
            );
          })()}
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
                <Image
                  src={profileUser.image}
                  alt={profileUser.name}
                  width={560}
                  height={560}
                  unoptimized
                  className="aspect-square h-[min(82vw,440px)] w-[min(82vw,440px)] rounded-full border border-white/10 object-cover shadow-2xl"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {isOwnProfile ? (
           <div className="absolute -bottom-11 right-4">
            <button onClick={() => setIsEditModalOpen(true)} className="h-10 rounded-full border border-border/70 bg-background/95 px-5 text-[13px] font-bold text-foreground shadow-lg backdrop-blur-xl transition-colors hover:bg-secondary">
              Edit profile
            </button>
          </div>
        ) : (
          <div className="absolute -bottom-14 right-4 flex items-center gap-2">
            <Link href={currentUser ? `/messages?with=${profileId}` : "#"} onClick={(event) => { if (!currentUser) { event.preventDefault(); openSignInModal(); } }} className="flex h-10 items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-[#080d0a] px-4 text-[13px] font-bold text-foreground transition-colors hover:border-white/20 hover:bg-[#0d1510]" aria-label={`Message ${profileUser.name}`}>
              <MessageCircle className="h-4 w-4" />
              <span>Message</span>
            </Link>
            <button onClick={toggleFollow} disabled={followLoading} aria-label={followState.isFollowing ? `Unfollow ${profileUser.name}` : followState.followsViewer ? `Follow back ${profileUser.name}` : `Follow ${profileUser.name}`} className={`flex h-10 min-w-[112px] items-center justify-center gap-2 rounded-full border px-4 text-[13px] font-bold transition-colors disabled:opacity-60 ${followState.isFollowing ? "border-white/[0.12] bg-[#080d0a] text-foreground hover:border-red-400/30 hover:text-red-400" : "border-brand-green bg-brand-green text-white hover:bg-[#00a855]"}`}>
              {followLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : followState.isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {followState.isFollowing ? "Unfollow" : followState.followsViewer ? "Follow back" : "Follow"}
            </button>
          </div>
        )}
      </div>

      <div className="px-4 pt-16 pb-4 border-b border-border">
        <h2 className="text-[22px] font-bold tracking-tight leading-tight">{profileUser.name}</h2>
        <p className="text-muted-foreground text-[14px] mt-0.5">@{profileUser.username || profileUser.name.replace(/\s+/g, "").toLowerCase()}</p>
        {!isOwnProfile && followState.followsViewer && (
          <span className="mt-2 inline-flex rounded-full border border-brand-green/25 bg-brand-green/10 px-2.5 py-1 text-[11px] font-bold text-brand-green">
            Follows you
          </span>
        )}
        
        {profileUser.bio && (
          <p className="text-[15px] text-foreground/90 mt-4 leading-relaxed whitespace-pre-wrap">{profileUser.bio}</p>
        )}

        <div className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground/75">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Joined {joinedDate}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 md:gap-6">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-[16px]">{ownLikesCount}</span>
            <span className="text-muted-foreground text-[13px]">Likes</span>
          </div>
          <button type="button" onClick={() => setFollowListType("followers")} className="flex items-center gap-1.5 rounded-lg transition-colors hover:text-brand-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40">
            <span className="font-bold text-[16px]">{followState.followersCount}</span>
            <span className="text-muted-foreground text-[13px]">Followers</span>
          </button>
          <button type="button" onClick={() => setFollowListType("following")} className="flex items-center gap-1.5 rounded-lg transition-colors hover:text-brand-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40">
            <span className="font-bold text-[16px]">{followState.followingCount}</span>
            <span className="text-muted-foreground text-[13px]">Following</span>
          </button>
          {streakDays > 0 && (
            <StreakDisplay streakDays={streakDays} size="sm" />
          )}
        </div>

        {allUserPosts.length > 0 && (
          <div className="mt-8 pt-8 border-t border-border/40 space-y-8">
            <ReflectionCalendar posts={allUserPosts} />
            <MilestonesGrid earnedMilestones={profileUser?.earnedMilestones || []} />
          </div>
        )}


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
                <motion.div 
                  key={post.isRepost ? `${post._id}-repost-${post.repostedBy?.firebaseId || i}` : post._id} 
                  initial={{ opacity: 0, y: 16 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ 
                    delay: Math.min(i * 0.04, 0.3),
                    duration: 0.4,
                    ease: [0.21, 0.47, 0.32, 0.98]
                  }}
                >
                  <PostCard post={post} />
                </motion.div>
              ) : (
                <motion.div 
                  key={post.isRepost ? `${post._id}-repost-${post.repostedBy?.firebaseId || i}` : post._id} 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ 
                    delay: Math.min(i * 0.03, 0.3),
                    duration: 0.4,
                    ease: [0.21, 0.47, 0.32, 0.98]
                  }}
                >
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
            
            <div ref={loadMoreRef} className="col-span-full flex min-h-20 items-center justify-center py-6" aria-live="polite">
              {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-brand-green" aria-label="Loading more posts" />}
            </div>
            {!hasMorePosts && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center opacity-40">
                <div className="w-1.5 h-1.5 rounded-full bg-foreground mb-4" />
                <p className="text-[13px] font-medium text-foreground tracking-wide">You&apos;ve reached the end</p>
              </div>
            )}
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

      {/* Mobile Settings / Info Bottom Sheet */}
      <AnimatePresence>
        {isMobileSettingsOpen && (
          <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileSettingsOpen(false)}>
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="modal-solid border-t border-border w-full max-w-md rounded-t-[32px] px-6 pt-4 pb-8 space-y-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle */}
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-black text-white">Options</h3>
                <button onClick={() => setIsMobileSettingsOpen(false)} className="p-2 hover:bg-secondary/60 rounded-full transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4">
                {isOwnProfile && (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setIsMobileSettingsOpen(false);
                        setIsEditModalOpen(true);
                      }}
                      className="w-full h-12 px-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3 text-white text-[14px] font-bold active:scale-[0.98] transition-all"
                    >
                      <UserIcon className="w-4 h-4 text-brand-green" />
                      Edit Profile
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileSettingsOpen(false);
                        subscribeUser();
                      }}
                      disabled={isSubscribing}
                      className="w-full h-12 px-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3 text-white text-[14px] font-bold active:scale-[0.98] transition-all"
                    >
                      <Bell className="w-4 h-4 text-brand-green" />
                      Enable Daily Notifications
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="pt-2 pb-1 text-[11px] font-black text-white/30 uppercase tracking-widest pl-1">
                    Information
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/about"
                      className="h-12 px-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-2.5 text-white/80 text-[13px] font-bold active:scale-[0.98] transition-all"
                      onClick={() => setIsMobileSettingsOpen(false)}
                    >
                      <Info className="w-4 h-4 text-brand-green" />
                      About
                    </Link>
                    <Link
                      href="/privacy"
                      className="h-12 px-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-2.5 text-white/80 text-[13px] font-bold active:scale-[0.98] transition-all"
                      onClick={() => setIsMobileSettingsOpen(false)}
                    >
                      <Shield className="w-4 h-4 text-brand-green" />
                      Privacy
                    </Link>
                    <Link
                      href="/terms"
                      className="h-12 px-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-2.5 text-white/80 text-[13px] font-bold active:scale-[0.98] transition-all"
                      onClick={() => setIsMobileSettingsOpen(false)}
                    >
                      <FileText className="w-4 h-4 text-brand-green" />
                      Terms
                    </Link>
                    <Link
                      href="/cookies"
                      className="h-12 px-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-2.5 text-white/80 text-[13px] font-bold active:scale-[0.98] transition-all"
                      onClick={() => setIsMobileSettingsOpen(false)}
                    >
                      <HelpCircle className="w-4 h-4 text-brand-green" />
                      Cookies
                    </Link>
                  </div>
                  <InstallAppButton className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-brand-green/15 bg-brand-green/10 px-4 text-[13px] font-bold text-brand-green transition-all active:scale-[0.98]" installedLabel="MindFuel is installed" />
                </div>

                {isOwnProfile && (
                  <button
                    onClick={() => {
                      setIsMobileSettingsOpen(false);
                      logout();
                    }}
                    className="w-full h-12 px-4 mt-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 flex items-center gap-3 text-rose-500 text-[14px] font-black active:scale-[0.98] transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                )}
              </div>

              <div className="pt-4 text-center border-t border-white/5 mt-2">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                  MindFuel by Lumyn
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

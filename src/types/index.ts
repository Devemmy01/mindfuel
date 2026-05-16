export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  options: PollOption[];
  endsAt: string;
  totalVotes: number;
  votedOptionId?: string; // set client-side per user
}

export interface PostType {
  _id: string;
  text: string;
  hashtags?: string[];
  userId: {
    _id: string;
    name: string;
    username?: string;
    image: string;
    firebaseId: string;
  };
  views: number;
  likesCount: number;
  commentsCount?: number;
  repostCount?: number;
  isSponsored?: boolean;
  imageUrl?: string;
  backgroundStyle: {
    text: string;
    type: "color" | "gradient" | string;
    value: string;
  };
  fontFamily?: string;
  promptId?: string;
  poll?: Poll;
  quotedPostId?: string;
  quotedPost?: PostType; // populated
  isRepost?: boolean;
  repostedBy?: {
    name: string;
    username?: string;
    firebaseId: string;
  };
  createdAt: string;
  isLiked?: boolean;
  isSaved?: boolean;
  isReposted?: boolean;
}

export interface ProfileUser {
  _id: string;
  name: string;
  username?: string;
  image: string;
  firebaseId: string;
  bio?: string;
  createdAt: string;
}

export interface SaveType {
  _id: string;
  postId: PostType;
}

export interface CommentType {
  _id: string;
  userId: ProfileUser;
  postId: string;
  parentId?: string | null;
  content: string;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
  replies?: CommentType[];
}

export interface CommentLikeType {
  _id: string;
  userId: string;
  commentId: string;
  createdAt: string;
}

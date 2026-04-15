export interface PostType {
  _id: string;
  text: string;
  userId: {
    _id: string;
    name: string;
    image: string;
    firebaseId: string;
  };
  views: number;
  likesCount: number;
  commentsCount?: number;
  isSponsored?: boolean;
  backgroundStyle: {
    type: "color" | "gradient" | string;
    value: string;
  };
  fontFamily?: string;
  createdAt: string;
}

export interface ProfileUser {
  _id: string;
  name: string;
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
  content: string;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
}

export interface CommentLikeType {
  _id: string;
  userId: string;
  commentId: string;
  createdAt: string;
}

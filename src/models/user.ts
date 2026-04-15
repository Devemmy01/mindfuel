import { Schema, model, models, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  name: string;
  image: string;
  uploadedImage: string;
  firebaseId: string;
  bio?: string;
  preferences: {
    dailyEmail: boolean;
    notifications: boolean;
  };
  pushSubscriptions: Array<{
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }>;
  createdAt: Date;
  updatedAt: Date;
}


const UserSchema = new Schema(
  {
    email: {
      type: String,
      unique: true,
      required: [true, "Email is required"],
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    image: {
      type: String,
      default: "",
    },
    uploadedImage: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    firebaseId: {
      type: String,
      required: [true, "Firebase ID is required"],
      unique: true,
    },
    preferences: {
      dailyEmail: {
        type: Boolean,
        default: true,
      },
      notifications: {
        type: Boolean,
        default: true,
      },
    },
    pushSubscriptions: {
      type: [
        {
          endpoint: String,
          keys: {
            p256dh: String,
            auth: String,
          },
        },
      ],
      default: [],
    },
  },

  { timestamps: true }
);

const User = models.User || model<IUser>("User", UserSchema);

export default User;

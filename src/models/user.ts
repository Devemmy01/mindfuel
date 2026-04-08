import { Schema, model, models, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  name: string;
  image: string;
  uploadedImage: string;
  firebaseId: string;
  bio?: string;
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
  },
  { timestamps: true }
);

const User = models.User || model<IUser>("User", UserSchema);

export default User;

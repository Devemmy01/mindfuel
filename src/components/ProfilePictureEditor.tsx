"use client";

import React, { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";

interface ProfilePictureEditorProps {
  currentImage: string;
  userName: string;
  onImageChange: (image: string) => void;
}

const AVATAR_MEMOJIS = [
  { id: 1, path: "/pp1.png", label: "Avatar 1" },
  { id: 2, path: "/pp2.png", label: "Avatar 2" },
  { id: 3, path: "/pp3.png", label: "Avatar 3" },
  { id: 4, path: "/pp4.png", label: "Avatar 4" },
  { id: 5, path: "/pp5.png", label: "Avatar 5" },
  { id: 6, path: "/pp6.png", label: "Avatar 6" },
  { id: 7, path: "/pp7.png", label: "Avatar 7" },
  { id: 8, path: "/pp8.png", label: "Avatar 8" },
  { id: 9, path: "/pp9.png", label: "Avatar 9" },
  { id: 10, path: "/pp10.png", label: "Avatar 10" },
  { id: 11, path: "/pp11.png", label: "Avatar 11" },
  { id: 12, path: "/pp12.png", label: "Avatar 12" },
  { id: 13, path: "/pp13.png", label: "Avatar 13" },
  { id: 14, path: "/pp14.png", label: "Avatar 14" },
  { id: 15, path: "/pp15.png", label: "Avatar 15" },
  { id: 16, path: "/pp16.png", label: "Avatar 16" },
  { id: 17, path: "/pp17.png", label: "Avatar 17" },
];

export default function ProfilePictureEditor({
  currentImage,
  userName,
  onImageChange,
}: ProfilePictureEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const [showAvatarGrid, setShowAvatarGrid] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<number | null>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        setPreview(base64String);
        setShowAvatarGrid(false);
        setSelectedAvatarId(null);
        onImageChange(base64String);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Failed to process image");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAvatar = (avatar: (typeof AVATAR_MEMOJIS)[0]) => {
    setPreview(avatar.path);
    setSelectedAvatarId(avatar.id);
    onImageChange(avatar.path);
    setShowAvatarGrid(false);
  };

  const clearImage = () => {
    setPreview("");
    setShowAvatarGrid(false);
    setSelectedAvatarId(null);
    onImageChange("");
  };

  return (
    <div className="space-y-4">
      {/* Current Avatar Preview */}
      <div className="flex justify-center">
        <div className="p-0 rounded-full shadow-lg overflow-hidden border-4 border-brand-green/30">
          {preview ? (
            <Image
              src={preview}
              alt={userName}
              width={112}
              height={112}
              className="w-28 h-28 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: "#0b100d",
              }}
            >
              <span className="text-5xl font-bold text-white selection:bg-transparent">
                {userName[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Upload Button */}
      <div>
        <label className="text-[13px] font-bold text-muted-foreground ml-1 block mb-2">
          Upload Photo
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) =>
            e.target.files?.[0] && handleFileSelect(e.target.files[0])
          }
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="w-full frosted-input px-4 py-3 flex items-center justify-center gap-2 text-[14px] font-medium hover:bg-secondary/40 transition-colors disabled:opacity-50 rounded-2xl border border-border/50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Choose Image
            </>
          )}
        </button>
      </div>

      {/* Avatar Grid Button */}
      <button
        type="button"
        onClick={() => setShowAvatarGrid(!showAvatarGrid)}
        className="w-full frosted-input px-4 py-3 flex items-center justify-center gap-2 text-[14px] font-medium hover:bg-secondary/40 transition-colors rounded-2xl border border-brand-green/30 text-brand-green"
      >
        {showAvatarGrid ? "Hide Avatars" : "Choose Avatar"}
      </button>

      {/* Avatar Grid */}
      {showAvatarGrid && (
        <div className="rounded-2xl border border-border/50 p-4 bg-secondary/20 space-y-3">
          <label className="text-[13px] font-bold text-muted-foreground">
            Pick a Memoji Avatar
          </label>
          <div className="grid grid-cols-5 gap-3">
            {AVATAR_MEMOJIS.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                onClick={() => handleSelectAvatar(avatar)}
                className={`relative rounded-full overflow-hidden transition-all aspect-square ${
                  selectedAvatarId === avatar.id
                    ? "ring-2 ring-brand-green ring-offset-2 ring-offset-background scale-110"
                    : "opacity-75 hover:opacity-100"
                }`}
              >
                <Image
                  src={avatar.path}
                  alt={avatar.label}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clear Button */}
      {preview && (
        <button
          type="button"
          onClick={clearImage}
          className="w-full flex items-center justify-center gap-2 text-[13px] font-medium text-red-500 hover:text-red-600 transition-colors py-2"
        >
          <X className="w-4 h-4" />
          Clear Image
        </button>
      )}
    </div>
  );
}

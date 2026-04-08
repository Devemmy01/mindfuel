"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { Bookmark, Loader2 } from "lucide-react";
import { SaveType } from "@/types";

export default function MindfulSaves() {
  const { user } = useAuth();
  const [saves, setSaves] = useState<SaveType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/saves?userId=${user.uid}`)
      .then(res => res.json())
      .then(data => {
        setSaves((data.saves || []).slice(0, 3));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  return (
    <div className="mt-8 px-2">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-brand-green/70" />
          <h3 className="font-bold text-[14px] tracking-tight">Saved Reflections</h3>
        </div>
        <Link href="/collections" className="text-[11px] font-bold text-muted-foreground hover:text-brand-green transition-colors uppercase tracking-widest">
          View All
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/30" />
        </div>
      ) : saves.length > 0 ? (
        <div className="space-y-3">
          {saves.map((save) => (
            <Link 
              key={save._id} 
              href={`/post/${save.postId?._id}`}
              className="block p-4 rounded-2xl bg-secondary/10 border border-border/40 hover:bg-secondary/20 transition-all group"
            >
              <p className="text-[13px] line-clamp-2 text-foreground/80 group-hover:text-foreground transition-colors leading-relaxed">
                {save.postId?.text}
              </p>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                <span className="w-1 h-1 rounded-full bg-border" />
                {save.postId?.userId?.name}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-6 rounded-2xl border border-dashed border-border/60 text-center">
            <p className="text-[12px] text-muted-foreground italic">No reflections saved yet.</p>
        </div>
      )}
    </div>
  );
}

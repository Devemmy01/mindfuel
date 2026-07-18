"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { getUserHandle } from "@/lib/userHandle";
import { usePresence } from "@/providers/PresenceProvider";

type Suggestion = { _id: string; firebaseId: string; name: string; username?: string; image?: string };

export default function SuggestedFollows() {
  const { user } = useAuth();
  const [people, setPeople] = useState<Suggestion[]>([]);
  const isOnline = usePresence(people.map((person) => person.firebaseId));
  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => {
      fetch(`/api/users/search?viewerId=${user.uid}`).then((response) => response.json()).then((data) => setPeople(data.users || [])).catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [user]);
  const follow = async (person: Suggestion) => {
    if (!user) return;
    setPeople((rows) => rows.filter((item) => item._id !== person._id));
    await fetch("/api/follows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ followerId: user.uid, followingId: person.firebaseId }) });
  };
  if (!user || people.length === 0) return null;
  return <section className="mb-5 rounded-3xl border border-border/60 bg-card/55 p-4 shadow-card backdrop-blur-xl"><div className="mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-brand-green" /><h2 className="text-sm font-bold">Who to follow</h2></div><div className="space-y-1">{people.map((person) => <div key={person._id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-secondary/35"><Link href={`/profile/${person.firebaseId}`} className="flex min-w-0 flex-1 items-center gap-3"><span className="relative shrink-0">{person.image ? <Image src={person.image} alt="" width={38} height={38} className="h-[38px] w-[38px] rounded-full object-cover" /> : <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-brand-green/10 font-bold text-brand-green">{person.name[0]}</span>}<span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${isOnline(person.firebaseId) ? "bg-[#35d07f]" : "bg-[#5f6b65]"}`} /></span><span className="min-w-0"><strong className="block truncate text-[13px]">{person.name}</strong><small className="block truncate text-[11px] text-muted-foreground">@{getUserHandle(person)} · {isOnline(person.firebaseId) ? "Online" : "Offline"}</small></span></Link><button onClick={() => follow(person)} className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-green/10 text-brand-green transition-colors hover:bg-brand-green hover:text-white" aria-label={`Follow ${person.name}`}><UserPlus className="h-3.5 w-3.5" /></button></div>)}</div></section>;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProfileDetailClient from "@/components/ProfileDetailClient";
import { getPublicProfile } from "@/lib/public-content";
import { absoluteUrl, defaultOgImage, siteDescription } from "@/lib/seo";

interface ProfilePageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await getPublicProfile(id);
  if (!profile) {
    return { title: "Profile not found", description: siteDescription, robots: { index: false, follow: false } };
  }

  const displayName = profile.name || "A MindFuel member";
  const username = profile.username || id;
  const description = profile.bio || `Read ${displayName}'s reflections and personal growth journey on MindFuel.`;
  const canonical = absoluteUrl(`/profile/${id}`);

  return {
    title: `${displayName} (@${username}) — Reflections`,
    description,
    alternates: { canonical },
    robots: { index: profile.postCount > 0, follow: true },
    openGraph: {
      title: `${displayName} on MindFuel`,
      description,
      type: "profile",
      url: canonical,
      images: [{ url: profile.image || defaultOgImage, alt: displayName }],
    },
    twitter: { card: "summary", title: `${displayName} on MindFuel`, description, images: [profile.image || defaultOgImage] },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  const profile = await getPublicProfile(id);
  if (!profile) notFound();

  const canonical = absoluteUrl(`/profile/${id}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${canonical}#profile`,
    url: canonical,
    dateCreated: profile.createdAt,
    dateModified: profile.updatedAt || profile.createdAt,
    mainEntity: {
      "@type": "Person",
      name: profile.name,
      alternateName: profile.username ? `@${profile.username}` : undefined,
      description: profile.bio || undefined,
      image: profile.image || undefined,
      url: canonical,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProfileDetailClient initialProfile={profile} initialPostCount={profile.postCount} />
    </>
  );
}

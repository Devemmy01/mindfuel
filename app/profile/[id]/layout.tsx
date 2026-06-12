import { Metadata } from "next";
import { absoluteUrl, defaultOgImage, siteDescription } from "@/lib/seo";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

async function getProfile(id: string) {
  try {
    const res = await fetch(absoluteUrl(`/api/users/${id}`), { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getProfile(id);
  
  if (!data || !data.user) {
    return {
      title: "Profile | MindFuel",
      description: siteDescription,
      alternates: {
        canonical: absoluteUrl(`/profile/${id}`),
      },
    };
  }

  const user = data.user;
  const displayName = user.name || "A Thinker";
  const username = user.username || id;
  const bio =
    user.bio ||
    `Read ${displayName}'s reflections, saved lessons, and personal growth journey on MindFuel.`;
  const image = user.image || defaultOgImage;

  return {
    title: `${displayName} (@${username}) - Reflections & Growth Journal`,
    description: bio,
    alternates: {
      canonical: absoluteUrl(`/profile/${id}`),
    },
    openGraph: {
      title: `${displayName} on MindFuel`,
      description: bio,
      type: "profile",
      url: absoluteUrl(`/profile/${id}`),
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: displayName,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: `${displayName} on MindFuel`,
      description: bio,
      images: [image],
    },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

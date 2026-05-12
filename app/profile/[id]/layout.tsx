import { Metadata } from "next";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

async function getProfile(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mind-fuel.app';
  try {
    const res = await fetch(`${baseUrl}/api/users/${id}`, { cache: 'no-store' });
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
      description: "Explore mindful reflections on MindFuel.",
    };
  }

  const user = data.user;
  const displayName = user.name || "A Thinker";
  const bio = user.bio || `Explore ${displayName}'s mindful reflections and daily streaks on MindFuel.`;

  return {
    title: `${displayName} (@${user.username || id}) | MindFuel`,
    description: bio,
    openGraph: {
      title: `${displayName} on MindFuel`,
      description: bio,
      type: "profile",
      images: [
        {
          url: user.image || "/og-profile.png",
          width: 400,
          height: 400,
          alt: displayName,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: `${displayName} on MindFuel`,
      description: bio,
      images: [user.image || "/og-profile.png"],
    },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

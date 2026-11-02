import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DesignShowcase from "./DesignShowcase";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

export default async function DesignPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  // Internal reference only: never served in production builds.
  if (process.env.NODE_ENV !== "development") notFound();
  const { theme } = await searchParams;
  const themes = theme === "light" ? ["light"] : theme === "dark" ? ["dark"] : ["dark", "light"];
  return (
    <div className="grid min-h-dvh lg:grid-flow-col lg:auto-cols-fr">
      {themes.map((name) => (
        <div key={name} className={`${name} bg-background text-foreground`}>
          <DesignShowcase theme={name} />
        </div>
      ))}
    </div>
  );
}

import Link from "next/link";
import { copy } from "@/lib/copy";

const LINKS = [
  { href: "/?view=landing", label: copy.nav.about },
  { href: "/guides", label: "Guides" },
  { href: "/terms#community-guidelines", label: "Community guidelines" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
];

export default function RailFooter() {
  return (
    <footer className="px-1 pb-2">
      <nav aria-label="About MindFuel" className="flex flex-wrap gap-x-3 gap-y-1.5">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="text-micro text-subtle-foreground hover:text-foreground hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="mt-2 text-micro text-subtle-foreground">© {new Date().getFullYear()} MindFuel</p>
    </footer>
  );
}

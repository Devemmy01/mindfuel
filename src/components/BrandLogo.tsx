import Image from "next/image";
import { cn } from "@/lib/utils";

/** The wordmark in the colour that suits the current theme. Size it with `className` (e.g. "h-8"). */
export default function BrandLogo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <span className={cn("inline-flex", className)}>
      <Image src="/logoWhitebg.png" alt="MindFuel" width={199} height={45} priority={priority} className="h-full w-auto object-contain dark:hidden" />
      <Image src="/logoDarkbg.png" alt="MindFuel" width={200} height={46} priority={priority} className="hidden h-full w-auto object-contain dark:block" />
    </span>
  );
}

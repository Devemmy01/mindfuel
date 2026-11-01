import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Teach tailwind-merge the design-system scales so `text-body` is treated as a
// font size (not a color) and custom radii/z-index/shadows dedupe correctly.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "h3", "body", "body-sm", "caption", "micro"] }],
      rounded: [{ rounded: ["control", "card", "sheet"] }],
      z: [{ z: ["sticky", "rail", "tabbar", "dropdown", "overlay", "modal", "toast", "tooltip"] }],
      shadow: [{ shadow: ["e1", "e2", "e3"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

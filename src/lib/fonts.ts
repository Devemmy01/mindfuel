export type FontOption = {
  id: string;
  label: string;
  /** CSS font-family string */
  family: string;
  /** Google Fonts URL param segment, e.g. "Inter:wght@400;600;700" */
  googleParam: string;
  /** Preview text style short label */
  preview: string;
};

export const fontOptions: FontOption[] = [
  {
    id: "inter",
    label: "Inter",
    family: "'Inter', sans-serif",
    googleParam: "Inter:wght@400;600;700;900",
    preview: "Aa",
  },
  {
    id: "playfair",
    label: "Playfair",
    family: "'Playfair Display', serif",
    googleParam: "Playfair+Display:wght@400;600;700;900",
    preview: "Aa",
  },
  {
    id: "lora",
    label: "Lora",
    family: "'Lora', serif",
    googleParam: "Lora:wght@400;600;700",
    preview: "Aa",
  },
  {
    id: "raleway",
    label: "Raleway",
    family: "'Raleway', sans-serif",
    googleParam: "Raleway:wght@400;600;700;800",
    preview: "Aa",
  },
  {
    id: "montserrat",
    label: "Montserrat",
    family: "'Montserrat', sans-serif",
    googleParam: "Montserrat:wght@400;600;700;800",
    preview: "Aa",
  },
  {
    id: "spacegrotesk",
    label: "Space",
    family: "'Space Grotesk', sans-serif",
    googleParam: "Space+Grotesk:wght@400;600;700",
    preview: "Aa",
  },
  {
    id: "dm-serif",
    label: "DM Serif",
    family: "'DM Serif Display', serif",
    googleParam: "DM+Serif+Display:ital@0;1",
    preview: "Aa",
  },
  {
    id: "cormorant",
    label: "Cormorant",
    family: "'Cormorant Garamond', serif",
    googleParam: "Cormorant+Garamond:wght@400;600;700",
    preview: "Aa",
  },
];

export const defaultFont = fontOptions[0];

export function getFontById(id: string): FontOption {
  return fontOptions.find((f) => f.id === id) ?? defaultFont;
}

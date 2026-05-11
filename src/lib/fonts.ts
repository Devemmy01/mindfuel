export type FontOption = {
  id: string;
  label: string;
  /** CSS font-family string */
  family: string;
  /** Google Fonts URL param segment */
  googleParam: string;
  /** Preview text style short label */
  preview: string;
};

// Single curated font — Inter for clean, X-style readability
export const fontOptions: FontOption[] = [
  {
    id: "inter",
    label: "Inter",
    family: "'Inter', sans-serif",
    googleParam: "Inter:wght@400;500;600;700;900",
    preview: "Aa",
  },
];

export const defaultFont = fontOptions[0];

export function getFontById(id: string): FontOption {
  return fontOptions.find((f) => f.id === id) ?? defaultFont;
}

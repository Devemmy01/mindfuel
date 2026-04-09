export type BackgroundStyle = {
  id: string;
  name: string;
  type: "color" | "gradient";
  value: string;
  text: string;
};

export const backgroundOptions: BackgroundStyle[] = [
  // Classy Dark
  { id: "obsidian",  name: "Obsidian",    type: "color",    value: "#0a0a0a",                                        text: "#ffffff" },
  { id: "nude",      name: "Nude",        type: "color",    value: "#C39A6B",                                        text: "#ffffff" },
  { id: "charcoal",  name: "Charcoal",    type: "gradient", value: "linear-gradient(135deg, #232526, #414345)",      text: "#ffffff" },
  { id: "midnight",  name: "Midnight",    type: "gradient", value: "linear-gradient(135deg, #0f172a, #1e293b)",      text: "#ffffff" },
  
  // Clean Light
  { id: "paper",     name: "Paper",       type: "color",    value: "#ffffff",                                        text: "#171717" },
  { id: "sand",      name: "Sand",        type: "color",    value: "#f5f5dc",                                        text: "#171717" },
  { id: "sakura",    name: "Sakura",      type: "gradient", value: "linear-gradient(135deg, #fff1f2, #ffe4e6)",      text: "#171717" },
  
  // Brand
  { id: "mindfuel",  name: "MindFuel",    type: "gradient", value: "linear-gradient(135deg, #00bf63, #047857)",      text: "#ffffff" },
  
  // Majestic Gradients
  { id: "aurora",    name: "Aurora",      type: "gradient", value: "linear-gradient(135deg, #134e5e, #71b280)",      text: "#ffffff" },
  { id: "serenity",  name: "Serenity",    type: "gradient", value: "linear-gradient(135deg, #a5b4fc, #818cf8)",      text: "#ffffff" },
  
  // New Vibrant & Premium Gradients
  { id: "sunset",    name: "Sunset",      type: "gradient", value: "linear-gradient(135deg, #ff7e5f, #feb47b)",      text: "#ffffff" },
  { id: "cosmic",    name: "Cosmic",      type: "gradient", value: "linear-gradient(135deg, #ff00cc, #333399)",      text: "#ffffff" },
  { id: "velvet",    name: "Velvet",      type: "gradient", value: "linear-gradient(135deg, #870000, #190a05)",      text: "#ffffff" },
  { id: "matcha",    name: "Matcha",      type: "gradient", value: "linear-gradient(135deg, #d4fc79, #96e6a1)",      text: "#171717" },
  { id: "lavender",  name: "Lavender",    type: "gradient", value: "linear-gradient(135deg, #e0c3fc, #8ec5fc)",      text: "#171717" },
  { id: "oceanic",   name: "Oceanic",     type: "gradient", value: "linear-gradient(135deg, #2b5876, #4e4376)",      text: "#ffffff" },
  { id: "ember",     name: "Ember",       type: "gradient", value: "linear-gradient(135deg, #f12711, #f5af19)",      text: "#ffffff" },
  { id: "slate",     name: "Slate",       type: "gradient", value: "linear-gradient(135deg, #8e9eab, #eef2f3)",      text: "#171717" }
];

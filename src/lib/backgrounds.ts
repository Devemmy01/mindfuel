export type BackgroundStyle = {
  id: string;
  name: string;
  type: "color" | "gradient";
  value: string;
  text: string;
};

export const backgroundOptions: BackgroundStyle[] = [
  // --- 2025 PREMIUM DESIGNER SERIES (Top Tier) ---
  { 
    id: "lavender-dots",   
    name: "Lavender Dots",     
    type: "gradient", 
    value: "radial-gradient(circle at 10px 10px, rgba(255,192,203,0.18) 2px, transparent 2px), radial-gradient(circle at 30px 30px, rgba(255,182,193,0.12) 2px, transparent 2px) 0 0 / 40px 40px, #1a1625",
    text: "#ffffff" 
  },
  { 
    id: "heart-beat",   
    name: "Heart Beat",     
    type: "gradient", 
    value: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 21s-6.716-4.35-9.193-7.193C.87 11.87.87 8.83 2.807 6.893c1.937-1.937 4.977-1.937 6.914 0L12 9.172l2.279-2.279c1.937-1.937 4.977-1.937 6.914 0 1.937 1.937 1.937 4.977 0 6.914C18.716 16.65 12 21 12 21z' fill='rgba(255,105,135,0.12)'/%3E%3C/svg%3E\") 0 0 / 60px 60px, #140d12",
    text: "#ffffff" 
  },
  { 
    id: "zen-waves",   
    name: "Zen Waves",     
    type: "gradient", 
    value: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 12c4-2 6-2 10 0s6 2 10 0' stroke='rgba(173,216,230,0.15)' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E\") 0 0 / 80px 80px, #0f172a",
    text: "#ffffff" 
  },
  { 
    id: "nebula",   
    name: "Nebula",     
    type: "gradient", 
    value: "radial-gradient(at 20% 30%, rgba(120, 119, 198, 0.4) 0px, transparent 50%), radial-gradient(at 80% 20%, rgba(255, 175, 189, 0.35) 0px, transparent 50%), radial-gradient(at 40% 80%, rgba(135, 206, 250, 0.3) 0px, transparent 50%), #0f172a",
    text: "#ffffff" 
  },
  { 
    id: "grainy-night",   
    name: "Night Grain",     
    type: "gradient", 
    value: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E\"), linear-gradient(135deg, #0f172a, #020617)",
    text: "#ffffff" 
  },
  { 
    id: "retro-grid",   
    name: "Architect",     
    type: "gradient", 
    value: "linear-gradient(#ffffff08 1px, transparent 1px) 0 0 / 40px 40px, linear-gradient(90deg, #ffffff08 1px, transparent 1px) 0 0 / 40px 40px, #0f172a",
    text: "#ffffff" 
  },
  { 
    id: "mesh-aurora",   
    name: "Mesh Aurora",     
    type: "gradient", 
    value: "radial-gradient(circle at 30% 40%, #a8edea33 0%, transparent 60%), radial-gradient(circle at 70% 60%, #fed6e333 0%, transparent 60%), radial-gradient(circle at 50% 50%, #d4fc7922 0%, transparent 70%), #0f172a",
    text: "#ffffff" 
  },
  { 
    id: "matcha-dream",   
    name: "Matcha",     
    type: "gradient", 
    value: "radial-gradient(circle at 30% 30%, rgba(144, 238, 144, 0.2), transparent 60%), radial-gradient(circle at 80% 70%, rgba(34, 139, 34, 0.25), transparent 70%), #0b1f14",
    text: "#ffffff" 
  },
  { 
    id: "ocean-depth",   
    name: "Deep Ocean",     
    type: "gradient", 
    value: "linear-gradient(180deg, #020617, #0a2540)",
    text: "#ffffff" 
  },
  { 
    id: "soft-grid",   
    name: "Notebook",     
    type: "gradient", 
    value: "linear-gradient(#00000008 1px, transparent 1px) 0 0 / 40px 40px, linear-gradient(90deg, #00000008 1px, transparent 1px) 0 0 / 40px 40px, #f4f1ee",
    text: "#171717" 
  },

  // --- BRAND & SPECIAL ---
  { id: "mindfuel",  name: "MindFuel",    type: "gradient", value: "linear-gradient(135deg, #00bf63, #047857)",      text: "#ffffff" },
  { id: "obsidian",  name: "Obsidian",    type: "color",    value: "#0a0a0a",                                        text: "#ffffff" },
  { id: "paper",     name: "Paper",       type: "color",    value: "#ffffff",                                        text: "#171717" },
  
  // --- AESTHETIC PATTERNS (PREVIOUS) ---
  { 
    id: "topo",   
    name: "Canyon",     
    type: "gradient", 
    value: "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20c20-10 40 10 60 0s40 10 40 0M0 40c20-10 40 10 60 0s40 10 40 0M0 60c20-10 40 10 60 0s40 10 40 0M0 80c20-10 40 10 60 0s40 10 40 0' fill='none' stroke='%23ffffff' stroke-width='0.5' stroke-opacity='0.15'/%3E%3C/svg%3E\"), linear-gradient(135deg, #1e3c72, #2a5298)",
    text: "#ffffff" 
  },
  { 
    id: "romance",   
    name: "Hearts",     
    type: "gradient", 
    value: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 34.35l-1.45-1.32C13.4 28.36 10 25.28 10 21.5c0-3.08 2.42-5.5 5.5-5.5 1.74 0 3.41.81 4.5 2.09C21.09 16.31 22.76 15.5 24.5 15.5 27.58 15.5 30 17.92 30 21.5c0 3.78-3.4 6.86-8.55 11.54L20 34.35z' fill='%23ffffff' fill-opacity='0.12'/%3E%3C/svg%3E\"), linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    text: "#ffffff" 
  }
];

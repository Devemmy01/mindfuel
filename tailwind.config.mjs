import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brand fills keep the literal accent in both themes. For green *text*
        // use `text-primary-text`, which darkens in light mode for contrast.
        brand: {
          green: {
            DEFAULT: "#00bf63",
            active: "#00a855",
            pressed: "#009950",
          },
          light: "#f9fafb",
          dark: "#111827",
        },
        "primary-text": "hsl(var(--primary-text))",
        "primary-hover": "hsl(var(--primary-hover))",
        "subtle-foreground": "hsl(var(--subtle-foreground))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        // Surface hierarchy: page < surface < raised < elevated.
        surface: {
          DEFAULT: "hsl(var(--surface))",
          raised: "hsl(var(--surface-raised))",
          elevated: "hsl(var(--surface-elevated))",
        },
        // Hairlines. `line` resolves to the themed border tokens.
        line: {
          subtle: "hsl(var(--border) / 0.7)",
          DEFAULT: "hsl(var(--border))",
          strong: "hsl(var(--border-strong))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Design-system radii. Prefer these three over one-off values.
        control: "8px",
        card: "12px",
        sheet: "20px",
      },
      fontSize: {
        display: ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.025em", fontWeight: "700" }],
        h1: ["1.75rem", { lineHeight: "2.125rem", letterSpacing: "-0.02em", fontWeight: "700" }],
        h2: ["1.375rem", { lineHeight: "1.75rem", letterSpacing: "-0.015em", fontWeight: "600" }],
        h3: ["1.125rem", { lineHeight: "1.5rem", letterSpacing: "-0.01em", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.5rem" }],
        "body-sm": ["0.9375rem", { lineHeight: "1.375rem" }],
        caption: ["0.8125rem", { lineHeight: "1.125rem" }],
        micro: ["0.75rem", { lineHeight: "1rem" }],
      },
      zIndex: {
        sticky: "10",
        rail: "20",
        tabbar: "30",
        dropdown: "40",
        overlay: "50",
        modal: "60",
        toast: "70",
        tooltip: "80",
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.23, 1, 0.32, 1)",
      },
      fontFamily: {
        // next/font registers Inter under a generated family name exposed as
        // --font-inter; the literal "Inter" only matched locally installed fonts.
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        "brand-glow": "none",
        "brand-sm": "none",
        "soft": "none",
        "card": "none",
        // Elevation scale. Dark theme leans on borders, so these stay subtle.
        e1: "0 1px 2px rgb(0 0 0 / 0.06), 0 1px 1px rgb(0 0 0 / 0.04)",
        e2: "0 4px 16px -4px rgb(0 0 0 / 0.16), 0 2px 4px rgb(0 0 0 / 0.06)",
        e3: "0 16px 48px -12px rgb(0 0 0 / 0.35), 0 4px 12px rgb(0 0 0 / 0.08)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-up": "slide-up 0.25s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [animate],
};

export default config;

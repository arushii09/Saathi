import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paytm: {
          navy: "#002E6E",
          dark: "#001A44",
          lightNavy: "#0D3C7E",
          blue: "#00BAF2",
          sky: "#00AEEF",
          deepBlue: "#0082C8",
          bg: "#F5F9FD",
          surface: "#FFFFFF",
          border: "#E2ECF6",
          green: "#00B368",
          red: "#EE272C",
        },
        navy: {
          900: "var(--navy-900)",
          800: "var(--navy-800)",
          700: "var(--navy-700)",
        },
        brand: {
          500: "var(--brand-500)",
          600: "var(--brand-600)",
        },
        teal: {
          500: "var(--teal-500)",
        },
        surface: "var(--surface)",
        card: "var(--card)",
        border: "var(--border)",
        text: {
          DEFAULT: "var(--text)",
          muted: "var(--muted)",
        },
        online: "var(--online)",
        offline: "var(--offline)",
        tier: {
          t1: {
            bg: "var(--tier-t1-bg)",
            border: "var(--tier-t1-border)",
            text: "var(--tier-t1-text)",
          },
          t2a: {
            bg: "var(--tier-t2a-bg)",
            border: "var(--tier-t2a-border)",
            text: "var(--tier-t2a-text)",
          },
          t2b: {
            bg: "var(--tier-t2b-bg)",
            border: "var(--tier-t2b-border)",
            text: "var(--tier-t2b-text)",
          },
          t3: {
            bg: "var(--tier-t3-bg)",
            border: "var(--tier-t3-border)",
            text: "var(--tier-t3-text)",
          },
        },
      },
      fontFamily: {
        heading: ["Montserrat", "Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        body: ["Inter", "Noto Sans Devanagari", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        hindi: ["Noto Sans Devanagari", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "Courier New", "monospace"],
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0, 46, 110, 0.05)",
        card: "0 4px 20px rgba(0, 46, 110, 0.08)",
        paytm: "0 8px 30px rgba(0, 186, 242, 0.15)",
        mic: "0 0 0 8px rgba(0, 186, 242, 0.2)",
        "mic-active": "0 0 0 16px rgba(0, 186, 242, 0.35)",
      },
      borderRadius: {
        card: "16px",
        btn: "12px",
        chip: "999px",
        phone: "36px",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 0 4px rgba(0, 186, 242, 0.2)" },
          "50%": { transform: "scale(1.04)", boxShadow: "0 0 0 14px rgba(0, 186, 242, 0.35)" },
        },
        pulseOnline: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.15)" },
        },
      },
      animation: {
        breathe: "breathe 3s ease-in-out infinite",
        "pulse-online": "pulseOnline 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

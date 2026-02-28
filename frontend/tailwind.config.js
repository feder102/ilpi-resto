/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary color
        indigo: {
          50: "#EEF2FF",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
        },
        // Neutral/Slate scale
        slate: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
        // Semantic colors
        green: {
          600: "#16A34A",
        },
        yellow: {
          600: "#CA8A04",
        },
        red: {
          600: "#DC2626",
        },
        blue: {
          600: "#2563EB",
        },
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
      },
      fontSize: {
        xs: ["12px", "1.4"],
        sm: ["14px", "1.5"],
        base: ["16px", "1.5"],
        lg: ["18px", "1.5"],
        xl: ["20px", "1.5"],
        "2xl": ["24px", "1.3"],
        "3xl": ["28px", "1.2"],
        "4xl": ["32px", "1.2"],
      },
      borderRadius: {
        sm: "2px",
        md: "6px",
        lg: "8px",
        full: "50%",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
        md: "0 4px 6px rgba(0, 0, 0, 0.1)",
        lg: "0 10px 15px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
}

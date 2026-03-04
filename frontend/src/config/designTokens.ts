/**
 * Design System Tokens
 * Central definition of colors, spacing, typography, and other design system values
 * Exported for use in components and styling
 */

// Color Palette - Complete Indigo + Slate with Semantic Colors
export const colors = {
  // Primary - Indigo (Complete Scale)
  indigo: {
    50: "#EEF2FF",
    100: "#E0E7FF",
    200: "#C7D2FE",
    300: "#A5B4FC",
    400: "#818CF8",
    500: "#6366F1",
    600: "#4F46E5", // Primary action color
    700: "#4338CA",
    800: "#3730A3",
    900: "#312E81",
  },

  // Neutral - Slate (Complete Scale)
  slate: {
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
  },

  // Semantic Colors (Brand-consistent alternatives)
  green: {
    50: "#F0FDF4",
    100: "#DCFCE7",
    600: "#16A34A",
    700: "#15803D",
  },
  yellow: {
    50: "#FEFCE8",
    100: "#FEF3C7",
    600: "#CA8A04",
    700: "#B45309",
  },
  red: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    600: "#DC2626",
    700: "#B91C1C",
  },
  blue: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    600: "#2563EB",
    700: "#1D4ED8",
  },

  // Shorthand semantic colors
  success: "#16A34A",
  warning: "#CA8A04",
  error: "#DC2626",
  info: "#2563EB",
};

// Spacing Scale (4px base unit)
export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
} as const;

// Typography
export const typography = {
  fontFamily: {
    sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
  },

  fontSize: {
    xs: { size: "12px", lineHeight: "1.4" },
    sm: { size: "14px", lineHeight: "1.5" },
    base: { size: "16px", lineHeight: "1.5" },
    lg: { size: "18px", lineHeight: "1.5" },
    xl: { size: "20px", lineHeight: "1.5" },
    "2xl": { size: "24px", lineHeight: "1.3" },
    "3xl": { size: "28px", lineHeight: "1.2" },
    "4xl": { size: "32px", lineHeight: "1.2" },
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    bold: 700,
  },
} as const;

// Border Radius
export const borderRadius = {
  sm: "2px",
  md: "6px",
  lg: "8px",
  full: "50%",
} as const;

// Shadows
export const shadows = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px rgba(0, 0, 0, 0.1)",
} as const;

// Breakpoints (Tailwind standard)
export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

// Z-index Scale
export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  backdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// Component Variants - Indigo + Slate + Semantic Colors
export const componentVariants = {
  button: {
    // Primary: Indigo-600 (white text)
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:ring-indigo-600",
    // Secondary: Slate-100 background (Slate-700 text)
    secondary: "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 active:bg-slate-300 focus:ring-indigo-600",
    // Danger: Red-600 (white text, semantic)
    danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-600",
  },

  badge: {
    // Success: Green semantic
    success: "bg-green-100 text-green-700",
    // Warning: Yellow semantic
    warning: "bg-yellow-100 text-yellow-700",
    // Error: Red semantic
    error: "bg-red-100 text-red-700",
    // Info: Blue semantic
    info: "bg-blue-100 text-blue-700",
    // Neutral: Slate-100
    neutral: "bg-slate-100 text-slate-700",
  },

  alert: {
    // Success: Green with Slate border
    success: "bg-green-50 border-l-4 border-green-600 text-green-800",
    // Warning: Yellow with Slate border
    warning: "bg-yellow-50 border-l-4 border-yellow-600 text-yellow-800",
    // Error: Red with Slate border
    error: "bg-red-50 border-l-4 border-red-600 text-red-800",
    // Info: Blue with Slate border
    info: "bg-blue-50 border-l-4 border-blue-600 text-blue-800",
  },

  input: {
    // Border: Slate-200 (rest), focus: Indigo-600
    base: "border-slate-200 focus:border-indigo-600 focus:ring-indigo-600",
    // Error: Red border
    error: "border-red-600 focus:border-red-600 focus:ring-red-600",
  },

  card: {
    // Default: White background, Slate-200 border
    default: "bg-white border-slate-200",
    // Elevated: White background, Slate-300 border, shadow
    elevated: "bg-white border-slate-200 shadow-md",
  },
} as const;

// Transitions
export const transitions = {
  fast: "150ms ease-in-out",
  normal: "300ms ease-in-out",
  slow: "500ms ease-in-out",
} as const;

export default {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  breakpoints,
  zIndex,
  componentVariants,
  transitions,
};

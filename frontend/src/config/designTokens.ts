/**
 * Design System Tokens
 * Central definition of colors, spacing, typography, and other design system values
 * Exported for use in components and styling
 */

// Color Palette
export const colors = {
  // Primary
  primary: {
    50: "#EEF2FF",
    500: "#6366F1",
    600: "#4F46E5",
    700: "#4338CA",
  },

  // Neutral (Slate)
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

  // Semantic Colors
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

// Component Variants
export const componentVariants = {
  button: {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700",
    secondary: "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200",
    danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  },

  badge: {
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    error: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
    neutral: "bg-slate-100 text-slate-700",
  },

  alert: {
    success: "bg-green-50 border-l-4 border-green-600 text-green-800",
    warning: "bg-yellow-50 border-l-4 border-yellow-600 text-yellow-800",
    error: "bg-red-50 border-l-4 border-red-600 text-red-800",
    info: "bg-blue-50 border-l-4 border-blue-600 text-blue-800",
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

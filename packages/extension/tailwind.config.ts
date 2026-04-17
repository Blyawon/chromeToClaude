import type { Config } from "tailwindcss";

/**
 * Monochrome / Vercel-leaning palette, exposed under semantic token names so
 * the existing primitives (Section, IconButton, PropertyInput, Select…) do not
 * need any changes. Only the Command Palette modal overrides these with
 * Figma-specific values via arbitrary Tailwind classes.
 */
export default {
  content: ["./src/ui/**/*.{ts,tsx}"],
  corePlugins: { preflight: true },
  theme: {
    extend: {
      colors: {
        // Surfaces — clean dark stack, alpha-based interactions
        "surface-page": "#0a0a0a",
        "surface-default": "#111111",
        "surface-raised": "#171717",
        "surface-hover": "rgba(255,255,255,0.05)",
        "surface-pressed": "rgba(255,255,255,0.09)",
        "surface-selected": "rgba(255,255,255,0.07)",
        "surface-inverse": "#fafafa",

        // Borders — hairline alphas for quiet separators
        "border-default": "rgba(255,255,255,0.09)",
        "border-subtle": "rgba(255,255,255,0.06)",
        "border-strong": "rgba(255,255,255,0.14)",
        "border-selected": "#fafafa",

        // Text
        "text-default": "#ededed",
        "text-secondary": "#a1a1a1",
        "text-tertiary": "#6b6b6b",
        "text-disabled": "#3f3f3f",
        "text-inverse": "#0a0a0a",
        "text-brand": "#fafafa",

        // Icons
        "icon-default": "#ededed",
        "icon-secondary": "#a1a1a1",
        "icon-tertiary": "#6b6b6b",
        "icon-disabled": "#3f3f3f",
        "icon-brand": "#fafafa",

        // Accent kept monochrome — amber is reserved for "edited"
        "accent-brand": "#fafafa",
        "accent-brand-hover": "#ffffff",
        "accent-brand-pressed": "#eaeaea",
        "accent-brand-subtle": "rgba(250,250,250,0.10)",

        "accent-danger": "#ef4444",
        "accent-danger-subtle": "rgba(239,68,68,0.14)",
        "accent-success": "#22c55e",
        "accent-success-subtle": "rgba(34,197,94,0.14)",
        "accent-warning": "#f5a524",
        "accent-warning-subtle": "rgba(245,165,36,0.14)",

        // Edited indicator — warm amber, the only non-neutral signal color
        edited: "#f5a524",
        "edited-subtle": "rgba(245,165,36,0.14)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "system-ui",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      fontSize: {
        "t-xs": ["10px", { lineHeight: "14px", letterSpacing: "0.01em" }],
        "t-sm": ["11px", { lineHeight: "16px", letterSpacing: "0" }],
        "t-md": ["12px", { lineHeight: "16px", letterSpacing: "-0.005em" }],
        "t-lg": ["13px", { lineHeight: "18px", letterSpacing: "-0.01em" }],
        "t-xl": ["14px", { lineHeight: "20px", letterSpacing: "-0.01em" }],
        "t-2xl": ["16px", { lineHeight: "22px", letterSpacing: "-0.015em" }],
      },
      spacing: {
        "s-050": "2px",
        "s-100": "4px",
        "s-150": "6px",
        "s-200": "8px",
        "s-300": "12px",
        "s-400": "16px",
        "s-500": "20px",
        "s-600": "24px",
        "s-800": "32px",
      },
      borderRadius: {
        "r-xs": "2px",
        "r-sm": "4px",
        "r-md": "6px",
        "r-lg": "10px",
        "r-xl": "14px",
      },
      boxShadow: {
        "depth-1":
          "0 1px 2px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(255,255,255,0.04)",
        "depth-2":
          "0 4px 12px rgba(0,0,0,0.35), 0 0 0 0.5px rgba(255,255,255,0.06)",
        "depth-3":
          "0 16px 40px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.08)",
        "depth-4":
          "0 24px 64px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.10)",
        focus: "0 0 0 2px rgba(250,250,250,0.5)",
        "focus-inset": "inset 0 0 0 1px rgba(250,250,250,0.9)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.32, 0.72, 0, 1)",
        snappy: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        80: "80ms",
        120: "120ms",
        160: "160ms",
        200: "200ms",
        240: "240ms",
      },
    },
  },
  plugins: [],
} satisfies Config;

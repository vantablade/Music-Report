/**
 * "musical" design tokens — yellow/white redesign.
 * Single source of truth for colors, fonts, radii and spacing (see
 * design_handoff_musical_redesign/README.md).
 */

export const colors = {
  /** Screen background */
  bg: "#FEFDF7",
  /** Card / input surface */
  surface: "#FFFFFF",
  /** Hairline border */
  border: "#EDEBDF",
  /** Accent — buttons, FAB, cursor */
  accent: "#FFD60A",
  /** Text/icon on accent */
  onAccent: "#171712",
  /** Primary text */
  text: "#171712",
  /** Muted text */
  muted: "#77766B",
  /** Accent text/links on white */
  link: "#8A7500",
  /** Accent tint — icon chips */
  accentTint: "#FFF7CC",
  /** Dark surface — scan screen, dark CTA */
  dark: "#171712",
  /** Text on dark */
  onDark: "#FEFDF7",
  /** Muted text on dark */
  mutedOnDark: "#9A9A8D",
  /** Inactive track / meter track */
  track: "#F2F0E4",
  /** Faint glyphs — chevrons, tick */
  faint: "#C9C7B8",
  /** Feedback */
  correct: "#1FA55C",
  near: "#77766B",
  wrong: "#D9503F",
  /** Destructive text (sign out) */
  danger: "#B4462F",
} as const;

/** Hanken Grotesk families (loaded in app/_layout.tsx). */
export const font = {
  regular: "HankenGrotesk_400Regular",
  medium: "HankenGrotesk_500Medium",
  semibold: "HankenGrotesk_600SemiBold",
  bold: "HankenGrotesk_700Bold",
  extrabold: "HankenGrotesk_800ExtraBold",
} as const;

export const radius = {
  pill: 999,
  card: 16,
  row: 14,
  input: 12,
  chip: 11,
  sheet: 20,
} as const;

export const spacing = {
  screenX: 20,
  screenTop: 18,
  /** Bottom padding that clears the tab bar + FAB */
  tabClearance: 90,
  section: 20,
  rowGap: 10,
} as const;

/** FAB shadow — 0 6px 18px rgba(23,23,18,.18) */
export const fabShadow = {
  shadowColor: "#171712",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.18,
  shadowRadius: 18,
  elevation: 8,
} as const;

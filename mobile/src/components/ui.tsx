/**
 * Shared "musical" UI primitives. Presentation only — no business logic.
 */
import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

import { colors, font, radius } from "@/theme";

/* ---------------- brand ---------------- */

/** Yellow rounded square with a centered eighth-note glyph. */
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: colors.accent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.56, color: colors.onAccent }}>♪</Text>
    </View>
  );
}

/** Viewfinder motif: rounded-square outline with a centered dot. */
export function ScanGlyph({
  size = 22,
  color = colors.text,
  dotColor = colors.text,
  borderWidth = 2.5,
  dot = 8,
}: {
  size?: number;
  color?: string;
  dotColor?: string;
  borderWidth?: number;
  dot?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderWidth,
        borderColor: color,
        borderRadius: 7,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: dotColor }} />
    </View>
  );
}

/* ---------------- buttons ---------------- */

type PillVariant = "primary" | "secondary" | "dark";

export function PillButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  busy,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: PillVariant;
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        pill.base,
        variant === "primary" && pill.primary,
        variant === "secondary" && pill.secondary,
        variant === "dark" && pill.dark,
        pressed && (variant === "secondary" ? pill.secondaryPressed : pill.pressed),
        (disabled || busy) && pill.disabled,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={variant === "dark" ? colors.accent : colors.onAccent} />
      ) : (
        <Text
          style={[
            pill.label,
            variant === "secondary" && pill.labelSecondary,
            variant === "dark" && pill.labelDark,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const pill = StyleSheet.create({
  base: { paddingVertical: 15, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dark: { backgroundColor: colors.dark },
  pressed: { opacity: 0.85 },
  secondaryPressed: { borderColor: colors.accent },
  disabled: { opacity: 0.4 },
  label: { fontFamily: font.bold, fontSize: 15.5, color: colors.onAccent },
  labelSecondary: { fontFamily: font.semibold, color: colors.text },
  labelDark: { color: colors.accent },
});

/** Small white pill chip (Library actions). */
export function Chip({ label, onPress, disabled }: { label: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [chip.base, pressed && chip.pressed, disabled && { opacity: 0.4 }]}
    >
      <Text style={chip.label}>{label}</Text>
    </Pressable>
  );
}

const chip = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  pressed: { borderColor: colors.accent },
  label: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
});

/* ---------------- surfaces ---------------- */

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[card.base, style]}>{children}</View>;
}

const card = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 18,
  },
});

/** Score list row — used by Home "Recent" (compact) and Library. */
export function ScoreRow({
  title,
  meta,
  onPress,
  compact,
}: {
  title: string;
  meta: string;
  onPress?: () => void;
  compact?: boolean;
}) {
  const chipSize = compact ? 34 : 38;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [row.base, compact && row.compact, pressed && row.pressed]}>
      <View
        style={[
          row.chip,
          { width: chipSize, height: chipSize, borderRadius: compact ? 10 : radius.chip },
        ]}
      >
        <Text style={{ fontSize: compact ? 15 : 16, color: colors.link }}>♪</Text>
      </View>
      <View style={row.textWrap}>
        <Text numberOfLines={1} style={[row.title, compact && row.titleCompact]}>
          {title}
        </Text>
        <Text numberOfLines={1} style={row.meta}>
          {meta}
        </Text>
      </View>
      <Text style={row.chevron}>›</Text>
    </Pressable>
  );
}

const row = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.row,
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  compact: { paddingVertical: 14 },
  pressed: { borderColor: colors.accent },
  chip: { backgroundColor: colors.accentTint, alignItems: "center", justifyContent: "center" },
  textWrap: { flex: 1, minWidth: 0 },
  title: { fontFamily: font.semibold, fontSize: 15.5, color: colors.text },
  titleCompact: { fontSize: 15 },
  meta: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 1 },
  chevron: { fontSize: 16, color: colors.faint },
});

/* ---------------- accuracy ring ---------------- */

export function AccuracyRing({ pct, size = 52 }: { pct: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const dash = (clamped / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontFamily: font.bold, fontSize: 12, color: colors.text }}>{Math.round(clamped)}%</Text>
    </View>
  );
}

/* ---------------- stack header ---------------- */

/** Lightweight custom header for stack screens (back text + centered title). */
export function StackHeader({
  backLabel,
  title,
  onBack,
  dark,
}: {
  backLabel: string;
  title: string;
  onBack: () => void;
  dark?: boolean;
}) {
  return (
    <View style={[header.base, dark ? header.dark : header.light]}>
      <Pressable onPress={onBack} hitSlop={8} style={header.backBtn}>
        <Text style={[header.back, dark && { color: colors.accent }]}>‹ {backLabel}</Text>
      </Pressable>
      <Text numberOfLines={1} style={[header.title, dark && { color: colors.onDark }]}>
        {title}
      </Text>
      {/* Spacer keeps the title optically centered against the back button. */}
      <View style={header.spacer} />
    </View>
  );
}

const header = StyleSheet.create({
  base: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16 },
  light: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg },
  dark: { backgroundColor: colors.dark },
  backBtn: { paddingVertical: 4, paddingRight: 4 },
  back: { fontFamily: font.semibold, fontSize: 15, color: colors.link },
  title: { flex: 1, textAlign: "center", fontFamily: font.bold, fontSize: 15, color: colors.text },
  spacer: { width: 52 },
});

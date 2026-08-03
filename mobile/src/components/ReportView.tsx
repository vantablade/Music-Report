/**
 * Renders a performance feedback report: overall score, pitch/rhythm/dynamics, and the notes
 * to work on. Presentation only.
 */
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { AnalysisReport } from "@/api/analyze";
import { midiToName } from "@/audio/pitch";
import { AccuracyRing } from "@/components/ui";
import { colors, font, radius, spacing } from "@/theme";

const pct = (x: number) => `${Math.round(x * 100)}%`;

function verdictLabel(overall: number): string {
  if (overall >= 90) return "Excellent";
  if (overall >= 75) return "Great";
  if (overall >= 55) return "Good — keep at it";
  return "Keep practicing";
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export function ReportView({ report }: { report: AnalysisReport }) {
  const { pitch, rhythm, dynamics } = report;
  const problems = report.notes.filter((n) => n.pitch === "wrong" || n.pitch === "missed");
  const shown = problems.slice(0, 24);

  const dynValue = dynamics.graded && dynamics.score != null ? pct(dynamics.score) : "—";
  const dynSub = dynamics.graded
    ? "vs. score"
    : dynamics.accents.length
      ? `${dynamics.accents.length} accent${dynamics.accents.length > 1 ? "s" : ""}`
      : "profile only";

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <AccuracyRing pct={report.overall} size={96} />
        <Text style={styles.verdict}>{verdictLabel(report.overall)}</Text>
      </View>

      <View style={styles.statsRow}>
        <Stat
          label="Pitch"
          value={pct(pitch.accuracy)}
          sub={`${pitch.correct} right · ${pitch.wrong} off · ${pitch.missed} missed`}
        />
        <Stat
          label="Rhythm"
          value={rhythm.graded ? pct(rhythm.accuracy) : "—"}
          sub={rhythm.tempo_bpm ? `~${rhythm.tempo_bpm} bpm` : "not graded"}
        />
        <Stat label="Dynamics" value={dynValue} sub={dynSub} />
      </View>

      {pitch.extra > 0 ? (
        <Text style={styles.extraNote}>
          {pitch.extra} extra note{pitch.extra > 1 ? "s" : ""} played that aren&apos;t in the score.
        </Text>
      ) : null}

      <Text style={styles.sectionTitle}>
        {problems.length === 0 ? "No mistakes — nice!" : "Notes to work on"}
      </Text>

      {shown.map((n) => (
        <View key={n.index} style={styles.row}>
          <View style={[styles.dot, n.pitch === "missed" ? styles.dotMissed : styles.dotWrong]} />
          <Text style={styles.rowNote}>{midiToName(n.expected_midi)}</Text>
          <Text style={styles.rowDetail}>
            {n.pitch === "missed"
              ? "missed"
              : `played ${n.played_midi != null ? midiToName(n.played_midi) : "?"}`}
            {n.timing === "late" ? " · late" : n.timing === "early" ? " · early" : ""}
          </Text>
        </View>
      ))}
      {problems.length > shown.length ? (
        <Text style={styles.more}>+{problems.length - shown.length} more</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.screenX, paddingBottom: 24, gap: 16 },
  hero: { alignItems: "center", gap: 8, paddingVertical: 8 },
  verdict: { fontFamily: font.bold, fontSize: 18, color: colors.text },
  statsRow: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  statValue: { fontFamily: font.extrabold, fontSize: 20, color: colors.text },
  statLabel: { fontFamily: font.semibold, fontSize: 12.5, color: colors.text, marginTop: 2 },
  statSub: { fontFamily: font.regular, fontSize: 10.5, color: colors.muted, marginTop: 3, textAlign: "center" },
  extraNote: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted },
  sectionTitle: { fontFamily: font.bold, fontSize: 15, color: colors.text, marginTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.row,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotWrong: { backgroundColor: colors.wrong },
  dotMissed: { backgroundColor: colors.faint },
  rowNote: { fontFamily: font.bold, fontSize: 14.5, color: colors.text, width: 44 },
  rowDetail: { fontFamily: font.regular, fontSize: 13, color: colors.muted, flex: 1 },
  more: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, textAlign: "center", marginTop: 2 },
});

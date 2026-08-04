import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AccuracyRing, Card, LogoMark, PillButton, ScanGlyph, ScoreRow } from "@/components/ui";
import { getLastPractice } from "@/library/practiceHistory";
import {
  importMusicXML,
  listScores,
  loadSampleScore,
  type LibraryScore,
} from "@/library/repository";
import { colors, font, radius, spacing } from "@/theme";

export default function HomeScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const scores = useQuery<LibraryScore[]>({ queryKey: ["library"], queryFn: listScores });
  const last = useQuery({ queryKey: ["last-practice"], queryFn: getLastPractice });

  const { refetch: refetchScores } = scores;
  const { refetch: refetchLast } = last;
  useFocusEffect(
    useCallback(() => {
      void refetchScores();
      void refetchLast();
    }, [refetchScores, refetchLast]),
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["library"] });
  };

  const sample = useMutation({
    mutationFn: loadSampleScore,
    onSuccess: invalidate,
    onError: (e) => Alert.alert("Couldn't load sample", (e as Error).message),
  });
  const importer = useMutation({
    mutationFn: importMusicXML,
    onSuccess: invalidate,
    onError: (e) => Alert.alert("Import failed", (e as Error).message),
  });
  const busy = sample.isPending || importer.isPending;

  // Only show "Continue practicing" if we have a last session AND that score still exists.
  const allScores: LibraryScore[] = scores.data ?? [];
  const lastEntry = last.data ?? null;
  const stillExists = !!lastEntry && allScores.some((s) => s.id === lastEntry.scoreId);
  const showContinue = !!lastEntry && stillExists;

  const recent: LibraryScore[] = allScores.slice(0, 2);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Brand header */}
        <View style={styles.brandRow}>
          <LogoMark size={26} />
          <Text style={styles.wordmark}>musical</Text>
        </View>

        {/* Greeting */}
        <Text style={styles.greeting}>Welcome back.{"\n"}Ready to play?</Text>

        {/* Continue practicing */}
        {showContinue && lastEntry && (
          <Card style={styles.continueCard}>
            <Text style={styles.microLabel}>CONTINUE PRACTICING</Text>
            <View style={styles.continueRow}>
              <View style={styles.continueText}>
                <Text numberOfLines={1} style={styles.continueTitle}>
                  {lastEntry.title}
                </Text>
                <Text style={styles.continueMeta}>
                  Last session · {Math.round(lastEntry.accuracy)}% accuracy
                </Text>
              </View>
              <AccuracyRing pct={lastEntry.accuracy} size={52} />
            </View>
            <PillButton
              label="Practice"
              style={styles.continueCta}
              onPress={() => router.push(`/practice/${lastEntry.scoreId}`)}
            />
          </Card>
        )}

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <QuickAction label="Scan" onPress={() => router.push("/scan")}>
            <ScanGlyph size={22} borderWidth={2} dot={7} dotColor={colors.accent} />
          </QuickAction>
          <QuickAction label="Import" disabled={busy} onPress={() => importer.mutate()}>
            <Text style={styles.quickGlyph}>↓</Text>
          </QuickAction>
          <QuickAction label="Sample" disabled={busy} onPress={() => sample.mutate()}>
            <Text style={[styles.quickGlyph, { fontSize: 15 }]}>♫</Text>
          </QuickAction>
          <QuickAction label="Metronome" onPress={() => router.push("/metronome")}>
            <Text style={[styles.quickGlyph, { fontSize: 18 }]}>▚</Text>
          </QuickAction>
        </View>

        {/* Recent */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent</Text>
            <Pressable onPress={() => router.push("/library")} hitSlop={8}>
              <Text style={styles.link}>See library</Text>
            </Pressable>
          </View>

          {recent.length === 0 ? (
            <Text style={styles.emptyHint}>
              No scores yet — scan one, import a MusicXML file, or load the sample.
            </Text>
          ) : (
            recent.map((s) => (
              <ScoreRow
                key={s.id}
                compact
                title={s.title ?? "Untitled score"}
                meta={`${s.tempo_bpm ? `${s.tempo_bpm} bpm · ` : ""}${new Date(s.created_at).toLocaleDateString()}`}
                onPress={() => router.push(`/score/${s.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({
  label,
  children,
  onPress,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.quickCard,
        pressed && { borderColor: colors.accent },
        disabled && { opacity: 0.4 },
      ]}
    >
      <View style={styles.quickIcon}>{children}</View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: spacing.screenX,
    paddingTop: spacing.screenTop,
    paddingBottom: spacing.tabClearance,
    gap: spacing.section,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 },
  wordmark: { fontFamily: font.extrabold, fontSize: 19, letterSpacing: -0.4, color: colors.text },
  greeting: {
    fontFamily: font.extrabold,
    fontSize: 26,
    letterSpacing: -0.8,
    color: colors.text,
    lineHeight: 30,
  },
  // continue card
  continueCard: { gap: 12 },
  microLabel: {
    fontFamily: font.bold,
    fontSize: 11,
    letterSpacing: 0.9,
    color: colors.muted,
  },
  continueRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  continueText: { flex: 1, minWidth: 0 },
  continueTitle: { fontFamily: font.bold, fontSize: 17, color: colors.text },
  continueMeta: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  continueCta: { paddingVertical: 13 },
  // quick actions
  quickRow: { flexDirection: "row", gap: 10 },
  quickCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.row,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 7,
  },
  quickIcon: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
  quickGlyph: { fontSize: 17, color: colors.text },
  quickLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  // recent
  recentSection: { gap: spacing.rowGap },
  recentHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  recentTitle: { fontFamily: font.bold, fontSize: 15, color: colors.text },
  link: { fontFamily: font.medium, fontSize: 13, color: colors.link },
  emptyHint: { fontFamily: font.regular, fontSize: 13.5, color: colors.muted, lineHeight: 20 },
});

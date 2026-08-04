import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScorePlayer } from "@/components/ScorePlayer";
import { PillButton, StackHeader } from "@/components/ui";
import { getInstrumentId, setInstrumentId } from "@/library/instrument";
import { getScore, readMusicXML } from "@/library/repository";
import { getInstrument, INSTRUMENTS } from "@/music/instruments";
import { colors, font, radius, spacing } from "@/theme";

export default function ScoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);

  const query = useQuery({
    queryKey: ["score-file", id],
    queryFn: async () => {
      const score = await getScore(id);
      if (!score) throw new Error("Score not found in library");
      const musicxml = await readMusicXML(score);
      return { score, musicxml };
    },
  });

  const instrumentQ = useQuery({ queryKey: ["instrument", id], queryFn: () => getInstrumentId(id) });
  const instrument = getInstrument(instrumentQ.data);

  const title = query.data?.score.title ?? "Score";

  async function choose(instrumentId: string) {
    await setInstrumentId(id, instrumentId);
    setPickerOpen(false);
    qc.invalidateQueries({ queryKey: ["instrument", id] });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StackHeader backLabel="Library" title={title} onBack={() => router.back()} />

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : query.isError || !query.data ? (
        <View style={styles.center}>
          <Text style={styles.error}>
            {(query.error as Error)?.message ?? "Could not open score"}
          </Text>
        </View>
      ) : (
        <>
          <ScorePlayer musicxml={query.data.musicxml} timbre={instrument.timbre} />
          <View style={styles.ctaWrap}>
            <Pressable style={styles.instRow} onPress={() => setPickerOpen(true)}>
              <Text style={styles.instLabel}>Instrument</Text>
              <Text numberOfLines={1} style={styles.instValue}>
                {instrument.label}
              </Text>
              <Text style={styles.chevron}>▾</Text>
            </Pressable>
            <PillButton
              label="Record & get feedback"
              variant="dark"
              onPress={() => router.push(`/record/${id}`)}
            />
          </View>
        </>
      )}

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Instrument</Text>
          <Text style={styles.sheetHint}>
            Sets the playback sound, and corrects feedback for transposing instruments.
          </Text>
          <ScrollView style={styles.optList}>
            {INSTRUMENTS.map((i) => {
              const selected = i.id === instrument.id;
              return (
                <Pressable
                  key={i.id}
                  onPress={() => choose(i.id)}
                  style={({ pressed }) => [styles.optRow, pressed && { backgroundColor: colors.accentTint }]}
                >
                  <Text style={[styles.optLabel, selected && styles.optLabelSel]}>{i.label}</Text>
                  {selected ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  error: { fontFamily: font.regular, fontSize: 15, color: colors.wrong, padding: 24, textAlign: "center" },
  ctaWrap: { paddingHorizontal: spacing.screenX, paddingBottom: 18, backgroundColor: colors.bg, gap: 10 },
  instRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.row,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  instLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.muted },
  instValue: { flex: 1, textAlign: "right", fontFamily: font.semibold, fontSize: 14.5, color: colors.text },
  chevron: { fontSize: 14, color: colors.faint },
  // picker modal
  backdrop: { flex: 1, backgroundColor: "rgba(23,23,18,0.35)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.screenX,
    paddingTop: 18,
    paddingBottom: 28,
  },
  sheetTitle: { fontFamily: font.bold, fontSize: 17, color: colors.text },
  sheetHint: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 8, lineHeight: 19 },
  optList: { maxHeight: 360 },
  optRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optLabel: { fontFamily: font.regular, fontSize: 15.5, color: colors.text },
  optLabelSel: { fontFamily: font.bold, color: colors.link },
  check: { fontFamily: font.bold, fontSize: 16, color: colors.link },
});

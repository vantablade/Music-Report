import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Chip, ScoreRow } from "@/components/ui";
import { importMusicXML, listScores, loadSampleScore, type LibraryScore } from "@/library/repository";
import { colors, font, spacing } from "@/theme";

export default function LibraryScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const scores = useQuery({ queryKey: ["library"], queryFn: listScores });
  const { refetch } = scores;

  useFocusEffect(useCallback(() => void refetch(), [refetch]));

  const invalidate = () => qc.invalidateQueries({ queryKey: ["library"] });
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

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>Library</Text>
      <View style={styles.chips}>
        <Chip label="Load sample" disabled={busy} onPress={() => sample.mutate()} />
        <Chip label="Import MusicXML" disabled={busy} onPress={() => importer.mutate()} />
      </View>
      {busy && <ActivityIndicator color={colors.accent} style={{ marginTop: 4 }} />}
    </View>
  );

  const isEmpty = scores.data && scores.data.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={scores.data ?? []}
        keyExtractor={(s: LibraryScore) => s.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.rowGap }} />}
        ListEmptyComponent={
          isEmpty ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No scores yet</Text>
              <Text style={styles.emptyBody}>
                Load the sample to see it render and play, import a MusicXML file, or scan sheet music.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ScoreRow
            title={item.title ?? "Untitled score"}
            meta={`${item.tempo_bpm ? `${item.tempo_bpm} bpm · ` : ""}${new Date(item.created_at).toLocaleDateString()}`}
            onPress={() => router.push(`/score/${item.id}`)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: spacing.screenX,
    paddingTop: spacing.screenTop,
    paddingBottom: spacing.tabClearance,
  },
  header: { gap: 16, paddingBottom: 16 },
  title: { fontFamily: font.extrabold, fontSize: 28, letterSpacing: -0.85, color: colors.text, paddingTop: 4 },
  chips: { flexDirection: "row", gap: 8 },
  empty: { gap: 8, paddingTop: 8 },
  emptyTitle: { fontFamily: font.bold, fontSize: 20, color: colors.text },
  emptyBody: { fontFamily: font.regular, fontSize: 14, color: colors.muted, lineHeight: 20 },
});

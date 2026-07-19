import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { importMusicXML, listScores, loadSampleScore, type LibraryScore } from "@/library/repository";

export default function LibraryScreen() {
  const qc = useQueryClient();
  const scores = useQuery({ queryKey: ["library"], queryFn: listScores });
  const { refetch } = scores;

  // Refresh when returning from a scan / detail.
  useFocusEffect(useCallback(() => void refetch(), [refetch]));

  const sample = useMutation({
    mutationFn: loadSampleScore,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library"] }),
    onError: (e) => Alert.alert("Couldn't load sample", (e as Error).message),
  });

  const importer = useMutation({
    mutationFn: importMusicXML,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library"] }),
    onError: (e) => Alert.alert("Import failed", (e as Error).message),
  });

  const busy = sample.isPending || importer.isPending;

  const actions = (
    <View style={styles.actions}>
      <Pressable style={styles.action} disabled={busy} onPress={() => sample.mutate()}>
        <Text style={styles.actionText}>Load sample</Text>
      </Pressable>
      <Pressable style={styles.action} disabled={busy} onPress={() => importer.mutate()}>
        <Text style={styles.actionText}>Import MusicXML</Text>
      </Pressable>
      <Link href="/scan" asChild>
        <Pressable style={[styles.action, styles.actionPrimary]} disabled={busy}>
          <Text style={styles.actionPrimaryText}>Scan</Text>
        </Pressable>
      </Link>
    </View>
  );

  if (scores.data && scores.data.length === 0) {
    return (
      <SafeAreaView style={styles.empty}>
        <Text style={styles.emptyTitle}>No scores yet</Text>
        <Text style={styles.emptyBody}>
          Load the sample to see it render and play, import a MusicXML file, or scan sheet music.
        </Text>
        {busy && <ActivityIndicator color="#7aa2ff" />}
        {actions}
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {actions}
      {busy && <ActivityIndicator color="#7aa2ff" style={{ marginVertical: 8 }} />}
      <FlatList
        data={scores.data ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <ScoreRow score={item} />}
      />
    </View>
  );
}

function ScoreRow({ score }: { score: LibraryScore }) {
  return (
    <Link href={`/score/${score.id}`} asChild>
      <Pressable style={styles.row}>
        <Text style={styles.rowTitle}>{score.title ?? "Untitled score"}</Text>
        <Text style={styles.rowMeta}>
          {score.tempo_bpm ? `${score.tempo_bpm} bpm · ` : ""}
          {new Date(score.created_at).toLocaleDateString()}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1115" },
  actions: { flexDirection: "row", gap: 8, padding: 16, paddingBottom: 8, flexWrap: "wrap" },
  action: {
    backgroundColor: "#1a1e26",
    borderWidth: 1,
    borderColor: "#2a3140",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  actionText: { color: "#f5f7fa", fontSize: 14, fontWeight: "600" },
  actionPrimary: { backgroundColor: "#7aa2ff", borderColor: "#7aa2ff" },
  actionPrimaryText: { color: "#0f1115", fontSize: 14, fontWeight: "700" },
  list: { padding: 16, paddingTop: 4, gap: 10 },
  row: {
    backgroundColor: "#1a1e26",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2a3140",
  },
  rowTitle: { color: "#f5f7fa", fontSize: 16, fontWeight: "600" },
  rowMeta: { color: "#8a93a3", fontSize: 13, marginTop: 4 },
  empty: { flex: 1, backgroundColor: "#0f1115", alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  emptyTitle: { color: "#f5f7fa", fontSize: 20, fontWeight: "700" },
  emptyBody: { color: "#8a93a3", fontSize: 14, textAlign: "center", lineHeight: 20 },
});

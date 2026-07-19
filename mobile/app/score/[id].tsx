import { useQuery } from "@tanstack/react-query";
import { Link, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { ScorePlayer } from "@/components/ScorePlayer";
import { getScore, readMusicXML } from "@/library/repository";

export default function ScoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const query = useQuery({
    queryKey: ["score-file", id],
    queryFn: async () => {
      const score = await getScore(id);
      if (!score) throw new Error("Score not found in library");
      const musicxml = await readMusicXML(score);
      return { score, musicxml };
    },
  });

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7aa2ff" />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{(query.error as Error)?.message ?? "Could not open score"}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScorePlayer musicxml={query.data.musicxml} />
      <Link href={`/practice/${id}`} asChild>
        <Pressable style={styles.practice}>
          <Text style={styles.practiceText}>Practice with feedback</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1115" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f1115" },
  error: { color: "#ff6b81", fontSize: 15, padding: 24, textAlign: "center" },
  practice: { backgroundColor: "#7aa2ff", margin: 16, paddingVertical: 15, borderRadius: 12, alignItems: "center" },
  practiceText: { color: "#0f1115", fontSize: 16, fontWeight: "700" },
});

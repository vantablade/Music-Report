import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PillButton, StackHeader } from "@/components/ui";
import { ScorePlayer } from "@/components/ScorePlayer";
import { getScore, readMusicXML } from "@/library/repository";
import { colors, font, spacing } from "@/theme";

export default function ScoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const query = useQuery({
    queryKey: ["score-file", id],
    queryFn: async () => {
      const score = await getScore(id);
      if (!score) throw new Error("Score not found in library");
      const musicxml = await readMusicXML(score);
      return { score, musicxml };
    },
  });

  const title = query.data?.score.title ?? "Score";

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
          <ScorePlayer musicxml={query.data.musicxml} />
          <View style={styles.ctaWrap}>
            <PillButton
              label="Record & get feedback"
              variant="dark"
              onPress={() => router.push(`/record/${id}`)}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  error: { fontFamily: font.regular, fontSize: 15, color: colors.wrong, padding: 24, textAlign: "center" },
  ctaWrap: { paddingHorizontal: spacing.screenX, paddingBottom: 18, backgroundColor: colors.bg },
});

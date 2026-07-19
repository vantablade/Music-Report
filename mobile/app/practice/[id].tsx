import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScorePlayer } from "@/components/ScorePlayer";
import { getScore, readMusicXML } from "@/library/repository";
import { parseMusicXML } from "@/music/parseMusicXML";
import { midiToName } from "@/audio/pitch";
import type { SessionSummary } from "@/practice/scoreFollower";
import { usePracticeSession } from "@/practice/usePracticeSession";

export default function PracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const query = useQuery({
    queryKey: ["score-file", id],
    queryFn: async () => {
      const score = await getScore(id);
      if (!score) throw new Error("Score not found in library");
      return { score, musicxml: await readMusicXML(score) };
    },
  });

  const timeline = useMemo(
    () => (query.data ? parseMusicXML(query.data.musicxml) : null),
    [query.data],
  );

  const session = usePracticeSession(timeline);

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
      <View style={styles.score}>
        <ScorePlayer
          musicxml={query.data.musicxml}
          mode="follow"
          cursorIndex={session.currentIndex}
          feedbackStatus={session.status}
        />
      </View>

      <SafeAreaView edges={["bottom"]} style={styles.panel}>
        {session.phase === "countin" ? (
          <Text style={styles.countdown}>{session.countdown === 0 ? "Go!" : session.countdown}</Text>
        ) : session.phase === "done" && session.summary ? (
          <Summary summary={session.summary} onAgain={session.start} />
        ) : (
          <TuningMeter session={session} />
        )}

        {session.error && <Text style={styles.error}>{session.error}</Text>}

        {session.phase !== "done" && (
          <Pressable
            style={[styles.btn, session.phase === "running" ? styles.stop : styles.start]}
            onPress={session.phase === "running" ? session.stop : session.start}
          >
            <Text style={styles.btnText}>
              {session.phase === "running" ? "Stop" : session.phase === "countin" ? "Cancel" : "Start practice"}
            </Text>
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}

function TuningMeter({ session }: { session: ReturnType<typeof usePracticeSession> }) {
  const r = session.live;
  const cents = r?.cents ?? 0;
  // Map -50..+50 cents to 0..100% for the needle.
  const pct = Math.max(0, Math.min(100, 50 + cents));
  const color =
    session.status === "correct" ? "#5fd08a" : session.status === "wrong" ? "#ff6b81" : "#ffcf5f";

  return (
    <View style={styles.meterWrap}>
      <Text style={styles.noteName}>{r?.stableMidi != null ? midiToName(r.stableMidi) : r ? "…" : "—"}</Text>
      <View style={styles.meterTrack}>
        <View style={styles.meterCenter} />
        {r && <View style={[styles.meterNeedle, { left: `${pct}%`, backgroundColor: color }]} />}
      </View>
      <Text style={styles.centsText}>{r ? `${cents > 0 ? "+" : ""}${cents}¢` : "listening…"}</Text>
    </View>
  );
}

function Summary({ summary, onAgain }: { summary: SessionSummary; onAgain: () => void }) {
  return (
    <View style={styles.summary}>
      <Text style={styles.accuracy}>{summary.pitchAccuracy}%</Text>
      <Text style={styles.summarySub}>
        {summary.correct}/{summary.total} notes correct · avg {summary.meanCentsError}¢ off
      </Text>
      <Text style={styles.breakdown}>
        wrong {summary.counts.wrong} · missed {summary.counts.missed} · sharp {summary.counts.sharp} · flat{" "}
        {summary.counts.flat}
      </Text>
      <Pressable style={[styles.btn, styles.start]} onPress={onAgain}>
        <Text style={styles.btnText}>Practice again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1115" },
  score: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f1115" },
  panel: { padding: 16, gap: 14, borderTopWidth: 1, borderTopColor: "#2a3140" },
  error: { color: "#ff6b81", fontSize: 14, textAlign: "center" },
  btn: { paddingVertical: 15, borderRadius: 12, alignItems: "center" },
  start: { backgroundColor: "#7aa2ff" },
  stop: { backgroundColor: "#5a2731" },
  btnText: { color: "#f5f7fa", fontSize: 16, fontWeight: "700" },
  countdown: { color: "#7aa2ff", fontSize: 56, fontWeight: "800", textAlign: "center" },
  // tuning meter
  meterWrap: { alignItems: "center", gap: 8 },
  noteName: { color: "#f5f7fa", fontSize: 34, fontWeight: "800" },
  meterTrack: { width: "100%", height: 10, backgroundColor: "#1a1e26", borderRadius: 5, justifyContent: "center" },
  meterCenter: { position: "absolute", left: "50%", width: 2, height: 18, backgroundColor: "#5f6a7d", top: -4 },
  meterNeedle: { position: "absolute", width: 6, height: 18, borderRadius: 3, top: -4, marginLeft: -3 },
  centsText: { color: "#8a93a3", fontSize: 14 },
  // summary
  summary: { alignItems: "center", gap: 6 },
  accuracy: { color: "#5fd08a", fontSize: 48, fontWeight: "800" },
  summarySub: { color: "#f5f7fa", fontSize: 15 },
  breakdown: { color: "#8a93a3", fontSize: 13, marginBottom: 6 },
});

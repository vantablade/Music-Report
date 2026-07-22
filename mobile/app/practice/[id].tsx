import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { midiToName } from "@/audio/pitch";
import { PillButton, StackHeader } from "@/components/ui";
import { ScorePlayer } from "@/components/ScorePlayer";
import { saveLastPractice } from "@/library/practiceHistory";
import { getScore, readMusicXML } from "@/library/repository";
import { parseMusicXML } from "@/music/parseMusicXML";
import type { SessionSummary } from "@/practice/scoreFollower";
import { usePracticeSession } from "@/practice/usePracticeSession";
import { colors, font, radius, spacing } from "@/theme";

export default function PracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

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
  const title = query.data?.score.title ?? "Score";

  // Record the finished session so Home can offer "Continue practicing".
  const recorded = useRef(false);
  useEffect(() => {
    if (session.phase !== "done" || !session.summary || recorded.current) return;
    recorded.current = true;
    void saveLastPractice({
      scoreId: id,
      title,
      accuracy: session.summary.pitchAccuracy,
      at: new Date().toISOString(),
    });
  }, [session.phase, session.summary, id, title]);
  useEffect(() => {
    if (session.phase === "running") recorded.current = false;
  }, [session.phase]);

  const statusColor =
    session.status === "correct"
      ? colors.correct
      : session.status === "wrong"
        ? colors.wrong
        : colors.near;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StackHeader backLabel="Score" title="Practice" onBack={() => router.back()} />

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
          <View style={styles.scoreArea}>
            <ScorePlayer
              musicxml={query.data.musicxml}
              mode="follow"
              cursorIndex={session.currentIndex}
              feedbackStatus={session.status}
            />
          </View>

          <View style={styles.panel}>
            {session.phase === "countin" ? (
              <CountIn value={session.countdown} />
            ) : session.phase === "done" && session.summary ? (
              <Summary summary={session.summary} onAgain={session.start} />
            ) : (
              <TuningMeter
                note={session.live?.stableMidi != null ? midiToName(session.live.stableMidi) : session.live ? "…" : "—"}
                cents={session.live?.cents ?? null}
                statusColor={statusColor}
              />
            )}

            {session.error && <Text style={styles.error}>{session.error}</Text>}

            {session.phase !== "done" && (
              <PillButton
                label={
                  session.phase === "running"
                    ? "Stop"
                    : session.phase === "countin"
                      ? "Cancel"
                      : "Start practice"
                }
                variant={
                  session.phase === "running" ? "dark" : session.phase === "countin" ? "secondary" : "primary"
                }
                onPress={session.phase === "idle" ? session.start : session.stop}
              />
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function TuningMeter({
  note,
  cents,
  statusColor,
}: {
  note: string;
  cents: number | null;
  statusColor: string;
}) {
  // Map -50..+50 cents onto 0..100% of the track.
  const pct = Math.max(0, Math.min(100, 50 + (cents ?? 0)));
  return (
    <View style={styles.meterWrap}>
      <Text style={styles.noteName}>{note}</Text>
      <View style={styles.track}>
        <View style={styles.centerTick} />
        {cents != null && (
          <View style={[styles.needle, { left: `${pct}%`, backgroundColor: statusColor }]} />
        )}
      </View>
      <Text style={styles.cents}>
        {cents != null ? `${cents > 0 ? "+" : ""}${cents}¢` : "listening…"}
      </Text>
    </View>
  );
}

function CountIn({ value }: { value: number }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.45, duration: 350, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.Text style={[styles.countIn, { opacity }]}>
      {value === 0 ? "Go!" : value}
    </Animated.Text>
  );
}

function Summary({ summary, onAgain }: { summary: SessionSummary; onAgain: () => void }) {
  return (
    <View style={styles.summaryWrap}>
      <Text style={styles.accuracy}>{summary.pitchAccuracy}%</Text>
      <Text style={styles.summaryLine}>
        {summary.correct}/{summary.total} notes correct · avg {summary.meanCentsError}¢ off
      </Text>
      <Text style={styles.breakdown}>
        wrong {summary.counts.wrong} · sharp {summary.counts.sharp} · flat {summary.counts.flat}
      </Text>
      <PillButton label="Practice again" onPress={onAgain} style={styles.againBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { fontFamily: font.regular, fontSize: 14, color: colors.wrong, textAlign: "center" },
  scoreArea: { flex: 1, backgroundColor: colors.surface },
  panel: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.screenX,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 14,
  },
  // meter
  meterWrap: { alignItems: "center", gap: 9 },
  noteName: { fontFamily: font.extrabold, fontSize: 34, color: colors.text },
  track: { width: "100%", height: 8, backgroundColor: colors.track, borderRadius: 4 },
  centerTick: {
    position: "absolute",
    left: "50%",
    width: 2,
    height: 16,
    top: -4,
    backgroundColor: colors.faint,
  },
  needle: { position: "absolute", width: 6, height: 16, borderRadius: 3, top: -4, marginLeft: -3 },
  cents: { fontFamily: font.regular, fontSize: 13.5, color: colors.muted },
  // count-in
  countIn: { textAlign: "center", fontFamily: font.extrabold, fontSize: 52, color: colors.text },
  // summary
  summaryWrap: { alignItems: "center", gap: 6 },
  accuracy: { fontFamily: font.extrabold, fontSize: 46, color: colors.correct },
  summaryLine: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  breakdown: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginBottom: 8 },
  againBtn: { alignSelf: "stretch", borderRadius: radius.pill },
});

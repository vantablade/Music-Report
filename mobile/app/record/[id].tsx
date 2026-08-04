import { useQuery } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAnalysis } from "@/analyze/useAnalysis";
import { useMetronome } from "@/audio/useMetronome";
import { useRecorder } from "@/audio/useRecorder";
import { ReportView } from "@/components/ReportView";
import { PillButton, StackHeader } from "@/components/ui";
import { saveLastPractice } from "@/library/practiceHistory";
import { getScore, readMusicXML } from "@/library/repository";
import { parseMusicXML } from "@/music/parseMusicXML";
import { readBeatsPerBar } from "@/music/timeSignature";
import { colors, font, radius, spacing } from "@/theme";

function fmtTime(s: number): string {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

const clampTempo = (n: number) => Math.max(40, Math.min(208, n));

export default function RecordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const recorder = useRecorder();
  const analysis = useAnalysis();
  const metronome = useMetronome();
  const saved = useRef(false);
  const [countingIn, setCountingIn] = useState(false);
  const [tempo, setTempo] = useState<number | null>(null);

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

  const beatsPerBar = useMemo(
    () => (query.data ? readBeatsPerBar(query.data.musicxml) : 4),
    [query.data],
  );
  const scoreTempo = useMemo(
    () => (query.data ? Math.round(parseMusicXML(query.data.musicxml).tempoBpm) : 100),
    [query.data],
  );
  const bpm = tempo ?? scoreTempo;

  // Default the count-in tempo to the score's own tempo once it loads.
  useEffect(() => {
    if (tempo === null && query.data) setTempo(clampTempo(scoreTempo));
  }, [tempo, query.data, scoreTempo]);

  // Record the overall score for the Home "continue practicing" card.
  useEffect(() => {
    if (analysis.phase !== "ready" || !analysis.report || saved.current) return;
    saved.current = true;
    saveLastPractice({
      scoreId: id,
      title,
      accuracy: analysis.report.overall,
      at: new Date().toISOString(),
    }).catch(() => {});
  }, [analysis.phase, analysis.report, id, title]);

  async function onRecord() {
    // Count in on the time signature so the player knows when to start; the mic isn't live yet,
    // so the count-in clicks are never part of the recording.
    setCountingIn(true);
    try {
      await metronome.runCountIn(bpm, beatsPerBar);
    } finally {
      setCountingIn(false);
    }
    recorder.start();
  }

  async function onStopRecording() {
    const uri = await recorder.stop();
    if (!uri || !query.data) return;
    analysis.start({
      file: { uri, name: "performance.wav", type: "audio/wav" },
      musicxml: query.data.musicxml,
    });
  }

  async function onUpload() {
    if (!query.data) return;
    const res = await DocumentPicker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    analysis.start({
      file: { uri: a.uri, name: a.name ?? "upload", type: a.mimeType ?? "audio/*" },
      musicxml: query.data.musicxml,
    });
  }

  const header = <StackHeader backLabel="Back" title={title} onBack={() => router.back()} />;

  if (query.isLoading) {
    return (
      <Shell header={header}>
        <Center>
          <ActivityIndicator size="large" color={colors.accent} />
        </Center>
      </Shell>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Shell header={header}>
        <Center>
          <Text style={styles.error}>{(query.error as Error)?.message ?? "Could not open score"}</Text>
        </Center>
      </Shell>
    );
  }

  if (analysis.phase === "uploading" || analysis.phase === "analyzing") {
    return (
      <Shell header={header}>
        <Center>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.procTitle}>
            {analysis.phase === "uploading" ? "Uploading…" : "Analyzing your performance…"}
          </Text>
          <Text style={styles.procSub}>Comparing your playing to the score.</Text>
        </Center>
      </Shell>
    );
  }

  if (analysis.phase === "failed") {
    return (
      <Shell header={header}>
        <Center>
          <Text style={[styles.procTitle, { color: colors.wrong }]}>Analysis failed</Text>
          <Text style={styles.procSub}>{analysis.error ?? "Something went wrong."}</Text>
          <PillButton
            label="Try again"
            style={styles.wideBtn}
            onPress={() => {
              analysis.reset();
              saved.current = false;
            }}
          />
          <Pressable onPress={() => router.push("/settings")} hitSlop={8}>
            <Text style={styles.link}>Check backend settings</Text>
          </Pressable>
        </Center>
      </Shell>
    );
  }

  if (analysis.phase === "ready" && analysis.report) {
    return (
      <Shell header={header}>
        <View style={{ flex: 1 }}>
          <ReportView report={analysis.report} />
        </View>
        <View style={styles.footer}>
          <PillButton
            label="Record again"
            variant="secondary"
            style={styles.footBtn}
            onPress={() => {
              analysis.reset();
              saved.current = false;
            }}
          />
          <PillButton label="Done" style={styles.footBtn} onPress={() => router.back()} />
        </View>
      </Shell>
    );
  }

  if (countingIn) {
    return (
      <Shell header={header}>
        <Center>
          <Text style={styles.countLabel}>Get ready…</Text>
          <Text style={styles.countNum}>{metronome.beat > 0 ? metronome.beat : ""}</Text>
          <Text style={styles.hint}>Start playing on the next downbeat.</Text>
        </Center>
      </Shell>
    );
  }

  // idle: record or upload
  return (
    <Shell header={header}>
      <View style={styles.idle}>
        {recorder.recording ? (
          <>
            <Text style={styles.timer}>{fmtTime(recorder.seconds)}</Text>
            <Text style={styles.hint}>Recording… play the piece, then tap stop.</Text>
            <Pressable
              onPress={onStopRecording}
              style={({ pressed }) => [styles.stopBtn, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.stopSquare} />
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.hint}>
              Record yourself playing “{title}”, or upload a recording — you&apos;ll get pitch,
              rhythm and dynamics feedback.
            </Text>
            <View style={styles.tempoRow}>
              <Pressable onPress={() => setTempo(clampTempo(bpm - 4))} style={styles.tempoBtn} hitSlop={6}>
                <Text style={styles.tempoBtnTxt}>−</Text>
              </Pressable>
              <View style={styles.tempoMid}>
                <Text style={styles.tempoVal}>{bpm}</Text>
                <Text style={styles.tempoUnit}>BPM · {beatsPerBar}-beat count-in</Text>
              </View>
              <Pressable onPress={() => setTempo(clampTempo(bpm + 4))} style={styles.tempoBtn} hitSlop={6}>
                <Text style={styles.tempoBtnTxt}>+</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={onRecord}
              style={({ pressed }) => [styles.recBtn, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.recDot} />
            </Pressable>
            <Text style={styles.recLabel}>Tap to record</Text>
            {recorder.error ? <Text style={styles.err}>{recorder.error}</Text> : null}
            <PillButton
              label="Upload a recording"
              variant="secondary"
              style={styles.uploadBtn}
              onPress={onUpload}
            />
          </>
        )}
      </View>
    </Shell>
  );
}

function Shell({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {header}
      {children}
    </SafeAreaView>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 32 },
  error: { fontFamily: font.regular, fontSize: 15, color: colors.wrong, textAlign: "center" },
  procTitle: { fontFamily: font.bold, fontSize: 16, color: colors.text, textAlign: "center" },
  procSub: { fontFamily: font.regular, fontSize: 13.5, color: colors.muted, textAlign: "center" },
  link: { fontFamily: font.semibold, fontSize: 14, color: colors.link, marginTop: 2 },
  wideBtn: { alignSelf: "stretch", marginTop: 4 },
  // count-in
  countLabel: { fontFamily: font.semibold, fontSize: 15, color: colors.muted },
  countNum: { fontFamily: font.extrabold, fontSize: 88, lineHeight: 96, color: colors.text },
  // idle
  idle: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: spacing.screenX },
  hint: { fontFamily: font.regular, fontSize: 14.5, color: colors.muted, textAlign: "center", lineHeight: 21 },
  tempoRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 4 },
  tempoBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tempoBtnTxt: { fontFamily: font.bold, fontSize: 22, color: colors.text },
  tempoMid: { alignItems: "center", minWidth: 130 },
  tempoVal: { fontFamily: font.extrabold, fontSize: 30, color: colors.text },
  tempoUnit: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  recBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  recDot: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.wrong },
  recLabel: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  uploadBtn: { alignSelf: "stretch", marginTop: 12 },
  err: { fontFamily: font.regular, fontSize: 13, color: colors.wrong, textAlign: "center" },
  // recording
  timer: { fontFamily: font.extrabold, fontSize: 44, color: colors.text },
  stopBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.wrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  stopSquare: { width: 34, height: 34, borderRadius: 6, backgroundColor: colors.onDark },
  // report footer
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: spacing.screenX,
    paddingBottom: 14,
    paddingTop: 6,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footBtn: { flex: 1 },
});

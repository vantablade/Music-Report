/**
 * Renders a MusicXML score (OSMD in a WebView) with playback + tempo controls.
 * Parses the MusicXML once to a timeline, hands both to the WebView host, and relays
 * transport commands. Exposes onPosition so callers (Phase 3) can track the cursor.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { buildOsmdHtml } from "@/music/osmdHost";
import { parseMusicXML, type ScoreTimeline } from "@/music/parseMusicXML";

interface Props {
  musicxml: string;
  onPosition?: (index: number) => void;
  onReady?: (timeline: ScoreTimeline) => void;
  /** "play" (default) drives its own transport; "follow" renders and takes an external cursor. */
  mode?: "play" | "follow";
  /** Follow mode: cursor position to display. */
  cursorIndex?: number;
  /** Follow mode: tint the cursor by comparison result. */
  feedbackStatus?: "correct" | "wrong" | "near" | null;
}

const TEMPO_STEPS = [0.5, 0.75, 1.0];

export function ScorePlayer({
  musicxml,
  onPosition,
  onReady,
  mode = "play",
  cursorIndex,
  feedbackStatus,
}: Props) {
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [rateIdx, setRateIdx] = useState(2); // default 1.0x
  const [error, setError] = useState<string | null>(null);

  const timeline = useMemo(() => parseMusicXML(musicxml), [musicxml]);
  const html = useMemo(() => buildOsmdHtml(), []);

  const isFollow = mode === "follow";

  function send(msg: Record<string, unknown>) {
    webRef.current?.injectJavaScript(`window.SMT && window.SMT.handle(${JSON.stringify(msg)}); true;`);
  }

  function onMessage(e: WebViewMessageEvent) {
    let evt: any;
    try {
      evt = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    switch (evt.type) {
      case "boot":
        // Host script is up; load the score.
        send({ type: "load", musicxml, timeline: timeline.notes });
        break;
      case "ready":
        setReady(true);
        onReady?.(timeline);
        break;
      case "position":
        onPosition?.(evt.index);
        break;
      case "ended":
        setPlaying(false);
        break;
      case "error":
        setError(evt.message);
        break;
    }
  }

  function togglePlay() {
    if (!ready) return;
    if (playing) {
      send({ type: "pause" });
      setPlaying(false);
    } else {
      send({ type: "play" });
      setPlaying(true);
    }
  }

  function cycleTempo() {
    const next = (rateIdx + 1) % TEMPO_STEPS.length;
    setRateIdx(next);
    send({ type: "setRate", rate: TEMPO_STEPS[next] });
  }

  // Follow mode: forward the externally-controlled cursor + feedback tint to the host.
  useEffect(() => {
    if (isFollow && ready && cursorIndex != null) send({ type: "seek", index: cursorIndex });
  }, [isFollow, ready, cursorIndex]);

  useEffect(() => {
    if (isFollow && ready && feedbackStatus) send({ type: "feedback", status: feedbackStatus });
  }, [isFollow, ready, feedbackStatus]);

  return (
    <View style={styles.container}>
      <View style={styles.webWrap}>
        <WebView
          ref={webRef}
          originWhitelist={["*"]}
          source={{ html }}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          // Allow the CDN OSMD script + WebAudio.
          mixedContentMode="always"
          mediaPlaybackRequiresUserAction={false}
        />
        {!ready && !error && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#7aa2ff" />
            <Text style={styles.loadingText}>Rendering score…</Text>
          </View>
        )}
        {error && (
          <View style={styles.loading}>
            <Text style={styles.error}>{error}</Text>
          </View>
        )}
      </View>

      {!isFollow && (
        <View style={styles.controls}>
          <Pressable style={[styles.btn, !ready && styles.btnDisabled]} onPress={togglePlay}>
            <Text style={styles.btnText}>{playing ? "Pause" : "Play"}</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnSecondary]} onPress={cycleTempo}>
            <Text style={styles.btnTextSecondary}>{TEMPO_STEPS[rateIdx]}×</Text>
          </Pressable>
          <Text style={styles.meta}>{timeline.notes.length} notes · {timeline.tempoBpm} bpm</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webWrap: { flex: 1, backgroundColor: "#ffffff" },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#ffffffee",
  },
  loadingText: { color: "#5f6a7d", fontSize: 14 },
  error: { color: "#b00020", fontSize: 14, padding: 24, textAlign: "center" },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#0f1115",
  },
  btn: { backgroundColor: "#7aa2ff", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  btnSecondary: { backgroundColor: "#1a1e26", borderWidth: 1, borderColor: "#2a3140" },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#0f1115", fontWeight: "700", fontSize: 15 },
  btnTextSecondary: { color: "#f5f7fa", fontWeight: "700", fontSize: 15 },
  meta: { color: "#5f6a7d", fontSize: 12, marginLeft: "auto" },
});

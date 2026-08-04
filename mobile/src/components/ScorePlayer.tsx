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
import { colors, font, radius } from "@/theme";

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
  /** Synth voice for playback (see instruments.ts). */
  timbre?: string;
}

const TEMPO_STEPS = [0.5, 0.75, 1.0];

export function ScorePlayer({
  musicxml,
  onPosition,
  onReady,
  mode = "play",
  cursorIndex,
  feedbackStatus,
  timbre,
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
        send({ type: "load", musicxml, timeline: timeline.notes, timbre });
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
            <ActivityIndicator size="large" color={colors.accent} />
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
          <Pressable
            onPress={togglePlay}
            disabled={!ready}
            style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.85 }, !ready && { opacity: 0.4 }]}
          >
            <Text style={styles.playGlyph}>{playing ? "❚❚" : "▶"}</Text>
          </Pressable>
          <Pressable
            onPress={cycleTempo}
            style={({ pressed }) => [styles.tempoPill, pressed && { borderColor: colors.accent }]}
          >
            <Text style={styles.tempoLabel}>{TEMPO_STEPS[rateIdx]}×</Text>
          </Pressable>
          <Text style={styles.meta}>
            {timeline.notes.length} notes · {timeline.tempoBpm} bpm
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webWrap: { flex: 1, backgroundColor: colors.surface },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#ffffffee",
  },
  loadingText: { fontFamily: font.regular, color: colors.muted, fontSize: 14 },
  error: { fontFamily: font.regular, color: colors.wrong, fontSize: 14, padding: 24, textAlign: "center" },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  playGlyph: { fontSize: 17, color: colors.onAccent },
  tempoPill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
  },
  tempoLabel: { fontFamily: font.bold, fontSize: 14, color: colors.text },
  meta: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginLeft: "auto" },
});

import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useMetronome } from "@/audio/useMetronome";
import { Chip, PillButton, StackHeader } from "@/components/ui";
import { colors, font, radius, spacing } from "@/theme";

const clampTempo = (n: number) => Math.max(40, Math.min(240, n));
const METERS = [2, 3, 4, 6];

export default function MetronomeScreen() {
  const router = useRouter();
  const { running, beat, startLoop, stopLoop } = useMetronome();
  const [bpm, setBpm] = useState(100);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const taps = useRef<number[]>([]);

  // Restart the loop when tempo/meter changes so the change is heard immediately.
  function apply(nextBpm: number, nextMeter: number) {
    if (running) {
      stopLoop();
      startLoop(nextBpm, nextMeter);
    }
  }

  function changeTempo(delta: number) {
    const next = clampTempo(bpm + delta);
    setBpm(next);
    apply(next, beatsPerBar);
  }

  function changeMeter(m: number) {
    setBeatsPerBar(m);
    apply(bpm, m);
  }

  function toggle() {
    if (running) stopLoop();
    else startLoop(bpm, beatsPerBar);
  }

  function tapTempo() {
    const now = Date.now();
    const arr = [...taps.current.filter((t) => now - t < 2500), now];
    taps.current = arr;
    if (arr.length >= 2) {
      const intervals = arr.slice(1).map((t, i) => t - arr[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const next = clampTempo(Math.round(60000 / avg));
      setBpm(next);
      apply(next, beatsPerBar);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StackHeader backLabel="Back" title="Metronome" onBack={() => router.back()} />
      <View style={styles.body}>
        <View style={styles.dots}>
          {Array.from({ length: beatsPerBar }).map((_, i) => {
            const active = running && beat === i + 1;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === 0 && styles.dotDown,
                  active && (i === 0 ? styles.dotActiveDown : styles.dotActive),
                ]}
              />
            );
          })}
        </View>

        <View style={styles.tempoRow}>
          <Pressable onPress={() => changeTempo(-4)} style={styles.tBtn} hitSlop={8}>
            <Text style={styles.tBtnTxt}>−</Text>
          </Pressable>
          <View style={styles.tMid}>
            <Text style={styles.bpm}>{bpm}</Text>
            <Text style={styles.bpmUnit}>BPM</Text>
          </View>
          <Pressable onPress={() => changeTempo(4)} style={styles.tBtn} hitSlop={8}>
            <Text style={styles.tBtnTxt}>+</Text>
          </Pressable>
        </View>

        <View style={styles.fineRow}>
          <Chip label="−1" onPress={() => changeTempo(-1)} />
          <Chip label="Tap" onPress={tapTempo} />
          <Chip label="+1" onPress={() => changeTempo(1)} />
        </View>

        <Text style={styles.meterLabel}>Beats per bar</Text>
        <View style={styles.meterRow}>
          {METERS.map((m) => (
            <Pressable
              key={m}
              onPress={() => changeMeter(m)}
              style={[styles.meterChip, beatsPerBar === m && styles.meterChipOn]}
            >
              <Text style={[styles.meterTxt, beatsPerBar === m && styles.meterTxtOn]}>{m}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <PillButton label={running ? "Stop" : "Start"} variant={running ? "dark" : "primary"} onPress={toggle} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: 22, padding: spacing.screenX },
  dots: { flexDirection: "row", gap: 12, height: 24, alignItems: "center" },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.track },
  dotDown: { backgroundColor: colors.faint },
  dotActive: { backgroundColor: colors.accent, transform: [{ scale: 1.25 }] },
  dotActiveDown: { backgroundColor: colors.onAccent, transform: [{ scale: 1.35 }] },
  tempoRow: { flexDirection: "row", alignItems: "center", gap: 22 },
  tBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tBtnTxt: { fontFamily: font.bold, fontSize: 26, color: colors.text },
  tMid: { alignItems: "center", minWidth: 120 },
  bpm: { fontFamily: font.extrabold, fontSize: 64, lineHeight: 68, color: colors.text },
  bpmUnit: { fontFamily: font.semibold, fontSize: 13, color: colors.muted, letterSpacing: 1 },
  fineRow: { flexDirection: "row", gap: 10 },
  meterLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.muted, marginTop: 4 },
  meterRow: { flexDirection: "row", gap: 10 },
  meterChip: {
    width: 48,
    height: 48,
    borderRadius: radius.chip,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  meterChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  meterTxt: { fontFamily: font.bold, fontSize: 18, color: colors.text },
  meterTxtOn: { color: colors.onAccent },
  footer: {
    paddingHorizontal: spacing.screenX,
    paddingBottom: 16,
    paddingTop: 6,
  },
});

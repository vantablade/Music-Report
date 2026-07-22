import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PillButton, StackHeader } from "@/components/ui";
import { addScore } from "@/library/repository";
import { useScanPipeline } from "@/scan/useScanPipeline";
import { colors, font, radius } from "@/theme";

type Stage = "camera" | "review";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("camera");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [capturing, setCapturing] = useState(false);
  const saved = useRef(false);

  const pipeline = useScanPipeline();

  // When OMR finishes, save the MusicXML into the library and open it.
  useEffect(() => {
    if (pipeline.phase !== "ready" || !pipeline.musicxml || saved.current) return;
    saved.current = true;
    const id = `scan-${Date.now()}`;
    addScore({
      id,
      title: title.trim() || "Untitled score",
      tempoBpm: null,
      musicxml: pipeline.musicxml,
    })
      .then(() => router.replace(`/score/${id}`))
      .catch(() => {
        saved.current = false;
      });
  }, [pipeline.phase, pipeline.musicxml, title, router]);

  async function capture() {
    if (!cameraRef.current) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setStage("review");
      }
    } finally {
      setCapturing(false);
    }
  }

  const header = (
    <StackHeader dark backLabel="Back" title="Scan sheet music" onBack={() => router.back()} />
  );

  /* ---- permissions ---- */
  if (!permission) {
    return (
      <Shell header={header}>
        <View style={styles.centered}>
          <Text style={styles.procTitle}>Requesting camera…</Text>
        </View>
      </Shell>
    );
  }
  if (!permission.granted) {
    return (
      <Shell header={header}>
        <View style={styles.centered}>
          <Text style={styles.procTitle}>Camera access needed</Text>
          <Text style={styles.procSub}>We need the camera to photograph your sheet music.</Text>
          <PillButton label="Grant permission" onPress={requestPermission} style={styles.permBtn} />
        </View>
      </Shell>
    );
  }

  /* ---- processing / result ---- */
  if (pipeline.phase !== "idle") {
    return (
      <Shell header={header}>
        <View style={styles.centered}>
          {pipeline.phase === "failed" ? (
            <>
              <Text style={[styles.procTitle, { color: colors.wrong }]}>Scan failed</Text>
              <Text style={styles.procSub}>{pipeline.error ?? "Could not read this image."}</Text>
              <PillButton
                label="Try again"
                style={styles.permBtn}
                onPress={() => {
                  pipeline.reset();
                  saved.current = false;
                  setStage("review");
                }}
              />
              <Pressable onPress={() => router.push("/settings")} hitSlop={8}>
                <Text style={styles.darkLink}>Check backend settings</Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.procTitle}>
                {pipeline.phase === "uploading" ? "Uploading image…" : "Reading the music…"}
              </Text>
              <Text style={styles.procSub}>Recognizing notes takes about 30–60 seconds.</Text>
            </>
          )}
        </View>
      </Shell>
    );
  }

  /* ---- review + name ---- */
  if (stage === "review" && photoUri) {
    return (
      <Shell header={header}>
        <View style={styles.reviewPhotoWrap}>
          <Image source={{ uri: photoUri }} style={styles.reviewPhoto} resizeMode="contain" />
        </View>
        <View style={styles.sheet}>
          <Text style={styles.sheetLabel}>Name this score</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rode Étude No. 9"
            placeholderTextColor={colors.muted}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />
          <View style={styles.sheetRow}>
            <PillButton
              label="Retake"
              variant="secondary"
              style={styles.sheetBtn}
              onPress={() => setStage("camera")}
            />
            <PillButton
              label="Scan"
              style={styles.sheetBtn}
              onPress={() =>
                pipeline.start({ uri: photoUri, title: title.trim() || "Untitled score" })
              }
            />
          </View>
        </View>
      </Shell>
    );
  }

  /* ---- camera ---- */
  return (
    <Shell header={header}>
      <View style={styles.cameraWrap}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        <View style={styles.frameGuide} pointerEvents="none" />
        <View style={styles.cameraBottom}>
          <Text style={styles.hintPill}>Fill the frame · hold steady · good light</Text>
          <Pressable
            onPress={capture}
            disabled={capturing}
            style={({ pressed }) => [styles.shutter, (pressed || capturing) && { opacity: 0.85 }]}
          />
        </View>
      </View>
    </Shell>
  );
}

function Shell({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      {header}
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.dark },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  procTitle: { fontFamily: font.bold, fontSize: 16, color: colors.onDark, textAlign: "center" },
  procSub: {
    fontFamily: font.regular,
    fontSize: 13.5,
    color: colors.mutedOnDark,
    textAlign: "center",
    lineHeight: 20,
  },
  permBtn: { alignSelf: "stretch", marginTop: 4 },
  darkLink: { fontFamily: font.semibold, fontSize: 14, color: colors.accent, marginTop: 4 },
  // camera
  cameraWrap: { flex: 1, position: "relative" },
  frameGuide: {
    position: "absolute",
    top: 56,
    left: 28,
    right: 28,
    bottom: 170,
    borderWidth: 2,
    borderColor: "rgba(255,214,10,0.85)",
    borderRadius: radius.row,
  },
  cameraBottom: { position: "absolute", left: 0, right: 0, bottom: 28, alignItems: "center", gap: 18 },
  hintPill: {
    fontFamily: font.regular,
    fontSize: 13.5,
    color: colors.onDark,
    backgroundColor: "rgba(23,23,18,0.72)",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.onDark,
    borderWidth: 5,
    borderColor: colors.accent,
  },
  // review
  reviewPhotoWrap: { flex: 1, paddingVertical: 8, paddingHorizontal: 24 },
  reviewPhoto: { flex: 1, borderRadius: 10 },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: 20,
    gap: 10,
  },
  sheetLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.muted },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    padding: 14,
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.text,
  },
  sheetRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  sheetBtn: { flex: 1, paddingVertical: 14 },
});

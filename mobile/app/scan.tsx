import { useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import DocumentScanner, { ScanDocumentResponseStatus } from "react-native-document-scanner-plugin";
import { SafeAreaView } from "react-native-safe-area-context";

import { PillButton, StackHeader } from "@/components/ui";
import { addScore } from "@/library/repository";
import { useScanPipeline } from "@/scan/useScanPipeline";
import { colors, font, radius } from "@/theme";

export default function ScanScreen() {
  // expo-camera declares the CAMERA permission, so the native scanner needs it granted at runtime.
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const launched = useRef(false);
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

  // Launch the OS document scanner (auto edge-detection + dewarp). `fromRetake` keeps the
  // existing photo if the user cancels a re-scan; the initial cancel just exits the screen.
  const launchScanner = useCallback(
    async (fromRetake: boolean) => {
      setScanError(null);
      try {
        const { scannedImages, status } = await DocumentScanner.scanDocument({
          croppedImageQuality: 100,
          maxNumDocuments: 1,
        });
        if (status === ScanDocumentResponseStatus.Success && scannedImages && scannedImages.length > 0) {
          let uri = scannedImages[0];
          if (!/^(file|content):\/\//.test(uri)) uri = `file://${uri}`;
          setPhotoUri(uri);
        } else if (!fromRetake) {
          router.back();
        }
      } catch (e) {
        setScanError((e as Error)?.message || "Could not open the scanner.");
      }
    },
    [router],
  );

  // Auto-open the scanner once, as soon as we have camera permission.
  useEffect(() => {
    if (!permission?.granted || photoUri || pipeline.phase !== "idle" || launched.current) return;
    launched.current = true;
    launchScanner(false);
  }, [permission?.granted, photoUri, pipeline.phase, launchScanner]);

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
          <Text style={styles.procSub}>We need the camera to scan your sheet music.</Text>
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
  if (photoUri) {
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
              onPress={() => launchScanner(true)}
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

  /* ---- launcher (scanner opening / cancelled / errored) ---- */
  return (
    <Shell header={header}>
      <View style={styles.centered}>
        {scanError ? (
          <>
            <Text style={[styles.procTitle, { color: colors.wrong }]}>Scanner error</Text>
            <Text style={styles.procSub}>{scanError}</Text>
            <PillButton label="Open scanner" style={styles.permBtn} onPress={() => launchScanner(false)} />
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.procTitle}>Opening scanner…</Text>
            <Text style={styles.procSub}>Line up the sheet music — the edges are detected automatically.</Text>
          </>
        )}
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

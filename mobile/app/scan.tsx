import { CameraView, useCameraPermissions } from "expo-camera";
import { Link, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { addScore } from "@/library/repository";
import { useScanPipeline } from "@/scan/useScanPipeline";

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

  if (!permission) {
    return (
      <Centered>
        <Text style={styles.body}>Requesting camera…</Text>
      </Centered>
    );
  }

  if (!permission.granted) {
    return (
      <Centered>
        <Text style={styles.body}>Camera access is needed to scan sheet music.</Text>
        <Button label="Grant permission" onPress={requestPermission} />
      </Centered>
    );
  }

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

  // ---- processing / result overlay ----
  if (pipeline.phase !== "idle") {
    return (
      <Centered>
        <StatusView pipeline={pipeline} onRetry={() => { pipeline.reset(); saved.current = false; setStage("review"); }} />
      </Centered>
    );
  }

  // ---- review + name ----
  if (stage === "review" && photoUri) {
    return (
      <SafeAreaView style={styles.reviewWrap}>
        <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="contain" />
        <View style={styles.reviewControls}>
          <Text style={styles.label}>Project name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rode Etude No. 9"
            placeholderTextColor="#5f6a7d"
            value={title}
            onChangeText={setTitle}
            autoFocus
          />
          <View style={styles.row}>
            <Button label="Retake" variant="secondary" onPress={() => setStage("camera")} />
            <Button
              label="Scan"
              onPress={() => pipeline.start({ uri: photoUri, title: title.trim() || "Untitled score" })}
            />
          </View>
          <Text style={styles.hint}>Tip: fill the frame, hold steady, good light.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---- camera ----
  return (
    <View style={styles.fill}>
      <CameraView ref={cameraRef} style={styles.fill} facing="back" />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <Text style={styles.frameHint}>Fill the frame with the sheet music, then capture.</Text>
        <Pressable
          style={[styles.shutter, capturing && styles.shutterBusy]}
          onPress={capture}
          disabled={capturing}
        />
      </SafeAreaView>
    </View>
  );
}

function StatusView({
  pipeline,
  onRetry,
}: {
  pipeline: ReturnType<typeof useScanPipeline>;
  onRetry: () => void;
}) {
  switch (pipeline.phase) {
    case "uploading":
      return <Progress label="Uploading image…" />;
    case "processing":
      return <Progress label="Reading the music… this takes ~30–60s." />;
    case "ready":
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5fd08a" />
          <Text style={styles.success}>✓ Recognized</Text>
          <Text style={styles.meta}>Saving to your library…</Text>
        </View>
      );
    case "failed":
      return (
        <View style={styles.center}>
          <Text style={styles.error}>Scan failed</Text>
          <Text style={styles.meta}>{pipeline.error ?? "Could not read this image."}</Text>
          <Button label="Try again" onPress={onRetry} />
          <Link href="/settings" asChild>
            <Pressable>
              <Text style={styles.link}>Check backend settings</Text>
            </Pressable>
          </Link>
        </View>
      );
    default:
      return null;
  }
}

function Progress({ label }: { label: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#7aa2ff" />
      <Text style={styles.meta}>{label}</Text>
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <SafeAreaView style={[styles.fill, styles.center]}>{children}</SafeAreaView>;
}

function Button({
  label,
  onPress,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <Pressable
      style={[styles.button, variant === "secondary" && styles.buttonSecondary]}
      onPress={onPress}
    >
      <Text style={variant === "secondary" ? styles.buttonSecondaryText : styles.buttonText}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#0f1115" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  overlay: { flex: 1, justifyContent: "flex-end", alignItems: "center", paddingBottom: 32 },
  frameHint: { color: "#f5f7fa", backgroundColor: "#000000aa", padding: 8, borderRadius: 8, marginBottom: 20 },
  shutter: { width: 74, height: 74, borderRadius: 37, backgroundColor: "#fff", borderWidth: 5, borderColor: "#7aa2ff" },
  shutterBusy: { opacity: 0.5 },
  // review
  reviewWrap: { flex: 1, backgroundColor: "#0f1115" },
  preview: { flex: 1, backgroundColor: "#000" },
  reviewControls: { padding: 20, gap: 10 },
  label: { color: "#8a93a3", fontSize: 13 },
  input: {
    backgroundColor: "#1a1e26",
    borderWidth: 1,
    borderColor: "#2a3140",
    borderRadius: 10,
    padding: 14,
    color: "#f5f7fa",
    fontSize: 16,
  },
  row: { flexDirection: "row", gap: 12, marginTop: 4 },
  hint: { color: "#5f6a7d", fontSize: 12, marginTop: 4 },
  // shared
  body: { color: "#f5f7fa", fontSize: 15, textAlign: "center" },
  meta: { color: "#8a93a3", fontSize: 14, textAlign: "center", lineHeight: 20 },
  success: { color: "#5fd08a", fontSize: 22, fontWeight: "700" },
  error: { color: "#ff6b81", fontSize: 22, fontWeight: "700" },
  link: { color: "#7aa2ff", fontSize: 14, marginTop: 8 },
  button: { flex: 1, backgroundColor: "#7aa2ff", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  buttonSecondary: { backgroundColor: "#1a1e26", borderWidth: 1, borderColor: "#2a3140" },
  buttonText: { color: "#0f1115", fontWeight: "700", fontSize: 15 },
  buttonSecondaryText: { color: "#f5f7fa", fontWeight: "700", fontSize: 15 },
});

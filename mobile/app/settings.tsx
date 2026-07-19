import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { pingBackend } from "@/api/scan";
import { getBackendUrl, setBackendUrl } from "@/config/backend";

export default function SettingsScreen() {
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; detail: string } | null>(null);

  useEffect(() => {
    getBackendUrl().then(setUrl);
  }, []);

  async function save() {
    await setBackendUrl(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function test() {
    await setBackendUrl(url); // test what's in the box
    setTesting(true);
    setResult(null);
    setResult(await pingBackend());
    setTesting(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Backend URL</Text>
        <Text style={styles.help}>
          The OMR server used for scanning. Paste your ngrok URL (it changes each session), e.g.
          https://abcd-1234.ngrok-free.app
        </Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://…"
          placeholderTextColor="#5f6a7d"
        />

        <View style={styles.row}>
          <Pressable style={[styles.btn, styles.btnSecondary]} onPress={test} disabled={testing}>
            {testing ? (
              <ActivityIndicator color="#f5f7fa" />
            ) : (
              <Text style={styles.btnSecondaryText}>Test connection</Text>
            )}
          </Pressable>
          <Pressable style={styles.btn} onPress={save}>
            <Text style={styles.btnText}>{saved ? "Saved ✓" : "Save"}</Text>
          </Pressable>
        </View>

        {result && (
          <Text style={[styles.result, { color: result.ok ? "#5fd08a" : "#ff6b81" }]}>
            {result.ok ? `✓ Connected — ${result.detail}` : `✗ ${result.detail}`}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1115" },
  content: { padding: 24, gap: 12 },
  label: { color: "#f5f7fa", fontSize: 16, fontWeight: "600" },
  help: { color: "#8a93a3", fontSize: 13, lineHeight: 19 },
  input: {
    backgroundColor: "#1a1e26",
    borderWidth: 1,
    borderColor: "#2a3140",
    borderRadius: 10,
    padding: 14,
    color: "#f5f7fa",
    fontSize: 15,
  },
  row: { flexDirection: "row", gap: 12, marginTop: 4 },
  btn: { flex: 1, backgroundColor: "#7aa2ff", paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  btnSecondary: { backgroundColor: "#1a1e26", borderWidth: 1, borderColor: "#2a3140" },
  btnText: { color: "#0f1115", fontWeight: "700", fontSize: 15 },
  btnSecondaryText: { color: "#f5f7fa", fontWeight: "700", fontSize: 15 },
  result: { fontSize: 14, marginTop: 6 },
});

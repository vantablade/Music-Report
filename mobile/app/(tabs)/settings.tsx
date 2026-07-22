import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { pingBackend } from "@/api/scan";
import { Card, PillButton } from "@/components/ui";
import { getBackendUrl, setBackendUrl } from "@/config/backend";
import { supabase } from "@/lib/supabase";
import { colors, font, radius, spacing } from "@/theme";

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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        <Card style={styles.card}>
          <Text style={styles.label}>Backend URL</Text>
          <Text style={styles.help}>
            The OMR server used for scanning. Paste your tunnel URL — it changes each session.
          </Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://…"
            placeholderTextColor={colors.muted}
          />
          <View style={styles.row}>
            <PillButton
              label={testing ? "Testing…" : "Test connection"}
              variant="secondary"
              busy={testing}
              onPress={test}
              style={styles.rowBtn}
            />
            <PillButton label={saved ? "Saved ✓" : "Save"} onPress={save} style={styles.rowBtn} />
          </View>

          {result && (
            <Text style={[styles.result, { color: result.ok ? colors.correct : colors.wrong }]}>
              {result.ok ? `✓ Connected — ${result.detail}` : `✗ ${result.detail}`}
            </Text>
          )}
        </Card>

        <Pressable onPress={() => supabase.auth.signOut()} style={styles.signOut} hitSlop={8}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: spacing.screenX,
    paddingTop: spacing.screenTop,
    paddingBottom: spacing.tabClearance,
    gap: 16,
  },
  title: { fontFamily: font.extrabold, fontSize: 28, letterSpacing: -0.85, color: colors.text, paddingTop: 4 },
  card: { gap: 10 },
  label: { fontFamily: font.bold, fontSize: 15, color: colors.text },
  help: { fontFamily: font.regular, fontSize: 13, color: colors.muted, lineHeight: 19 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    padding: 13,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.text,
  },
  row: { flexDirection: "row", gap: 10, marginTop: 2 },
  rowBtn: { flex: 1, paddingVertical: 12 },
  result: { fontFamily: font.semibold, fontSize: 13.5 },
  signOut: { alignSelf: "flex-start", padding: 8 },
  signOutText: { fontFamily: font.semibold, fontSize: 14, color: colors.danger },
});

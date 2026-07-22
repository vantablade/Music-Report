import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LogoMark, PillButton } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { colors, font, radius } from "@/theme";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signUp") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setNotice("Check your email to confirm, then sign in.");
        setMode("signIn");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <LogoMark size={64} />
        <Text style={styles.wordmark}>musical</Text>
        <Text style={styles.subtitle}>
          {mode === "signIn" ? "Sign in to your library" : "Create an account"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {notice && <Text style={styles.notice}>{notice}</Text>}

        <PillButton
          label={mode === "signIn" ? "Sign in" : "Sign up"}
          busy={busy}
          onPress={submit}
          style={styles.cta}
        />

        <Pressable onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")} hitSlop={8}>
          <Text style={styles.switch}>
            {mode === "signIn" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, justifyContent: "center", padding: 28, gap: 12 },
  wordmark: {
    fontFamily: font.extrabold,
    fontSize: 34,
    letterSpacing: -1,
    color: colors.text,
    marginTop: 10,
  },
  subtitle: { fontFamily: font.regular, fontSize: 15, color: colors.muted, marginBottom: 14 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    padding: 15,
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.text,
  },
  cta: { paddingVertical: 16, marginTop: 6 },
  switch: {
    fontFamily: font.medium,
    fontSize: 14,
    color: colors.link,
    textAlign: "center",
    marginTop: 8,
  },
  error: { fontFamily: font.regular, fontSize: 14, color: colors.wrong },
  notice: { fontFamily: font.regular, fontSize: 14, color: colors.correct },
});

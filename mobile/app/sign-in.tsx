import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";

/**
 * Email/password auth. Redirect back to the app is handled by AuthProvider's
 * onAuthStateChange once a session exists.
 */
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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sheet Music Trainer</Text>
        <Text style={styles.subtitle}>
          {mode === "signIn" ? "Sign in to your library" : "Create an account"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#5f6a7d"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#5f6a7d"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {notice && <Text style={styles.notice}>{notice}</Text>}

        <Pressable style={[styles.button, busy && styles.busy]} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#0f1115" />
          ) : (
            <Text style={styles.buttonText}>{mode === "signIn" ? "Sign in" : "Sign up"}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")}>
          <Text style={styles.switch}>
            {mode === "signIn" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1115" },
  content: { flex: 1, padding: 24, gap: 14, justifyContent: "center" },
  title: { color: "#f5f7fa", fontSize: 26, fontWeight: "700" },
  subtitle: { color: "#8a93a3", fontSize: 15, marginBottom: 8 },
  input: {
    backgroundColor: "#1a1e26",
    borderWidth: 1,
    borderColor: "#2a3140",
    borderRadius: 10,
    padding: 14,
    color: "#f5f7fa",
    fontSize: 15,
  },
  button: {
    backgroundColor: "#7aa2ff",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  busy: { opacity: 0.7 },
  buttonText: { color: "#0f1115", fontSize: 16, fontWeight: "700" },
  switch: { color: "#7aa2ff", textAlign: "center", marginTop: 12, fontSize: 14 },
  error: { color: "#ff6b81", fontSize: 14 },
  notice: { color: "#5fd08a", fontSize: 14 },
});

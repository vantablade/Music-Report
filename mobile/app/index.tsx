import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sheet Music Trainer</Text>
        <Text style={styles.subtitle}>Scan, render, and practice with feedback.</Text>

        <Link href="/library" asChild>
          <Pressable style={styles.cta}>
            <Text style={styles.ctaText}>My library</Text>
          </Pressable>
        </Link>

        <Link href="/scan" asChild>
          <Pressable style={styles.secondary}>
            <Text style={styles.secondaryText}>Scan sheet music</Text>
          </Pressable>
        </Link>

        <Link href="/settings" asChild>
          <Pressable style={styles.settings}>
            <Text style={styles.settingsText}>Settings</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1115" },
  content: { flex: 1, padding: 24, gap: 14, justifyContent: "center" },
  title: { color: "#f5f7fa", fontSize: 28, fontWeight: "700" },
  subtitle: { color: "#8a93a3", fontSize: 15, marginBottom: 8 },
  cta: { backgroundColor: "#7aa2ff", paddingVertical: 15, borderRadius: 12, alignItems: "center" },
  ctaText: { color: "#0f1115", fontSize: 16, fontWeight: "700" },
  secondary: {
    backgroundColor: "#1a1e26",
    borderWidth: 1,
    borderColor: "#2a3140",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryText: { color: "#f5f7fa", fontSize: 16, fontWeight: "600" },
  settings: { paddingVertical: 12, alignItems: "center", marginTop: 8 },
  settingsText: { color: "#5f6a7d", fontSize: 14 },
});

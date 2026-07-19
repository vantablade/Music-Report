import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { env } from "@/config/env";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15_000 },
  },
});

function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const authed = !!session || env.devNoAuth;

  useEffect(() => {
    if (loading) return;
    const onSignIn = segments[0] === "sign-in";
    if (!authed && !onSignIn) router.replace("/sign-in");
    else if (authed && onSignIn) router.replace("/");
  }, [authed, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f1115" }}>
        <ActivityIndicator size="large" color="#7aa2ff" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerTitleStyle: { fontWeight: "600" } }}>
      <Stack.Screen name="index" options={{ title: "Sheet Music Trainer" }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="scan" options={{ title: "Scan sheet music" }} />
      <Stack.Screen name="library" options={{ title: "My library" }} />
      <Stack.Screen name="score/[id]" options={{ title: "Score" }} />
      <Stack.Screen name="practice/[id]" options={{ title: "Practice" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

import { Tabs, useRouter } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScanGlyph } from "@/components/ui";
import { colors, fabShadow, font } from "@/theme";

/** Height of the bar's content (excludes the safe-area inset). */
const BAR_CONTENT_HEIGHT = 46;

function MusicalTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: 6 + insets.bottom }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = (options.title ?? route.name) as string;
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tab}>
            <Text style={[styles.label, focused ? styles.labelActive : styles.labelInactive]}>{label}</Text>
            <View style={[styles.dot, focused && styles.dotActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <Tabs
        tabBar={(props) => <MusicalTabBar {...props} />}
        sceneContainerStyle={{ backgroundColor: colors.bg }}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="library" options={{ title: "Library" }} />
        <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      </Tabs>

      {/* Floating scan button, above the tab bar. */}
      <Pressable
        onPress={() => router.push("/scan")}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + BAR_CONTENT_HEIGHT + 20 },
          pressed && { opacity: 0.85 },
        ]}
      >
        <ScanGlyph size={22} color={colors.onAccent} dotColor={colors.onAccent} borderWidth={2.5} dot={8} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: "row",
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tab: { flex: 1, alignItems: "center", gap: 5, paddingVertical: 4 },
  label: { fontSize: 13.5 },
  labelActive: { fontFamily: font.bold, color: colors.text },
  labelInactive: { fontFamily: font.medium, color: colors.muted },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "transparent" },
  dotActive: { backgroundColor: colors.accent },
  fab: {
    position: "absolute",
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...fabShadow,
  },
});

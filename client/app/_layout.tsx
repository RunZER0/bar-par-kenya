import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AccessibilityInfo, AppState, Platform, View } from "react-native";
import { MobileNav } from "@/components/MobileNav";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { api } from "@/api";
import { PwaRegistration } from "@/components/PwaRegistration";

export default function RootLayout() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const sync = () => { void api.syncPendingReviews(); };
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    if (Platform.OS === "web") {
      globalThis.addEventListener?.("online", sync);
    }
    return () => {
      appState.remove();
      if (Platform.OS === "web") {
        globalThis.removeEventListener?.("online", sync);
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <PwaRegistration />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: reduceMotion ? "none" : "fade",
            contentStyle: { backgroundColor: "#F4F5F0" },
          }}
        />
        <MobileNav />
      </View>
    </SafeAreaProvider>
  );
}

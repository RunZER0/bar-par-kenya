import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { MobileNav } from "@/components/MobileNav";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
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

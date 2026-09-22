import { Link, usePathname } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors } from "@/theme";

const items = [
  { href: "/", label: "Today" },
  { href: "/study", label: "Cards" },
  { href: "/mind-maps", label: "Maps" },
] as const;

export function MobileNav() {
  const { width } = useWindowDimensions();
  const path = usePathname();
  if (width >= 720) return null;

  return (
    <View style={styles.shell}>
      {items.map((item) => {
        const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <View style={[styles.marker, active && styles.markerActive]} />
              <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: Platform.OS === "web" ? 12 : 10,
    minHeight: 58,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,.97)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    zIndex: 100,
  },
  item: { minWidth: 82, minHeight: 48, alignItems: "center", justifyContent: "center", gap: 4 },
  marker: { width: 18, height: 3, borderRadius: 2, backgroundColor: "transparent" },
  markerActive: { backgroundColor: colors.coral },
  label: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  labelActive: { color: colors.ink },
  pressed: { opacity: 0.62 },
});

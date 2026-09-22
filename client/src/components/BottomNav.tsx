import { Link, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors } from "@/theme";

const items = [
  { href: "/", label: "Today" },
  { href: "/study", label: "Cards" },
  { href: "/mind-maps", label: "Maps" },
] as const;

export function BottomNav() {
  const { width } = useWindowDimensions();
  const path = usePathname();
  if (width >= 720) return null;

  return (
    <View style={styles.shell}>
      {items.map((item) => {
        const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} asChild>
            <Pressable style={styles.item}>
              <View style={[styles.dot, active && styles.dotActive]} />
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
    minHeight: 64,
    paddingBottom: 6,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  item: { flex: 1, minHeight: 58, alignItems: "center", justifyContent: "center", gap: 5 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "transparent" },
  dotActive: { backgroundColor: colors.coral },
  label: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  labelActive: { color: colors.ink },
});

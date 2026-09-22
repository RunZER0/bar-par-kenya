import { Link, usePathname } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Brand } from "./Brand";
import { colors, radii } from "@/theme";

const links = [
  { href: "/study", label: "Flashcards" },
  { href: "/mind-maps", label: "Mind maps" },
] as const;

export function AppHeader() {
  const path = usePathname();
  const { width } = useWindowDimensions();
  const compact = width < 720;

  return (
    <View style={styles.shell}>
      <Link href="/" asChild>
        <Pressable><Brand compact={compact} /></Pressable>
      </Link>
      <View style={styles.links}>
        {links.map((item) => {
          const active = path.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable style={({ pressed }) => [styles.link, active && styles.active, pressed && styles.pressed]}>
                <Text style={[styles.linkText, active && styles.activeText]}>{item.label}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
      {!compact ? (
        <Link href="/study" asChild>
          <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>Study now</Text>
          </Pressable>
        </Link>
      ) : <View style={{ width: 32 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 72,
    paddingHorizontal: Platform.select({ web: 32, default: 18 }),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: "rgba(244,245,240,.97)",
    gap: 16,
  },
  links: { flexDirection: "row", alignItems: "center", gap: 4 },
  link: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: radii.pill },
  active: { backgroundColor: colors.cream },
  linkText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  activeText: { color: colors.ink },
  primary: {
    minHeight: 40, paddingHorizontal: 16, borderRadius: radii.sm,
    backgroundColor: colors.ink, alignItems: "center", justifyContent: "center",
  },
  primaryText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.72 },
});

import { Link, usePathname } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Brand } from "./Brand";
import { colors, radii } from "@/theme";

const links = [
  { href: "/", label: "Today" },
  { href: "/study", label: "Cards" },
  { href: "/mind-maps", label: "Maps" },
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

      {!compact ? (
        <View style={styles.links}>
          {links.map((item) => {
            const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} asChild>
                <Pressable style={({ pressed }) => [styles.link, active && styles.active, pressed && styles.pressed]}>
                  <Text style={[styles.linkText, active && styles.activeText]}>{item.label}</Text>
                </Pressable>
              </Link>
            );
          })}
        </View>
      ) : <View style={styles.spacer} />}

      <Link href="/account" asChild>
        <Pressable style={({ pressed }) => [styles.account, path.startsWith("/account") && styles.accountActive, pressed && styles.pressed]}>
          <Text style={styles.accountText}>Account</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 68,
    paddingHorizontal: Platform.select({ web: 32, default: 18 }),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.paper,
    gap: 16,
  },
  links: { flexDirection: "row", alignItems: "center", gap: 4 },
  link: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: radii.pill },
  active: { backgroundColor: colors.cream },
  linkText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  activeText: { color: colors.ink },
  account: { minHeight: 40, paddingHorizontal: 14, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  accountActive: { backgroundColor: colors.cream },
  accountText: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  spacer: { flex: 1 },
  pressed: { opacity: 0.7 },
});

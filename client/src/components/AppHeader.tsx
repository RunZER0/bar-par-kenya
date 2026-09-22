import { Link, usePathname } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { paddingTop: insets.top, minHeight: 68 + insets.top }]}>
      <Link href="/" asChild>
        <Pressable accessibilityLabel="Bar Par home" hitSlop={8}><Brand compact={compact} /></Pressable>
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
        <Pressable
          accessibilityLabel="Account"
          style={({ pressed }) => [styles.account, path.startsWith("/account") && styles.accountActive, pressed && styles.pressed]}
        >
          <Text style={styles.accountText}>{compact ? "Me" : "Account"}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 68,
    paddingHorizontal: Platform.select({ web: 28, default: 18 }),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: "rgba(244,245,240,.98)",
    gap: 16,
  },
  spacer: { flex: 1 },
  links: { flexDirection: "row", alignItems: "center", gap: 4 },
  link: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: radii.pill },
  active: { backgroundColor: colors.cream },
  linkText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  activeText: { color: colors.ink },
  account: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 13,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  accountActive: { borderColor: colors.ink },
  accountText: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  pressed: { opacity: 0.68 },
});

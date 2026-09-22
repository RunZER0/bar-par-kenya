import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { StatePanel } from "@/components/StatePanel";
import { api, type MindMapSummary } from "@/api";
import { colors } from "@/theme";

export default function MindMaps() {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [items, setItems] = useState<MindMapSummary[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  async function load() {
    setState("loading");
    try {
      setItems(await api.listMindMaps());
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <View style={styles.page}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.head}>
          <Text style={styles.eyebrow}>MAPS</Text>
          <Text style={[styles.title, desktop && styles.titleDesktop]}>Mind maps</Text>
          <Text style={styles.count}>{items.length || 9} ATP units</Text>
        </View>

        {state === "loading" ? (
          <StatePanel title="Loading…" />
        ) : state === "error" ? (
          <StatePanel title="Could not load maps." action="Try again" onPress={() => void load()} />
        ) : (
          <View style={styles.list}>
            {items.map((item, index) => (
              <Link
                key={item.subjectId}
                href={{ pathname: "/mind-maps/[slug]", params: { slug: item.slug } }}
                asChild
              >
                <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <Text style={styles.index}>{String(index + 1).padStart(2, "0")}</Text>
                  <View style={styles.identity}>
                    <Text style={styles.code}>{item.unitCode}</Text>
                    <Text style={styles.name}>{item.name}</Text>
                  </View>
                  <View style={styles.meta}>
                    <Text style={styles.nodes}>{item.nodeCount}</Text>
                    <Text style={styles.arrow}>→</Text>
                  </View>
                </Pressable>
              </Link>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  scroll: { width: "100%", maxWidth: 1050, alignSelf: "center", paddingHorizontal: 20, paddingTop: 50, paddingBottom: 120 },
  head: { paddingBottom: 30, borderBottomWidth: 1, borderBottomColor: colors.line },
  eyebrow: { color: colors.coral, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: colors.ink, marginTop: 8, fontSize: 44, lineHeight: 48, fontWeight: "900", letterSpacing: -2.1 },
  titleDesktop: { fontSize: 62, lineHeight: 66, letterSpacing: -3.2 },
  count: { color: colors.muted, marginTop: 8, fontSize: 11, fontWeight: "800" },
  list: { borderTopWidth: 0 },
  row: { minHeight: 92, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: "row", alignItems: "center", gap: 18 },
  pressed: { backgroundColor: colors.cream },
  index: { width: 26, color: colors.coral, fontSize: 9, fontWeight: "900" },
  identity: { flex: 1 },
  code: { color: colors.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  name: { color: colors.ink, fontSize: 19, lineHeight: 24, fontWeight: "900", marginTop: 3 },
  meta: { flexDirection: "row", alignItems: "center", gap: 16 },
  nodes: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  arrow: { color: colors.ink, fontSize: 18, fontWeight: "900" },
});

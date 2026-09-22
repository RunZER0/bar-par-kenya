import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { StatePanel } from "@/components/StatePanel";
import { api, type MindMapSummary } from "@/api";
import { colors, radii } from "@/theme";

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
          <Text style={styles.kicker}>MIND MAPS</Text>
          <Text style={[styles.title, desktop && styles.titleDesktop]}>See the whole ATP.</Text>
          <View style={styles.rule} />
        </View>

        {state === "loading" ? (
          <StatePanel title="Loading maps…" />
        ) : state === "error" ? (
          <StatePanel title="Could not load the maps." action="Try again" onPress={() => void load()} />
        ) : (
          <View style={[styles.grid, desktop && styles.gridDesktop]}>
            {items.map((item, index) => (
              <Link
                key={item.subjectId}
                href={{ pathname: "/mind-maps/[slug]", params: { slug: item.slug } }}
                asChild
              >
                <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                  <View style={styles.cardTop}>
                    <Text style={styles.index}>{String(index + 1).padStart(2, "0")}</Text>
                    <Text style={styles.arrow}>↗</Text>
                  </View>
                  <View>
                    <Text style={styles.code}>{item.unitCode}</Text>
                    <Text style={styles.name}>{item.name}</Text>
                  </View>
                  <Text style={styles.nodes}>{item.nodeCount} nodes</Text>
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
  scroll: { width: "100%", maxWidth: 1240, alignSelf: "center", paddingHorizontal: 20, paddingTop: 54, paddingBottom: 60 },
  head: { marginBottom: 28 },
  kicker: { color: colors.coral, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: colors.ink, marginTop: 10, fontSize: 42, lineHeight: 46, fontWeight: "900", letterSpacing: -2 },
  titleDesktop: { fontSize: 60, lineHeight: 64, letterSpacing: -3 },
  rule: { height: 1, backgroundColor: colors.line, marginTop: 26 },
  grid: { gap: 10 },
  gridDesktop: { flexDirection: "row", flexWrap: "wrap" },
  card: {
    minHeight: 210,
    flexGrow: 1,
    flexBasis: 340,
    padding: 20,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    justifyContent: "space-between",
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.995 }] },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  index: { color: colors.coral, fontSize: 10, fontWeight: "900" },
  arrow: { color: colors.muted, fontSize: 18, fontWeight: "800" },
  code: { color: colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  name: { color: colors.ink, fontSize: 24, lineHeight: 29, fontWeight: "900", letterSpacing: -0.8, marginTop: 7, maxWidth: 280 },
  nodes: { color: colors.muted, fontSize: 10, fontWeight: "800" },
});

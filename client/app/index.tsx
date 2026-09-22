import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { StatePanel } from "@/components/StatePanel";
import { api, type Deck, type Learner } from "@/api";
import { colors, radii } from "@/theme";

export default function Today() {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [decks, setDecks] = useState<Deck[]>([]);
  const [learner, setLearner] = useState<Learner | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  async function load() {
    setState("loading");
    try {
      const [deckData, me] = await Promise.all([api.listDecks(), api.me()]);
      setDecks(deckData);
      setLearner(me);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  const dueTotal = useMemo(() => decks.reduce((sum, deck) => sum + deck.due + deck.newCount, 0), [decks]);
  const activeDecks = useMemo(() => decks.filter((deck) => deck.due + deck.newCount > 0), [decks]);
  const first = activeDecks[0] ?? decks[0] ?? null;

  return (
    <View style={styles.page}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.scroll}>
        {state === "loading" ? (
          <StatePanel title="Loading today…" />
        ) : state === "error" ? (
          <StatePanel title="Could not load today." action="Try again" onPress={() => void load()} />
        ) : (
          <>
            <View style={styles.head}>
              <Text style={styles.kicker}>TODAY</Text>
              <Text style={[styles.total, desktop && styles.totalDesktop]}>{dueTotal}</Text>
              <Text style={styles.totalLabel}>{dueTotal === 1 ? "card ready" : "cards ready"}</Text>
              {learner?.kind === "registered" && learner.displayName ? <Text style={styles.name}>{learner.displayName}</Text> : null}
            </View>

            {first ? (
              <Link href={{ pathname: "/study", params: { subjectId: first.subjectId } }} asChild>
                <Pressable style={({ pressed }) => [styles.start, pressed && styles.pressed]}>
                  <View>
                    <Text style={styles.startCode}>{first.unitCode}</Text>
                    <Text style={styles.startName}>{first.name}</Text>
                  </View>
                  <View style={styles.startRight}>
                    <Text style={styles.startCount}>{first.due + first.newCount}</Text>
                    <Text style={styles.startArrow}>→</Text>
                  </View>
                </Pressable>
              </Link>
            ) : null}

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{activeDecks.length ? "Up next" : "ATP units"}</Text>
              <Link href="/mind-maps" asChild><Pressable><Text style={styles.textLink}>Maps</Text></Pressable></Link>
            </View>

            <View style={[styles.list, desktop && styles.grid]}>
              {(activeDecks.length ? activeDecks : decks).map((deck) => (
                <Link key={deck.subjectId} href={{ pathname: "/study", params: { subjectId: deck.subjectId } }} asChild>
                  <Pressable style={({ pressed }) => [styles.deck, pressed && styles.pressed]}>
                    <View style={styles.deckTop}>
                      <Text style={styles.deckCode}>{deck.unitCode}</Text>
                      <Text style={styles.deckCount}>{deck.due > 0 ? `${deck.due} due` : deck.newCount > 0 ? `${deck.newCount} new` : "Clear"}</Text>
                    </View>
                    <Text style={styles.deckName}>{deck.name}</Text>
                  </Pressable>
                </Link>
              ))}
            </View>

            {learner?.kind === "guest" ? (
              <Link href="/account" asChild>
                <Pressable style={({ pressed }) => [styles.protect, pressed && styles.pressed]}>
                  <Text style={styles.protectText}>Protect progress</Text>
                  <Text style={styles.protectArrow}>→</Text>
                </Pressable>
              </Link>
            ) : null}
          </>
        )}
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  scroll: { width: "100%", maxWidth: 1120, alignSelf: "center", paddingHorizontal: 20, paddingTop: 48, paddingBottom: 44 },
  head: { marginBottom: 34 },
  kicker: { color: colors.coral, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  total: { color: colors.ink, fontSize: 76, lineHeight: 78, fontWeight: "900", letterSpacing: -4.5, marginTop: 8 },
  totalDesktop: { fontSize: 104, lineHeight: 104, letterSpacing: -6 },
  totalLabel: { color: colors.muted, fontSize: 14, fontWeight: "800", marginTop: 2 },
  name: { color: colors.ink, fontSize: 14, fontWeight: "800", marginTop: 16 },
  start: { minHeight: 116, padding: 22, borderRadius: radii.lg, backgroundColor: colors.ink, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 20 },
  startCode: { color: colors.lime, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  startName: { color: "#fff", fontSize: 24, lineHeight: 29, fontWeight: "900", letterSpacing: -0.8, marginTop: 6 },
  startRight: { alignItems: "flex-end", gap: 8 },
  startCount: { color: "#fff", fontSize: 22, fontWeight: "900" },
  startArrow: { color: colors.lime, fontSize: 22, fontWeight: "900" },
  sectionHead: { marginTop: 36, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  textLink: { color: colors.ink2, fontSize: 12, fontWeight: "800" },
  list: { gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  deck: { minHeight: 104, padding: 16, borderTopWidth: 1, borderTopColor: colors.line, flexBasis: 320, flexGrow: 1 },
  deckTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  deckCode: { color: colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  deckCount: { color: colors.coral, fontSize: 10, fontWeight: "900" },
  deckName: { color: colors.ink, fontSize: 18, lineHeight: 22, fontWeight: "800", marginTop: 18 },
  protect: { minHeight: 52, marginTop: 34, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  protectText: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  protectArrow: { color: colors.coral, fontSize: 18, fontWeight: "900" },
  pressed: { opacity: 0.72 },
});

import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { StatePanel } from "@/components/StatePanel";
import { api, type Deck, type Learner } from "@/api";
import { colors, radii } from "@/theme";

type State = "loading" | "ready" | "error";

function nextReviewLabel(decks: Deck[]) {
  const dates = decks
    .map((deck) => deck.nextDueAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const next = dates[0];
  if (!next) return null;
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (next.toDateString() === today.toDateString()) {
    return next.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (next.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return next.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Today() {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [state, setState] = useState<State>("loading");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [learner, setLearner] = useState<Learner | null>(null);
  const [lastDeckId, setLastDeckId] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [usingOffline, setUsingOffline] = useState(false);

  async function load() {
    setState("loading");
    try {
      await api.syncPendingReviews();
      const [deckData, me, last, pendingCount, reviewedBefore] = await Promise.all([
        api.listDecks(),
        api.getMe(),
        api.getLastDeck(),
        api.pendingReviewCount(),
        api.hasReviewed(),
      ]);
      setDecks(deckData);
      setLearner(me);
      setLastDeckId(last);
      setPending(pendingCount);
      setHasReviewed(reviewedBefore);
      setUsingOffline(api.isUsingOfflineCache());
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  const dueTotal = useMemo(() => decks.reduce((sum, deck) => sum + deck.due, 0), [decks]);
  const newTotal = useMemo(() => decks.reduce((sum, deck) => sum + deck.newCount, 0), [decks]);
  const actionable = useMemo(
    () => [...decks]
      .filter((deck) => deck.due + deck.newCount > 0)
      .sort((a, b) => (b.due - a.due) || (b.newCount - a.newCount)),
    [decks],
  );
  const lastDeck = decks.find((deck) => deck.subjectId === lastDeckId) ?? null;
  const nextReview = nextReviewLabel(decks);
  const primaryCount = dueTotal > 0 ? dueTotal : newTotal;
  const primaryLabel = dueTotal > 0 ? "cards due" : newTotal > 0 ? "new cards" : "nothing due";

  return (
    <View style={styles.page}>
      <AppHeader />
      {state === "loading" ? (
        <View style={styles.state}><StatePanel title="Loading…" /></View>
      ) : state === "error" ? (
        <View style={styles.state}><StatePanel title="Could not load today." action="Try again" onPress={() => void load()} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.hero, desktop && styles.heroDesktop]}>
            <View style={styles.heroMain}>
              <Text style={styles.eyebrow}>TODAY</Text>
              <View style={styles.metricRow}>
                <Text style={[styles.metric, desktop && styles.metricDesktop]}>{primaryCount || "Clear"}</Text>
                {primaryCount > 0 ? <Text style={styles.metricLabel}>{primaryLabel}</Text> : null}
              </View>
              {!primaryCount && nextReview ? <Text style={styles.next}>Next review · {nextReview}</Text> : null}
              {primaryCount > 0 ? (
                <Link href="/study" asChild>
                  <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
                    <Text style={styles.primaryText}>Start review</Text>
                    <Text style={styles.primaryArrow}>→</Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>

            <View style={styles.heroSide}>
              <View style={styles.sideItem}>
                <Text style={styles.sideNumber}>{dueTotal}</Text>
                <Text style={styles.sideLabel}>Due</Text>
              </View>
              <View style={styles.sideDivider} />
              <View style={styles.sideItem}>
                <Text style={styles.sideNumber}>{newTotal}</Text>
                <Text style={styles.sideLabel}>New</Text>
              </View>
            </View>
          </View>

          {usingOffline || pending > 0 ? (
            <View style={styles.syncRow}>
              <View style={[styles.syncDot, usingOffline && styles.syncDotOffline]} />
              <Text style={styles.syncText}>
                {usingOffline ? "Offline" : `${pending} review${pending === 1 ? "" : "s"} waiting to sync`}
              </Text>
              <Pressable onPress={() => void load()}><Text style={styles.syncAction}>Retry</Text></Pressable>
            </View>
          ) : null}

          {lastDeck ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CONTINUE</Text>
              <Link href={{ pathname: "/study", params: { subjectId: lastDeck.subjectId } }} asChild>
                <Pressable style={({ pressed }) => [styles.continueRow, pressed && styles.pressed]}>
                  <View>
                    <Text style={styles.code}>{lastDeck.unitCode}</Text>
                    <Text style={styles.continueName}>{lastDeck.name}</Text>
                  </View>
                  <Text style={styles.rowArrow}>→</Text>
                </Pressable>
              </Link>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLabel}>DECKS</Text>
              <Link href="/study" asChild><Pressable><Text style={styles.sectionAction}>All</Text></Pressable></Link>
            </View>
            <View style={styles.deckList}>
              {(actionable.length ? actionable : decks).slice(0, desktop ? 6 : 5).map((deck) => (
                <Link key={deck.subjectId} href={{ pathname: "/study", params: { subjectId: deck.subjectId } }} asChild>
                  <Pressable style={({ pressed }) => [styles.deckRow, pressed && styles.rowPressed]}>
                    <View style={styles.deckIdentity}>
                      <Text style={styles.code}>{deck.unitCode}</Text>
                      <Text style={styles.deckName}>{deck.name}</Text>
                    </View>
                    <View style={styles.deckNumbers}>
                      {deck.due > 0 ? <Text style={styles.due}>{deck.due} due</Text> : null}
                      {deck.newCount > 0 ? <Text style={styles.newCount}>{deck.newCount} new</Text> : null}
                      {deck.due + deck.newCount === 0 ? <Text style={styles.clearText}>Clear</Text> : null}
                    </View>
                  </Pressable>
                </Link>
              ))}
            </View>
          </View>

          <View style={[styles.mapRow, desktop && styles.mapRowDesktop]}>
            <View>
              <Text style={styles.sectionLabel}>MAPS</Text>
              <Text style={styles.mapTitle}>9 ATP units</Text>
            </View>
            <Link href="/mind-maps" asChild>
              <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                <Text style={styles.secondaryText}>Open maps</Text>
              </Pressable>
            </Link>
          </View>

          {learner?.kind === "guest" && hasReviewed ? (
            <Link href={{ pathname: "/account", params: { mode: "register" } }} asChild>
              <Pressable style={({ pressed }) => [styles.guestRow, pressed && styles.pressed]}>
                <Text style={styles.guestText}>Guest progress</Text>
                <Text style={styles.guestAction}>Save progress →</Text>
              </Pressable>
            </Link>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  state: { flex: 1, padding: 20, maxWidth: 900, width: "100%", alignSelf: "center", justifyContent: "center" },
  scroll: { width: "100%", maxWidth: 1180, alignSelf: "center", paddingHorizontal: 20, paddingTop: 48, paddingBottom: 120 },
  hero: { paddingBottom: 34, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 28 },
  heroDesktop: { minHeight: 310, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroMain: { flex: 1 },
  eyebrow: { color: colors.coral, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  metricRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 12, marginTop: 8 },
  metric: { color: colors.ink, fontSize: 64, lineHeight: 70, fontWeight: "900", letterSpacing: -3.5 },
  metricDesktop: { fontSize: 96, lineHeight: 100, letterSpacing: -6 },
  metricLabel: { color: colors.ink2, fontSize: 20, fontWeight: "800" },
  next: { color: colors.muted, fontSize: 13, fontWeight: "700", marginTop: 8 },
  primary: { alignSelf: "flex-start", minHeight: 48, marginTop: 24, paddingHorizontal: 18, borderRadius: radii.sm, backgroundColor: colors.ink, flexDirection: "row", alignItems: "center", gap: 28 },
  primaryText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  primaryArrow: { color: colors.lime, fontSize: 17, fontWeight: "900" },
  heroSide: { flexDirection: "row", alignItems: "center", minWidth: 220, paddingVertical: 18 },
  sideItem: { flex: 1 },
  sideNumber: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  sideLabel: { color: colors.muted, fontSize: 11, fontWeight: "700", marginTop: 3 },
  sideDivider: { width: 1, height: 42, backgroundColor: colors.line, marginHorizontal: 20 },
  syncRow: { minHeight: 44, marginTop: 14, paddingHorizontal: 14, borderRadius: radii.sm, backgroundColor: colors.cream, flexDirection: "row", alignItems: "center", gap: 9 },
  syncDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.coral },
  syncDotOffline: { backgroundColor: colors.muted },
  syncText: { flex: 1, color: colors.ink2, fontSize: 11, fontWeight: "700" },
  syncAction: { color: colors.ink, fontSize: 11, fontWeight: "900" },
  section: { paddingTop: 36 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionLabel: { color: colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  sectionAction: { color: colors.ink, fontSize: 11, fontWeight: "900" },
  continueRow: { minHeight: 80, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  continueName: { color: colors.ink, fontSize: 22, lineHeight: 27, fontWeight: "900", marginTop: 3 },
  rowArrow: { color: colors.coral, fontSize: 22, fontWeight: "900" },
  deckList: { borderTopWidth: 1, borderTopColor: colors.line },
  deckRow: { minHeight: 70, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 18 },
  rowPressed: { backgroundColor: colors.cream },
  deckIdentity: { flex: 1 },
  code: { color: colors.coral, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  deckName: { color: colors.ink, fontSize: 16, lineHeight: 21, fontWeight: "800", marginTop: 3 },
  deckNumbers: { alignItems: "flex-end", gap: 2 },
  due: { color: colors.ink, fontSize: 12, fontWeight: "900" },
  newCount: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  clearText: { color: colors.success, fontSize: 10, fontWeight: "900" },
  mapRow: { marginTop: 42, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.line, gap: 18 },
  mapRowDesktop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mapTitle: { color: colors.ink, fontSize: 25, fontWeight: "900", marginTop: 5 },
  secondary: { alignSelf: "flex-start", minHeight: 44, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  guestRow: { marginTop: 32, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: "row", justifyContent: "space-between" },
  guestText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  guestAction: { color: colors.ink, fontSize: 11, fontWeight: "900" },
  pressed: { opacity: 0.68 },
});

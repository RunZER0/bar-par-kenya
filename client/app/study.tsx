import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { StatePanel } from "@/components/StatePanel";
import { api, type CardReview, type Deck, type StudyCard } from "@/api";
import { colors, radii, shadow } from "@/theme";

type Phase = "loading" | "ready" | "empty" | "error";

function dueLabel(deck: Deck) {
  if (deck.due > 0) return String(deck.due) + " due";
  if (deck.newCount > 0) return String(deck.newCount) + " new";
  return "Clear";
}

function ratingHint(rating: CardReview["rating"]) {
  if (rating === "again") return "10m";
  if (rating === "hard") return "1d";
  if (rating === "good") return "Next";
  return "Later";
}

export default function Study() {
  const { width } = useWindowDimensions();
  const desktop = width >= 920;
  const [phase, setPhase] = useState<Phase>("loading");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nextDueAt, setNextDueAt] = useState<string | null>(null);

  const card = cards[index] ?? null;
  const remaining = Math.max(0, cards.length - index);
  const progress = cards.length ? Math.round((index / cards.length) * 100) : 0;

  async function loadDecks() {
    setPhase("loading");
    try {
      const data = await api.listDecks();
      setDecks(data);
      const first = data.find((item) => item.due + item.newCount > 0) ?? data[0] ?? null;
      setSelectedDeck(first);
      if (!first) {
        setPhase("empty");
        return;
      }
      await openDeck(first);
    } catch {
      setPhase("error");
    }
  }

  async function openDeck(deck: Deck) {
    setSelectedDeck(deck);
    setIndex(0);
    setRevealed(false);
    setPhase("loading");
    try {
      const session = await api.startCardSession(deck.subjectId);
      setCards(session.cards);
      setNextDueAt(session.nextDueAt);
      setPhase(session.cards.length ? "ready" : "empty");
    } catch {
      setPhase("error");
    }
  }

  async function rate(rating: CardReview["rating"]) {
    if (!card || !revealed || saving) return;
    setSaving(true);
    try {
      await api.reviewCard(card.id, rating);
      if (index + 1 >= cards.length) {
        if (selectedDeck) {
          const refreshed = await api.listDecks();
          setDecks(refreshed);
          const current = refreshed.find((item) => item.subjectId === selectedDeck.subjectId) ?? selectedDeck;
          setSelectedDeck(current);
        }
        setIndex(cards.length);
        setRevealed(false);
        setPhase("empty");
      } else {
        setIndex((value) => value + 1);
        setRevealed(false);
      }
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { void loadDecks(); }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (event: KeyboardEvent) => {
      if (!card || saving) return;
      if (event.code === "Space") {
        event.preventDefault();
        setRevealed((value) => !value);
        return;
      }
      if (!revealed) return;
      if (event.key === "1") void rate("again");
      if (event.key === "2") void rate("hard");
      if (event.key === "3") void rate("good");
      if (event.key === "4") void rate("easy");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [card, revealed, saving, index]);

  const dueTotal = useMemo(() => decks.reduce((sum, deck) => sum + deck.due + deck.newCount, 0), [decks]);

  return (
    <View style={styles.page}>
      <AppHeader />
      <View style={[styles.body, desktop && styles.bodyDesktop]}>
        <View style={[styles.deckRail, desktop && styles.deckRailDesktop]}>
          <View style={styles.railHead}>
            <Text style={styles.kicker}>FLASHCARDS</Text>
            <Text style={styles.railTotal}>{dueTotal}</Text>
          </View>
          <ScrollView
            horizontal={!desktop}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.deckList, !desktop && styles.deckListMobile]}
          >
            {decks.map((deck) => {
              const active = selectedDeck?.subjectId === deck.subjectId;
              return (
                <Pressable
                  key={deck.subjectId}
                  onPress={() => void openDeck(deck)}
                  style={({ pressed }) => [styles.deckButton, active && styles.deckButtonActive, pressed && styles.pressed]}
                >
                  <View style={styles.deckButtonTop}>
                    <Text style={[styles.deckCode, active && styles.deckCodeActive]}>{deck.unitCode}</Text>
                    <Text style={[styles.deckDue, active && styles.deckDueActive]}>{dueLabel(deck)}</Text>
                  </View>
                  <Text numberOfLines={2} style={[styles.deckName, active && styles.deckNameActive]}>{deck.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.stage}>
          <View style={styles.stageTop}>
            <View>
              <Text style={styles.kicker}>{selectedDeck?.unitCode ?? "ATP"}</Text>
              <Text style={styles.stageTitle}>{selectedDeck?.name ?? "Flashcards"}</Text>
            </View>
            <View style={styles.counterWrap}>
              <Text style={styles.counter}>{remaining}</Text>
              <Text style={styles.counterLabel}>LEFT</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: String(progress) + "%" }]} />
          </View>

          {phase === "loading" ? (
            <StatePanel title="Loading cards…" />
          ) : phase === "error" ? (
            <StatePanel title="Could not load this deck." action="Try again" onPress={() => selectedDeck ? void openDeck(selectedDeck) : void loadDecks()} />
          ) : phase === "empty" ? (
            <StatePanel
              title={nextDueAt ? "Deck clear for now." : "No cards in this deck yet."}
              action={decks.some((item) => item.subjectId !== selectedDeck?.subjectId && item.due + item.newCount > 0) ? "Next deck" : undefined}
              onPress={() => {
                const next = decks.find((item) => item.subjectId !== selectedDeck?.subjectId && item.due + item.newCount > 0);
                if (next) void openDeck(next);
              }}
            />
          ) : card ? (
            <>
              <Pressable onPress={() => setRevealed((value) => !value)} style={({ pressed }) => [styles.card, revealed && styles.cardRevealed, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardLabel, revealed && styles.cardLabelDark]}>{revealed ? "ANSWER" : "RECALL"}</Text>
                  <Text style={[styles.cardPosition, revealed && styles.cardLabelDark]}>{String(index + 1).padStart(2, "0")} / {String(cards.length).padStart(2, "0")}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.topic, revealed && styles.topicDark]}>{card.topicName}</Text>
                  <Text style={[styles.cardText, revealed && styles.cardTextDark]}>{revealed ? card.back : card.front}</Text>
                  {revealed && card.source ? <Text style={styles.source}>{card.source}</Text> : null}
                </View>
                <Text style={[styles.cardFooter, revealed && styles.topicDark]}>{revealed ? "Rate the recall." : "Tap to reveal."}</Text>
              </Pressable>

              <View style={styles.controls}>
                {!revealed ? (
                  <Pressable onPress={() => setRevealed(true)} style={({ pressed }) => [styles.reveal, pressed && styles.pressed]}>
                    <Text style={styles.revealText}>Reveal answer</Text>
                    <Text style={styles.revealArrow}>↓</Text>
                  </Pressable>
                ) : (
                  <View style={styles.ratingGrid}>
                    {(["again", "hard", "good", "easy"] as const).map((rating, ratingIndex) => (
                      <Pressable
                        key={rating}
                        disabled={saving}
                        onPress={() => void rate(rating)}
                        style={({ pressed }) => [styles.rateButton, rating === "again" && styles.rateAgain, pressed && styles.pressed]}
                      >
                        <Text style={[styles.rateKey, rating === "again" && styles.rateAgainText]}>{ratingIndex + 1}</Text>
                        <Text style={[styles.rateName, rating === "again" && styles.rateAgainText]}>{rating[0].toUpperCase() + rating.slice(1)}</Text>
                        <Text style={[styles.rateHint, rating === "again" && styles.rateAgainHint]}>{ratingHint(rating)}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
              {Platform.OS === "web" ? <Text style={styles.keyboard}>Space reveal · 1 Again · 2 Hard · 3 Good · 4 Easy</Text> : null}
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  body: { flex: 1, width: "100%", maxWidth: 1320, alignSelf: "center", padding: 16, gap: 16 },
  bodyDesktop: { flexDirection: "row", padding: 28, gap: 22 },
  deckRail: { gap: 12 },
  deckRailDesktop: { width: 280, flexShrink: 0 },
  railHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  kicker: { color: colors.coral, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  railTotal: { minWidth: 28, height: 28, borderRadius: 14, backgroundColor: colors.ink, color: "#fff", textAlign: "center", lineHeight: 28, fontSize: 11, fontWeight: "900" },
  deckList: { gap: 8 },
  deckListMobile: { paddingRight: 16 },
  deckButton: { minWidth: 220, padding: 15, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  deckButtonActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  deckButtonTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  deckCode: { color: colors.coral, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  deckCodeActive: { color: colors.lime },
  deckDue: { color: colors.muted, fontSize: 9, fontWeight: "800" },
  deckDueActive: { color: "#9CB0AA" },
  deckName: { color: colors.ink, marginTop: 10, fontSize: 15, lineHeight: 19, fontWeight: "800" },
  deckNameActive: { color: "#fff" },
  pressed: { opacity: 0.72 },
  stage: { flex: 1, minWidth: 0, maxWidth: 860, alignSelf: "center", width: "100%" },
  stageTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 20, marginBottom: 16 },
  stageTitle: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: "900", letterSpacing: -1.2, marginTop: 5 },
  counterWrap: { alignItems: "flex-end" },
  counter: { color: colors.ink, fontSize: 26, lineHeight: 28, fontWeight: "900" },
  counterLabel: { color: colors.muted, fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  progressTrack: { height: 4, backgroundColor: "#E5E9E2", borderRadius: 2, overflow: "hidden", marginBottom: 18 },
  progressFill: { height: "100%", backgroundColor: colors.coral },
  card: { minHeight: 430, padding: 28, borderRadius: radii.lg, backgroundColor: colors.ink, justifyContent: "space-between", ...shadow },
  cardRevealed: { backgroundColor: colors.lime },
  cardPressed: { transform: [{ scale: 0.995 }] },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  cardLabel: { color: colors.lime, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  cardLabelDark: { color: colors.ink2 },
  cardPosition: { color: "#809A93", fontSize: 10, fontWeight: "800" },
  cardBody: { paddingVertical: 44 },
  topic: { color: "#8FA69F", fontSize: 10, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 14 },
  topicDark: { color: "#61705B" },
  cardText: { maxWidth: 690, color: "#fff", fontSize: 32, lineHeight: 40, fontWeight: "800", letterSpacing: -1.05 },
  cardTextDark: { color: colors.ink },
  source: { color: "#61705B", marginTop: 24, fontSize: 11, lineHeight: 16, fontWeight: "700" },
  cardFooter: { color: "#8FA69F", fontSize: 10, fontWeight: "700" },
  controls: { marginTop: 12 },
  reveal: { minHeight: 54, paddingHorizontal: 20, borderRadius: radii.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20 },
  revealText: { color: colors.ink, fontSize: 13, fontWeight: "900" },
  revealArrow: { color: colors.coral, fontSize: 18, fontWeight: "900" },
  ratingGrid: { flexDirection: "row", gap: 7 },
  rateButton: { flex: 1, minHeight: 64, paddingHorizontal: 8, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  rateAgain: { borderColor: "#E9C7BE", backgroundColor: "#FFF2EE" },
  rateKey: { position: "absolute", top: 8, right: 9, color: "#A1ACA7", fontSize: 8, fontWeight: "900" },
  rateName: { color: colors.ink, fontSize: 12, fontWeight: "900" },
  rateHint: { color: colors.muted, fontSize: 9, fontWeight: "800", marginTop: 4 },
  rateAgainText: { color: colors.danger },
  rateAgainHint: { color: "#B8796E" },
  keyboard: { color: colors.muted, textAlign: "center", fontSize: 9, fontWeight: "700", marginTop: 12 },
});

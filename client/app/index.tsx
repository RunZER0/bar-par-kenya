import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { Brand } from "@/components/Brand";
import { colors, radii, shadow } from "@/theme";

const units = [
  ["ATP100", "Civil Litigation"],
  ["ATP101", "Criminal Litigation"],
  ["ATP102", "Probate & Administration"],
  ["ATP103", "Legal Writing & Drafting"],
  ["ATP104", "Trial Advocacy"],
  ["ATP105", "Professional Ethics & Practice"],
  ["ATP106", "Legal Practice Management"],
  ["ATP107", "Conveyancing"],
  ["ATP108", "Commercial Transactions"],
] as const;

export default function Landing() {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;

  return (
    <View style={styles.page}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.hero, desktop && styles.heroDesktop]}>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>KENYA SCHOOL OF LAW</Text>
            <Text style={[styles.title, desktop && styles.titleDesktop]}>Know the issue.{"\n"}Recall the rule.</Text>
            <Text style={styles.meta}>9 ATP units · Flashcards · Mind maps</Text>
            <View style={styles.actions}>
              <Link href="/study" asChild>
                <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
                  <Text style={styles.primaryText}>Start flashcards</Text>
                  <Text style={styles.primaryArrow}>→</Text>
                </Pressable>
              </Link>
              <Link href="/mind-maps" asChild>
                <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                  <Text style={styles.secondaryText}>Open mind maps</Text>
                </Pressable>
              </Link>
            </View>
          </View>

          <View style={[styles.demoWrap, desktop && styles.demoWrapDesktop]}>
            <View style={styles.demoMeta}>
              <Text style={styles.demoCode}>ATP100 · CIVIL LITIGATION</Text>
              <Text style={styles.demoCount}>01 / 30</Text>
            </View>
            <View style={styles.demoCard}>
              <Text style={styles.demoLabel}>RECALL</Text>
              <Text style={styles.demoQuestion}>What must be shown for stay of execution pending appeal?</Text>
              <View style={styles.demoRule} />
              <Text style={styles.demoHint}>Reveal when you have an answer.</Text>
            </View>
            <View style={styles.ratingRow}>
              {["Again", "Hard", "Good", "Easy"].map((label) => (
                <View key={label} style={styles.rating}><Text style={styles.ratingText}>{label}</Text></View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.strip}>
          <Text style={styles.stripNumber}>09</Text>
          <Text style={styles.stripLabel}>ATP UNITS</Text>
          <View style={styles.stripRule} />
          <Text style={styles.stripNumber}>298</Text>
          <Text style={styles.stripLabel}>SYLLABUS ENTRIES MAPPED</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionKicker}>THE ATP</Text>
            <Text style={styles.sectionTitle}>Everything has a place.</Text>
          </View>
          <View style={[styles.unitGrid, desktop && styles.unitGridDesktop]}>
            {units.map(([code, name], index) => (
              <View key={code} style={styles.unit}>
                <Text style={styles.unitIndex}>{String(index + 1).padStart(2, "0")}</Text>
                <Text style={styles.unitCode}>{code}</Text>
                <Text style={styles.unitName}>{name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.bottom, desktop && styles.bottomDesktop]}>
          <View>
            <Text style={styles.bottomKicker}>FLASHCARDS</Text>
            <Text style={styles.bottomTitle}>Recall what matters.</Text>
          </View>
          <View>
            <Text style={styles.bottomKicker}>MIND MAPS</Text>
            <Text style={styles.bottomTitle}>See how it connects.</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Brand compact />
          <Text style={styles.footerText}>Built for KSL.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingBottom: 44 },
  hero: { paddingHorizontal: 20, paddingTop: 58, paddingBottom: 60, gap: 42, maxWidth: 1240, width: "100%", alignSelf: "center" },
  heroDesktop: { minHeight: 650, paddingHorizontal: 44, paddingTop: 90, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 80 },
  heroCopy: { flex: 1, maxWidth: 650 },
  kicker: { color: colors.coral, fontSize: 11, fontWeight: "800", letterSpacing: 1.6, marginBottom: 18 },
  title: { color: colors.ink, fontSize: 52, lineHeight: 54, fontWeight: "900", letterSpacing: -2.8 },
  titleDesktop: { fontSize: 78, lineHeight: 78, letterSpacing: -4.5 },
  meta: { color: colors.muted, marginTop: 24, fontSize: 15, fontWeight: "700" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 30 },
  primary: { minHeight: 48, paddingHorizontal: 19, borderRadius: radii.sm, backgroundColor: colors.ink, flexDirection: "row", gap: 24, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  primaryArrow: { color: colors.lime, fontSize: 18, fontWeight: "800" },
  secondary: { minHeight: 48, paddingHorizontal: 19, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.75 },
  demoWrap: { flex: 1, maxWidth: 520 },
  demoWrapDesktop: { minWidth: 440 },
  demoMeta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  demoCode: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  demoCount: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  demoCard: { minHeight: 320, padding: 30, justifyContent: "center", borderRadius: radii.lg, backgroundColor: colors.ink, ...shadow },
  demoLabel: { color: colors.lime, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  demoQuestion: { color: "#fff", fontSize: 30, lineHeight: 36, fontWeight: "800", letterSpacing: -0.7, marginTop: 22 },
  demoRule: { height: 1, backgroundColor: "rgba(255,255,255,.14)", marginTop: 30 },
  demoHint: { color: "#91A9A2", fontSize: 11, marginTop: 16, fontWeight: "600" },
  ratingRow: { flexDirection: "row", gap: 7, marginTop: 10 },
  rating: { flex: 1, minHeight: 40, borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  ratingText: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  strip: { maxWidth: 1152, width: "100%", alignSelf: "center", paddingHorizontal: 20, paddingVertical: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  stripNumber: { color: colors.coral, fontSize: 24, fontWeight: "900" },
  stripLabel: { color: colors.ink, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  stripRule: { width: 1, height: 28, backgroundColor: colors.line, marginHorizontal: 12 },
  section: { maxWidth: 1240, width: "100%", alignSelf: "center", paddingHorizontal: 20, paddingTop: 78, paddingBottom: 70 },
  sectionHead: { marginBottom: 24 },
  sectionKicker: { color: colors.coral, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  sectionTitle: { color: colors.ink, fontSize: 34, lineHeight: 40, fontWeight: "900", letterSpacing: -1.3, marginTop: 8 },
  unitGrid: { gap: 8 },
  unitGridDesktop: { flexDirection: "row", flexWrap: "wrap" },
  unit: { minHeight: 132, padding: 18, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.card, flexBasis: 250, flexGrow: 1 },
  unitIndex: { color: colors.coral, fontSize: 10, fontWeight: "900" },
  unitCode: { color: colors.muted, fontSize: 10, fontWeight: "800", marginTop: 18 },
  unitName: { color: colors.ink, fontSize: 18, lineHeight: 22, fontWeight: "800", marginTop: 5 },
  bottom: { maxWidth: 1152, width: "100%", alignSelf: "center", padding: 24, gap: 30, borderRadius: radii.lg, backgroundColor: colors.lime },
  bottomDesktop: { flexDirection: "row", justifyContent: "space-between", padding: 38 },
  bottomKicker: { color: colors.ink2, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  bottomTitle: { color: colors.ink, fontSize: 28, fontWeight: "900", letterSpacing: -1, marginTop: 6 },
  footer: { maxWidth: 1152, width: "100%", alignSelf: "center", paddingHorizontal: 20, paddingTop: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footerText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
});

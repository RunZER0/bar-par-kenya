import { Link, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { StatePanel } from "@/components/StatePanel";
import { api, type MindMapData, type MindMapNode } from "@/api";
import { colors, radii } from "@/theme";

export function generateStaticParams() {
  return [
    { slug: "civil-litigation" },
    { slug: "criminal-litigation" },
    { slug: "probate-administration" },
    { slug: "legal-writing-drafting" },
    { slug: "trial-advocacy" },
    { slug: "professional-ethics" },
    { slug: "legal-practice-management" },
    { slug: "conveyancing" },
    { slug: "commercial-transactions" },
  ];
}

export default function MindMapDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [data, setData] = useState<MindMapData | null>(null);
  const [selectedTopicKey, setSelectedTopicKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  async function load() {
    if (!slug) return;
    setState("loading");
    try {
      const map = await api.getMindMap(slug);
      setData(map);
      const firstTopic = map.nodes.find((node) => node.kind === "topic");
      setSelectedTopicKey(firstTopic?.key ?? null);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => { void load(); }, [slug]);

  const root = data?.nodes.find((node) => node.kind === "unit") ?? null;
  const topics = useMemo(
    () => (data?.nodes ?? []).filter((node) => node.kind === "topic" && node.parentKey === root?.key),
    [data, root?.key],
  );
  const selectedTopic = topics.find((node) => node.key === selectedTopicKey) ?? topics[0] ?? null;
  const allIssues = useMemo(
    () => (data?.nodes ?? []).filter((node) => node.kind === "issue"),
    [data],
  );
  const issues = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized) {
      return allIssues.filter((node) => {
        if (node.label.toLowerCase().includes(normalized)) return true;
        const parent = topics.find((topic) => topic.key === node.parentKey);
        return parent?.label.toLowerCase().includes(normalized) ?? false;
      });
    }
    return allIssues.filter((node) => node.parentKey === selectedTopic?.key);
  }, [allIssues, query, selectedTopic?.key, topics]);

  const topicIssueCount = (topic: MindMapNode) => allIssues.filter((node) => node.parentKey === topic.key).length;

  return (
    <View style={styles.page}>
      <AppHeader />
      <View style={styles.toolbar}>
        <Link href="/mind-maps" asChild>
          <Pressable style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>← Maps</Text>
          </Pressable>
        </Link>
        <View style={styles.searchWrap}>
          <Text style={styles.searchGlyph}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Find an issue"
            placeholderTextColor="#93A09B"
            style={styles.search}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={10}>
              <Text style={styles.clear}>×</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {state === "loading" ? (
        <View style={styles.state}><StatePanel title="Loading map…" /></View>
      ) : state === "error" ? (
        <View style={styles.state}><StatePanel title="Could not load this map." action="Try again" onPress={() => void load()} /></View>
      ) : data && root ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.heading, desktop && styles.headingDesktop]}>
            <View style={styles.headingMain}>
              <Text style={styles.kicker}>{data.unitCode}</Text>
              <Text style={[styles.title, desktop && styles.titleDesktop]}>{data.name}</Text>
              <View style={styles.counts}>
                <Text style={styles.count}>{topics.length} topics</Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.count}>{allIssues.length} issues</Text>
              </View>
            </View>
            <Link
              href={{
                pathname: "/study",
                params: selectedTopic?.topicId && (selectedTopic.cardCount ?? 0) > 0
                  ? { subjectId: data.subjectId, topicId: selectedTopic.topicId }
                  : { subjectId: data.subjectId },
              }}
              asChild
            >
              <Pressable style={({ pressed }) => [styles.studyButton, pressed && styles.pressed]}>
                <Text style={styles.studyButtonText}>
                  {selectedTopic?.topicId && (selectedTopic.cardCount ?? 0) > 0 ? "Study topic" : "Study unit"}
                </Text>
                <Text style={styles.studyButtonArrow}>→</Text>
              </Pressable>
            </Link>
          </View>

          {desktop ? (
            <View style={styles.canvas}>
              <View style={styles.rootColumn}>
                <View style={styles.rootNode}>
                  <Text style={styles.rootCode}>{data.unitCode}</Text>
                  <Text style={styles.rootName}>{data.name}</Text>
                </View>
              </View>

              <View style={styles.connectorColumn}>
                <View style={styles.trunk} />
              </View>

              <View style={styles.topicColumn}>
                <Text style={styles.columnLabel}>TOPICS</Text>
                <ScrollView style={styles.topicScroll} contentContainerStyle={styles.topicList} nestedScrollEnabled>
                  {topics.map((topic) => {
                    const active = selectedTopic?.key === topic.key && !query;
                    return (
                      <Pressable
                        key={topic.key}
                        onPress={() => { setSelectedTopicKey(topic.key); setQuery(""); }}
                        style={({ pressed }) => [styles.topicNode, active && styles.topicNodeActive, pressed && styles.pressed]}
                      >
                        <View style={[styles.branchPoint, active && styles.branchPointActive]} />
                        <Text style={[styles.topicText, active && styles.topicTextActive]}>{topic.label}</Text>
                        <Text style={[styles.topicCount, active && styles.topicCountActive]}>{topicIssueCount(topic)}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.connectorColumn}>
                <View style={[styles.trunk, styles.trunkLight]} />
              </View>

              <View style={styles.issueColumn}>
                <View style={styles.issueHead}>
                  <Text style={styles.columnLabel}>{query ? "SEARCH" : "ISSUES"}</Text>
                  <Text style={styles.issueCount}>{issues.length}</Text>
                </View>
                <ScrollView style={styles.issueScroll} contentContainerStyle={styles.issueList} nestedScrollEnabled>
                  {issues.length ? issues.map((issue, index) => (
                    <View key={issue.key} style={styles.issueNode}>
                      <Text style={styles.issueIndex}>{String(index + 1).padStart(2, "0")}</Text>
                      <Text style={styles.issueText}>{issue.label}</Text>
                    </View>
                  )) : <Text style={styles.noResult}>No matching issue.</Text>}
                </ScrollView>
              </View>
            </View>
          ) : (
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mobileTopics}>
                {topics.map((topic) => {
                  const active = selectedTopic?.key === topic.key && !query;
                  return (
                    <Pressable
                      key={topic.key}
                      onPress={() => { setSelectedTopicKey(topic.key); setQuery(""); }}
                      style={({ pressed }) => [styles.mobileTopic, active && styles.mobileTopicActive, pressed && styles.pressed]}
                    >
                      <Text style={[styles.mobileTopicText, active && styles.mobileTopicTextActive]}>{topic.label}</Text>
                      <Text style={[styles.mobileTopicCount, active && styles.mobileTopicTextActive]}>{topicIssueCount(topic)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.mobileIssueHead}>
                <Text style={styles.columnLabel}>{query ? "SEARCH" : selectedTopic?.label ?? "ISSUES"}</Text>
                <Text style={styles.issueCount}>{issues.length}</Text>
              </View>
              <View style={styles.mobileIssueList}>
                {issues.length ? issues.map((issue, index) => (
                  <View key={issue.key} style={styles.mobileIssue}>
                    <Text style={styles.issueIndex}>{String(index + 1).padStart(2, "0")}</Text>
                    <Text style={styles.mobileIssueText}>{issue.label}</Text>
                  </View>
                )) : <Text style={styles.noResult}>No matching issue.</Text>}
              </View>
            </View>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  toolbar: {
    minHeight: 62,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    backgroundColor: colors.card,
  },
  back: { minHeight: 44, paddingRight: 12, justifyContent: "center" },
  backText: { color: colors.ink, fontSize: 12, fontWeight: "900" },
  searchWrap: {
    flex: 1,
    maxWidth: 360,
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.paper,
  },
  searchGlyph: { color: colors.muted, fontSize: 16 },
  search: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: "700", outlineStyle: "none" } as any,
  clear: { color: colors.muted, fontSize: 18, lineHeight: 20 },
  pressed: { opacity: 0.68 },
  state: { padding: 20, maxWidth: 900, width: "100%", alignSelf: "center" },
  scroll: { width: "100%", maxWidth: 1320, alignSelf: "center", padding: 20, paddingBottom: 120 },
  heading: { marginVertical: 20, gap: 18 },
  headingDesktop: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  headingMain: { flex: 1, minWidth: 0 },
  studyButton: { minHeight: 44, paddingHorizontal: 15, borderRadius: radii.sm, backgroundColor: colors.ink, flexDirection: "row", alignItems: "center", gap: 18, alignSelf: "flex-start" },
  studyButtonText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  studyButtonArrow: { color: colors.lime, fontSize: 16, fontWeight: "900" },
  kicker: { color: colors.coral, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 38, lineHeight: 42, fontWeight: "900", letterSpacing: -1.8, marginTop: 7 },
  titleDesktop: { fontSize: 50, lineHeight: 54, letterSpacing: -2.4 },
  counts: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 12 },
  count: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  dot: { color: colors.coral, fontSize: 11 },
  canvas: {
    minHeight: 620,
    maxHeight: 720,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  rootColumn: { width: 220, alignItems: "center", justifyContent: "center", padding: 18 },
  rootNode: { width: "100%", minHeight: 130, padding: 20, borderRadius: radii.md, backgroundColor: colors.ink, justifyContent: "center" },
  rootCode: { color: colors.lime, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  rootName: { color: "#fff", fontSize: 20, lineHeight: 25, fontWeight: "900", marginTop: 8 },
  connectorColumn: { width: 34, alignItems: "center", justifyContent: "center" },
  trunk: { width: 1, height: "76%", backgroundColor: colors.coral },
  trunkLight: { backgroundColor: colors.line },
  topicColumn: { width: 330, paddingVertical: 18 },
  columnLabel: { color: colors.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1.4 },
  topicScroll: { marginTop: 12 },
  topicList: { gap: 7, paddingRight: 12, paddingBottom: 16 },
  topicNode: { minHeight: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm, backgroundColor: colors.paper, flexDirection: "row", alignItems: "center", gap: 10 },
  topicNodeActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  branchPoint: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#C7CFC9" },
  branchPointActive: { backgroundColor: colors.ink },
  topicText: { flex: 1, color: colors.ink, fontSize: 12, lineHeight: 16, fontWeight: "800" },
  topicTextActive: { color: colors.ink },
  topicCount: { color: colors.muted, fontSize: 9, fontWeight: "900" },
  topicCountActive: { color: colors.ink2 },
  issueColumn: { flex: 1, minWidth: 0, paddingVertical: 18, paddingRight: 18 },
  issueHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  issueCount: { color: colors.coral, fontSize: 10, fontWeight: "900" },
  issueScroll: { marginTop: 12 },
  issueList: { gap: 7, paddingBottom: 16 },
  issueNode: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: "row", alignItems: "center", gap: 12 },
  issueIndex: { color: colors.coral, width: 24, fontSize: 9, fontWeight: "900" },
  issueText: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  noResult: { color: colors.muted, fontSize: 12, fontWeight: "700", paddingVertical: 30 },
  mobileTopics: { gap: 7, paddingBottom: 18 },
  mobileTopic: { maxWidth: 230, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", gap: 12 },
  mobileTopicActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  mobileTopicText: { flexShrink: 1, color: colors.ink, fontSize: 11, lineHeight: 15, fontWeight: "800" },
  mobileTopicTextActive: { color: "#fff" },
  mobileTopicCount: { color: colors.muted, fontSize: 9, fontWeight: "900" },
  mobileIssueHead: { paddingTop: 16, paddingBottom: 10, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: "row", justifyContent: "space-between", gap: 14 },
  mobileIssueList: { gap: 7 },
  mobileIssue: { minHeight: 58, padding: 14, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  mobileIssueText: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: "800" },
});

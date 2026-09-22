import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { StatePanel } from "@/components/StatePanel";
import { api, type Learner } from "@/api";
import { colors, radii } from "@/theme";

type Mode = "register" | "login";

export default function Account() {
  const [learner, setLearner] = useState<Learner | null>(null);
  const [mode, setMode] = useState<Mode>("register");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("");

  async function load() {
    setState("loading");
    try {
      setLearner(await api.me());
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  async function submit() {
    setState("saving");
    setMessage("");
    try {
      const next = mode === "register"
        ? await api.register({ displayName: displayName.trim(), email: email.trim(), password })
        : await api.login({ email: email.trim(), password });
      setLearner(next);
      setPassword("");
      setState("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not continue.");
      setState("ready");
    }
  }

  async function signOut() {
    await api.logout();
    setLearner(null);
    setDisplayName("");
    setEmail("");
    setPassword("");
    setMode("login");
    await load();
  }

  const registered = learner?.kind === "registered";

  return (
    <View style={styles.page}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <Text style={styles.kicker}>ACCOUNT</Text>
          <Text style={styles.title}>{registered ? learner?.displayName || "Your account" : "Protect your progress"}</Text>
          {registered ? <Text style={styles.email}>{learner?.email}</Text> : null}
        </View>

        {state === "loading" ? (
          <StatePanel title="Loading account…" />
        ) : state === "error" ? (
          <StatePanel title="Could not load your account." action="Try again" onPress={() => void load()} />
        ) : registered ? (
          <View style={styles.panel}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Status</Text>
              <Text style={styles.rowValue}>Synced</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={styles.rowValue}>{learner?.email}</Text>
            </View>
            <Pressable onPress={() => void signOut()} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Text style={styles.secondaryText}>Sign out</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.panel}>
            <View style={styles.switcher}>
              <Pressable onPress={() => { setMode("register"); setMessage(""); }} style={[styles.switch, mode === "register" && styles.switchActive]}>
                <Text style={[styles.switchText, mode === "register" && styles.switchTextActive]}>Create account</Text>
              </Pressable>
              <Pressable onPress={() => { setMode("login"); setMessage(""); }} style={[styles.switch, mode === "login" && styles.switchActive]}>
                <Text style={[styles.switchText, mode === "login" && styles.switchTextActive]}>Sign in</Text>
              </Pressable>
            </View>

            {mode === "register" ? (
              <View style={styles.field}>
                <Text style={styles.label}>Name</Text>
                <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Your name" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="words" />
              </View>
            ) : null}
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" keyboardType="email-address" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput value={password} onChangeText={setPassword} placeholder={mode === "register" ? "10+ characters" : "Password"} placeholderTextColor={colors.muted} style={styles.input} secureTextEntry />
            </View>

            {message ? <Text style={styles.error}>{message}</Text> : null}

            <Pressable
              disabled={state === "saving" || !email.trim() || !password || (mode === "register" && displayName.trim().length < 2)}
              onPress={() => void submit()}
              style={({ pressed }) => [styles.primary, (state === "saving" || !email.trim() || !password || (mode === "register" && displayName.trim().length < 2)) && styles.disabled, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>{state === "saving" ? "Saving…" : mode === "register" ? "Create account" : "Sign in"}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  scroll: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 20, paddingTop: 48, paddingBottom: 40 },
  head: { marginBottom: 24 },
  kicker: { color: colors.coral, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 42, lineHeight: 46, fontWeight: "900", letterSpacing: -2, marginTop: 8 },
  email: { color: colors.muted, fontSize: 13, marginTop: 8 },
  panel: { padding: 22, borderTopWidth: 1, borderTopColor: colors.line, gap: 16 },
  switcher: { flexDirection: "row", gap: 6, marginBottom: 4 },
  switch: { flex: 1, minHeight: 42, borderRadius: radii.sm, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  switchActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  switchText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  switchTextActive: { color: "#fff" },
  field: { gap: 7 },
  label: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm, backgroundColor: colors.card, paddingHorizontal: 14, color: colors.ink, fontSize: 14 },
  error: { color: colors.danger, fontSize: 12, fontWeight: "700" },
  primary: { minHeight: 48, borderRadius: radii.sm, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  secondary: { minHeight: 44, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", marginTop: 10 },
  secondaryText: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  rowLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  rowValue: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  divider: { height: 1, backgroundColor: colors.line },
});

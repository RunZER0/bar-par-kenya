import { Link, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { StatePanel } from "@/components/StatePanel";
import { api, type Learner } from "@/api";
import { colors, radii } from "@/theme";

type Mode = "register" | "login";

export default function Account() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [learner, setLearner] = useState<Learner | null>(null);
  const [mode, setMode] = useState<Mode>(params.mode === "login" ? "login" : "register");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setState("loading");
    try {
      setLearner(await api.getMe());
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  async function submit() {
    setMessage(null);
    setSaving(true);
    try {
      const result = mode === "register"
        ? await api.registerAccount({ displayName: displayName.trim(), email: email.trim(), password })
        : await api.login({ email: email.trim(), password });
      setLearner(result.learner);
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not continue.");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    setMessage(null);
    setSaving(true);
    try {
      await api.logout();
      setLearner(null);
      setDisplayName("");
      setEmail("");
      setPassword("");
      setMode("login");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setSaving(false);
    }
  }

  const disabled = saving
    || !email.trim()
    || password.length < (mode === "register" ? 10 : 1)
    || (mode === "register" && displayName.trim().length < 2);

  return (
    <View style={styles.page}>
      <AppHeader />
      {state === "loading" ? (
        <View style={styles.state}><StatePanel title="Loading…" /></View>
      ) : state === "error" ? (
        <View style={styles.state}><StatePanel title="Could not load account." action="Try again" onPress={() => void load()} /></View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {learner?.kind === "registered" ? (
              <View style={styles.profile}>
                <Text style={styles.eyebrow}>ACCOUNT</Text>
                <Text style={styles.title}>{learner.displayName || "Account"}</Text>
                <Text style={styles.email}>{learner.email}</Text>
                {message ? <Text style={styles.error}>{message}</Text> : null}
                <View style={styles.profileActions}>
                  <Link href="/" asChild>
                    <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
                      <Text style={styles.primaryText}>Today</Text>
                    </Pressable>
                  </Link>
                  <Pressable disabled={saving} onPress={() => void signOut()} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                    <Text style={styles.secondaryText}>Sign out</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.formWrap}>
                <Text style={styles.eyebrow}>ACCOUNT</Text>
                <Text style={styles.title}>{mode === "register" ? "Save progress" : "Sign in"}</Text>

                <View style={styles.tabs}>
                  <Pressable onPress={() => { setMode("register"); setMessage(null); }} style={[styles.tab, mode === "register" && styles.tabActive]}>
                    <Text style={[styles.tabText, mode === "register" && styles.tabTextActive]}>Save progress</Text>
                  </Pressable>
                  <Pressable onPress={() => { setMode("login"); setMessage(null); }} style={[styles.tab, mode === "login" && styles.tabActive]}>
                    <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>Sign in</Text>
                  </Pressable>
                </View>

                <View style={styles.form}>
                  {mode === "register" ? (
                    <View style={styles.field}>
                      <Text style={styles.label}>Name</Text>
                      <TextInput
                        value={displayName}
                        onChangeText={setDisplayName}
                        autoCapitalize="words"
                        autoComplete="name"
                        style={styles.input}
                      />
                    </View>
                  ) : null}

                  <View style={styles.field}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                      style={styles.input}
                    />
                    {mode === "register" ? <Text style={styles.fieldMeta}>10+ characters</Text> : null}
                  </View>

                  {message ? <Text style={styles.error}>{message}</Text> : null}

                  <Pressable
                    disabled={disabled}
                    onPress={() => void submit()}
                    style={({ pressed }) => [styles.submit, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
                  >
                    <Text style={styles.submitText}>{saving ? "Saving…" : mode === "register" ? "Save progress" : "Sign in"}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  state: { flex: 1, padding: 20, maxWidth: 760, width: "100%", alignSelf: "center", justifyContent: "center" },
  scroll: { width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: 20, paddingTop: 54, paddingBottom: 120 },
  profile: { paddingTop: 20 },
  formWrap: { paddingTop: 8 },
  eyebrow: { color: colors.coral, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: colors.ink, fontSize: 46, lineHeight: 50, fontWeight: "900", letterSpacing: -2.2, marginTop: 8 },
  email: { color: colors.muted, fontSize: 14, fontWeight: "700", marginTop: 10 },
  profileActions: { flexDirection: "row", gap: 10, marginTop: 30 },
  tabs: { flexDirection: "row", gap: 6, marginTop: 28, marginBottom: 28, borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { paddingHorizontal: 2, paddingVertical: 12, marginRight: 18, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.ink },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  tabTextActive: { color: colors.ink },
  form: { gap: 18 },
  field: { gap: 7 },
  label: { color: colors.ink2, fontSize: 11, fontWeight: "800" },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    backgroundColor: colors.card,
    color: colors.ink,
    fontSize: 15,
    outlineStyle: "none",
  } as any,
  fieldMeta: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  submit: { minHeight: 50, borderRadius: radii.sm, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", marginTop: 4 },
  submitText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  disabled: { opacity: 0.35 },
  primary: { minHeight: 46, paddingHorizontal: 18, borderRadius: radii.sm, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  secondary: { minHeight: 46, paddingHorizontal: 18, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.66 },
});

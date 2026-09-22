import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={[styles.mark, compact && styles.markSmall]}>
        <Text style={styles.markText}>BP</Text>
      </View>
      <Text style={[styles.word, compact && styles.wordSmall]}>bar par<Text style={styles.dot}>.</Text></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  mark: {
    width: 38, height: 38, borderRadius: 12, borderBottomLeftRadius: 4,
    backgroundColor: colors.lime, alignItems: "center", justifyContent: "center",
  },
  markSmall: { width: 32, height: 32, borderRadius: 10, borderBottomLeftRadius: 3 },
  markText: { color: colors.ink, fontWeight: "900", fontSize: 12, letterSpacing: -0.6 },
  word: { color: colors.ink, fontWeight: "800", fontSize: 21, letterSpacing: -0.8 },
  wordSmall: { fontSize: 18 },
  dot: { color: colors.coral },
});

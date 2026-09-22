import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "@/theme";

type Props = {
  title: string;
  action?: string;
  onPress?: () => void;
};

export function StatePanel({ title, action, onPress }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {action && onPress ? (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    padding: 28,
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  button: {
    minHeight: 44,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
    backgroundColor: colors.ink,
  },
  pressed: { opacity: 0.76 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});

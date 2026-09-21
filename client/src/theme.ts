import { Platform } from "react-native";

export const colors = {
  ink: "#102D2A",
  ink2: "#1B4841",
  paper: "#F4F5F0",
  card: "#FFFFFF",
  line: "#DDE3DB",
  muted: "#70807A",
  lime: "#D8ED9B",
  coral: "#EE765F",
  cream: "#F2EDE3",
  success: "#2E7D5B",
  danger: "#B54D3D",
};

export const radii = { sm: 10, md: 16, lg: 24, pill: 999 };

export const shadow = Platform.select({
  web: { boxShadow: "0 20px 60px rgba(16,45,42,.10)" } as any,
  default: {
    shadowColor: "#102D2A",
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
});

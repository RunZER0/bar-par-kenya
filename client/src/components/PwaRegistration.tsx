import { useEffect } from "react";
import { Platform } from "react-native";

export function PwaRegistration() {
  useEffect(() => {
    if (Platform.OS !== "web" || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (!cancelled) void registration.update();
      } catch {
        // The app remains fully usable when service workers are unavailable.
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}

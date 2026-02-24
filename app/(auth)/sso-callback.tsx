// screens/sso-callback.tsx

import { useEffect, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

export default function SSOCallback() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isLoaded || hasRedirected.current) return;

    // ✅ Login concluído com sucesso
    if (isSignedIn) {
      hasRedirected.current = true;
      router.replace("/(tabs)");
      return;
    }

    // ❌ Login cancelado → volta para login após pequeno delay
    const timeout = setTimeout(() => {
      hasRedirected.current = true;
      router.replace("/(auth)");
    }, 800);

    return () => clearTimeout(timeout);
  }, [isLoaded, isSignedIn]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
      }}
    >
      <ActivityIndicator size="large" />
    </View>
  );
}

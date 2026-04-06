// RootLayout.tsx
import React from "react";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import "../global.css";

// Importa a variável pública do Expo
import { EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY } from "@env";

const queryClient = new QueryClient();

export default function RootLayout() {
  if (!EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      "Missing Clerk publishableKey. Configure EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env file."
    );
  }

  return (
    <ClerkProvider
      publishableKey={EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="dark" />
      </QueryClientProvider>
    </ClerkProvider>
  );
}
import React, { useState, useCallback } from "react";
import { View, useColorScheme, Image } from "react-native";
import { Tabs, Redirect, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TabsLayout = () => {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const [unreadCount, setUnreadCount] = useState(0);
  const NOTIF_KEY = user ? `@notifications:${user.id}` : "";

  if (!isSignedIn) {
    return <Redirect href="/(auth)" />;
  }

  const loadUnread = useCallback(async () => {
    if (!user) return;

    try {
      const stored = await AsyncStorage.getItem(NOTIF_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      const unread = parsed.filter((n: any) => n.read === false).length;
      setUnreadCount(unread);
    } catch (e) {
      console.log("Erro ao carregar notificações:", e);
    }
  }, [user, NOTIF_KEY]);

  useFocusEffect(
    useCallback(() => {
      loadUnread();
      const interval = setInterval(loadUnread, 5000);
      return () => clearInterval(interval);
    }, [loadUnread])
  );

  // 🔥 Sempre preto ativo
  const activeTintColor = "#000000";
  const inactiveTintColor =
    colorScheme === "dark" ? "#6B7280" : "#9CA3AF";
  const backgroundColor =
    colorScheme === "dark" ? "#000000" : "#FFFFFF";

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: backgroundColor,
          borderTopWidth: 0.5,
          borderTopColor:
            colorScheme === "dark" ? "#111" : "#E5E7EB",
          height: 55 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarIcon: ({ focused, color }) => {
          // 🔥 FOTO REAL DO CLERK
          if (route.name === "profile") {
            if (user?.imageUrl) {
              return (
                <Image
                  source={{ uri: user.imageUrl }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    borderWidth: focused ? 2 : 0,
                    borderColor: focused ? "#000000" : "transparent",
                  }}
                />
              );
            }

            // fallback temporário
            return (
              <Ionicons
                name="person-outline"
                size={24}
                color={focused ? "#000000" : color}
              />
            );
          }

          let iconName = "";

          switch (route.name) {
            case "index":
              iconName = focused ? "home" : "home-outline";
              break;
            case "search":
              iconName = focused ? "search" : "search-outline";
              break;
            case "reels":
              iconName = focused
                ? "play-circle"
                : "play-circle-outline";
              break;
            case "notifications":
              iconName = focused
                ? "notifications"
                : "notifications-outline";
              break;
            case "messages":
              iconName = focused
                ? "chatbubble"
                : "chatbubble-outline";
              break;
          }

          return (
            <Ionicons
              name={iconName as any}
              size={24}
              color={focused ? "#000000" : color}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="reels" />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
};

export default TabsLayout;
// ------------------------------------------------------
// UserProfileScreen.tsx — PERFIL PÚBLICO (IG STYLE)
// VIEW ONLY (sem editar / sem logout)
// HEADER SCROLLÁVEL
// DARK MODE DINÂMICO
// Recebe username via rota (feed)
// Adicionado botão Seguir / Seguindo + Mensagem (mais próximos)
// ------------------------------------------------------

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  StatusBar,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PostsList from "@/components/PostsList";

const HEADER_OFFSET = 10;

interface Profile {
  username: string;
  name: string;
  avatar: string;
  posts: number;
  followers: number;
  following: number;
}

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>(); // usuário clicado
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false); // botão seguir
  const imageOpacity = useRef(new Animated.Value(0)).current;

  // 🔹 Simulação de fetch do usuário público
  const loadUserProfile = async () => {
    setLoading(true);

    // Simula delay de fetch
    await new Promise((r) => setTimeout(r, 400));

    // Aqui você pode substituir por sua API real
    setProfile({
      username: username || "usuario",
      name: `Usuário ${username || "Público"}`,
      avatar: `https://i.pravatar.cc/150?u=${username || "usuario"}`, // avatar único por username
      posts: Math.floor(Math.random() * 200),
      followers: Math.floor(Math.random() * 5000),
      following: Math.floor(Math.random() * 500),
    });

    setLoading(false);
  };

  useEffect(() => {
    loadUserProfile();
  }, [username]);

  if (loading || !profile) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: isDarkMode ? "#000" : "#fff" }}
      >
        <ActivityIndicator
          size="large"
          color={isDarkMode ? "#fff" : "#000"}
        />
      </View>
    );
  }

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: isDarkMode ? "#000" : "#fff" }}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#000" : "#fff"}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View
          className="flex-row items-center justify-between px-4 py-2"
          style={{ paddingTop: insets.top + HEADER_OFFSET }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Feather
              name="arrow-left"
              size={22}
              color={isDarkMode ? "#fff" : "#000"}
            />
          </TouchableOpacity>

          <View
            className="absolute left-0 right-0 flex-row justify-center items-center"
            style={{ top: insets.top + 12 }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: isDarkMode ? "#fff" : "#000",
                marginTop: -5,
              }}
            >
              {profile.username}
            </Text>
          </View>

          <View style={{ width: 22 }} />
        </View>

        {/* PROFILE */}
        <View className="px-4 mt-2">
          <View className="flex-row items-center">
            <Animated.Image
              source={{ uri: profile.avatar }}
              className="w-24 h-24 rounded-full"
              style={{ opacity: imageOpacity }}
              onLoad={() =>
                Animated.timing(imageOpacity, {
                  toValue: 1,
                  duration: 200,
                  useNativeDriver: true,
                }).start()
              }
            />

            <View className="flex-1 ml-6">
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  marginBottom: 4,
                  color: isDarkMode ? "#fff" : "#000",
                }}
              >
                {profile.name}
              </Text>

              {/* STATS */}
              <View className="flex-row justify-between" style={{ marginLeft: -36 }}>
                {[
                  { label: "posts", value: profile.posts },
                  { label: "seguidores", value: profile.followers },
                  { label: "seguindo", value: profile.following },
                ].map((item) => (
                  <View key={item.label} className="items-center flex-1">
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: isDarkMode ? "#fff" : "#000",
                      }}
                    >
                      {item.value}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: isDarkMode ? "#aaa" : "#666",
                      }}
                    >
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* BOTÕES SEGUIR / SEGUINDO + MENSAGEM */}
              <View className="mt-4 flex-row" style={{ justifyContent: "flex-start", gap: 8 }}>
                {/* Botão Seguir / Seguindo */}
                <TouchableOpacity
                  onPress={() => setIsFollowing(!isFollowing)}
                  style={{
                    flex: 0.45,
                    paddingVertical: 6,
                    borderRadius: 6,
                    backgroundColor: isFollowing
                      ? isDarkMode
                        ? "#333"
                        : "#eee"
                      : "#0095f6",
                    borderWidth: isFollowing ? 1 : 0,
                    borderColor: isFollowing
                      ? isDarkMode
                        ? "#555"
                        : "#ccc"
                      : "transparent",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: isFollowing ? (isDarkMode ? "#fff" : "#000") : "#fff",
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    {isFollowing ? "Seguindo" : "Seguir"}
                  </Text>
                </TouchableOpacity>

                {/* Botão Enviar Mensagem */}
                <TouchableOpacity
                  onPress={() => router.push(`/chat/${profile.username}`)}
                  style={{
                    flex: 0.45,
                    paddingVertical: 6,
                    borderRadius: 6,
                    backgroundColor: isDarkMode ? "#333" : "#eee",
                    borderWidth: 1,
                    borderColor: isDarkMode ? "#555" : "#ccc",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: isDarkMode ? "#fff" : "#000",
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    Mensagem
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* DIVIDER */}
        <View
          className="h-px mt-6"
          style={{ backgroundColor: isDarkMode ? "#333" : "#ddd" }}
        />

        {/* FEED DE POSTS */}
        <PostsList
          username={profile.username}
          isGrid
          type="posts"
          darkMode={isDarkMode}
        />

        <View style={{ height: insets.bottom + 80 }} />
      </ScrollView>
    </View>
  );
}

// ----------------------------------------------------
// PostScreen.tsx — TELA INDIVIDUAL DO POST
// ESTILO INSTAGRAM
// ----------------------------------------------------

import React, { useMemo } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { usePosts } from "@/hooks/usePosts";

const { width } = Dimensions.get("window");

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { posts } = usePosts();

  // 🔎 Buscar post pelo ID
  const post = useMemo(() => {
    return posts?.find((p) => p.id === id);
  }, [posts, id]);

  if (!post) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#9CA3AF" }}>
          Post não encontrado
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#000" : "#fff" },
      ]}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather
            name="arrow-left"
            size={24}
            color={isDark ? "#fff" : "#000"}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            { color: isDark ? "#fff" : "#000" },
          ]}
        >
          Publicação
        </Text>

        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={[post]}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <>
            {/* USER */}
            <View style={styles.userRow}>
              <Image
                source={{ uri: item.user?.image }}
                style={styles.avatar}
              />
              <Text
                style={[
                  styles.username,
                  { color: isDark ? "#fff" : "#000" },
                ]}
              >
                {item.user?.username}
              </Text>
            </View>

            {/* IMAGE */}
            <Image
              source={{ uri: item.image }}
              style={styles.postImage}
              resizeMode="cover"
            />

            {/* ACTIONS */}
            <View style={styles.actionsRow}>
              <Feather
                name="heart"
                size={24}
                color={isDark ? "#fff" : "#000"}
              />
              <Feather
                name="message-circle"
                size={24}
                color={isDark ? "#fff" : "#000"}
                style={{ marginLeft: 16 }}
              />
              <Feather
                name="send"
                size={24}
                color={isDark ? "#fff" : "#000"}
                style={{ marginLeft: 16 }}
              />
            </View>

            {/* CAPTION */}
            {item.caption && (
              <View style={styles.captionRow}>
                <Text
                  style={[
                    styles.username,
                    { color: isDark ? "#fff" : "#000" },
                  ]}
                >
                  {item.user?.username}{" "}
                </Text>
                <Text
                  style={{ color: isDark ? "#ddd" : "#333" }}
                >
                  {item.caption}
                </Text>
              </View>
            )}
          </>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  username: {
    fontWeight: "600",
    fontSize: 14,
  },
  postImage: {
    width: width,
    height: width,
  },
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  captionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
});
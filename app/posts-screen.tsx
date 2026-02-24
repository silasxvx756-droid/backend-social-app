// ----------------------------------------------------
// PostsScreen.tsx — POST ÚNICO
// ABRE APENAS O POST CLICADO
// ----------------------------------------------------

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import PostCard from "@/components/PostCard";
import { postEvents } from "@/hooks/usePosts";

// --------------------
// TIPOS
// --------------------
type PostUser = {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string | null;
};

type Post = {
  id: string;
  user: PostUser;
  content?: string;
  image?: string | null;
  likes: string[];
  comments?: any[];
  createdAt: number;
};

// --------------------
// DIMENSÕES
// --------------------
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const HEADER_HEIGHT = 48 + 10 + 48;
const POST_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT;

export default function PostsScreen() {
  const { initialPostId } = useLocalSearchParams<{
    initialPostId?: string;
  }>();

  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // --------------------
  // 🔄 LOAD POSTS
  // --------------------
  const loadPosts = async () => {
    try {
      const stored = await AsyncStorage.getItem("posts");
      if (!stored) {
        setPosts([]);
        return;
      }

      const parsed: Post[] = JSON.parse(stored);

      const normalized = parsed
        .filter(Boolean)
        .map((p) => ({
          ...p,
          likes: Array.isArray(p.likes) ? p.likes : [],
          comments: Array.isArray(p.comments) ? p.comments : [],
          user: p.user || {
            id: "0",
            username: "usuario",
            avatar:
              "https://cdn-icons-png.flaticon.com/512/149/149071.png",
          },
        }));

      setPosts(normalized);
    } finally {
      setLoading(false);
    }
  };

  // --------------------
  // 🧠 INIT + SYNC
  // --------------------
  useEffect(() => {
    loadPosts();
    const sub = postEvents.addListener("post-updated", loadPosts);
    return () => sub.remove();
  }, []);

  // --------------------
  // 🎯 POST CLICADO
  // --------------------
  const activePost = useMemo(() => {
    if (!initialPostId) return null;
    return posts.find((p) => p.id === initialPostId) || null;
  }, [posts, initialPostId]);

  // --------------------
  // LOADING / FALLBACK
  // --------------------
  if (loading || !activePost) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // --------------------
  // UI
  // --------------------
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} />
        </TouchableOpacity>
      </View>

      {/* POST */}
      <View style={{ height: POST_HEIGHT }}>
        <PostCard post={activePost} />
      </View>
    </View>
  );
}

// --------------------
// STYLES
// --------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },

  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

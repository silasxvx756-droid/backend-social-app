import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import PostCard from "@/components/PostCard";
import { postEvents } from "@/hooks/usePosts"; // ✅ sincronização global de posts

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

const PostsScreen = () => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  /** 🔄 Função para carregar o post mais recente */
  const loadPost = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("posts");
      if (stored) {
        const parsed: Post[] = JSON.parse(stored);
        const latest = parsed
          .filter((p) => p && typeof p === "object")
          .sort((a, b) => b.createdAt - a.createdAt)[0];

        if (latest) {
          setPost({
            ...latest,
            user: latest.user || {
              id: "sem-id",
              username: "usuário",
              avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
            },
            likes: Array.isArray(latest.likes) ? latest.likes : [],
            comments: Array.isArray(latest.comments) ? latest.comments : [],
          });
        }
      }
    } catch (err) {
      console.log("Erro ao carregar post:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /** 🧠 Escuta global: sincroniza curtidas com feed e perfil */
  useEffect(() => {
    loadPost();

    const sub = postEvents.addListener("post-updated", async (postId?: string) => {
      // 🔎 só recarrega se o post exibido for o mesmo, ou se for indefinido (atualização global)
      if (!postId || postId === post?.id) {
        await loadPost();
      }
    });

    return () => sub.remove();
  }, [loadPost, post?.id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#133de9" size="large" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#777" }}>Nenhum post encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🔙 Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#133de9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Postagem</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PostCard post={post} />
      </ScrollView>
    </View>
  );
};

export default PostsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#133de9" },
  scrollContent: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 24,
    paddingHorizontal: 12,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
});

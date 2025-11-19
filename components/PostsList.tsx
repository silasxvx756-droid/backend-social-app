// src/components/PostsList.tsx
import React, { useCallback } from "react";
import { ScrollView, Text, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { usePosts } from "@/hooks/usePosts";
import PostCard from "./PostCard";

const PostsList = ({ username }: { username?: string }) => {
  const { posts, isLoading, toggleLike, deletePost, reload } = usePosts();

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [])
  );

  const handleRefresh = async () => {
    await reload();
  };

  // 🔹 Filtra posts do usuário, se houver username
  const filteredPosts = username
    ? posts.filter((p) => p.user.username === username)
    : posts;

  return (
    <ScrollView
      style={{ padding: 12 }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
      }
    >
      {filteredPosts.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 40, color: "gray" }}>
          Nenhuma postagem encontrada.
        </Text>
      ) : (
        filteredPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onLike={() => toggleLike(post.id, post.user.username)} // ✅ corrigido
            onDelete={deletePost}
          />
        ))
      )}
    </ScrollView>
  );
};

export default PostsList;

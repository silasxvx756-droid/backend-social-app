import React from "react";
import { View, FlatList } from "react-native";
import { usePosts } from "@/hooks/usePosts";
import PostCard from "@/components/PostCard";

const HomeScreen = () => {
  const { posts, isLoading } = usePosts();

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
};

export default HomeScreen;

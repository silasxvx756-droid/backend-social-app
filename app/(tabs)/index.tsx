// src/app/(tabs)/index.tsx
import PostComposer from "@/components/PostComposer";
import PostsList from "@/components/PostsList";
import { usePosts } from "@/hooks/usePosts";
import { useUserSync } from "@/hooks/useUserSync";
import { useState, useRef, useEffect } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "expo-router";

const HomeScreen = () => {
  const [isRefetching, setIsRefetching] = useState(false);
  const { reload } = usePosts();
  const scrollRef = useRef<ScrollView>(null);
  const navigation = useNavigation();

  const handlePullToRefresh = async () => {
    setIsRefetching(true);
    await reload();
    setIsRefetching(false);
  };

  useUserSync();

  // 🔥 Detecta clique repetido na aba "Home" e sobe o feed
  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", (e) => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-4 py-3" />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handlePullToRefresh}
            tintColor={"#1DA1F2"}
          />
        }
      >
        <PostComposer />
        <PostsList />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

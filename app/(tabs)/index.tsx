// src/app/(tabs)/index.tsx

import PostsList from "@/components/PostsList";
import { usePosts } from "@/hooks/usePosts";
import { useUserSync } from "@/hooks/useUserSync";

import { useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useScrollToTop } from "@react-navigation/native";

export default function HomeScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();

  const isDark = colorScheme === "dark";
  const isWeb = Platform.OS === "web";
  const isDesktop = isWeb && width >= 1024;

  const { reload } = usePosts();
  const [isRefetching, setIsRefetching] = useState(false);

  useUserSync();
  useScrollToTop(scrollRef);

  // Pull to refresh (apenas mobile)
  const handlePullToRefresh = async () => {
    if (isDesktop) return;

    setIsRefetching(true);
    await reload();
    setIsRefetching(false);
  };

  // Novo post
  const openGalleryPost = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      router.push({
        pathname: "/edit-post",
        params: {
          image: result.assets[0].uri,
          type: "post",
        },
      });
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: isDark ? "#000" : "#fff",
      }}
    >
      {/* HEADER */}
      <View
        style={{
          paddingHorizontal: isDesktop ? 24 : 16,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
          borderBottomWidth: 0.5,
          borderBottomColor: isDark ? "#222" : "#ddd",
        }}
      >
        {/* Botão novo post */}
        <TouchableOpacity onPress={openGalleryPost}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "300",
              color: isDark ? "#fff" : "#000",
            }}
          >
            +
          </Text>
        </TouchableOpacity>
      </View>

      {/* FEED */}
      <ScrollView
        ref={scrollRef}
        refreshControl={
          !isDesktop ? (
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handlePullToRefresh}
              tintColor={isDark ? "#fff" : "#000"}
            />
          ) : undefined
        }
        contentContainerStyle={{
          alignItems: isDesktop ? "center" : "stretch",
          paddingVertical: isDesktop ? 24 : 0,
        }}
      >
        {/* POSTS */}
        <View
          style={{
            width: "100%",
            maxWidth: isDesktop ? 620 : "100%",
          }}
        >
          <PostsList isDark={isDark} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

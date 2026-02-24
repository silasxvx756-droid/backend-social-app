// ----------------------------------------------------
// PostsList.tsx — FEED + GRID + WEB SIDEBAR (FINAL)
// GRID DO PROFILE EM MODO QUADRADO 1:1
// FIREBASE INTEGRADO
// ----------------------------------------------------

import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  View,
  Dimensions,
  TouchableOpacity,
  Text,
  Modal,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { usePosts } from "@/hooks/usePosts";
import PostCard from "@/components/PostCard";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

// -----------------------------
// GRID CONFIG
// -----------------------------
const NUM_COLUMNS = 3;
const ITEM_WIDTH = width / NUM_COLUMNS;
const ITEM_HEIGHT = ITEM_WIDTH; // ✅ AGORA É 1:1 (QUADRADO)

type PostsListType = "posts" | "reposts";

type Props = {
  username?: string;
  isGrid?: boolean;
  type?: PostsListType;
  limit?: number;
};

export default function PostsList({
  username,
  isGrid = false,
  type = "posts",
  limit,
}: Props) {
  const { posts, loaded } = usePosts();

  const [showModal, setShowModal] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const closeModal = () => {
    setShowModal(false);
    setProfileUsername(null);
  };

  const closePostModal = () => setSelectedPost(null);

  // -----------------------------
  // FILTRO DE POSTS
  // -----------------------------
  const filteredPosts = useMemo(() => {
    if (!posts || posts.length === 0) return [];

    const activeUsername = isGrid ? profileUsername : username;

    let result = !activeUsername
      ? posts
      : posts.filter(
          (p) =>
            p.user?.username &&
            p.user.username.toLowerCase() ===
              activeUsername?.toLowerCase()
        );

    if (limit) result = result.slice(0, limit);

    return result;
  }, [posts, username, profileUsername, isGrid, limit]);

  // -----------------------------
  // EMPTY STATE
  // -----------------------------
  if (!loaded) return null; // Evitar flicker
  if (filteredPosts.length === 0) {
    return (
      <View
        style={{
          paddingVertical: 100,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#9CA3AF" }}>
          {type === "reposts" ? "Nenhum repost ainda" : "Nenhum post ainda"}
        </Text>
      </View>
    );
  }

  // =====================================================
  // PROFILE GRID - QUADRADO + MODAL SOMENTE IMAGEM
  // =====================================================
  if (isGrid) {
    return (
      <>
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ gap: 0 }}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setInitialIndex(index);
                setProfileUsername(item.user?.username ?? null);
                setShowModal(true);
              }}
            >
              <Image
                source={{ uri: item.image }}
                style={{
                  width: ITEM_WIDTH,
                  height: ITEM_HEIGHT,
                }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
        />

        <Modal
          visible={showModal}
          animationType="fade"
          onRequestClose={closeModal}
          transparent
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.9)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              style={{ position: "absolute", top: 50, left: 20 }}
              onPress={closeModal}
            >
              <Feather name="x" size={28} color="#fff" />
            </TouchableOpacity>

            {filteredPosts[initialIndex] && (
              <Image
                source={{ uri: filteredPosts[initialIndex].image }}
                style={{
                  width: width * 0.9,
                  height: width * 0.9,
                  borderRadius: 12,
                }}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
      </>
    );
  }

  // =====================================================
  // WEB VERSION
  // =====================================================
  if (isWeb) {
    return (
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          paddingTop: 30,
          width: "100%",
          maxWidth: 1000,
          alignSelf: "center",
        }}
      >
        <View style={{ width: 600 }}>
          <FlatList
            data={filteredPosts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <PostCard post={item} isRepost={type === "reposts"} />}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <View style={{ width: 320, marginLeft: 40 }}>
          <Text style={{ fontWeight: "600", marginBottom: 16, color: "#555" }}>
            Sugestões para você
          </Text>
        </View>
      </View>
    );
  }

  // =====================================================
  // MOBILE FEED NORMAL + MODAL
  // =====================================================
  return (
    <>
      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedPost(item)}>
            <PostCard post={item} isRepost={type === "reposts"} />
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={{ paddingBottom: 10 }}
      />

      <Modal
        visible={!!selectedPost}
        animationType="slide"
        onRequestClose={closePostModal}
        transparent
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.9)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            style={{ position: "absolute", top: 50, left: 20, zIndex: 10 }}
            onPress={closePostModal}
          >
            <Feather name="x" size={28} color="#fff" />
          </TouchableOpacity>

          {selectedPost && (
            <View
              style={{
                width: width * 0.95,
                maxHeight: "90%",
                backgroundColor: "#fff",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <Image
                source={{ uri: selectedPost.image }}
                style={{ width: "100%", height: width * 0.9 }}
                resizeMode="cover"
              />

              <View style={{ padding: 12 }}>
                <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                  {selectedPost.user?.displayName || selectedPost.user?.username}
                </Text>

                {selectedPost.content && (
                  <Text style={{ color: "#333", marginBottom: 8 }}>{selectedPost.content}</Text>
                )}

                <Text style={{ color: "#888", fontSize: 12 }}>
                  {selectedPost.likes?.length || 0} curtidas
                </Text>

                <Text style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
                  {selectedPost.comments?.length || 0} comentários
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}
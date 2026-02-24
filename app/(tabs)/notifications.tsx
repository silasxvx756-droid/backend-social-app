import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
const ONE_MONTH = 30 * 24 * 60 * 60 * 1000;

type Notification = {
  id: string;
  type: "like" | "comment" | "follow";
  createdAt: number;
  read: boolean;
  postId?: string;
  actor?: {
    id: string;
    username?: string;
    displayName?: string;
    avatar?: string;
  };
  isFollowingBack?: boolean;
};

type Post = {
  id: string;
  image?: string;
  caption?: string;
  createdAt?: number;
  actor?: {
    id: string;
    username?: string;
    displayName?: string;
    avatar?: string;
  };
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentUser();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [postThumbs, setPostThumbs] = useState<Record<string, string>>({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const navigating = useRef(false);

  if (!currentUser) return null;

  const NOTIF_KEY = `@notifications:${currentUser.id}`;
  const POSTS_KEY = "@posts";

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours} h`;
    return `${days} d`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(NOTIF_KEY);
        const parsed: Notification[] = stored ? JSON.parse(stored) : [];

        const now = Date.now();
        const last30Days = parsed.filter(
          (n) => now - n.createdAt <= ONE_MONTH
        );

        const postsStored = await AsyncStorage.getItem(POSTS_KEY);
        const posts: Post[] = postsStored ? JSON.parse(postsStored) : [];

        const thumbMap: Record<string, string> = {};
        posts.forEach((p) => {
          if (p.image) thumbMap[p.id] = p.image;
        });

        setPostThumbs(thumbMap);
        setNotifications(last30Days);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
  };

  const toggleFollowBack = async (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, isFollowingBack: !n.isFollowingBack } : n
    );
    setNotifications(updated);
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
  };

  const handlePress = async (item: Notification) => {
    if (navigating.current) return;
    navigating.current = true;

    if (!item.read) await markAsRead(item.id);

    if (item.type === "follow" && item.actor?.id) {
      router.push(`/UserProfileScreen?userId=${item.actor.id}`);
    }

    if ((item.type === "like" || item.type === "comment") && item.postId) {
      const postsStored = await AsyncStorage.getItem(POSTS_KEY);
      const posts: Post[] = postsStored ? JSON.parse(postsStored) : [];
      const foundPost = posts.find((p) => p.id === item.postId);

      if (foundPost) {
        setSelectedPost(foundPost);
        setModalVisible(true);
      }
    }

    setTimeout(() => (navigating.current = false), 300);
  };

  const now = Date.now();

  const last7Days = notifications.filter(
    (n) => now - n.createdAt <= ONE_WEEK
  );

  const last30Days = notifications.filter(
    (n) => now - n.createdAt > ONE_WEEK && now - n.createdAt <= ONE_MONTH
  );

  const renderItem = (item: Notification) => {
    const preview =
      item.type !== "follow" && item.postId
        ? postThumbs[item.postId]
        : undefined;

    const actorName =
      item.actor?.displayName || item.actor?.username || "Alguém";

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.item}
        activeOpacity={0.8}
        onPress={() => handlePress(item)}
      >
        <Image
          source={item.actor?.avatar ? { uri: item.actor.avatar } : undefined}
          style={styles.avatar}
        />

        <View style={styles.textRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.message}>
              <Text style={styles.username}>{actorName}</Text>{" "}
              {item.type === "like" && "curtiu seu post. "}
              {item.type === "comment" && "comentou no seu post. "}
              {item.type === "follow" && "começou a seguir você. "}
              <Text style={styles.timeInline}>{getTimeAgo(item.createdAt)}</Text>
            </Text>
          </View>

          {item.type === "follow" ? (
            <TouchableOpacity
              style={[
                styles.followButton,
                item.isFollowingBack && styles.followingButton,
              ]}
              onPress={(e) => {
                e.stopPropagation();
                toggleFollowBack(item.id);
              }}
            >
              <Text
                style={[
                  styles.followButtonText,
                  item.isFollowingBack && styles.followingButtonText,
                ]}
              >
                {item.isFollowingBack ? "Seguindo" : "Seguir de volta"}
              </Text>
            </TouchableOpacity>
          ) : (
            preview && <Image source={{ uri: preview }} style={styles.postThumb} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.loading}>Carregando notificações...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notificações</Text>

        <View style={{ width: 22 }} />
      </View>

      <ScrollView>
        {last7Days.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Últimos 7 dias</Text>
            {last7Days.map(renderItem)}
          </>
        )}

        {last30Days.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Últimos 30 dias</Text>
            {last30Days.map(renderItem)}
          </>
        )}

        {last7Days.length === 0 && last30Days.length === 0 && (
          <Text style={styles.empty}>Nenhuma notificação recente.</Text>
        )}
      </ScrollView>

      {/* Modal do post igual ao feed */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Feather name="arrow-left" size={22} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Post</Text>

            <View style={{ width: 22 }} />
          </View>

          {selectedPost && (
            <ScrollView>
              {/* Cabeçalho do post */}
              <View style={styles.postHeader}>
                <Image
                  source={{ uri: selectedPost.actor?.avatar }}
                  style={styles.postAvatar}
                />
                <Text style={styles.postUsername}>{selectedPost.actor?.username}</Text>
              </View>

              {/* Imagem do post */}
              {selectedPost.image && (
                <Image source={{ uri: selectedPost.image }} style={styles.modalImage} />
              )}

              {/* Botões de ação */}
              <View style={styles.postActions}>
                <Feather name="heart" size={24} style={{ marginRight: 16 }} />
                <Feather name="message-circle" size={24} />
              </View>

              {/* Legenda */}
              <View style={styles.captionContainer}>
                <Text>
                  <Text style={styles.postUsername}>{selectedPost.actor?.username} </Text>
                  {selectedPost.caption}
                </Text>
                <Text style={styles.postTime}>
                  {selectedPost.createdAt ? getTimeAgo(selectedPost.createdAt) : "Agora"}
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  headerTitle: { fontSize: 20, fontWeight: "600" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: "#ccc",
  },

  textRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  message: { fontSize: 15, lineHeight: 20 },

  username: { fontWeight: "bold" },

  timeInline: {
    fontSize: 13,
    color: "#777",
  },

  postThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginLeft: 12,
  },

  followButton: {
    backgroundColor: "#0095f6",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 12,
  },

  followingButton: {
    backgroundColor: "#efefef",
  },

  followButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },

  followingButtonText: {
    color: "#000",
  },

  loading: { textAlign: "center", marginTop: 100 },

  empty: { textAlign: "center", marginTop: 60 },

  modalContainer: { flex: 1, backgroundColor: "#fff" },

  modalHeader: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderColor: "#ddd",
  },

  modalTitle: { fontSize: 18, fontWeight: "600" },

  modalImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#eee",
  },

  captionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
  },

  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },

  postAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },

  postActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  postUsername: { fontWeight: "600", fontSize: 14 },

  postTime: {
    fontSize: 12,
    color: "#888",
    marginTop: 6,
  },
});
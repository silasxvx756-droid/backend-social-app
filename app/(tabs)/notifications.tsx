// NotificationsScreen.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import { useUser } from "@clerk/clerk-expo";
import { useFocusEffect } from "expo-router";
import { io } from "socket.io-client";

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
const ONE_MONTH = 30 * 24 * 60 * 60 * 1000;
const { width } = Dimensions.get("window");

type Notification = {
  _id: string;
  type: "like" | "comment" | "follow" | "post";
  createdAt: string;
  read: boolean;
  postId?: string;
  actor?: {
    id: string;
    username?: string;
    displayName?: string;
    avatar?: string;
  };
};

type Comment = {
  _id: string;
  text: string;
  createdAt?: string;
  user?: { id: string; displayName?: string; avatar?: string };
};

type Post = {
  _id: string;
  content: string;
  image?: string;
  likedByUser?: boolean;
  comments?: Comment[];
  actor?: { id: string; username?: string; displayName?: string; avatar?: string };
  createdAt: string;
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const navigating = useRef(false);
  const { user } = useUser();

  const getCurrentUser = () => ({
    id: user?.id || "",
    displayName: user?.fullName || user?.username || "Usuário",
    avatar: user?.imageUrl || "https://via.placeholder.com/32",
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);

  const [currentPost, setCurrentPost] = useState<Post | null>(null);
  const [postLoading, setPostLoading] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");

  const [socket, setSocket] = useState<any>(null);

  const API_URL = "https://backend-social-app-1.onrender.com";

  // ---------------- Carregar notificações ----------------
  const loadNotifications = async () => {
    if (!user?.id) return;
    try {
      const res = await axios.get(`${API_URL}/api/notifications/${getCurrentUser().id}`);
      console.log("Notificações carregadas do backend:", res.data);
      setNotifications(res.data);

      // ---------------- MOSTRAR NO BASH SE COMEÇOU A SEGUIR ----------------
      res.data.forEach((n: Notification) => {
        if (n.type === "follow" && n.actor) {
          console.log(
            `[Seguiu você] Nome: ${n.actor.displayName || n.actor.username}, Foto: ${n.actor.avatar}`
          );
        }
      });

      if (scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: true });
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 4000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // ---------------- Socket.IO ----------------
  useEffect(() => {
    const s = io(API_URL);
    setSocket(s);

    if (user?.id) s.emit("join", user.id);

    s.on("notification-updated", ({ notificationId, actor }) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, actor: { ...n.actor, ...actor } } : n
        )
      );

      if (currentPost?.actor?.id === actor.id) {
        setCurrentPost((prev) =>
          prev ? { ...prev, actor: { ...prev.actor, ...actor } } : prev
        );
      }
    });

    return () => s.disconnect();
  }, [user?.id, currentPost]);

  // ---------------- Marcar como lida individual ----------------
  const markAsRead = async (id: string) => {
    try {
      await axios.post(`${API_URL}/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- Abrir modal do post ----------------
  const openPostModal = async (postId: string) => {
    setPostLoading(true);
    try {
      const res = await axios.get(`${API_URL}/posts/${postId}`);
      setCurrentPost(res.data);
      setModalVisible(true);
    } catch (err) {
      console.error(err);
      setCurrentPost(null);
      setModalVisible(true);
    } finally {
      setPostLoading(false);
    }
  };

  const openCommentsModal = () => {
    if (currentPost?.comments) setComments(currentPost.comments);
    setCommentsModalVisible(true);
  };

  const handlePress = async (item: Notification) => {
    if (navigating.current) return;
    navigating.current = true;

    if (!item.read) await markAsRead(item._id);

    if (
      (item.type === "like" || item.type === "comment" || item.type === "post") &&
      item.postId
    ) {
      await openPostModal(item.postId);
    }

    setTimeout(() => (navigating.current = false), 300);
  };

  // ---------------- Função de tempo ----------------
  const getTimeAgo = (timestamp?: string | number) => {
    if (!timestamp) return "";
    const time = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
    const diff = Date.now() - time;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours} h`;
    return `${days} d`;
  };

  // ---------------- Curtir post ----------------
  const handleLikePost = async (post: Post) => {
    if (!post) return;
    const liked = post.likedByUser;
    const updatedPost = { ...post, likedByUser: !liked };
    setCurrentPost(updatedPost);

    try {
      await axios.post(`${API_URL}/posts/${post._id}/like`, { user: getCurrentUser() });
    } catch (err) {
      console.error(err);
      setCurrentPost(post);
    }
  };

  // ---------------- Adicionar comentário ----------------
  const handleAddComment = async () => {
    if (!commentText.trim() || !currentPost) return;

    const newComment: Comment = {
      _id: Date.now().toString(),
      text: commentText,
      createdAt: new Date().toISOString(),
      user: getCurrentUser(),
    };

    setComments((prev) => [...prev, newComment]);
    setCurrentPost({
      ...currentPost,
      comments: [...(currentPost.comments || []), newComment],
    });
    setCommentText("");

    try {
      await axios.post(`${API_URL}/posts/${currentPost._id}/comments`, {
        text: newComment.text,
        user: getCurrentUser(),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- Renderização de notificação ----------------
  const renderItem = (item: Notification) => {
    const actor = item.actor?.id === user?.id ? getCurrentUser() : item.actor;
    const actorName = actor?.displayName || actor?.username || "Alguém";

    console.log("Renderizando notificação:", item);

    return (
      <TouchableOpacity
        key={item._id}
        style={styles.item}
        activeOpacity={0.8}
        onPress={() => handlePress(item)}
      >
        <Image
          source={{ uri: actor?.avatar || "https://via.placeholder.com/44" }}
          style={styles.avatar}
        />
        <View style={styles.textRow}>
          <Text style={styles.message}>
            <Text style={styles.username}>{actorName}</Text>{" "}
            {item.type === "like" && "curtiu seu post. "}
            {item.type === "comment" && "comentou no seu post. "}
            {item.type === "follow" && "começou a seguir você. "}
            {item.type === "post" && "criou um post. "}
            <Text style={styles.timeInline}>{getTimeAgo(item.createdAt)}</Text>
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const now = Date.now();
  const last7Days = notifications.filter(
    (n) => now - new Date(n.createdAt).getTime() <= ONE_WEEK
  );
  const last30Days = notifications.filter(
    (n) =>
      now - new Date(n.createdAt).getTime() > ONE_WEEK &&
      now - new Date(n.createdAt).getTime() <= ONE_MONTH
  );

  const notificationsRef = useRef<Notification[]>([]);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

  useFocusEffect(
    useCallback(() => {
      notificationsRef.current.forEach((n) => {
        if (n.type === "follow" && n.actor) {
          console.log(
            `[Seguiu você - focusEffect] Nome: ${n.actor.displayName || n.actor.username}, Foto: ${n.actor.avatar}`
          );
        }
      });

      return () => {
        const markRecentAsRead = async () => {
          const now = Date.now();
          const recentNotifications = notificationsRef.current.filter(
            (n) => now - new Date(n.createdAt).getTime() <= ONE_WEEK && !n.read
          );
          for (const n of recentNotifications) await markAsRead(n._id);
        };
        markRecentAsRead().catch(console.error);
      };
    }, [])
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#0095f6" style={{ marginTop: 100 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => console.log("Voltar")}>
          <Feather name="arrow-left" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView ref={scrollRef} style={{ paddingBottom: 100 }}>
        {/* ---------------- DEBUG VISUAL ---------------- */}
        {notifications.length === 0 && (
          <Text style={{ padding: 16, color: 'red' }}>Nenhuma notificação no estado</Text>
        )}
        {notifications.map((n) => (
          <View key={n._id} style={{ padding: 12, borderBottomWidth: 1, borderColor: '#ccc' }}>
            <Text>ID: {n._id}</Text>
            <Text>Tipo: {n.type}</Text>
            <Text>Actor: {n.actor?.displayName || n.actor?.username}</Text>
            <Text>CreatedAt: {n.createdAt}</Text>
          </View>
        ))}

        {/* ---------------- NOTIFICAÇÕES FILTRADAS ---------------- */}
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

      {/* ---------------- MODAL DE POST ---------------- */}
      {/* ... mantive seu código original de modal de post e comentários ... */}
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
    backgroundColor: "#fff",
  },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: "#ccc" },
  textRow: { flex: 1 },
  message: { fontSize: 15, lineHeight: 20 },
  username: { fontWeight: "bold" },
  timeInline: { fontSize: 13, color: "#777" },
  empty: { textAlign: "center", marginTop: 60 },
});
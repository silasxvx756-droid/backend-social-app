// src/components/PostCard.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Dimensions,
  Animated,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { postEvents } from "@/hooks/usePosts";
import { addNotification } from "@/utils/addNotification";
import { useRouter } from "expo-router";
import Modal from "react-native-modal";

const { width } = Dimensions.get("window");

// ----------------------
//  COMPONENTE DO CORAÇÃO
// ----------------------
const HeartAnimated = React.memo(({ visible, scale, opacity }: any) => {
  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: [{ translateX: -40 }, { translateY: -40 }, { scale }],
        opacity,
      }}
    >
      <FontAwesome name="heart" size={80} color="#e0245e" />
    </Animated.View>
  );
});

// ----------------------
// FORMATAÇÃO DE TEMPO
// ----------------------
const formatInstagramTime = (timestamp: number) => {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "agora";
  if (minutes === 1) return "há 1 min";
  if (minutes < 60) return `há ${minutes} min`;

  if (hours === 1) return "há 1 h";
  if (hours < 24) return `há ${hours} h`;

  if (days === 1) return "há 1 d";
  if (days < 7) return `há ${days} d`;

  return new Date(timestamp).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
};

const PostCard = ({ post, onDelete, onComment }: any) => {
  const { currentUser } = useCurrentUser();
  const router = useRouter();

  // ----------------------------
  // CONTROLA NAVEGAÇÃO RÁPIDA
  // ----------------------------
  const isNavigating = useRef(false);
  const openProfile = useCallback(
    (u: any) => {
      if (isNavigating.current) return;
      isNavigating.current = true;

      router.push(
        `/UserProfileScreen?userId=${u.id}&username=${u.username}&avatar=${u.avatar}`
      );

      setTimeout(() => {
        isNavigating.current = false;
      }, 700);
    },
    [router]
  );

  // ----------------------------
  // STATES PRINCIPAIS
  // ----------------------------
  const [liked, setLiked] = useState(
    post.likes.some((u: any) => u.id === currentUser?.id)
  );

  const [likeCount, setLikeCount] = useState(post.likes.length);

  const [comments, setComments] = useState(post.comments || []);
  const [commentText, setCommentText] = useState("");
  const [commentsVisible, setCommentsVisible] = useState(false);

  const [likesVisible, setLikesVisible] = useState(false);
  const [likers, setLikers] = useState(post.likes || []);

  // ----------------------------
  //  ANIMAÇÃO DO CORAÇÃO
  // ----------------------------
  const [showHeart, setShowHeart] = useState(false);
  const likeScale = useRef(new Animated.Value(1)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const lastTapRef = useRef<number | null>(null);

  // ----------------------------
  //   CARREGA COMENTÁRIOS
  // ----------------------------
  const loadComments = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(`@comments:${post.id}`);
      if (stored) setComments(JSON.parse(stored));
    } catch {}
  }, [post.id]);

  const saveComments = useCallback(
    async (updated: any) => {
      try {
        await AsyncStorage.setItem(
          `@comments:${post.id}`,
          JSON.stringify(updated)
        );
      } catch {}
    },
    [post.id]
  );

  // ----------------------------
  //   CARREGA LIKERS
  // ----------------------------
  const loadLikers = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("posts");
      if (!stored) return;

      const parsed = JSON.parse(stored);
      const currentPost = parsed.find((p: any) => p.id === post.id);

      if (currentPost) setLikers(currentPost.likes);
    } catch {}
  }, [post.id]);

  useEffect(() => {
    loadComments();
    loadLikers();
  }, []);

  // ----------------------------
  //   LIKE DO POST
  // ----------------------------
  const handleLikePost = useCallback(async () => {
    if (!currentUser) return;

    // animação
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.4, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((prev) => (newLiked ? prev + 1 : prev - 1));

    try {
      const stored = await AsyncStorage.getItem("posts");
      const parsed = stored ? JSON.parse(stored) : [];

      const updated = parsed.map((p: any) =>
        p.id === post.id
          ? {
              ...p,
              likes: newLiked
                ? [
                    ...p.likes,
                    {
                      id: currentUser.id,
                      username: currentUser.username,
                      avatar: currentUser.avatar,
                    },
                  ]
                : p.likes.filter((u: any) => u.id !== currentUser.id),
            }
          : p
      );

      await AsyncStorage.setItem("posts", JSON.stringify(updated));
      postEvents.emit("post-updated", post.id);

      if (newLiked && post.user.id !== currentUser.id) {
        await addNotification(
          {
            id: currentUser.id,
            username: currentUser.username,
            avatar: currentUser.avatar,
          },
          "like",
          post.id
        );
      }
    } catch {}
  }, [liked, currentUser, post]);

  // ----------------------------
  //   TAP NA IMAGEM (CURTIR)
  // ----------------------------
  const handleTap = useCallback(() => {
    const now = Date.now();

    if (lastTapRef.current && now - lastTapRef.current < 300) {
      if (!liked) handleLikePost();

      setShowHeart(true);
      heartOpacity.setValue(1);

      Animated.sequence([
        Animated.timing(heartOpacity, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.delay(250),
        Animated.timing(heartOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setShowHeart(false));

      lastTapRef.current = null;
      return;
    }

    lastTapRef.current = now;
  }, [liked, handleLikePost]);

  // ----------------------------
  //   ADICIONAR COMENTÁRIO
  // ----------------------------
  const handleAddComment = useCallback(async () => {
    if (!commentText.trim() || !currentUser) return;

    const newComment = {
      id: Date.now().toString(),
      text: commentText.trim(),
      user: {
        id: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
      },
      createdAt: Date.now(),
    };

    const updated = [...comments, newComment];
    setComments(updated);
    setCommentText("");

    await saveComments(updated);
    postEvents.emit("post-updated", post.id);

    onComment?.({ ...post, comments: updated });

    if (post.user.id !== currentUser.id) {
      await addNotification(
        {
          id: currentUser.id,
          username: currentUser.username,
          avatar: currentUser.avatar,
        },
        "comment",
        post.id
      );
    }
  }, [commentText, comments, currentUser, post]);

  // ----------------------------
  //   DELETAR POST
  // ----------------------------
  const handleDeletePost = useCallback(() => {
    Alert.alert("Apagar postagem", "Deseja realmente apagar?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            const stored = await AsyncStorage.getItem("posts");
            const parsed = stored ? JSON.parse(stored) : [];
            const updated = parsed.filter((p: any) => p.id !== post.id);

            await AsyncStorage.setItem("posts", JSON.stringify(updated));
            postEvents.emit("post-updated", post.id);
            onDelete?.(post.id);
          } catch {}
        },
      },
    ]);
  }, [post]);

  if (!currentUser) return null;

  // ----------------------------
  //     RENDER
  // ----------------------------
  return (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => openProfile(post.user)}
          style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
          activeOpacity={0.7}
        >
          <Image
            source={{
              uri:
                post.user.avatar ||
                "https://cdn-icons-png.flaticon.com/512/149/149071.png",
            }}
            style={styles.avatar}
          />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.displayName}>@{post.user.username}</Text>
            <Text style={styles.postTime}>
              {formatInstagramTime(post.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>

        {currentUser.id === post.user.id && (
          <TouchableOpacity onPress={handleDeletePost}>
            <Feather name="more-vertical" size={22} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      {/* TEXTO */}
      {post.content && (
        <Text style={styles.content}>{post.content}</Text>
      )}

      {/* IMAGEM */}
      {post.image && (
        <Pressable onPress={handleTap}>
          <View style={{ position: "relative" }}>
            <Image
              source={{ uri: post.image }}
              style={styles.postImage}
              resizeMode="cover"
            />

            <HeartAnimated
              visible={showHeart}
              scale={likeScale}
              opacity={heartOpacity}
            />
          </View>
        </Pressable>
      )}

      {/* AÇÕES */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleLikePost}
          style={styles.actionButton}
        >
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            {liked ? (
              <FontAwesome name="heart" size={20} color="#e0245e" />
            ) : (
              <Feather name="heart" size={20} color="#555" />
            )}
          </Animated.View>

          <TouchableOpacity onPress={() => setLikesVisible(true)}>
            <Text style={styles.likesCount}>{likeCount}</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCommentsVisible(true)}
          style={styles.actionButton}
        >
          <Feather name="message-circle" size={20} color="#555" />
          <Text style={styles.likesCount}>{comments.length}</Text>
        </TouchableOpacity>
      </View>

      {/* 
      MODAIS 
      (Manter os seus, apenas não coloque dentro do PostCard se quiser máxima performance)
      */}
    </View>
  );
};

export default React.memo(PostCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  displayName: { fontWeight: "600", color: "#222" },
  postTime: { fontSize: 12, color: "#777" },
  content: { fontSize: 14, color: "#333", marginBottom: 8 },
  postImage: {
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  actions: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  actionButton: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  likesCount: { marginLeft: 6, color: "#444" },
});

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  useColorScheme,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { addNotification } from "@/utils/addNotification";
import { useFocusEffect } from "expo-router";

/* ---------------- RESPONSIVO ---------------- */
const { width: screenWidth } = Dimensions.get("window");
const isDesktop = screenWidth >= 768;
const containerWidth = isDesktop ? 520 : screenWidth;

/* ---------------- UTIL ---------------- */
const timeAgo = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  if (hours < 24) return `há ${hours} h`;
  return `há ${days} d`;
};

const PostCard = ({ post, isProfile = false }: any) => {
  const { currentUser } = useCurrentUser();
  const darkMode = useColorScheme() === "dark";
  const iconColor = darkMode ? "#fff" : "#000";

  if (!currentUser || !post?.user) return null;

  const displayName =
    post.user.displayName ||
    post.user.name ||
    post.user.username ||
    "unknown";

  const avatar = post.user.avatar || "https://via.placeholder.com/150";

  /* ================= STATES ================= */
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  const [liked, setLiked] = useState(
    post.likes?.some((u: any) => u.id === currentUser.id)
  );
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [commentCount, setCommentCount] = useState(
    post.comments?.length || 0
  );

  /* ================= LOAD DATA ================= */
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const storedPosts = await AsyncStorage.getItem("posts");
        const parsedPosts = storedPosts ? JSON.parse(storedPosts) : [];

        const updatedPost = parsedPosts.find(
          (p: any) => p.id === post.id
        );

        if (updatedPost) {
          setCommentCount(updatedPost.comments?.length || 0);
          setLikeCount(updatedPost.likes?.length || 0);
          setLiked(
            updatedPost.likes?.some(
              (u: any) => u.id === currentUser.id
            )
          );
          setPostComments(updatedPost.comments || []);
        }
      };

      loadData();
    }, [post.id])
  );

  /* ================= LIKE ================= */
  const handleLikePost = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((prev) => (newLiked ? prev + 1 : prev - 1));

    const stored = await AsyncStorage.getItem("posts");
    const parsed = stored ? JSON.parse(stored) : [];

    const updated = parsed.map((p: any) =>
      p.id === post.id
        ? {
            ...p,
            likes: newLiked
              ? [...(p.likes || []), currentUser]
              : (p.likes || []).filter(
                  (u: any) => u.id !== currentUser.id
                ),
          }
        : p
    );

    await AsyncStorage.setItem("posts", JSON.stringify(updated));

    if (newLiked && post.user.id !== currentUser.id) {
      await addNotification(currentUser, "like", post.id, post.user.id);
    }
  };

  /* ================= COMMENTS ================= */
  const addComment = async () => {
    if (!newComment.trim()) return;

    const commentObj = {
      text: newComment,
      createdAt: Date.now(),
      user: currentUser,
    };

    const stored = await AsyncStorage.getItem("posts");
    const parsed = stored ? JSON.parse(stored) : [];

    const updated = parsed.map((p: any) =>
      p.id === post.id
        ? {
            ...p,
            comments: [...(p.comments || []), commentObj],
          }
        : p
    );

    await AsyncStorage.setItem("posts", JSON.stringify(updated));

    setPostComments((prev) => [...prev, commentObj]);
    setCommentCount((prev) => prev + 1);
    setNewComment("");
  };

  /* ================= CARD CONTENT ================= */
  const renderPost = () => (
    <View
      style={[
        styles.card,
        {
          width: containerWidth,
          backgroundColor: darkMode ? "#000" : "#fff",
        },
      ]}
    >
      <View style={styles.header}>
        <Image source={{ uri: avatar }} style={styles.avatar} />
        <Text style={[styles.displayName, { color: iconColor }]}>
          {displayName}
        </Text>
      </View>

      <Image source={{ uri: post.image }} style={styles.postImage} />

      <View style={styles.actions}>
        <TouchableOpacity onPress={handleLikePost} style={styles.actionButton}>
          {liked ? (
            <FontAwesome name="heart" size={24} color="#e0245e" />
          ) : (
            <Feather name="heart" size={24} color={iconColor} />
          )}
          <Text style={{ marginLeft: 6, color: iconColor }}>
            {likeCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCommentsModalVisible(true)}
          style={styles.actionButton}
        >
          <Feather name="message-circle" size={24} color={iconColor} />
          <Text style={{ marginLeft: 6, color: iconColor }}>
            {commentCount}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      {/* SE ESTIVER NO PROFILE → ABRE MODAL */}
      {isProfile ? (
        <>
          <TouchableOpacity onPress={() => setPostModalVisible(true)}>
            {renderPost()}
          </TouchableOpacity>

          <Modal visible={postModalVisible} animationType="slide">
            <View style={{ flex: 1, backgroundColor: darkMode ? "#000" : "#fff" }}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setPostModalVisible(false)}>
                  <Feather name="arrow-left" size={24} color={iconColor} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: iconColor }]}>
                  Post
                </Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView contentContainerStyle={{ alignItems: "center" }}>
                {renderPost()}
              </ScrollView>
            </View>
          </Modal>
        </>
      ) : (
        renderPost()
      )}

      {/* COMMENTS MODAL */}
      <Modal visible={commentsModalVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: darkMode ? "#000" : "#fff" }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCommentsModalVisible(false)}>
              <Feather name="arrow-left" size={24} color={iconColor} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: iconColor }]}>
              Comentários
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
            {postComments.map((comment: any, index: number) => (
              <View key={index} style={{ marginBottom: 16 }}>
                <Text style={{ color: iconColor }}>
                  <Text style={{ fontWeight: "700" }}>
                    {comment.user?.username}{" "}
                  </Text>
                  {comment.text}
                </Text>
                <Text style={{ fontSize: 12, color: "#888" }}>
                  {timeAgo(comment.createdAt)}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.commentInputContainer}>
            <TextInput
              placeholder="Adicionar comentário..."
              placeholderTextColor="#888"
              value={newComment}
              onChangeText={setNewComment}
              style={[
                styles.commentInput,
                { color: iconColor, borderColor: iconColor },
              ]}
            />
            <TouchableOpacity onPress={addComment}>
              <Text style={{ color: "#0095f6", fontWeight: "600" }}>
                Enviar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default React.memo(PostCard);

const styles = StyleSheet.create({
  card: { marginBottom: 12, borderRadius: 12, overflow: "hidden" },
  header: { flexDirection: "row", padding: 12, alignItems: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  displayName: { fontWeight: "700", fontSize: 14 },
  postImage: { width: "100%", aspectRatio: 1 },
  actions: { flexDirection: "row", padding: 12 },
  actionButton: { flexDirection: "row", alignItems: "center", marginRight: 18 },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  modalTitle: { fontSize: 18, fontWeight: "600" },

  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },

  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
  },
});
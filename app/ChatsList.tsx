import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Feather } from "@expo/vector-icons";

type ChatItem = {
  id: string;
  users: {
    id: string;
    username: string;
    avatar?: string;
  }[];
  lastMessage?: string;
  updatedAt: number;
};

export default function ChatsList() {
  const { currentUser } = useCurrentUser();
  const router = useRouter();
  const params = useLocalSearchParams();

  const forwardPost = params.forwardPost
    ? JSON.parse(params.forwardPost as string)
    : null;

  const [chats, setChats] = useState<ChatItem[]>([]);

  // ----------------------
  // 📥 LOAD CHATS
  // ----------------------
  const loadChats = useCallback(async () => {
    if (!currentUser) return;

    try {
      const stored = await AsyncStorage.getItem(
        `conversations_${currentUser.id}`
      );
      setChats(stored ? JSON.parse(stored) : []);
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    loadChats();
  }, []);

  // ----------------------
  // 👉 OPEN CHAT
  // ----------------------
  const openChat = (chat: ChatItem) => {
    const otherUser = chat.users.find(
      (u) => u.id !== currentUser?.id
    );

    if (!otherUser) return;

    router.push({
      pathname: "/ChatScreen",
      params: {
        chatId: chat.id,
        userId: otherUser.id,
        username: otherUser.username,
        avatar: otherUser.avatar ?? "",
        forwardPost: forwardPost
          ? JSON.stringify(forwardPost)
          : undefined,
      },
    });
  };

  if (!currentUser) return null;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
      </View>

      <FlatList
        data={chats.sort((a, b) => b.updatedAt - a.updatedAt)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => {
          const otherUser = item.users.find(
            (u) => u.id !== currentUser.id
          );

          if (!otherUser) return null;

          return (
            <TouchableOpacity
              style={styles.chatItem}
              onPress={() => openChat(item)}
            >
              <Image
                source={{
                  uri:
                    otherUser.avatar ??
                    "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                }}
                style={styles.avatar}
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.username}>
                  {otherUser.username}
                </Text>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.lastMessage || "Nova conversa"}
                </Text>
              </View>

              <Feather name="chevron-right" size={20} color="#bbb" />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Nenhuma conversa iniciada
          </Text>
        }
      />
    </View>
  );
}

// ======================
// 🎨 STYLES
// ======================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111",
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  lastMessage: {
    fontSize: 14,
    color: "#777",
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#777",
  },
});

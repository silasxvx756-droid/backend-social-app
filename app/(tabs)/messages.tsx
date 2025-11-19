// src/screens/ConversationsScreen.tsx
import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type User = {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string | null;
};

type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
};

type Conversation = {
  user: User;
  lastMessage?: Message;
  unreadCount: number;
};

type RootStackParamList = {
  ChatScreen: { loggedUser: User; chatUser: User };
  UserProfileScreen: { userId: string };
  ConversationsScreen: undefined;
};

type ConversationsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ConversationsScreen"
>;

export default function ConversationsScreen() {
  const navigation = useNavigation<ConversationsScreenNavigationProp>();
  const { currentUser } = useCurrentUser();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getConversationKey = useCallback((userId1: string, userId2: string) => {
    const participants = [userId1, userId2].sort();
    return `conversation_${participants.join("_")}`;
  }, []);

  const deleteConversation = useCallback(
    async (userId: string) => {
      if (!currentUser) return;

      Alert.alert(
        "Apagar conversa",
        "Deseja realmente apagar toda a conversa?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Apagar",
            style: "destructive",
            onPress: async () => {
              try {
                const key = getConversationKey(currentUser.id, userId);
                await AsyncStorage.removeItem(key);
                await loadConversations();
              } catch (error) {
                Alert.alert("Erro", "Não foi possível apagar a conversa.");
              }
            },
          },
        ]
      );
    },
    [currentUser, getConversationKey]
  );

  const getUniqueUsersFromPosts = useCallback(async (): Promise<User[]> => {
    try {
      const postsRaw = await AsyncStorage.getItem("posts");
      if (!postsRaw) return [];
      const posts = JSON.parse(postsRaw);

      const map = new Map<string, User>();
      posts.forEach((post: any) => {
        if (post.user?.id && post.user.id !== currentUser?.id) {
          map.set(post.user.id, {
            id: post.user.id,
            username: post.user.username,
            displayName: post.user.displayName,
            avatar: post.user.avatar ?? null,
          });
        }
      });

      return Array.from(map.values());
    } catch {
      return [];
    }
  }, [currentUser?.id]);

  const getUsersFromConversations = useCallback(async (): Promise<User[]> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const convoKeys = keys.filter((k) => k.startsWith("conversation_"));
      const users: User[] = [];

      for (const key of convoKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (!stored) continue;

        let messages: Message[] = [];
        try {
          messages = JSON.parse(stored) || [];
        } catch {
          continue;
        }

        if (messages.length === 0) continue;

        const m = messages[0];
        const chatUserId =
          m.senderId === currentUser?.id ? m.receiverId : m.senderId;

        const raw = await AsyncStorage.getItem(`user_${chatUserId}`);
        if (raw) {
          try {
            users.push(JSON.parse(raw));
          } catch {
            users.push({ id: chatUserId, username: `user_${chatUserId}` });
          }
        } else {
          users.push({ id: chatUserId, username: `user_${chatUserId}` });
        }
      }

      return users.filter(
        (u, i, arr) => i === arr.findIndex((x) => x.id === u.id)
      );
    } catch {
      return [];
    }
  }, [currentUser?.id]);

  const loadConversationMessages = useCallback(
    async (userId: string) => {
      if (!currentUser) return [];
      try {
        const key = getConversationKey(currentUser.id, userId);
        const stored = await AsyncStorage.getItem(key);
        if (!stored) return [];
        const messages: Message[] = JSON.parse(stored) || [];

        return messages.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      } catch {
        return [];
      }
    },
    [currentUser, getConversationKey]
  );

  const loadConversations = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);

      const [postUsers, chatUsers] = await Promise.all([
        getUniqueUsersFromPosts(),
        getUsersFromConversations(),
      ]);

      const map = new Map<string, User>();
      [...postUsers, ...chatUsers].forEach((u) => map.set(u.id, u));

      const allUsers = Array.from(map.values()).map((u) => {
        // 🔵 FOTO DO PRÓPRIO USUÁRIO — SEMPRE CLERK
        if (u.id === currentUser.id) {
          return {
            ...u,
            username: currentUser.username,
            displayName: currentUser.displayName,
            avatar: currentUser.avatar ?? null,
          };
        }

        // ⭐ FIX: garantir avatar dos outros usuários
        return {
          ...u,
          avatar: u.avatar ?? null,
        };
      });

      const conversationsData = await Promise.all(
        allUsers.map(async (u) => {
          const msgs = await loadConversationMessages(u.id);
          const lastMsg = msgs[msgs.length - 1];
          const unread = msgs.filter(
            (m) => m.receiverId === currentUser.id && !m.read
          ).length;

          return { user: u, lastMessage: lastMsg, unreadCount: unread };
        })
      );

      const valid = conversationsData.filter(
        (c) => c.lastMessage || c.unreadCount > 0
      );

      valid.sort((a, b) => {
        const ta = a.lastMessage
          ? new Date(a.lastMessage.timestamp).getTime()
          : 0;
        const tb = b.lastMessage
          ? new Date(b.lastMessage.timestamp).getTime()
          : 0;
        return tb - ta;
      });

      setConversations(valid);
    } finally {
      setLoading(false);
    }
  }, [
    currentUser,
    getUniqueUsersFromPosts,
    getUsersFromConversations,
    loadConversationMessages,
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (currentUser) loadConversations();
    }, [currentUser, loadConversations])
  );

  const openChat = useCallback(
    (chatUser: User) => {
      if (!currentUser) return;
      navigation.navigate("ChatScreen", {
        loggedUser: currentUser,
        chatUser,
      });
    },
    [currentUser, navigation]
  );

  const renderConversation = ({ item }: { item: Conversation }) => {
    const hasUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          hasUnread && styles.conversationItemUnread,
        ]}
        onPress={() => openChat(item.user)}
        onLongPress={() => deleteConversation(item.user.id)}
        delayLongPress={300}
      >
        <View style={styles.avatarContainer}>
          {item.user.avatar ? (
            <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Feather name="user" size={24} color="#777" />
            </View>
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text
              style={[
                styles.displayName,
                hasUnread && styles.displayNameUnread,
              ]}
            >
              {item.user.displayName || item.user.username}
            </Text>

            {item.lastMessage && (
              <Text style={styles.timestamp}>
                {new Date(item.lastMessage.timestamp).toLocaleTimeString(
                  "pt-BR",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              </Text>
            )}
          </View>

          <View style={styles.messageRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.lastMessage,
                hasUnread && styles.lastMessageUnread,
              ]}
            >
              {item.lastMessage
                ? item.lastMessage.content
                : "Nenhuma mensagem ainda"}
            </Text>

            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Feather name="chevron-right" size={16} color="#ccc" />
      </TouchableOpacity>
    );
  };

  if (loading && conversations.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#133de9" />
        <Text style={styles.loadingText}>Carregando conversas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mensagens</Text>
        <Text style={styles.headerSubtitle}>
          {conversations.length} conversa
          {conversations.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(i) => i.user.id}
        renderItem={renderConversation}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#133de9"]}
          />
        }
        contentContainerStyle={[
          styles.listContainer,
          conversations.length === 0 && styles.listContainerEmpty,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#777" },

  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 28, fontWeight: "bold" },
  headerSubtitle: { fontSize: 14, color: "#777" },

  listContainer: { flexGrow: 1 },
  listContainerEmpty: { justifyContent: "center" },

  conversationItem: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
    alignItems: "center",
  },
  conversationItemUnread: {
    backgroundColor: "#eef2ff",
  },

  avatarContainer: { marginRight: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#e5e5e5",
    alignItems: "center",
    justifyContent: "center",
  },

  conversationContent: { flex: 1 },

  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  displayName: { fontSize: 16, fontWeight: "600" },
  displayNameUnread: { color: "#133de9", fontWeight: "700" },

  timestamp: { fontSize: 12, color: "#999" },

  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  lastMessage: { color: "#666", flex: 1 },
  lastMessageUnread: { color: "#000", fontWeight: "600" },

  unreadBadge: {
    backgroundColor: "#133de9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadCount: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
});

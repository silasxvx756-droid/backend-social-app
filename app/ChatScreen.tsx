// src/screens/ConversationsScreen.tsx
import React, { useCallback, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareFlatList } from "react-native-keyboard-aware-scroll-view";

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
  content?: string;
  image?: string;
  timestamp: string;
  read: boolean;
};

type Conversation = {
  user: User;
  lastMessage?: Message;
  unreadCount: number;
};

type RootStackParamList = {
  ConversationsScreen: undefined;
};

export default function ConversationsScreen() {
  const navigation = useNavigation();
  const { currentUser } = useCurrentUser();
  const insets = useSafeAreaInsets();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [modalDeleteVisible, setModalDeleteVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // ------------------- Chat Modal -------------------
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  const listRef = useRef<any>(null);

  const getConversationKey = useCallback(
    (a: string, b: string) => `conversation_${[a, b].sort().join("_")}`,
    []
  );

  const loadConversationMessages = useCallback(
    async (userId: string) => {
      if (!currentUser) return [];
      try {
        const key = getConversationKey(currentUser.id, userId);
        const stored = await AsyncStorage.getItem(key);
        if (!stored) return [];
        const msgs: Message[] = JSON.parse(stored) || [];
        return msgs.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      } catch {
        return [];
      }
    },
    [currentUser]
  );

  const loadConversations = useCallback(async () => {
    if (!currentUser) return;

    const keys = await AsyncStorage.getAllKeys();
    const convoKeys = keys.filter((k) => k.startsWith("conversation_"));
    const users: User[] = [];

    for (const key of convoKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;
      const msgs: Message[] = JSON.parse(raw) || [];
      if (!msgs.length) continue;
      const m = msgs[0];
      const chatUserId = m.senderId === currentUser.id ? m.receiverId : m.senderId;
      const uRaw = await AsyncStorage.getItem(`clerk_user_${chatUserId}`);
      if (uRaw) users.push(JSON.parse(uRaw));
    }

    const uniqueUsers = users.filter(
      (u, i, arr) => i === arr.findIndex((x) => x.id === u.id)
    );

    const data = await Promise.all(
      uniqueUsers.map(async (u) => {
        const msgs = await loadConversationMessages(u.id);
        const last = msgs[msgs.length - 1];
        const unread = msgs.filter(
          (m) => m.receiverId === currentUser.id && !m.read
        ).length;

        return {
          user: u,
          lastMessage: last,
          unreadCount: unread,
        };
      })
    );

    data.sort((a, b) => {
      const ta = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const tb = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return tb - ta;
    });

    setConversations(data);
  }, [currentUser]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [currentUser])
  );

  // ------------------- Open Chat Modal -------------------
  const openChatModal = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    const msgs = await loadConversationMessages(conversation.user.id);
    setMessages(msgs);
    setChatModalVisible(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
  };

  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const saveMessage = async (msg: Message) => {
    const updated = [...messages, msg];
    setMessages(updated);
    const key = getConversationKey(currentUser!.id, selectedConversation!.user.id);
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    loadConversations();
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  // ------------------- Send Text -------------------
  const sendMessage = async () => {
    if (!messageText.trim() || sending) return;
    setSending(true);
    const msg: Message = {
      id: generateMessageId(),
      senderId: currentUser!.id,
      receiverId: selectedConversation!.user.id,
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    await saveMessage(msg);
    setMessageText("");
    setSending(false);
  };

  // ------------------- Pick Image -------------------
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissão necessária para acessar a galeria.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      const msg: Message = {
        id: generateMessageId(),
        senderId: currentUser!.id,
        receiverId: selectedConversation!.user.id,
        image: imageUri,
        timestamp: new Date().toISOString(),
        read: false,
      };
      await saveMessage(msg);
    }
  };

  // ------------------- Take Photo -------------------
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissão necessária para usar a câmera.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      const msg: Message = {
        id: generateMessageId(),
        senderId: currentUser!.id,
        receiverId: selectedConversation!.user.id,
        image: imageUri,
        timestamp: new Date().toISOString(),
        read: false,
      };
      await saveMessage(msg);
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === currentUser!.id;
    return (
      <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        {item.content && <Text style={styles.messageText}>{item.content}</Text>}
        {item.image && (
          <Image
            source={{ uri: item.image }}
            style={styles.imageMessage}
            resizeMode="cover"
          />
        )}
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const unread = item.unreadCount > 0;
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => openChatModal(item)}
      >
        {item.user.avatar ? (
          <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Feather name="user" size={22} color="#999" />
          </View>
        )}
        <View style={styles.content}>
          <Text style={[styles.name, unread && styles.nameUnread]}>
            {(item.user.displayName || item.user.username).split(" ")[0]}
          </Text>
          <Text numberOfLines={1} style={[styles.lastMsg, unread && styles.lastMsgUnread]}>
            {item.lastMessage?.content || "Nenhuma mensagem"}
          </Text>
        </View>
        {unread && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 25 }]}>
        <Text style={styles.headerTitle}>Mensagens</Text>
      </View>

      {/* Conversas */}
      <FlatList
        data={conversations}
        keyExtractor={(i) => i.user.id}
        renderItem={renderConversationItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* ------------------- Modal Chat ------------------- */}
      <Modal
        visible={chatModalVisible}
        animationType="slide"
        onRequestClose={() => setChatModalVisible(false)}
      >
        <View style={styles.container}>
          {/* Header Chat */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setChatModalVisible(false)}>
              <Feather name="arrow-left" size={24} color="#000" />
            </TouchableOpacity>
            <Image
              source={{
                uri: selectedConversation?.user.avatar || "https://ui-avatars.com/api/?background=e5e5ea&color=000&name=" + selectedConversation?.user.username,
              }}
              style={styles.avatar}
            />
            <Text style={styles.userName}>
              {(selectedConversation?.user.displayName || selectedConversation?.user.username).split(" ")[0]}
            </Text>
          </View>

          {/* Messages */}
          <KeyboardAwareFlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={{ padding: 16 }}
            enableOnAndroid
            keyboardShouldPersistTaps="handled"
          />

          {/* Footer Moderno */}
          <View style={styles.footerModern}>
            <TouchableOpacity style={styles.iconCircle} onPress={pickImage}>
              <Feather name="image" size={20} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconCircle} onPress={takePhoto}>
              <Feather name="camera" size={20} color="#333" />
            </TouchableOpacity>

            <View style={styles.inputWrapper}>
              <TextInput
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Digite uma mensagem..."
                placeholderTextColor="#999"
                style={styles.inputModern}
                multiline
              />
            </View>

            <TouchableOpacity
              onPress={sendMessage}
              disabled={!messageText.trim()}
              style={[styles.sendCircle, { opacity: !messageText.trim() ? 0.5 : 1 }]}
            >
              <Feather name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ------------------- Styles -------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#000" },

  conversationItem: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f3f3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  content: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#000" },
  nameUnread: { fontWeight: "700" },
  lastMsg: { color: "#666", marginTop: 2 },
  lastMsgUnread: { color: "#000", fontWeight: "600" },
  badge: {
    backgroundColor: "#000",
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Chat bubbles
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 20,
    marginVertical: 4,
  },
  ownBubble: { backgroundColor: "#e5e5ea", alignSelf: "flex-end" },
  otherBubble: { backgroundColor: "#f2f2f2", alignSelf: "flex-start" },
  messageText: { fontSize: 14 },
  imageMessage: { width: 200, height: 200, borderRadius: 12, marginTop: 4 },
  timestamp: { fontSize: 10, color: "#999", marginTop: 2, textAlign: "right" },

  // Footer moderno
  footerModern: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f3f3f3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: "#f3f3f3",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginRight: 8,
    maxHeight: 100,
  },
  inputModern: { fontSize: 15, color: "#000" },
  sendCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  userName: { fontSize: 16, fontWeight: "600" },
});
// src/screens/ConversationsScreen.tsx
import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  InteractionManager,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";

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
  imageUri?: string | null;
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

type NavProp = NativeStackNavigationProp<
  RootStackParamList,
  "ConversationsScreen"
>;

export default function ConversationsScreen() {
  const navigation = useNavigation<NavProp>();
  const { currentUser } = useCurrentUser();
  const insets = useSafeAreaInsets();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  const getConversationKey = useCallback(
    (a: string, b: string) => `conversation_${[a, b].sort().join("_")}`,
    []
  );

  const confirmDeleteConversation = (userId: string) => {
    setSelectedUserId(userId);
    setModalVisible(true);
  };

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

  const getUsersFromConversations = useCallback(async (): Promise<User[]> => {
    if (!currentUser) return [];
    const keys = await AsyncStorage.getAllKeys();
    const convoKeys = keys.filter((k) => k.startsWith("conversation_"));

    const users: User[] = [];

    for (const key of convoKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;
      const msgs: Message[] = JSON.parse(raw) || [];
      if (!msgs.length) continue;

      const m = msgs[0];
      const chatUserId =
        m.senderId === currentUser.id ? m.receiverId : m.senderId;

      const uRaw = await AsyncStorage.getItem(`clerk_user_${chatUserId}`);
      if (uRaw) users.push(JSON.parse(uRaw));
    }

    return users.filter(
      (u, i, arr) => i === arr.findIndex((x) => x.id === u.id)
    );
  }, [currentUser]);

  const loadConversations = useCallback(async () => {
    if (!currentUser) return;

    const users = await getUsersFromConversations();

    const data = await Promise.all(
      users.map(async (u) => {
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
      const ta = a.lastMessage
        ? new Date(a.lastMessage.timestamp).getTime()
        : 0;
      const tb = b.lastMessage
        ? new Date(b.lastMessage.timestamp).getTime()
        : 0;
      return tb - ta;
    });

    setConversations(data);
  }, [currentUser]);

  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        loadConversations();
      }
    }, [currentUser])
  );

  const openChatModal = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (currentUser) {
      const msgs = await loadConversationMessages(conversation.user.id);
      setMessages(msgs);
    }
    setChatModalVisible(true);
  };

  // Scroll automático ao enviar/receber mensagem ou abrir chat
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      InteractionManager.runAfterInteractions(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages, chatModalVisible]);

  // Scroll automático ao abrir teclado
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      InteractionManager.runAfterInteractions(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    });

    return () => showSub.remove();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const sendMessage = async () => {
    if (!currentUser || !selectedConversation || (!inputText.trim() && !selectedImage)) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      receiverId: selectedConversation.user.id,
      content: inputText,
      timestamp: new Date().toISOString(),
      read: false,
      imageUri: selectedImage || null,
    };

    const key = getConversationKey(currentUser.id, selectedConversation.user.id);
    const updatedMessages = [...messages, newMsg];
    await AsyncStorage.setItem(key, JSON.stringify(updatedMessages));

    setMessages(updatedMessages);
    setInputText("");
    setSelectedImage(null);
    loadConversations();
  };

  const deleteMessage = async (messageId: string) => {
    if (!currentUser || !selectedConversation) return;

    const key = getConversationKey(currentUser.id, selectedConversation.user.id);
    const updatedMessages = messages.filter((m) => m.id !== messageId);

    await AsyncStorage.setItem(key, JSON.stringify(updatedMessages));
    setMessages(updatedMessages);
    loadConversations();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    ) return "Hoje";

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()
    ) return "Ontem";

    return d.toLocaleDateString();
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const unread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        activeOpacity={0.7}
        onPress={() => openChatModal(item)}
        onLongPress={() => confirmDeleteConversation(item.user.id)}
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
          <Text
            numberOfLines={1}
            style={[styles.lastMsg, unread && styles.lastMsgUnread]}
          >
            {item.lastMessage?.content || (item.lastMessage?.imageUri ? "📷 Imagem" : "Nenhuma mensagem")}
          </Text>
        </View>

        {unread && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item.unreadCount > 99 ? "99+" : item.unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Lista de mensagens com separadores de data
  const messagesWithDates: any[] = [];
  let lastDate = "";
  messages.forEach((msg) => {
    const msgDate = new Date(msg.timestamp).toDateString();
    if (msgDate !== lastDate) {
      messagesWithDates.push({ type: "separator", id: `sep-${msgDate}`, date: msg.timestamp });
      lastDate = msgDate;
    }
    messagesWithDates.push({ ...msg, type: "message" });
  });

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
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ color: "#999" }}>Nenhuma conversa</Text>
          </View>
        }
      />

      {/* Modal de exclusão */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Apagar conversa?</Text>
            <Text style={styles.modalMessage}>
              Deseja realmente apagar toda a conversa?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={async () => {
                  if (!currentUser || !selectedUserId) return;
                  const key = getConversationKey(currentUser.id, selectedUserId);
                  await AsyncStorage.removeItem(key);
                  setModalVisible(false);
                  loadConversations();
                }}
              >
                <Text style={styles.deleteText}>Apagar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de chat */}
      <Modal
        visible={chatModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setChatModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.fullScreenModal}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header chat */}
          <View style={styles.chatHeader}>
            <TouchableOpacity
              onPress={() => setChatModalVisible(false)}
              style={{ marginRight: 8, paddingVertical: 2 }}
            >
              <Feather name="arrow-left" size={20} color="#000" />
            </TouchableOpacity>

            {selectedConversation?.user.avatar ? (
              <Image
                source={{ uri: selectedConversation.user.avatar }}
                style={styles.chatAvatar}
              />
            ) : (
              <View style={styles.chatAvatarPlaceholder}>
                <Feather name="user" size={18} color="#999" />
              </View>
            )}

            <Text style={[styles.modalTitle, { marginLeft: 6 }]}>
              {selectedConversation?.user.displayName || selectedConversation?.user.username}
            </Text>
          </View>

          {/* Preview imagem */}
          {selectedImage && (
            <View style={{ marginBottom: 8, alignItems: 'flex-start' }}>
              <Image
                source={{ uri: selectedImage }}
                style={{ width: 120, height: 120, borderRadius: 12 }}
              />
            </View>
          )}

          {/* Lista de mensagens */}
          <FlatList
            ref={flatListRef}
            data={messagesWithDates}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 10, paddingBottom: 60 }} // altura do input
            renderItem={({ item, index }) => {
              if (item.type === "separator") {
                return (
                  <View style={{ alignSelf: "center", marginVertical: 5 }}>
                    <Text style={{ fontSize: 12, color: "#666" }}>{formatDate(item.date)}</Text>
                  </View>
                );
              }

              const isMine = item.senderId === currentUser?.id;
              return (
                <TouchableOpacity
                  onLongPress={() =>
                    Alert.alert(
                      "Apagar mensagem?",
                      "Deseja realmente apagar esta mensagem?",
                      [
                        { text: "Cancelar", style: "cancel" },
                        { text: "Apagar", style: "destructive", onPress: () => deleteMessage(item.id) },
                      ]
                    )
                  }
                  style={[
                    styles.messageBubble,
                    isMine ? styles.myMessage : styles.theirMessage,
                    index === messagesWithDates.length - 1 ? { marginBottom: 0 } : { marginBottom: 3 },
                  ]}
                >
                  {item.imageUri && (
                    <Image
                      source={{ uri: item.imageUri }}
                      style={{ width: 150, height: 150, borderRadius: 12, marginBottom: 4 }}
                      resizeMode="cover"
                    />
                  )}
                  {item.content ? <Text style={{ color: "#000" }}>{item.content}</Text> : null}
                  <Text style={styles.timestamp}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          {/* Input */}
          <View style={styles.inputContainer}>
            <TouchableOpacity onPress={pickImage} style={{ marginRight: 8 }}>
              <Feather name="image" size={24} color="#000" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Digite uma mensagem..."
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Feather name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { backgroundColor: "#fff", paddingBottom: 16, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#000" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 40 },
  conversationItem: { flexDirection: "row", padding: 16, alignItems: "center", backgroundColor: "#fff" },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 14 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e5e5", alignItems: "center", justifyContent: "center", marginRight: 14 },
  content: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#000" },
  nameUnread: { fontWeight: "700" },
  lastMsg: { color: "#666", marginTop: 2 },
  lastMsgUnread: { color: "#000", fontWeight: "600" },
  badge: { backgroundColor: "#000", minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContainer: { backgroundColor: "#fff", borderRadius: 10, paddingVertical: 16, paddingHorizontal: 18, alignItems: "center" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#000", textAlign: "center" },
  modalMessage: { fontSize: 13, color: "#666", marginBottom: 12, textAlign: "center" },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  modalButton: { flex: 1, paddingVertical: 10, borderRadius: 8, marginHorizontal: 4, alignItems: "center" },
  cancelButton: { backgroundColor: "#e5e5e5" },
  deleteButton: { backgroundColor: "#ff3b30" },
  cancelText: { color: "#000", fontWeight: "600", fontSize: 14 },
  deleteText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  fullScreenModal: { flex: 1, backgroundColor: "#fff", paddingTop: 5, paddingHorizontal: 10 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, width: '100%', paddingTop: Platform.OS === 'ios' ? 15 : 5 },
  chatAvatar: { width: 35, height: 35, borderRadius: 17.5, marginRight: 10 },
  chatAvatarPlaceholder: { width: 35, height: 35, borderRadius: 17.5, backgroundColor: "#e5e5e5", alignItems: "center", justifyContent: "center", marginRight: 10 },
  messageBubble: { padding: 8, borderRadius: 12, maxWidth: '80%' },
  myMessage: { backgroundColor: '#d1d1d1', alignSelf: 'flex-end', borderBottomRightRadius: 0 },
  theirMessage: { backgroundColor: '#f0f0f0', alignSelf: 'flex-start', borderBottomLeftRadius: 0 },
  timestamp: { fontSize: 10, color: '#888', marginTop: 2, textAlign: 'right' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 8, paddingHorizontal: 4 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 16, height: 40, backgroundColor: '#f5f5f5' },
  sendButton: { marginLeft: 4, backgroundColor: '#000', borderRadius: 20, padding: 10, justifyContent: 'center', alignItems: 'center' },
});

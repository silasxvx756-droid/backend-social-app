// src/screens/ChatScreen.tsx
import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
  Linking,
  Animated,
  Easing,
  Keyboard,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Modal from "react-native-modal";
import { addNotification } from "@/utils/addNotification";

// ---------------- TYPES ----------------
type User = {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
};

type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  content?: string;
  imageUri?: string;
  timestamp: string;
  read: boolean;
};

type RootStackParamList = {
  ChatScreen: { loggedUser: User | string; chatUser: User | string };
  UserProfileScreen: { userId: string; username?: string; firstName?: string; avatar?: string };
};

type ChatScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "ChatScreen"
>;

export default function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation<ChatScreenNavigationProp>();

  const params = route.params as any;

  const loggedUser: User =
    typeof params.loggedUser === "string"
      ? JSON.parse(params.loggedUser)
      : params.loggedUser;

  const chatUser: User =
    typeof params.chatUser === "string"
      ? JSON.parse(params.chatUser)
      : params.chatUser;

  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mediaSending, setMediaSending] = useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const footerOffset = useRef(new Animated.Value(0)).current;

  const [isOnline, setIsOnline] = useState(false);
  const [lastOnline, setLastOnline] = useState<number | null>(null);

  const [optionsVisible, setOptionsVisible] = useState(false);
  const [muted, setMuted] = useState(false);

  // COPIAR MENSAGEM
  const copyToClipboard = (text: string) => {
    Clipboard.setStringAsync(text);
    Alert.alert("Copiado", "Mensagem copiada para a área de transferência.");
  };

  // ---------------- MUTAR / DESMUTAR ----------------
  const loadMuted = useCallback(async () => {
    const key = `muted_${loggedUser.id}`;
    const stored = await AsyncStorage.getItem(key);
    const list = stored ? JSON.parse(stored) : [];
    setMuted(list.includes(chatUser.id));
  }, [chatUser.id, loggedUser.id]);

  const toggleMute = async () => {
    try {
      const key = `muted_${loggedUser.id}`;
      const stored = await AsyncStorage.getItem(key);
      let list = stored ? JSON.parse(stored) : [];

      if (list.includes(chatUser.id)) {
        list = list.filter((u: string) => u !== chatUser.id);
        setMuted(false);
        Alert.alert("Som ativado", "As notificações deste chat foram ativadas.");
      } else {
        list.push(chatUser.id);
        setMuted(true);
        Alert.alert("Conversas silenciada", "Você não receberá notificações deste chat.");
      }

      await AsyncStorage.setItem(key, JSON.stringify(list));
    } catch (err) {
      console.log("Erro ao silenciar conversa:", err);
    }
  };

  // ---------------- NOTIFICAÇÃO ----------------
  const notifyReceiver = useCallback(async () => {
    try {
      if (!muted) {
        await addNotification(
          {
            id: loggedUser.id,
            username: loggedUser.username,
            avatar: loggedUser.avatar,
          },
          "message"
        );
      }
    } catch (err) {
      console.log("Erro ao notificar mensagem:", err);
    }
  }, [loggedUser, muted]);

  // ---------------- STATUS ONLINE ----------------
  const loadOnlineStatus = useCallback(async () => {
    try {
      const onlineKey = `online_${chatUser.id}`;
      const lastOnlineKey = `lastOnline_${chatUser.id}`;

      const online = await AsyncStorage.getItem(onlineKey);
      const last = await AsyncStorage.getItem(lastOnlineKey);

      setIsOnline(online === "true");
      setLastOnline(last ? Number(last) : null);
    } catch (err) {
      console.log("Erro ao carregar status online:", err);
    }
  }, [chatUser.id]);

  const getLastSeenText = () => {
    if (isOnline) return null;
    if (!lastOnline) return null;

    const diff = Date.now() - lastOnline;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Visto há poucos segundos";
    if (minutes === 1) return "Visto há 1 minuto";
    if (minutes < 60) return `Visto há ${minutes} minutos`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "Visto há 1 hora";

    return `Visto há ${hours} horas`;
  };

  useEffect(() => {
    const interval = setInterval(() => loadOnlineStatus(), 5000);
    return () => clearInterval(interval);
  }, [loadOnlineStatus]);

  const generateMessageId = useCallback(
    () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    []
  );

  const getConversationKey = useCallback(() => {
    const participants = [loggedUser.id, chatUser.id].sort();
    return `conversation_${participants.join("_")}`;
  }, [loggedUser.id, chatUser.id]);

  const markMessagesAsRead = useCallback(
    async (msgs: Message[]) => {
      try {
        const key = getConversationKey();
        const updated = msgs.map((m) =>
          m.receiverId === loggedUser.id ? { ...m, read: true } : m
        );
        await AsyncStorage.setItem(key, JSON.stringify(updated));
        setMessages(updated);
      } catch (err) {
        console.log("Erro ao marcar mensagens como lidas", err);
      }
    },
    [getConversationKey, loggedUser.id]
  );

  const loadMessages = useCallback(async () => {
    try {
      const key = getConversationKey();
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const parsed: Message[] = JSON.parse(stored);
        const sorted = parsed.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setMessages(sorted);
        await markMessagesAsRead(sorted);
      }
    } catch {
      console.log("Erro ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  }, [getConversationKey, markMessagesAsRead]);

  const saveMessage = useCallback(
    async (msg: Message) => {
      const key = getConversationKey();
      const updated = [...messages, msg];
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      setMessages(updated);
    },
    [messages, getConversationKey]
  );

  // ---------------- ENVIAR MENSAGEM ----------------
  const sendMessage = useCallback(async () => {
    if (!messageText.trim() || sending) return;
    setSending(true);

    try {
      const newMessage: Message = {
        id: generateMessageId(),
        senderId: loggedUser.id,
        receiverId: chatUser.id,
        content: messageText.trim(),
        timestamp: new Date().toISOString(),
        read: false,
      };

      await saveMessage(newMessage);
      await notifyReceiver();

      setMessageText("");
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      console.log("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }, [
    messageText,
    sending,
    loggedUser.id,
    chatUser.id,
    generateMessageId,
    saveMessage,
    notifyReceiver,
  ]);

  // ---------------- ENVIAR IMAGEM ----------------
  const sendImageMessage = async (uri: string) => {
    try {
      const newMessage: Message = {
        id: generateMessageId(),
        senderId: loggedUser.id,
        receiverId: chatUser.id,
        imageUri: uri,
        timestamp: new Date().toISOString(),
        read: false,
      };

      await saveMessage(newMessage);
      await notifyReceiver();

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      console.log("Erro ao enviar imagem");
    }
  };

  // ---------------- PICK DA GALERIA (apenas isso agora) ----------------
  const pickMediaFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsMultipleSelection: false,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        setMediaSending(true);
        await sendImageMessage(result.assets[0].uri);
        setMediaSending(false);
      }
    } catch {
      console.log("Erro ao selecionar mídia");
      setMediaSending(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const loadAll = async () => {
        await loadMessages();
        await loadOnlineStatus();
        await loadMuted();

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 300);
      };
      loadAll();
    }, [loadMessages, loadOnlineStatus, loadMuted])
  );

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages]);

  // ANIMAÇÃO DO FOOTER
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", (e) => {
      Animated.timing(footerOffset, {
        toValue: e.endCoordinates.height,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener("keyboardWillHide", () => {
      Animated.timing(footerOffset, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });

    const androidShow = Keyboard.addListener("keyboardDidShow", (e) => {
      Animated.timing(footerOffset, {
        toValue: e.endCoordinates.height,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
    const androidHide = Keyboard.addListener("keyboardDidHide", () => {
      Animated.timing(footerOffset, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      androidShow.remove();
      androidHide.remove();
    };
  }, [footerOffset]);

  const handleOpenLink = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
    const match = text.match(urlRegex);
    if (match && match[0]) {
      const url = match[0].startsWith("http") ? match[0] : `https://${match[0]}`;
      Linking.openURL(url).catch(() => console.log("Erro ao abrir link"));
    }
  };

  const groupMessagesByDate = (msgs: Message[]) => {
    return msgs.reduce((groups: { [date: string]: Message[] }, msg) => {
      const date = new Date(msg.timestamp);
      const key = date.toISOString().split("T")[0];
      if (!groups[key]) groups[key] = [];
      groups[key].push(msg);
      return groups;
    }, {});
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#133de9" />
        <Text style={styles.loadingText}>Carregando conversa...</Text>
      </View>
    );
  }

  const groupedMessages = Object.entries(groupMessagesByDate(messages));

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.userInfo}>
            {chatUser.avatar ? (
              <Image source={{ uri: chatUser.avatar }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Feather name="user" size={20} color="#fff" />
              </View>
            )}

            <View>
              <Text style={styles.userName}>
                {chatUser.displayName || chatUser.username}
              </Text>

              {(() => {
                const lastSeenText = getLastSeenText();
                return lastSeenText ? (
                  <Text style={styles.userStatus}>{lastSeenText}</Text>
                ) : null;
              })()}
            </View>
          </View>

          <TouchableOpacity
            style={{ padding: 6, marginLeft: 10 }}
            onPress={() => setOptionsVisible(true)}
          >
            <Feather name="more-vertical" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* LISTA DE MENSAGENS */}
        <FlatList
          ref={flatListRef}
          data={groupedMessages}
          keyExtractor={([dateKey]) => dateKey}
          renderItem={({ item: [dateKey, msgs] }) => {
            const date = parseISO(dateKey);
            let displayDate = format(date, "d 'de' MMMM", { locale: ptBR });
            if (isToday(date)) displayDate = "Hoje";
            else if (isYesterday(date)) displayDate = "Ontem";

            return (
              <View>
                <View style={styles.dateSeparator}>
                  <Text style={styles.dateText}>{displayDate}</Text>
                </View>

                {msgs.map((item: Message) => {
                  const isOwn = item.senderId === loggedUser.id;
                  const messageTime = new Date(item.timestamp).toLocaleTimeString(
                    "pt-BR",
                    { hour: "2-digit", minute: "2-digit" }
                  );

                  const hasLink = item.content?.match(
                    /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi
                  );

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.messageContainer,
                        isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
                      ]}
                    >
                      <View
                        style={[
                          styles.messageBubble,
                          isOwn ? styles.ownMessageBubble : styles.otherMessageBubble,
                        ]}
                      >

                        {item.imageUri && (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                              setSelectedImage(item.imageUri!);
                              setIsImageModalVisible(true);
                            }}
                          >
                            <Image
                              source={{ uri: item.imageUri }}
                              style={styles.messageImage}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        )}

                        {item.content ? (
                          <Text
                            style={[
                              styles.messageText,
                              isOwn ? styles.ownMessageText : styles.otherMessageText,
                              hasLink ? styles.linkText : null,
                            ]}
                            onPress={() => {
                              if (hasLink) handleOpenLink(item.content!);
                            }}
                            onLongPress={() => copyToClipboard(item.content!)}
                          >
                            {item.content}
                          </Text>
                        ) : null}

                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                          <Text
                            style={[
                              styles.messageTime,
                              isOwn ? styles.ownMessageTime : styles.otherMessageTime,
                            ]}
                          >
                            {messageTime}
                          </Text>

                          {isOwn && (
                            <View style={{ flexDirection: "row", marginLeft: 4 }}>
                              {item.read ? (
                                <>
                                  <Feather name="check" size={14} color="#4fc3f7" />
                                  <Feather
                                    name="check"
                                    size={14}
                                    color="#4fc3f7"
                                    style={{ marginLeft: -4 }}
                                  />
                                </>
                              ) : (
                                <Feather name="check" size={14} color="rgba(255,255,255,0.7)" />
                              )}
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          }}
          contentContainerStyle={[styles.messagesContainer, { paddingBottom: 0 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        {/* FOOTER */}
        <Animated.View
          style={[
            styles.footerContainer,
            { paddingBottom: insets.bottom || 8, marginBottom: footerOffset },
          ]}
        >
          <View style={styles.inputContainer}>

            {/* 🔵 APENAS GALERIA AGORA */}
            <TouchableOpacity onPress={pickMediaFromGallery} style={styles.imageButton}>
              <Feather name="image" size={22} color="#133de9" />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Digite uma mensagem..."
              placeholderTextColor="#999"
              multiline={false}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || sending || mediaSending) && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!messageText.trim() || sending || mediaSending}
            >
              {sending || mediaSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* MODAL FULLSCREEN */}
        <Modal
          isVisible={isImageModalVisible}
          onBackdropPress={() => setIsImageModalVisible(false)}
          backdropOpacity={1}
          animationIn="fadeIn"
          animationOut="fadeOut"
          style={{ margin: 0 }}
        >
          {selectedImage && (
            <View style={{ flex: 1, backgroundColor: "black" }}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setIsImageModalVisible(false)}
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Image
                  source={{ uri: selectedImage }}
                  style={{ width: "100%", height: "100%", resizeMode: "contain" }}
                />
                <Feather
                  name="x"
                  size={28}
                  color="#fff"
                  style={{
                    position: "absolute",
                    top: 50,
                    right: 20,
                    backgroundColor: "rgba(0,0,0,0.4)",
                    borderRadius: 20,
                    padding: 6,
                  }}
                />
              </TouchableOpacity>
            </View>
          )}
        </Modal>

        {/* MODAL DE OPÇÕES */}
        <Modal
          isVisible={optionsVisible}
          onBackdropPress={() => setOptionsVisible(false)}
          backdropOpacity={0.3}
          animationIn="fadeIn"
          animationOut="fadeOut"
          style={{ justifyContent: "flex-end", margin: 0 }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              paddingVertical: 16,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
            }}
          >

            {/* 🔵 VER PERFIL */}
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setOptionsVisible(false);
                navigation.navigate("UserProfileScreen", {
                  userId: chatUser.id,
                  username: chatUser.username,
                  firstName: chatUser.displayName,
                  avatar: chatUser.avatar,
                });
              }}
            >
              <Feather name="user" size={20} color="#333" />
              <Text style={styles.optionText}>Ver perfil</Text>
            </TouchableOpacity>

            {/* 🔕 SILENCIAR */}
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setOptionsVisible(false);
                toggleMute();
              }}
            >
              <Feather
                name={muted ? "volume-x" : "volume-2"}
                size={20}
                color={muted ? "#c62828" : "#333"}
              />
              <Text
                style={[
                  styles.optionText,
                  muted ? { color: "#c62828" } : null,
                ]}
              >
                {muted ? "Ativar som" : "Silenciar conversa"}
              </Text>
            </TouchableOpacity>

            {/* 🔥 APAGAR CONVERSA */}
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setOptionsVisible(false);
                Alert.alert(
                  "Apagar conversa",
                  "Tem certeza que deseja apagar toda a conversa?",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Apagar",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          const key = `conversation_${[loggedUser.id, chatUser.id]
                            .sort()
                            .join("_")}`;

                          await AsyncStorage.removeItem(key);
                          setMessages([]);

                          Alert.alert("Conversa apagada");
                        } catch (err) {
                          console.log("Erro ao apagar conversa", err);
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Feather name="trash-2" size={20} color="#c62828" />
              <Text style={[styles.optionText, { color: "#c62828" }]}>
                Apagar conversa
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>

      </View>
    </View>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  innerContainer: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: "#555" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#133de9",
    paddingTop: 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: { marginRight: 12 },
  userInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  userName: { color: "#fff", fontSize: 16, fontWeight: "600" },

  userStatus: {
    color: "#dfe6ff",
    fontSize: 12,
    marginTop: -2,
  },

  messagesContainer: { padding: 16, flexGrow: 1 },

  dateSeparator: {
    alignSelf: "center",
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 10,
  },
  dateText: { color: "#333", fontSize: 13, fontWeight: "500" },

  messageContainer: { marginVertical: 4 },
  ownMessageContainer: { alignItems: "flex-end" },
  otherMessageContainer: { alignItems: "flex-start" },
  messageBubble: { padding: 8, borderRadius: 12, maxWidth: "80%" },
  ownMessageBubble: { backgroundColor: "#133de9", borderBottomRightRadius: 4 },
  otherMessageBubble: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15 },
  ownMessageText: { color: "#fff" },
  otherMessageText: { color: "#333" },
  linkText: { textDecorationLine: "underline" },

  messageTime: { fontSize: 11 },
  ownMessageTime: { color: "rgba(255,255,255,0.7)" },
  otherMessageTime: { color: "#999" },

  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: "#ddd",
  },

  footerContainer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  imageButton: { padding: 6, marginRight: 4 },

  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    paddingHorizontal: 8,
    maxHeight: 120,
  },

  sendButton: {
    backgroundColor: "#133de9",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  sendButtonDisabled: { backgroundColor: "#ccc" },

  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 12,
    color: "#333",
  },
});

// src/screens/NotificationsScreen.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";

type Notification = {
  id: string;
  type: "like" | "comment" | "follow";
  message: string;
  createdAt: number;
  read: boolean;
  postId?: string;
  user?: {
    id: string;
    username: string;
    avatar?: string;
  };
};

const NotificationsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const previousLength = useRef(0);

  // 🔊 Som da notificação
  const playNotificationSound = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/notification.mp3")
      );

      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded || status.didJustFinish) sound.unloadAsync();
      });
    } catch (err) {
      console.warn("Erro ao tocar som:", err);
    }
  };

  // 📥 Carregar notificações
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const stored = await AsyncStorage.getItem("@notifications");
        const parsed = stored ? JSON.parse(stored) : [];

        if (parsed.length > previousLength.current) {
          await playNotificationSound();
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        previousLength.current = parsed.length;

        const updated = parsed.map((n: Notification) =>
          n.read ? n : { ...n, read: true }
        );

        setNotifications(updated);
        await AsyncStorage.setItem("@notifications", JSON.stringify(updated));
      } catch (err) {
        console.error("Erro ao carregar notificações:", err);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  // 🔕 Marcar como lida
  const markAsRead = async (id: string) => {
    try {
      const updated = notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      setNotifications(updated);
      await AsyncStorage.setItem("@notifications", JSON.stringify(updated));
    } catch (err) {
      console.error("Erro ao atualizar notificações:", err);
    }
  };

  // 👉 Navegar ao tocar
  const handlePress = async (item: Notification) => {
    if (navigating) return;
    setNavigating(true);

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await markAsRead(item.id);

    if (item.type === "follow" && item.user?.id) {
      router.push(
        `/UserProfileScreen?userId=${item.user.id}&username=${item.user.username}`
      );
    } else if (item.postId) {
      router.push(`/PostScreen?postId=${item.postId}`);
    }

    setTimeout(() => setNavigating(false), 800);
  };

  // 🕒 Tempo relativo
  const timeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "agora mesmo";
    if (minutes < 60) return `${minutes} min atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  // 🔔 Ícones
  const renderIcon = (type: Notification["type"]) => {
    switch (type) {
      case "like":
        return <Feather name="heart" size={20} color="#e0245e" />;
      case "comment":
        return <Feather name="message-circle" size={20} color="#1DA1F2" />;
      case "follow":
        return <Feather name="user-plus" size={20} color="#17BF63" />;
      default:
        return null;
    }
  };

  // 🗑️ Limpar todas as notificações
  const clearAllNotifications = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Alert.alert(
        "Limpar tudo",
        "Deseja apagar todas as notificações?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Limpar",
            style: "destructive",
            onPress: async () => {
              await AsyncStorage.setItem("@notifications", JSON.stringify([]));
              setNotifications([]);
            },
          },
        ]
      );
    } catch (err) {
      console.error("Erro ao limpar notificações:", err);
    }
  };

  // 📌 Item da lista
  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => handlePress(item)}
      style={[styles.item, !item.read && styles.unread]}
      activeOpacity={0.7}
    >
      <View style={styles.icon}>{renderIcon(item.type)}</View>

      <View style={styles.textContainer}>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.loading}>Carregando notificações...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 🔥 Header com botão de limpar */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Notificações</Text>

        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAllNotifications}>
            <Feather name="trash-2" size={22} color="#333" />
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <Text style={styles.empty}>Nenhuma notificação por enquanto.</Text>
      ) : (
        <FlatList
          data={[...notifications].sort((a, b) => b.createdAt - a.createdAt)}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  header: {
    fontSize: 22,
    fontWeight: "700",
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  unread: { backgroundColor: "#f2f8ff" },

  icon: { marginRight: 12 },

  textContainer: { flex: 1 },

  message: { fontSize: 16, color: "#222" },

  time: { fontSize: 13, color: "#777", marginTop: 2 },

  empty: {
    textAlign: "center",
    color: "#777",
    marginTop: 50,
    fontSize: 16,
  },

  loading: {
    textAlign: "center",
    marginTop: 100,
    fontSize: 16,
    color: "#666",
  },
});

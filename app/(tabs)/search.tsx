import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Keyboard,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type User = {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
};

type RootStackParamList = {
  UserProfileScreen: {
    userId: string;
    username: string;
    displayName?: string;
    avatar?: string;
  };
  SearchScreen: undefined;
};

type SearchScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "SearchScreen"
>;

const SearchScreen = () => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { currentUser } = useCurrentUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  const searchInputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // 🔍 CARREGAR USUÁRIOS
  const loadUsers = useCallback(async () => {
    try {
      const usersMap = new Map<string, User>();

      const storedUsers = await AsyncStorage.getItem("@all_users");
      if (storedUsers) {
        JSON.parse(storedUsers).forEach((u: User) => {
          if (u.id !== currentUser?.id) usersMap.set(u.id, u);
        });
      }

      const postsData = await AsyncStorage.getItem("posts");
      if (postsData) {
        JSON.parse(postsData).forEach((post: any) => {
          const u = post.user;
          if (u?.id && u.id !== currentUser?.id) {
            usersMap.set(u.id, {
              id: u.id,
              username: u.username,
              displayName: u.displayName,
              avatar: u.avatar,
            });
          }
        });
      }

      const usersArray = Array.from(usersMap.values()).sort((a, b) =>
        (a.displayName || a.username).localeCompare(b.displayName || b.username)
      );

      setAllUsers(usersArray);
    } catch (e) {
      console.error("Erro ao carregar usuários:", e);
    }
  }, [currentUser?.id]);

  // 🔍 CARREGAR RECENTES
  const loadRecentUsers = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("@recent_users");
      if (stored) setRecentUsers(JSON.parse(stored));
    } catch (e) {
      console.error("Erro ao carregar usuários recentes:", e);
    }
  }, []);

  // 🔍 BUSCA COM DEBOUNCE
  const performSearch = useCallback(
    (query: string) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      const trimmedQuery = query.toLowerCase().trim();

      if (!trimmedQuery) {
        setFilteredUsers([]);
        setSearching(false);
        return;
      }

      setSearching(true);

      debounceTimer.current = setTimeout(() => {
        const filtered = allUsers.filter(
          (u) =>
            u.username.toLowerCase().includes(trimmedQuery) ||
            u.displayName?.toLowerCase().includes(trimmedQuery)
        );

        setFilteredUsers(filtered);
        setSearching(false);
      }, 300);
    },
    [allUsers]
  );

  // 🔗 ABRIR PERFIL
  const handleUserPress = useCallback(
    async (user: User) => {
      Keyboard.dismiss();

      navigation.navigate("UserProfileScreen", {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar || "",
      });

      try {
        const updated = [user, ...recentUsers.filter((u) => u.id !== user.id)].slice(0, 10);
        setRecentUsers(updated);
        await AsyncStorage.setItem("@recent_users", JSON.stringify(updated));
      } catch (e) {
        console.error("Erro ao salvar usuário recente:", e);
      }
    },
    [navigation, recentUsers]
  );

  // ❌ REMOVER RECENTE
  const handleRemoveRecentUser = useCallback(
    async (userId: string) => {
      try {
        const updated = recentUsers.filter((u) => u.id !== userId);
        setRecentUsers(updated);
        await AsyncStorage.setItem("@recent_users", JSON.stringify(updated));
      } catch (e) {
        console.error("Erro ao remover usuário recente:", e);
      }
    },
    [recentUsers]
  );

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.userContent}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: isDark ? "#2c2c2c" : "#f0f0f0" },
            ]}
          >
            <Feather name="user" size={20} color={isDark ? "#8899a6" : "#657786"} />
          </View>
        )}

        <View style={styles.userInfo}>
          <Text
            style={[styles.displayName, { color: isDark ? "#fff" : "#14171a" }]}
            numberOfLines={1}
          >
            {item.displayName || item.username}
          </Text>
          <Text
            style={[styles.username, { color: isDark ? "#8899a6" : "#657786" }]}
            numberOfLines={1}
          >
            @{item.username}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  useFocusEffect(
    useCallback(() => {
      loadUsers();
      loadRecentUsers();
    }, [loadUsers, loadRecentUsers])
  );

  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  const dataToRender = searchQuery ? filteredUsers : recentUsers;

  const renderHeader = () => (
    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: isDark ? "#1e1e1e" : "#f5f8fa" },
        ]}
      >
        <Feather name="search" size={20} color={isDark ? "#8899a6" : "#657786"} />
        <TextInput
          ref={searchInputRef}
          placeholder="Pesquisar"
          style={[styles.searchInput, { color: isDark ? "#fff" : "#14171a" }]}
          placeholderTextColor={isDark ? "#8899a6" : "#657786"}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Feather name="x" size={18} color={isDark ? "#8899a6" : "#657786"} />
          </TouchableOpacity>
        )}
      </View>

      {!searchQuery && recentUsers.length > 0 && (
        <Text
          style={{
            marginTop: 12,
            color: isDark ? "#8899a6" : "#657786",
            fontWeight: "600",
          }}
        >
          Usuários Recentes
        </Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? "#121212" : "#fff" }]}>
        {searching && searchQuery.length > 0 && (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="small" color="#1da1f2" />
            <Text style={{ marginLeft: 8, color: isDark ? "#8899a6" : "#657786" }}>
              Pesquisando...
            </Text>
          </View>
        )}

        <FlatList
          data={dataToRender}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            searchQuery.length > 0 ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={{ color: isDark ? "#8899a6" : "#657786" }}>
                  Nenhum usuário encontrado
                </Text>
              </View>
            ) : null
          }
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 44,
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16 },
  userItem: { paddingVertical: 12, paddingHorizontal: 16 },
  userContent: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  userInfo: { flex: 1, marginLeft: 10 },
  displayName: { fontSize: 15, fontWeight: "600" },
  username: { fontSize: 14 },
  searchingContainer: { flexDirection: "row", justifyContent: "center", paddingVertical: 20 },
});

export default SearchScreen;
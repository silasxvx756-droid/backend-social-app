// src/screens/SearchScreen.tsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Keyboard,
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
    firstName?: string;
    avatar?: string;
  };
  SearchScreen: undefined;
};

type SearchScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "SearchScreen"
>;

const SearchScreen = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { currentUser } = useCurrentUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const searchInputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // 🔹 Carregar usuários a partir dos posts
  const loadUsers = useCallback(async () => {
    try {
      const postsData = await AsyncStorage.getItem("posts");
      if (!postsData) return;

      const posts = JSON.parse(postsData);
      const usersMap = new Map<string, User>();

      posts.forEach((post: any) => {
        const user = post.user;
        if (user?.id && user.id !== currentUser?.id) {
          usersMap.set(user.id, {
            id: user.id,
            username: user.username || `user_${user.id}`,
            displayName: user.displayName,
            avatar: user.avatar,
          });
        }
      });

      setAllUsers(Array.from(usersMap.values()));
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }
  }, [currentUser?.id]);

  // 🔹 Busca com debounce
  const performSearch = useCallback(
    (query: string) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(() => {
        const trimmedQuery = query.toLowerCase().trim();

        if (!trimmedQuery) {
          setFilteredUsers([]);
          setSearching(false);
          return;
        }

        setSearching(true);

        const filtered = allUsers.filter((user) => {
          const usernameMatch = user.username.toLowerCase().includes(trimmedQuery);
          const displayNameMatch = user.displayName?.toLowerCase().includes(trimmedQuery);
          return usernameMatch || displayNameMatch;
        });

        setFilteredUsers(filtered);
        setSearching(false);
      }, 300);
    },
    [allUsers]
  );

  // 🔹 Carregar dados iniciais ao focar a tela
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        setLoading(true);
        try {
          await loadUsers();
        } catch (error) {
          console.error("Erro ao carregar dados:", error);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }, [loadUsers])
  );

  // 🔹 Efeito de busca
  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  // 🔹 Navegar para o perfil correto
  const handleUserPress = useCallback(
    (user: User) => {
      Keyboard.dismiss();
      navigation.navigate("UserProfileScreen", {
        userId: user.id,
        username: user.username,
        firstName: user.displayName || "",
        avatar: user.avatar || "",
      });
    },
    [navigation]
  );

  // 🔹 Renderizar usuário
  const renderUser = useCallback(
    ({ item }: { item: User }) => (
      <TouchableOpacity style={styles.userItem} onPress={() => handleUserPress(item)}>
        <View style={styles.userContent}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Feather name="user" size={20} color="#657786" />
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.displayName} numberOfLines={1}>
              {item.displayName || item.username}
            </Text>
            <Text style={styles.username} numberOfLines={1}>
              @{item.username}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [handleUserPress]
  );

  // 🔹 Tela de carregamento
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#657786" />
            <TextInput
              placeholder="Pesquisar"
              style={styles.searchInput}
              placeholderTextColor="#657786"
              editable={false}
            />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#133de9" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 🔹 Campo de busca */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#657786" />
          <TextInput
            ref={searchInputRef}
            placeholder="Pesquisar"
            style={styles.searchInput}
            placeholderTextColor="#657786"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={() => setSearchQuery("")}>
              <Feather name="x" size={18} color="#657786" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {searching ? (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="small" color="#133de9" />
            <Text style={styles.searchingText}>Pesquisando...</Text>
          </View>
        ) : (
          <>
            {filteredUsers.length > 0 ? (
              <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                renderItem={renderUser}
                scrollEnabled={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
              />
            ) : (
              searchQuery.length > 0 && (
                <View style={styles.emptyContainer}>
                  <Feather name="search" size={48} color="#aab8c2" />
                  <Text style={styles.emptyTitle}>Nenhum usuário encontrado</Text>
                  <Text style={styles.emptySubtitle}>Tente pesquisar outro nome</Text>
                </View>
              )
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ebedef",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f9fa",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#14171a",
  },
  clearButton: { padding: 4, marginLeft: 8 },
  content: { flex: 1 },
  userItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ebedef",
  },
  userContent: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f7f9fa",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userInfo: { flex: 1 },
  displayName: { fontSize: 15, fontWeight: "600", color: "#14171a", marginBottom: 2 },
  username: { fontSize: 14, color: "#657786" },
  searchingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  searchingText: { marginLeft: 8, fontSize: 14, color: "#657786" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#14171a",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: { fontSize: 14, color: "#657786", textAlign: "center", lineHeight: 20 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#657786" },
});

export default SearchScreen;

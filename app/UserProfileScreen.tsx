// src/screens/UserProfileScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
  StatusBar,
  FlatList,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import PostsList from "@/components/PostsList";
import { postEvents } from "@/hooks/usePosts";
import { addNotification } from "@/utils/addNotification";
import Modal from "react-native-modal";

interface RouteParams {
  userId: string;
  username: string;
  firstName?: string;
  avatar?: string;
}

interface UserActor {
  id: string;
  username: string;
  avatar?: string;
}

const UserProfileScreen: React.FC = () => {
  const { user } = useUser();
  const router = useRouter();

  const { userId = "", username = "", firstName = "", avatar = "" } =
    useLocalSearchParams() as Partial<RouteParams>;

  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false); // 🔥 evitar navegação dupla

  const [targetUser, setTargetUser] = useState({
    id: userId,
    username,
    firstName,
    avatar,
  });

  const [followersList, setFollowersList] = useState<UserActor[]>([]);
  const [followingList, setFollowingList] = useState<UserActor[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowersModalVisible, setFollowersModalVisible] = useState(false);
  const [isFollowingModalVisible, setFollowingModalVisible] = useState(false);

  /** 🔹 Carrega dados completos do usuário alvo */
  const loadTargetUser = useCallback(async () => {
    try {
      const storedPosts = await AsyncStorage.getItem("posts");
      let posts = storedPosts ? JSON.parse(storedPosts) : [];

      const postWithUser = posts.find((p: any) => p.user.id === userId);

      if (postWithUser) {
        setTargetUser({
          id: userId,
          username: postWithUser.user.username,
          firstName: postWithUser.user.displayName || "",
          avatar: postWithUser.user.avatar || "",
        });
        return;
      }

      const followersStored = await AsyncStorage.getItem(`followers_${userId}`);
      const followingStored = await AsyncStorage.getItem(`following_${userId}`);

      const followers = followersStored ? JSON.parse(followersStored) : [];
      const following = followingStored ? JSON.parse(followingStored) : [];

      const foundUser =
        followers.find((u: any) => u.id === userId) ||
        following.find((u: any) => u.id === userId);

      if (foundUser) {
        setTargetUser({
          id: userId,
          username: foundUser.username,
          firstName: foundUser.displayName || "",
          avatar: foundUser.avatar || "",
        });
      }
    } catch (err) {
      console.warn("Erro ao carregar targetUser:", err);
    }
  }, [userId]);

  /** 🔹 Carrega seguidores/seguindo */
  const loadFollowData = useCallback(async () => {
    try {
      const followersKey = `followers_${userId}`;
      const followingKey = `following_${userId}`;
      const blockedKey = `blocked_${user?.id}`;

      const [storedFollowers, storedFollowing, blockedStored] = await Promise.all([
        AsyncStorage.getItem(followersKey),
        AsyncStorage.getItem(followingKey),
        AsyncStorage.getItem(blockedKey),
      ]);

      const followers = storedFollowers ? JSON.parse(storedFollowers) : [];
      const following = storedFollowing ? JSON.parse(storedFollowing) : [];
      const blocked = blockedStored ? JSON.parse(blockedStored) : [];

      setFollowersList(followers);
      setFollowingList(following);
      setFollowersCount(followers.length);
      setFollowingCount(following.length);

      if (user) {
        const amIFollowing = followers.some((f: any) => f.id === user.id);
        const amIBlocking = blocked.some((b: any) => b.id === userId);
        setIsFollowing(amIFollowing);
        setIsBlocked(amIBlocking);
      }
    } catch (error) {
      console.error("Erro ao carregar dados de perfil:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, user]);

  /** 🔹 Seguir / deixar de seguir */
  const toggleFollow = async () => {
    if (!user) return;
    try {
      const followersKey = `followers_${userId}`;
      const followingKey = `following_${user.id}`;

      const [followersStored, followingStored] = await Promise.all([
        AsyncStorage.getItem(followersKey),
        AsyncStorage.getItem(followingKey),
      ]);

      const followers = followersStored ? JSON.parse(followersStored) : [];
      const following = followingStored ? JSON.parse(followingStored) : [];

      const isAlreadyFollowing = followers.some((f: any) => f.id === user.id);

      if (isAlreadyFollowing) {
        const updatedFollowers = followers.filter((f: any) => f.id !== user.id);
        const updatedFollowing = following.filter((f: any) => f.id !== userId);

        await AsyncStorage.setItem(followersKey, JSON.stringify(updatedFollowers));
        await AsyncStorage.setItem(followingKey, JSON.stringify(updatedFollowing));

        setIsFollowing(false);
        setFollowersList(updatedFollowers);
        setFollowersCount(updatedFollowers.length);
      } else {
        const newFollower: UserActor = {
          id: user.id,
          username:
            (user.username as string) ||
            (user.unsafeMetadata?.username as string) ||
            "@user",
          avatar: user.imageUrl || "",
        };

        const newFollowing = { id: userId, username, avatar };

        const updatedFollowers = [newFollower, ...followers];
        const updatedFollowing = [newFollowing, ...following];

        await AsyncStorage.setItem(followersKey, JSON.stringify(updatedFollowers));
        await AsyncStorage.setItem(followingKey, JSON.stringify(updatedFollowing));

        setIsFollowing(true);
        setFollowersList(updatedFollowers);
        setFollowersCount(updatedFollowers.length);
        await addNotification(newFollower, "follow");
      }

      postEvents.emit("post-updated");
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar o status de seguimento.");
    }
  };

  /** 🔹 Bloquear / desbloquear */
  const toggleBlock = async () => {
    if (!user) return;
    try {
      const blockedKey = `blocked_${user.id}`;
      const stored = await AsyncStorage.getItem(blockedKey);
      const blocked = stored ? JSON.parse(stored) : [];

      const isAlreadyBlocked = blocked.some((b: any) => b.id === userId);

      if (isAlreadyBlocked) {
        const updatedBlocked = blocked.filter((b: any) => b.id !== userId);
        await AsyncStorage.setItem(blockedKey, JSON.stringify(updatedBlocked));
        setIsBlocked(false);
        Alert.alert("Desbloqueado", `${username} foi desbloqueado.`);
      } else {
        const newBlocked = [
          ...blocked,
          { id: userId, username, avatar: avatar || "" },
        ];
        await AsyncStorage.setItem(blockedKey, JSON.stringify(newBlocked));
        setIsBlocked(true);
        Alert.alert("Usuário bloqueado", `${username} foi bloqueado com sucesso.`);
      }

      postEvents.emit("post-updated");
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar o bloqueio.");
    }
  };

  /** 🔹 Abrir chat (com proteção anti-duplo clique) */
  const handleSendMessage = () => {
    if (!user || isBlocked) {
      Alert.alert("Ação bloqueada", "Você não pode enviar mensagens a este usuário.");
      return;
    }

    if (isNavigating) return; // 🔥 evita abrir 2 telas
    setIsNavigating(true);

    router.push({
      pathname: "/ChatScreen",
      params: {
        loggedUser: JSON.stringify({
          id: user.id,
          username:
            (user.username as string) ||
            (user.unsafeMetadata?.username as string) ||
            "@user",
          displayName: user.firstName || "",
          avatar: user.imageUrl || "",
        }),
        chatUser: JSON.stringify({
          id: userId,
          username,
          displayName: targetUser.firstName || "",
          avatar: targetUser.avatar || "",
        }),
      },
    });

    setTimeout(() => setIsNavigating(false), 300); // 🔓 libera clique novamente
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTargetUser();
    await loadFollowData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadTargetUser();
    loadFollowData();

    const sub = postEvents.addListener("post-updated", () => {
      loadTargetUser();
      loadFollowData();
    });

    return () => sub.remove();
  }, [loadTargetUser, loadFollowData]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#133de9" />
      </View>
    );
  }

  /** 🔹 Item renderizado nos modais */
  const renderUserItem = ({ item }: { item: UserActor }) => (
    <TouchableOpacity
      className="flex-row items-center py-2"
      onPress={() => {
        setFollowersModalVisible(false);
        setFollowingModalVisible(false);
        router.push({
          pathname: "/UserProfileScreen",
          params: {
            userId: item.id,
            username: item.username,
            avatar: item.avatar || "",
          },
        });
      }}
    >
      <Image
        source={{
          uri: item.avatar || "https://cdn-icons-png.flaticon.com/512/847/847969.png",
        }}
        className="w-10 h-10 rounded-full mr-3"
      />
      <Text className="text-gray-900 text-base">@{item.username}</Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: StatusBar.currentHeight || 0 }}>
      {/* Cabeçalho */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#133de9" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Foto + informações */}
        <View className="items-center mt-6">
          <Image
            source={{
              uri:
                targetUser.avatar ||
                "https://cdn-icons-png.flaticon.com/512/847/847969.png",
            }}
            className="w-28 h-28 rounded-full"
          />
          <Text className="text-xl font-bold text-gray-900 mt-3">
            {targetUser.firstName || "Usuário"}
          </Text>
          <Text className="text-gray-700 text-lg">@{targetUser.username}</Text>

          {/* Seguidores / seguindo */}
          {!isBlocked && (
            <View
              className="flex-row justify-center items-center mt-4"
              style={{ gap: 50 }}
            >
              <TouchableOpacity
                onPress={() => setFollowersModalVisible(true)}
                style={{ alignItems: "center" }}
              >
                <Text className="text-gray-900 text-base font-semibold">
                  {followersCount}
                </Text>
                <Text className="text-gray-500 text-sm">Seguidores</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFollowingModalVisible(true)}
                style={{ alignItems: "center" }}
              >
                <Text className="text-gray-900 text-base font-semibold">
                  {followingCount}
                </Text>
                <Text className="text-gray-500 text-sm">Seguindo</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Botões */}
          {user?.id !== userId && (
            <View className="mt-5 items-center">
              {!isBlocked && (
                <>
                  <TouchableOpacity
                    onPress={toggleFollow}
                    className="px-5 py-2 rounded-full mb-2"
                    style={{
                      backgroundColor: isFollowing ? "#e5e7eb" : "#133de9",
                    }}
                  >
                    <Text
                      className={`font-semibold ${
                        isFollowing ? "text-gray-900" : "text-white"
                      }`}
                    >
                      {isFollowing ? "Seguindo" : "Seguir"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={isNavigating}
                    onPress={handleSendMessage}
                    className="px-5 py-2 rounded-full bg-[#133de9]"
                    style={{ opacity: isNavigating ? 0.6 : 1 }}
                  >
                    <Text className="text-white font-semibold">Enviar mensagem</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                onPress={toggleBlock}
                className="px-5 py-2 rounded-full mt-2"
                style={{
                  backgroundColor: isBlocked ? "#ef4444" : "#e5e7eb",
                }}
              >
                <Text
                  className={`font-semibold ${isBlocked ? "text-white" : "text-gray-900"}`}
                >
                  {isBlocked ? "Desbloquear" : "Bloquear"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Posts */}
        <View className="mt-6">
          {isBlocked ? (
            <Text className="text-center text-gray-500 mt-10">
              Este usuário está bloqueado. Conteúdo oculto.
            </Text>
          ) : (
            <PostsList username={targetUser.username} />
          )}
        </View>

        <View className="mb-10" />
      </ScrollView>

      {/* Modal Seguidores */}
      <Modal
        isVisible={isFollowersModalVisible}
        onBackdropPress={() => setFollowersModalVisible(false)}
        style={{ margin: 0, justifyContent: "flex-end" }}
      >
        <View className="bg-white rounded-t-2xl p-5 max-h-[70%]">
          <Text className="text-lg font-semibold mb-3 text-center">
            Seguidores ({followersList.length})
          </Text>
          {followersList.length === 0 ? (
            <Text className="text-center text-gray-500 mt-4">
              Nenhum seguidor encontrado.
            </Text>
          ) : (
            <FlatList
              data={followersList}
              keyExtractor={(item) => item.id}
              renderItem={renderUserItem}
            />
          )}
        </View>
      </Modal>

      {/* Modal Seguindo */}
      <Modal
        isVisible={isFollowingModalVisible}
        onBackdropPress={() => setFollowingModalVisible(false)}
        style={{ margin: 0, justifyContent: "flex-end" }}
      >
        <View className="bg-white rounded-t-2xl p-5 max-h-[70%]">
          <Text className="text-lg font-semibold mb-3 text-center">
            Seguindo ({followingList.length})
          </Text>
          {followingList.length === 0 ? (
            <Text className="text-center text-gray-500 mt-4">
              Nenhum usuário seguido.
            </Text>
          ) : (
            <FlatList
              data={followingList}
              keyExtractor={(item) => item.id}
              renderItem={renderUserItem}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

export default UserProfileScreen;

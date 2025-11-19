import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Image,
  StatusBar,
  Animated,
  FlatList,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "@clerk/clerk-expo";
import Modal from "react-native-modal";
import EditProfileModal from "@/components/EditProfileModal";
import SignOutButton from "@/components/SignOutButton";
import PostsList from "@/components/PostsList";
import { useProfile } from "@/hooks/useProfile";
import { postEvents } from "@/hooks/usePosts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";

const STORAGE_KEY = "@user_profile_data";

type UserData = {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string | null;
};

const ProfileScreen: React.FC = () => {
  const { user, isLoaded } = useUser();
  const { formData, updateFormField, saveProfile, isUpdating } = useProfile();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();

  // 🔵 PREVINE NAVEGAÇÃO DUPLA
  const [isNavigating, setIsNavigating] = useState(false);

  const [isModalVisible, setModalVisible] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [followers, setFollowers] = useState<UserData[]>([]);
  const [following, setFollowing] = useState<UserData[]>([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  // 🔵 REF PARA SUBIR A TELA
  const scrollRef = useRef<ScrollView>(null);

  // 🔵 Detecta clique repetido na aba e sobe o feed
  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });

    return unsubscribe;
  }, [navigation]);

  const imageOpacity = useRef(new Animated.Value(0)).current;

  const loadFollowData = async (userId: string) => {
    try {
      const followersKey = `followers_${userId}`;
      const followingKey = `following_${userId}`;
      const [followersStored, followingStored] = await Promise.all([
        AsyncStorage.getItem(followersKey),
        AsyncStorage.getItem(followingKey),
      ]);

      const parsedFollowers = followersStored ? JSON.parse(followersStored) : [];
      const parsedFollowing = followingStored ? JSON.parse(followingStored) : [];

      const allAvatars = [
        ...parsedFollowers.map((u: UserData) => u.avatar).filter(Boolean),
        ...parsedFollowing.map((u: UserData) => u.avatar).filter(Boolean),
      ];
      await Promise.all(allAvatars.map((url) => Image.prefetch(url)));

      setFollowers(parsedFollowers);
      setFollowing(parsedFollowing);
    } catch (error) {
      console.error("Erro ao carregar seguidores:", error);
    }
  };

  const loadFromClerk = useCallback(async () => {
    if (!isLoaded || !user) return;
    try {
      const username =
        (user.unsafeMetadata?.username as string) || user.username || "@xvx";

      const clerkData = {
        firstName: user.firstName || "",
        username,
        bio: (user.unsafeMetadata?.bio as string) || "",
        location: (user.unsafeMetadata?.location as string) || "",
        avatar: user.imageUrl || null,
      };

      updateFormField("firstName", clerkData.firstName);
      updateFormField("username", clerkData.username);
      updateFormField("bio", clerkData.bio);
      updateFormField("location", clerkData.location);
      setLocalAvatar(clerkData.avatar);

      if (user.imageUrl) {
        await Image.prefetch(user.imageUrl);
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clerkData));
      await loadFollowData(user.id);
    } catch (e) {
      console.error("Erro ao carregar dados do Clerk:", e);
    }
  }, [isLoaded, user, updateFormField]);

  useEffect(() => {
    loadFromClerk();
  }, [loadFromClerk]);

  useEffect(() => {
    const syncAfterEvent = async () => {
      await user?.reload();
      await loadFromClerk();
      await loadFollowData(user?.id || "");
    };
    postEvents.addListener("post-updated", syncAfterEvent);
    postEvents.addListener("follow-updated", syncAfterEvent);
    return () => {
      postEvents.removeListener("post-updated", syncAfterEvent);
      postEvents.removeListener("follow-updated", syncAfterEvent);
    };
  }, [user, loadFromClerk]);

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await user.reload();
    await loadFromClerk();
    setRefreshing(false);
  };

  if (!isLoaded) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#133de9" />
      </View>
    );
  }

  const displayName = formData.firstName || user?.firstName || "Usuário";
  const username =
    (user?.unsafeMetadata?.username as string) ||
    formData.username ||
    "@xvx";

  return (
    <View
      className="flex-1 bg-white"
      style={{ paddingTop: StatusBar.currentHeight || 0 }}
    >
      <View className="flex-row justify-end items-center px-4 mt-1">
        <SignOutButton />
      </View>

      <ScrollView
        ref={scrollRef}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mt-4">
          <Animated.Image
            source={{
              uri:
                localAvatar ||
                user?.imageUrl ||
                "https://cdn-icons-png.flaticon.com/512/847/847969.png",
            }}
            className="w-28 h-28 rounded-full"
            resizeMode="cover"
            onLoad={() => {
              Animated.timing(imageOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }).start();
            }}
            style={{ opacity: imageOpacity }}
          />

          <Text className="text-xl font-bold text-gray-900 mt-3">
            {displayName}
          </Text>

          <Text className="text-gray-700 text-lg">@{username}</Text>

          {/* 🔵 Contadores */}
          <View
            className="flex-row justify-center items-center mt-3"
            style={{ gap: 30 }}
          >
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => setShowFollowersModal(true)}
            >
              <Text className="text-gray-900 text-base font-semibold">
                {followers.length}
              </Text>
              <Text className="text-gray-500 text-sm">Seguidores</Text>
            </TouchableOpacity>

            <View style={{ width: 1, height: 28, backgroundColor: "#d1d5db" }} />

            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => setShowFollowingModal(true)}
            >
              <Text className="text-gray-900 text-base font-semibold">
                {following.length}
              </Text>
              <Text className="text-gray-500 text-sm">Seguindo</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="mt-4 px-4 py-2 rounded-full"
            style={{ backgroundColor: "#133de9" }}
          >
            <Text className="text-white font-semibold">Editar perfil</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-6">
          <PostsList username={username} />
        </View>

        <View style={{ height: insets.bottom + 80 }} />
      </ScrollView>

      {/* 🔵 MODAL — SEGUIDORES */}
      <Modal
        isVisible={showFollowersModal}
        onBackdropPress={() => setShowFollowersModal(false)}
        style={{ margin: 0, justifyContent: "flex-end" }}
      >
        <View className="bg-white rounded-t-2xl p-5 max-h-[70%]">
          <Text className="text-lg font-bold mb-3 text-center">Seguidores</Text>

          {followers.length === 0 ? (
            <Text className="text-center text-gray-500">
              Nenhum seguidor ainda.
            </Text>
          ) : (
            <FlatList
              data={followers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="flex-row items-center mb-3"
                  onPress={() => {
                    if (isNavigating) return;
                    setIsNavigating(true);

                    setShowFollowersModal(false);

                    router.push({
                      pathname: "/UserProfileScreen",
                      params: {
                        userId: item.id,
                        username: item.username,
                        firstName: item.displayName || item.username,
                        avatar: item.avatar || "",
                      },
                    });

                    setTimeout(() => setIsNavigating(false), 500);
                  }}
                >
                  <Image
                    source={{
                      uri:
                        item.avatar ||
                        "https://cdn-icons-png.flaticon.com/512/847/847969.png",
                    }}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <View>
                    <Text className="font-semibold text-gray-900">
                      {item.displayName || item.username}
                    </Text>
                    <Text className="text-gray-600 text-sm">
                      @{item.username}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      {/* 🔵 MODAL — SEGUINDO */}
      <Modal
        isVisible={showFollowingModal}
        onBackdropPress={() => setShowFollowingModal(false)}
        style={{ margin: 0, justifyContent: "flex-end" }}
      >
        <View className="bg-white rounded-t-2xl p-5 max-h-[70%]">
          <Text className="text-lg font-bold mb-3 text-center">Seguindo</Text>

          {following.length === 0 ? (
            <Text className="text-center text-gray-500">
              Você ainda não segue ninguém.
            </Text>
          ) : (
            <FlatList
              data={following}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="flex-row items-center mb-3"
                  onPress={() => {
                    if (isNavigating) return;
                    setIsNavigating(true);

                    setShowFollowingModal(false);

                    router.push({
                      pathname: "/UserProfileScreen",
                      params: {
                        userId: item.id,
                        username: item.username,
                        firstName: item.displayName || item.username,
                        avatar: item.avatar || "",
                      },
                    });

                    setTimeout(() => setIsNavigating(false), 500);
                  }}
                >
                  <Image
                    source={{
                      uri:
                        item.avatar ||
                        "https://cdn-icons-png.flaticon.com/512/847/847969.png",
                    }}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <View>
                    <Text className="font-semibold text-gray-900">
                      {item.displayName || item.username}
                    </Text>
                    <Text className="text-gray-600 text-sm">
                      @{item.username}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      <EditProfileModal
        isVisible={isModalVisible}
        onClose={() => setModalVisible(false)}
        formData={formData}
        updateFormField={updateFormField}
        saveProfile={async () => {
          await saveProfile();
          await loadFromClerk();
          await loadFollowData(user?.id || "");
          postEvents.emit("post-updated");
          postEvents.emit("follow-updated");
          setModalVisible(false);
        }}
        isUpdating={isUpdating}
      />
    </View>
  );
};

export default ProfileScreen;

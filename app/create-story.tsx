import { View, Text, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const CreateStoryScreen = () => {
  const router = useRouter();
  const { image } = useLocalSearchParams<{ image: string }>();
  const { currentUser } = useCurrentUser();

  if (!image || !currentUser) return null;

  // 💾 Publicar story e abrir viewer
  const publishStory = async () => {
    const key = `@stories:${currentUser.id}`;

    const newStory = {
      id: Date.now().toString(),
      image,
      userId: currentUser.id,
      user: currentUser.name || "Você",
      createdAt: Date.now(),
      viewed: false,
    };

    const stored = await AsyncStorage.getItem(key);
    const stories = stored ? JSON.parse(stored) : [];

    stories.unshift(newStory);
    await AsyncStorage.setItem(key, JSON.stringify(stories));

    // 👉 IR DIRETO PARA O STORY PUBLICADO
    router.replace({
      pathname: "/story-viewer",
      params: {
        userId: currentUser.id,
        storyId: newStory.id,
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* HEADER */}
      <View className="flex-row justify-between items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={26} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={publishStory}>
          <Text className="text-white text-base font-bold">Publicar</Text>
        </TouchableOpacity>
      </View>

      {/* PREVIEW */}
      <View className="flex-1">
        <Image
          source={{ uri: image }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>

      {/* FOOTER */}
      <View className="absolute bottom-0 w-full px-4 py-4 flex-row justify-between">
        <TouchableOpacity>
          <Feather name="type" size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity>
          <Feather name="smile" size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity>
          <Feather name="edit-2" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default CreateStoryScreen;

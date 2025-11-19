import { useCreatePost } from "@/hooks/useCreatePost";
import { useUser } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");

const PostComposer = () => {
  const {
    content,
    setContent,
    selectedImage,
    isCreating,
    pickImageFromGallery,
    removeImage,
    createPost,
  } = useCreatePost();

  const { user } = useUser();

  /** ⛔️ Apenas permitir posts com imagem */
  const canPost = !!selectedImage && !isCreating;

  return (
    <View className="border-b border-gray-100 p-4 bg-white">
      <View className="flex-row">
        <Image
          source={{ uri: user?.imageUrl }}
          className="w-12 h-12 rounded-full mr-3"
        />
        <View className="flex-1">
          <TextInput
            className="text-gray-900 text-lg"
            placeholder="Qual é o projeto?"
            placeholderTextColor="#657786"
            value={content}
            maxLength={280}
            onChangeText={(t) => setContent(t.replace(/\n/g, ""))}

            /** ⛔ BLOQUEIA ENTER COMPLETAMENTE */
            multiline={false}
            onSubmitEditing={(e) => e.preventDefault?.()}
            blurOnSubmit={false}
          />
        </View>
      </View>

      {selectedImage && (
        <View className="mt-3 ml-15">
          <View className="relative">
            <Image
              source={{ uri: selectedImage }}
              style={{
                width: width - 32,
                height: width - 32,
                borderRadius: 16,
              }}
              resizeMode="cover"
            />
            <TouchableOpacity
              className="absolute top-2 right-2 w-8 h-8 bg-black bg-opacity-60 rounded-full items-center justify-center"
              onPress={removeImage}
            >
              <Feather name="x" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View className="flex-row justify-between items-center mt-3">
        <View className="flex-row">
          <TouchableOpacity className="mr-4" onPress={pickImageFromGallery}>
            <Feather name="image" size={20} color="#133de9" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center">
          {content.length > 0 && (
            <Text
              className={`text-sm mr-3 ${
                content.length > 260 ? "text-red-500" : "text-gray-500"
              }`}
            >
              {280 - content.length}
            </Text>
          )}

          <TouchableOpacity
            className={`px-6 py-2 rounded-full ${
              canPost ? "" : "bg-gray-300"
            }`}
            style={{
              backgroundColor: canPost ? "#133de9" : "#d1d5db",
            }}
            onPress={createPost}
            disabled={!canPost}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text
                className={`font-semibold ${
                  canPost ? "text-white" : "text-gray-500"
                }`}
              >
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default PostComposer;

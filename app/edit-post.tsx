import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { usePosts } from "@/hooks/usePosts";
import { useUser } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const MAX_WIDTH = 480;

export default function EditPostScreen() {
  const { image } = useLocalSearchParams<{ image: string }>();
  const router = useRouter();
  const { addPost } = usePosts();
  const { user } = useUser();

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!image) return Alert.alert("Erro", "Nenhuma imagem selecionada.");
    if (!user) return Alert.alert("Erro", "Usuário não autenticado.");

    setLoading(true);

    try {
      await addPost({
        user: {
          id: user.id,
          username: user.username ?? "",
          displayName: user.fullName ?? "",
          avatar: user.imageUrl ?? null,
        },
        content: text,
        imageFile: image, // 👈 usa direto a URI
      });

      setText("");
      router.push("/");
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Não foi possível publicar o post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "black",
        alignItems: "center",
      }}
    >
      <View style={{ width: "100%", maxWidth: isWeb ? MAX_WIDTH : "100%" }}>
        {/* HEADER */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color="white" />
          </TouchableOpacity>

          <Text
            style={{
              color: "white",
              fontWeight: "700",
              fontSize: 18,
              marginLeft: 16,
            }}
          >
            Novo Post
          </Text>
        </View>

        {/* IMAGEM */}
        <View
          style={{
            width: "100%",
            aspectRatio: 1,
            backgroundColor: "#000",
          }}
        >
          <Image
            source={{ uri: image }}
            style={{
              width: "100%",
              height: "100%",
            }}
            resizeMode="cover"
          />
        </View>

        {/* INPUT + BOTÃO */}
        <View style={{ padding: 16 }}>
          <TextInput
            multiline
            placeholder="Escreva algo..."
            placeholderTextColor="#999"
            value={text}
            onChangeText={setText}
            style={{
              color: "white",
              backgroundColor: "#111",
              padding: 12,
              borderRadius: 8,
              minHeight: 80,
              marginBottom: 16,
            }}
          />

          <TouchableOpacity
            onPress={handlePost}
            disabled={loading}
            style={{
              backgroundColor: loading ? "#888" : "white",
              padding: 14,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontWeight: "700",
                color: loading ? "#ccc" : "#000",
              }}
            >
              {loading ? "Publicando..." : "Publicar"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
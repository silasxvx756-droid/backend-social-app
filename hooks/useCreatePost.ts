// src/hooks/useCreatePost.ts
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { postEvents } from "@/hooks/usePosts";

export const useCreatePost = () => {
  const { currentUser } = useCurrentUser();

  // 🔢 Máximo de caracteres da legenda
  const maxChars = 2200;

  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 🖼️ Escolher imagem da galeria
  const pickImageFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // 📸 Tirar foto
  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // ❌ Remover imagem
  const removeImage = () => setSelectedImage(null);

  // 📝 Criar post
  const createPost = async () => {
    if (!content.trim() && !selectedImage) return;

    if (content.length > maxChars) {
      alert(`A legenda pode ter no máximo ${maxChars} caracteres.`);
      return;
    }

    try {
      setIsCreating(true);

      // 🚫 Remove quebras de linha
      const sanitizedContent = content.replace(/\r?\n|\r/g, " ");

      const stored = await AsyncStorage.getItem("posts");
      const existing = stored ? JSON.parse(stored) : [];

      const newPost = {
        id: Date.now().toString(),
        user: currentUser || {
          id: "anon",
          username: "desconhecido",
          displayName: "Usuário",
          avatar: null,
        },
        content: sanitizedContent.trim(),
        image: selectedImage,
        likes: [],
        createdAt: Date.now(),
        comments: [],
      };

      const updated = [newPost, ...existing];
      await AsyncStorage.setItem("posts", JSON.stringify(updated));

      // 🔔 Salvar notificação local no app
      const storedNotifs = await AsyncStorage.getItem("@notifications");
      const parsedNotifs = storedNotifs ? JSON.parse(storedNotifs) : [];

      const newNotification = {
        id: Date.now().toString(),
        type: "post",
        message: "@conectdesigner criou uma nova publicação 🚀",
        createdAt: Date.now(),
        read: false,
        postId: newPost.id,
      };

      await AsyncStorage.setItem(
        "@notifications",
        JSON.stringify([...parsedNotifs, newNotification])
      );

      // 🔔 Notificação no dispositivo (APENAS para @conectdesigner)
      if (currentUser?.username === "conectdesigner") {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🔥 @conectdesigner acabou de postar algo novo!",
          },
          trigger: null,
        });
      }

      postEvents.emit("post-updated");

      setContent("");
      setSelectedImage(null);
    } catch (error) {
      console.error("Erro ao criar post:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return {
    content,
    setContent,
    selectedImage,
    setSelectedImage,
    isCreating,
    pickImageFromGallery,
    takePhoto,
    removeImage,
    createPost,

    maxChars,
    remainingChars: maxChars - content.length,
  };
};

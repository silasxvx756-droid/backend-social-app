// src/hooks/useCreatePost.ts
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { postEvents } from "@/hooks/usePosts";

export const useCreatePost = () => {
  const { currentUser } = useCurrentUser();

  const maxChars = 2200;

  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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

  const removeImage = () => setSelectedImage(null);

  const createPost = async () => {
    if (!content.trim() && !selectedImage) return;

    if (content.length > maxChars) {
      alert(`A legenda pode ter no máximo ${maxChars} caracteres.`);
      return;
    }

    try {
      setIsCreating(true);

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

      // ----------------------------------------------------------
      // 🔔 NOTIFICAÇÃO LOCAL — agora com o texto que você pediu
      // ----------------------------------------------------------
      const notifKey = `@notifications:${currentUser?.id}`;

      const storedNotifs = await AsyncStorage.getItem(notifKey);
      const parsedNotifs = storedNotifs ? JSON.parse(storedNotifs) : [];

      const newNotification = {
        id: Date.now().toString(),
        type: "post",
        message: `@${currentUser?.username} criou uma nova publicação`,
        createdAt: Date.now(),
        read: false,
        postId: newPost.id,
      };

      await AsyncStorage.setItem(
        notifKey,
        JSON.stringify([...parsedNotifs, newNotification])
      );
      // ----------------------------------------------------------

      // 📱 Notificação push (apenas para o próprio usuário)
      if (currentUser?.username === "conectdesigner") {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Você precisa ver a publicação da conect!",
            body: "A publicação dele já está disponível para todos.",
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

// src/components/EditProfileModal.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { postEvents } from "@/hooks/usePosts";
import Modal from "react-native-modal";

interface EditProfileModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const EditProfileModal = ({ isVisible, onClose }: EditProfileModalProps) => {
  const { user } = useUser();

  const [formData, setFormData] = useState({
    username:
      (user?.unsafeMetadata?.username as string) ||
      user?.username ||
      "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
  });

  const [avatar, setAvatar] = useState(user?.imageUrl || null);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateFormField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 🔥 QUALIDADE MÁXIMA DA IMAGEM
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        base64: false,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        setAvatar(result.assets[0].uri);
      }
    } catch (err) {
      console.log("Erro ao escolher imagem:", err);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setIsUpdating(true);

    try {
      const newUsername = formData.username.trim().toLowerCase();
      const newFirstName = formData.firstName.trim();
      const newLastName = formData.lastName.trim();

      if (!newUsername) {
        Alert.alert("Atenção", "O nome de usuário não pode ficar vazio.");
        setIsUpdating(false);
        return;
      }

      // 🔹 1 — Verificar duplicação
      const storedPosts = await AsyncStorage.getItem("posts");
      const posts = storedPosts ? JSON.parse(storedPosts) : [];

      const usernameAlreadyExists = posts.some(
        (p: any) =>
          p.user?.id !== user.id &&
          p.user?.username?.toLowerCase() === newUsername
      );

      if (usernameAlreadyExists) {
        Alert.alert(
          "Nome de usuário em uso",
          "Esse nome de usuário já está sendo usado por outra pessoa. Escolha outro."
        );
        setIsUpdating(false);
        return;
      }

      // 🔹 2 — Atualizar Clerk
      await user.update({
        firstName: newFirstName,
        lastName: newLastName,
        unsafeMetadata: { username: newUsername },
      });

      // 🔥 Atualizar avatar
      if (avatar && avatar !== user.imageUrl) {
        const ext = avatar.split(".").pop() || "jpg";
        const type =
          ext === "png"
            ? "image/png"
            : ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : "image/*";

        const image = {
          uri: avatar,
          name: `profile.${ext}`,
          type,
        };

        await user.setProfileImage({ file: image });
      }

      await user.reload();

      const currentUsername =
        (user.unsafeMetadata?.username as string) || newUsername;

      const currentDisplayName = `${newFirstName} ${newLastName}`.trim();
      const currentAvatar = user.imageUrl || avatar;

      // 🔹 4 — Atualizar posts
      const updatedPosts = posts.map((p: any) =>
        p.user.id === user.id
          ? {
              ...p,
              user: {
                ...p.user,
                username: currentUsername,
                displayName: currentDisplayName,
                avatar: currentAvatar,
              },
            }
          : p
      );

      await AsyncStorage.setItem("posts", JSON.stringify(updatedPosts));

      // 🔹 5 — Atualizar comentários
      const allKeys = await AsyncStorage.getAllKeys();
      const commentKeys = allKeys.filter((key) => key.startsWith("@comments:"));

      for (const key of commentKeys) {
        const storedComments = await AsyncStorage.getItem(key);
        if (!storedComments) continue;

        const comments = JSON.parse(storedComments);

        const updatedComments = comments.map((c: any) => {
          if (c.user?.id === user.id || c.userId === user.id) {
            return {
              ...c,
              user: {
                ...c.user,
                id: user.id,
                username: currentUsername,
                displayName: currentDisplayName,
                avatar: currentAvatar,
              },
              username: currentUsername,
              displayName: currentDisplayName,
              avatar: currentAvatar,
            };
          }
          return c;
        });

        await AsyncStorage.setItem(key, JSON.stringify(updatedComments));
      }

      // 🔹 6 — Atualizar notificações
      const storedNotifs = await AsyncStorage.getItem("@notifications");
      const notifications = storedNotifs ? JSON.parse(storedNotifs) : [];

      const updatedNotifs = notifications.map((n: any) =>
        n.userId === user.id
          ? {
              ...n,
              username: currentUsername,
              displayName: currentDisplayName,
              avatar: currentAvatar,
            }
          : n
      );

      await AsyncStorage.setItem(
        "@notifications",
        JSON.stringify(updatedNotifs)
      );

      postEvents.emit("post-updated");

      // ❌ Sem alerta de sucesso
      onClose(); // apenas fecha o modal silenciosamente

    } catch (error) {
      console.error("Erro ao atualizar Clerk:", error);
      Alert.alert("Erro", "Falha ao atualizar o perfil. Tente novamente.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={{ margin: 0 }}
    >
      <KeyboardAvoidingView
        className="flex-1 bg-gray-50"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Cabeçalho */}
        <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-200">
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={26} color="#000" />
          </TouchableOpacity>

          <Text className="text-lg font-semibold text-gray-900">
            Editar perfil
          </Text>

          <View style={{ width: 26 }} />
        </View>

        {/* Conteúdo */}
        <ScrollView className="flex-1 px-5 py-6">
          <View className="items-center mb-8">
            <Image
              source={{ uri: avatar || user?.imageUrl }}
              className="w-32 h-32 rounded-full mb-3 bg-gray-200"
            />
            <TouchableOpacity
              onPress={pickImage}
              style={{ backgroundColor: "#133de9" }}
              className="px-5 py-2 rounded-full"
            >
              <Text className="text-white font-medium">Trocar foto</Text>
            </TouchableOpacity>
          </View>

          {[
            { label: "Nome de usuário", field: "username", placeholder: "ex: silas_dev" },
            { label: "Nome", field: "firstName", placeholder: "Seu nome" },
            { label: "Sobrenome", field: "lastName", placeholder: "Seu sobrenome" },
          ].map(({ label, field, placeholder }) => (
            <View
              key={field}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-5"
            >
              <Text className="text-gray-500 text-sm mb-2">{label}</Text>
              <TextInput
                className="text-base text-gray-800"
                placeholder={placeholder}
                placeholderTextColor="#A0AEC0"
                value={(formData as any)[field]}
                onChangeText={(text) => updateFormField(field, text)}
                autoCapitalize="none"
              />
            </View>
          ))}
        </ScrollView>

        {/* Botão salvar */}
        <View className="bg-white border-t border-gray-200 p-4">
          <TouchableOpacity
            disabled={isUpdating}
            onPress={saveProfile}
            style={{
              backgroundColor: isUpdating ? "rgba(19,61,233,0.5)" : "#133de9",
            }}
            className="rounded-full py-3"
          >
            {isUpdating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-center text-white text-base font-semibold">
                Salvar alterações
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default EditProfileModal;

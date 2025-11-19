// src/hooks/useProfile.ts
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "@clerk/clerk-expo";
import { postEvents } from "@/hooks/usePosts";

const STORAGE_KEY = "@user_profile_data";

export const useProfile = () => {
  const { user } = useUser();
  const [formData, setFormData] = useState({
    firstName: "",
    username: "",
    bio: "",
    location: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const updateFormField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const saveProfile = async () => {
    if (!user) return;
    try {
      setIsUpdating(true);

      // ✅ Atualiza Clerk
      await user.update({
        firstName: formData.firstName,
        unsafeMetadata: {
          username: formData.username,
          bio: formData.bio,
          location: formData.location,
        },
      });

      // ✅ Salva localmente
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(formData));

      // ✅ Atualiza avatar do usuário nas listas locais
      const keys = await AsyncStorage.getAllKeys();
      const relevantKeys = keys.filter(
        (key) => key.startsWith("followers_") || key.startsWith("following_")
      );

      for (const key of relevantKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (!stored) continue;
        const list = JSON.parse(stored);
        const updatedList = list.map((u: any) =>
          u.id === user.id ? { ...u, avatar: user.imageUrl } : u
        );
        await AsyncStorage.setItem(key, JSON.stringify(updatedList));
      }

      // ✅ Emite evento global de atualização
      postEvents.emit("post-updated");
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return { formData, updateFormField, saveProfile, isUpdating };
};

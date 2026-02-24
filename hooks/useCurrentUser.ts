import { useUser } from "@clerk/clerk-expo";
import { useMemo, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string | null;
}

export const useCurrentUser = () => {
  const { user, isLoaded } = useUser();

  const currentUser: CurrentUser | null = useMemo(() => {
    if (!isLoaded || !user) return null;

    const username =
      user.username ||
      (user.unsafeMetadata?.username as string) ||
      "usuario";

    const displayName =
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      username;

    return {
      id: user.id,
      username,
      displayName,
      avatar: user.imageUrl ?? null,
    };
  }, [isLoaded, user]);

  // 🔥 SALVA TODO USUÁRIO QUE LOGAR
  useEffect(() => {
    if (!currentUser) return;

    (async () => {
      const stored = await AsyncStorage.getItem("@all_users");
      const users = stored ? JSON.parse(stored) : [];

      if (!users.find((u: any) => u.id === currentUser.id)) {
        users.push(currentUser);
        await AsyncStorage.setItem("@all_users", JSON.stringify(users));
      }
    })();
  }, [currentUser]);

  return { currentUser };
};

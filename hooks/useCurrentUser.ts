import { useUser } from "@clerk/clerk-expo";
import { useMemo } from "react";

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
      "usuário";

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

  return { currentUser };
};

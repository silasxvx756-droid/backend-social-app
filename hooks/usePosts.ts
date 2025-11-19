import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EventEmitter } from "expo-modules-core";

type PostEvents = { "post-updated": (postId?: string) => void };
export const postEvents = new EventEmitter<PostEvents>();

export interface PostUser {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string | null;
}

export interface Post {
  id: string;
  user: PostUser;
  content: string;
  image?: string;
  likes: string[]; // Agora GUARDA userId
  createdAt: number;
  comments?: any[];
}

const STORAGE_KEY = "posts";

export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastUpdatedPostId = useRef<string | null>(null);

  /** 🔄 Converte likes antigos (username[]) → userId[] */
  const migrateOldLikes = (parsed: Post[]): Post[] => {
    return parsed.map((p) => {
      // Se likes tiver usernames, converte para userId
      const shouldMigrate =
        p.likes.length > 0 &&
        typeof p.likes[0] === "string" &&
        p.likes[0].includes("@"); // heurística simples

      if (!shouldMigrate) return p;

      // Likes antigos armazenavam username, agora armazenamos userId
      const migratedLikes = p.likes.map((username) =>
        username === p.user.username ? p.user.id : username
      );

      return {
        ...p,
        likes: migratedLikes,
      };
    });
  };

  /** 🔄 Carrega posts */
  const loadPosts = useCallback(async () => {
    try {
      setIsLoading(true);

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed: Post[] = stored ? JSON.parse(stored) : [];

      // 🔄 MIGRAÇÃO AUTOMÁTICA
      const migrated = migrateOldLikes(parsed);

      // Salva de volta caso tenha migrado algo
      if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      }

      const sorted = migrated.sort((a, b) => b.createdAt - a.createdAt);
      setPosts(sorted);
    } catch (err) {
      console.error("Erro ao carregar posts:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** 💾 Salva posts com controle de emissão */
  const savePosts = useCallback(
    async (data: Post[], emit: boolean = true, updatedPostId?: string) => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setPosts(data);

        if (emit) {
          lastUpdatedPostId.current = updatedPostId || null;
          postEvents.emit("post-updated", updatedPostId);
        }
      } catch (err) {
        console.error("Erro ao salvar posts:", err);
      }
    },
    []
  );

  /** ❤️ Curtir/descurtir usando USER ID */
  const toggleLike = useCallback(
    async (postId: string, userId: string) => {
      const updated = posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              likes: p.likes.includes(userId)
                ? p.likes.filter((id) => id !== userId)
                : [...p.likes, userId],
            }
          : p
      );

      setPosts(updated);
      await savePosts(updated, true, postId);
    },
    [posts, savePosts]
  );

  /** 🗑️ Deletar post */
  const deletePost = useCallback(
    async (postId: string) => {
      const updated = posts.filter((p) => p.id !== postId);
      await savePosts(updated, true, postId);
    },
    [posts, savePosts]
  );

  /** ✏️ Atualizar username do autor sem mexer nas curtidas */
  const updateUserInPosts = useCallback(
    async (userId: string, newUsername: string, newDisplayName?: string) => {
      const updated = posts.map((p) =>
        p.user.id === userId
          ? {
              ...p,
              user: {
                ...p.user,
                username: newUsername,
                displayName: newDisplayName ?? p.user.displayName,
              },
            }
          : p
      );
      await savePosts(updated);
    },
    [posts, savePosts]
  );

  /** 🔂 Recarregar manualmente */
  const reload = useCallback(async () => {
    await loadPosts();
  }, [loadPosts]);

  /** 🚀 Carrega ao montar */
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  /** 🧠 Evita reload redundante do mesmo post */
  useEffect(() => {
    const listener = async (postId?: string) => {
      if (lastUpdatedPostId.current && lastUpdatedPostId.current === postId) {
        lastUpdatedPostId.current = null;
        return;
      }
      await loadPosts();
    };

    postEvents.addListener("post-updated", listener);
    return () => {
      postEvents.removeListener("post-updated", listener);
    };
  }, [loadPosts]);

  return {
    posts,
    isLoading,
    toggleLike,
    deletePost,
    updateUserInPosts,
    reload,
  };
};

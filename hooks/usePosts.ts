// usePosts.ts
import { useState, useEffect, useCallback } from "react";

export interface PostUser {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string | null;
}

export interface Post {
  _id: string;
  user: PostUser;
  content: string;
  image?: string;
  likes: string[];
  comments?: any[];
  createdAt: string;
}

const API_URL = "http://192.168.0.105:3000"; // 👈 TROQUE PELO SEU IP

export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);

  // -----------------------------
  // LOAD POSTS FROM BACKEND
  // -----------------------------
  useEffect(() => {
    async function loadPosts() {
      try {
        const response = await fetch(`${API_URL}/posts`);
        const data = await response.json();
        setPosts(data);
      } catch (err) {
        console.error("Erro carregando posts:", err);
      } finally {
        setLoaded(true);
      }
    }

    loadPosts();
  }, []);

  // -----------------------------
  // ADD POST (BACKEND)
  // -----------------------------
  const addPost = useCallback(
    async ({
      user,
      content,
      imageFile,
    }: {
      user: PostUser;
      content: string;
      imageFile?: string;
    }) => {
      try {
        const response = await fetch(`${API_URL}/posts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user,
            content,
            image: imageFile,
          }),
        });

        const newPost = await response.json();

        setPosts((prev) => [newPost, ...prev]);
      } catch (err) {
        console.error("Erro addPost backend:", err);
        throw err;
      }
    },
    []
  );

  return { posts, loaded, addPost };
};
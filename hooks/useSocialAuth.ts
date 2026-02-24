import { useSSO, useUser } from "@clerk/clerk-expo";
import { useState } from "react";
import { Alert } from "react-native";

/**
 * Gera username curto, único e seguro para URL
 * Ex: user_k8f2m9_482
 */
const generateUsername = () => {
  const randomPart = Math.random().toString(36).substring(2, 8);
  const number = Math.floor(100 + Math.random() * 900);
  return `user_${randomPart}_${number}`.toLowerCase();
};

export const useSocialAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { startSSOFlow } = useSSO();
  const { user } = useUser();

  const handleSocialAuth = async (
    strategy: "oauth_google" | "oauth_apple"
  ) => {
    setIsLoading(true);

    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
      });

      if (!createdSessionId || !setActive) {
        throw new Error("SSO failed");
      }

      // Ativa sessão
      await setActive({ session: createdSessionId });

      // 🔹 Cria username automaticamente se não existir
      if (user && !user.username) {
        let attempts = 0;
        let success = false;

        while (attempts < 5 && !success) {
          try {
            const username = generateUsername();
            await user.update({ username });
            success = true;
          } catch (err) {
            attempts++;
          }
        }

        if (!success) {
          console.warn("Não foi possível gerar username automaticamente");
        }
      }
    } catch (err) {
      console.log("Erro no social auth:", err);

      const provider = strategy === "oauth_google" ? "Google" : "Apple";
      Alert.alert(
        "Erro",
        `Falha ao entrar com ${provider}. Tente novamente.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    handleSocialAuth,
  };
};

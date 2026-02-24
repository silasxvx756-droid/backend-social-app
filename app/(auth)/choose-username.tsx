import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

export default function ChooseUsername() {
  const router = useRouter();
  const { user } = useUser();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function validateUsername(value: string) {
    return /^[a-z0-9._]{3,20}$/.test(value);
  }

  async function handleContinue() {
    if (!validateUsername(username)) {
      setError(
        "Use 3–20 caracteres. Letras minúsculas, números, ponto ou underline."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      // ✅ SALVA NO CLERK
      await user.update({
        publicMetadata: {
          username,
        },
      });

      // ✅ Sai do auth → entra no app
      router.replace("/(tabs)");
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Esse nome de usuário já está em uso.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-white dark:bg-black px-8"
    >
      <View className="flex-1 justify-center">
        <Text className="text-2xl font-bold text-black dark:text-white mb-2">
          Escolha seu nome de usuário
        </Text>

        <Text className="text-gray-500 dark:text-gray-400 mb-6">
          Esse nome será público e não poderá ser alterado depois.
        </Text>

        <TextInput
          value={username}
          onChangeText={(text) => {
            setUsername(text.toLowerCase());
            setError("");
          }}
          placeholder="seunome"
          autoCapitalize="none"
          autoCorrect={false}
          className="h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 text-black dark:text-white mb-2"
        />

        {error ? (
          <Text className="text-red-500 text-sm mb-4">{error}</Text>
        ) : null}

        <TouchableOpacity
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.8}
          className={`h-12 rounded-full items-center justify-center ${
            username ? "bg-black dark:bg-white" : "bg-gray-300"
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              className={`font-semibold text-base ${
                username ? "text-white dark:text-black" : "text-gray-500"
              }`}
            >
              Continuar
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

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
import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

export default function LoginScreen() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!isLoaded) return;

    if (!email || !password) {
      Alert.alert("Erro", "Preencha email e senha");
      return;
    }

    try {
      setLoading(true);

      const result = await signIn.create({
        identifier: email,
        password,
      });

      await setActive({ session: result.createdSessionId });

      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert(
        "Erro ao entrar",
        err?.errors?.[0]?.message || "Email ou senha inválidos"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 px-8 justify-center">
        {/* HEADER */}
        <View className="mb-8">
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={26} color="#000" />
          </TouchableOpacity>

          <Text className="text-3xl font-bold text-black mt-6">
            Entrar
          </Text>
          <Text className="text-gray-500 mt-2">
            Entre com seu email e senha
          </Text>
        </View>

        {/* EMAIL */}
        <View className="mb-4">
          <Text className="text-gray-600 mb-1">Email</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-base"
            placeholder="seu@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* SENHA */}
        <View className="mb-2">
          <Text className="text-gray-600 mb-1">Senha</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-base"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* ESQUECI SENHA */}
        <TouchableOpacity
          className="self-end mb-6"
          onPress={() => router.push("/(auth)/forgot-password")}
        >
          <Text className="text-blue-500 font-medium">
            Esqueci minha senha
          </Text>
        </TouchableOpacity>

        {/* BOTÃO LOGIN */}
        <TouchableOpacity
          className="bg-black rounded-full py-4 items-center"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">
              Entrar
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

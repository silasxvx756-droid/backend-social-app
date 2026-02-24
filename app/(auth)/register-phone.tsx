import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RegisterEmail() {
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!email || !password || !name || !username) return;

    setLoading(true);
    try {
      // 🔐 Simula login bem-sucedido
      await AsyncStorage.setItem("@auth_token", "logged");
      await AsyncStorage.setItem("@profile_completed", "true");

      // 🚀 Entra direto no app
      router.replace("/(tabs)"); 
      // ou: router.replace("/home")
    } catch (error) {
      console.log("Erro ao registrar:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: isWeb ? "center" : "flex-start",
      }}
      className="bg-gray-50"
    >
      <View
        style={{
          maxWidth: isWeb ? 420 : "100%",
          alignSelf: "center",
        }}
        className={`w-full ${
          isWeb
            ? "bg-white rounded-2xl shadow-md px-8 py-10"
            : "px-8 pt-24"
        }`}
      >
        <Text className="text-3xl font-bold mb-2">Crie sua conta</Text>
        <Text className="text-gray-500 mb-8">
          Cadastre-se usando seu e-mail.
        </Text>

        <TextInput
          placeholder="Nome completo"
          value={name}
          onChangeText={setName}
          className="border border-gray-300 rounded-xl px-4 py-4 mb-4"
        />

        <TextInput
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          className="border border-gray-300 rounded-xl px-4 py-4 mb-4"
        />

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          className="border border-gray-300 rounded-xl px-4 py-4 mb-4"
        />

        <TextInput
          placeholder="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          className="border border-gray-300 rounded-xl px-4 py-4 mb-6"
        />

        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          style={{
            backgroundColor: "#133DE9",
            borderRadius: 999,
            paddingVertical: 16,
          }}
          className="items-center mb-4"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">
              Continuar
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-center text-gray-500">
            Já tem conta? Entrar
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

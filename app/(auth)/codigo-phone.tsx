import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function VerifyCode() {
  const router = useRouter();
  const { phone } = useLocalSearchParams();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const isWeb = Platform.OS === "web";
  const { width } = Dimensions.get("window");
  const isDesktop = isWeb && width > 768;

  async function handleVerifyCode() {
    if (code.length < 4) return;

    setLoading(true);
    try {
      await AsyncStorage.setItem("@profile_completed", "true");

      // 🔥 Agora SEM diferenciação — sempre vai para createpassword
      router.replace("/(auth)/createpassword");

    } catch (error) {
      console.log("Erro ao verificar código:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setResending(true);
    try {
      console.log("Código reenviado para", phone);
    } catch (error) {
      console.log("Erro ao reenviar código:", error);
    } finally {
      setResending(false);
    }
  }

  return (
    <View className="flex-1 bg-gray-50 justify-center items-center px-6">
      <View
        className={`bg-white ${
          isDesktop ? "w-[420px] p-10 rounded-3xl shadow-lg" : "w-full"
        }`}
      >
        <Text className="text-3xl font-bold mb-2">
          Digite o código recebido
        </Text>

        <Text className="text-gray-500 mb-8">
          Enviamos um código para {phone || "seu celular"}.
        </Text>

        <TextInput
          placeholder="1234"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          className="border border-gray-300 rounded-xl px-4 py-5 mb-6 text-lg text-center tracking-widest"
          style={{
            fontSize: isDesktop ? 22 : 18,
          }}
        />

        <TouchableOpacity
          onPress={handleVerifyCode}
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
              Verificar código
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResendCode}
          disabled={resending}
          className="bg-gray-200 rounded-full py-4 items-center mb-6"
        >
          {resending ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text className="font-semibold">
              Reenviar código
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-center text-gray-500">
            Voltar
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

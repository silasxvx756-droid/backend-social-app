import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

export default function NameScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("silasyyyxvx");

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="pt-14 px-6">
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Feather name="arrow-left" size={26} color="#000" />
        </TouchableOpacity>

        <Text className="text-[26px] font-bold mb-2">
          Crie um nome de usuário
        </Text>

        <Text className="text-[15px] text-gray-600 mb-6">
          Adicione um nome de usuário ou use nossa sugestão.
          Você poderá alterar isso quando quiser.
        </Text>

        {/* Input */}
        <View className="flex-row items-center border border-gray-300 rounded-xl h-[56px] px-4 mb-8">
          <TextInput
            placeholder="Nome de usuário"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            className="flex-1 text-[16px]"
          />

          {username.length > 0 && (
            <Feather name="check-circle" size={22} color="#1DB954" />
          )}
        </View>

        {/* Botão Avançar */}
        <TouchableOpacity
          onPress={() => router.push("/auth/PrivacyPolicyScreen")}
          className="bg-[#0A66C2] rounded-full h-[52px] items-center justify-center"
        >
          <Text className="text-white text-[16px] font-semibold">
            Avançar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rodapé */}
      <View className="flex-1 justify-end pb-8">
        <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
          <Text className="text-center text-[#0A66C2] text-[15px] font-medium">
            Já tenho uma conta
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

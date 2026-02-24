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
  const [name, setName] = useState("");

  function handleNext() {
    if (!name.trim()) return;

    router.push({
      pathname: "/(auth)/username",
      params: { name },
    });
  }

  return (
    <View className="flex-1 bg-white">
      
      {/* Header */}
      <View className="pt-14 px-6">
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Feather name="arrow-left" size={26} color="#000" />
        </TouchableOpacity>

        <Text className="text-[28px] font-bold mb-6">
          Qual é seu nome?
        </Text>

        {/* Input */}
        <View className="border border-gray-300 rounded-2xl h-[58px] justify-center px-4 mb-8">
          <TextInput
            placeholder="Nome completo"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            className="text-[16px]"
          />
        </View>

        {/* Botão */}
        <TouchableOpacity
          onPress={handleNext}
          disabled={!name.trim()}
          className={`rounded-full h-[50px] items-center justify-center ${
            name.trim() ? "bg-[#0A66C2]" : "bg-gray-300"
          }`}
        >
          <Text className="text-white text-[16px] font-semibold">
            Avançar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rodapé */}
      <View className="flex-1 justify-end pb-8">
        <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
          <Text className="text-center text-blue-600 text-[15px]">
            Já tenho uma conta
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

import {
  View,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";

export default function BirthDate() {
  const router = useRouter();

  const [date, setDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);

  function handleChange(_: any, selectedDate?: Date) {
    setShowPicker(false);
    if (selectedDate) setDate(selectedDate);
  }

  function calculateAge(birthDate: Date) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  function formatDate(date: Date) {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <View className="flex-1 bg-white px-8 pt-16">
      
      {/* Voltar */}
      <TouchableOpacity onPress={() => router.back()} className="mb-6">
        <Feather name="arrow-left" size={24} color="#000" />
      </TouchableOpacity>

      {/* Título */}
      <Text className="text-3xl font-bold mb-3">
        Qual é sua data de nascimento?
      </Text>

      {/* Descrição */}
      <Text className="text-gray-600 mb-6 leading-6">
        Use sua própria data de nascimento, mesmo que esta seja a conta de uma
        empresa, de um animal de estimação ou de qualquer outro tipo. Ninguém
        verá essa informação a não ser que você decida compartilhá-la.{" "}
        <Text className="text-blue-600">
          Por que preciso informar minha data de nascimento?
        </Text>
      </Text>

      {/* Campo Data */}
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        className="border border-gray-300 rounded-xl px-4 py-5 mb-8"
      >
        <Text className="text-gray-500 text-sm mb-1">
          Data de nascimento ({calculateAge(date)} anos)
        </Text>
        <Text className="text-lg text-black">
          {formatDate(date)}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          onChange={handleChange}
        />
      )}

      {/* Botão Avançar */}
      <TouchableOpacity
        onPress={() => router.push("/(auth)/next-step")}
        style={{ backgroundColor: "#0A66C2" }}
        className="rounded-full py-4 items-center mb-8"
      >
        <Text className="text-white font-semibold text-base">
          Avançar
        </Text>
      </TouchableOpacity>

      {/* Link Entrar */}
      <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
        <Text className="text-center text-blue-600">
          Já tenho uma conta
        </Text>
      </TouchableOpacity>
    </View>
  );
}

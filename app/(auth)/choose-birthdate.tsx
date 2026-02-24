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

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  function onChange(_: any, selectedDate?: Date) {
    setShowPicker(false);
    if (selectedDate) setDate(selectedDate);
  }

  function ageFromDate(date: Date) {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    return age;
  }

  function formatDate(date: Date) {
    return date.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <View className="flex-1 bg-white px-6 pt-14">
      
      {/* Voltar */}
      <TouchableOpacity onPress={() => router.back()} className="mb-6">
        <Feather name="arrow-left" size={26} color="#000" />
      </TouchableOpacity>

      {/* Título */}
      <Text className="text-[30px] font-bold leading-tight mb-4">
        Qual é sua data de nascimento?
      </Text>

      {/* Texto explicativo */}
      <Text className="text-[15px] text-gray-600 leading-6 mb-8">
        Use sua própria data de nascimento, mesmo que esta seja a conta de uma
        empresa, de um animal de estimação ou de qualquer outro tipo. Ninguém
        verá essa informação a não ser que você decida compartilhá-la.{" "}
        <Text className="text-blue-600 font-medium">
          Por que preciso informar minha data de nascimento?
        </Text>
      </Text>

      {/* Campo Data */}
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        className="border border-gray-300 rounded-2xl px-4 py-4 mb-10"
      >
        <Text className="text-[13px] text-gray-500 mb-1">
          Data de nascimento ({ageFromDate(date)} anos)
        </Text>
        <Text className="text-[17px] text-black">
          {formatDate(date)}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          maximumDate={new Date()}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onChange}
        />
      )}

      {/* Botão Avançar */}
      <TouchableOpacity
        onPress={() => router.push("/(auth)/name")}
        className="bg-[#0A66C2] rounded-full py-[14px] items-center mb-10"
      >
        <Text className="text-white text-[16px] font-semibold">
          Avançar
        </Text>
      </TouchableOpacity>

      {/* Rodapé */}
      <View className="flex-1 justify-end pb-6">
        <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
          <Text className="text-center text-blue-600 text-[15px]">
            Já tenho uma conta
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

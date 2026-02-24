import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useState } from "react";

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="pt-14 px-6">
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Feather name="arrow-left" size={26} color="#000" />
        </TouchableOpacity>

        <Text className="text-[26px] font-bold mb-2">
          Política de Privacidade
        </Text>

        <Text className="text-[15px] text-gray-600 mb-6">
          Leia e aceite nossos termos para continuar usando o aplicativo.
        </Text>
      </View>

      {/* Conteúdo */}
      <ScrollView
        className="px-6"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[15px] text-gray-700 leading-6 mb-4">
          Nós respeitamos sua privacidade e estamos comprometidos em proteger
          seus dados pessoais. As informações coletadas são usadas apenas para
          melhorar sua experiência no aplicativo.
        </Text>

        <Text className="text-[15px] text-gray-700 leading-6 mb-4">
          Ao utilizar nossos serviços, você concorda com a coleta e uso das
          informações de acordo com esta política. Você pode alterar ou excluir
          seus dados a qualquer momento.
        </Text>

        <Text className="text-[15px] text-gray-700 leading-6">
          Para mais detalhes, consulte a versão completa da nossa Política de
          Privacidade em nosso site oficial.
        </Text>
      </ScrollView>

      {/* Aceite */}
      <View className="px-6 mb-4">
        <TouchableOpacity
          onPress={() => setAccepted(!accepted)}
          className="flex-row items-center"
        >
          <View
            className={`w-6 h-6 rounded-md border mr-3 items-center justify-center ${
              accepted
                ? "bg-[#0A66C2] border-[#0A66C2]"
                : "border-gray-400"
            }`}
          >
            {accepted && <Feather name="check" size={16} color="#fff" />}
          </View>

          <Text className="text-[15px] text-gray-800">
            Li e aceito a Política de Privacidade
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botão */}
      <View className="px-6 pb-8">
        <TouchableOpacity
          disabled={!accepted}
          onPress={() => router.push("/(auth)/next-step")}
          className={`rounded-full h-[52px] items-center justify-center ${
            accepted ? "bg-[#0A66C2]" : "bg-gray-300"
          }`}
        >
          <Text className="text-white text-[16px] font-semibold">
            Continuar
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

export default function CreatePassword() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isDesktop = Platform.OS === "web" && width >= 1024;

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  function handleNext() {
    if (password.length < 6) return;
    router.push("/(auth)/choose-birthdate");
  }

  return (
    <View
      className={`flex-1 bg-white ${
        isDesktop ? "items-center justify-center" : "px-8 pt-24"
      }`}
    >
      {/* Card Desktop */}
      <View
        className={`w-full ${
          isDesktop
            ? "max-w-md border border-gray-200 rounded-2xl px-10 py-12 shadow-sm"
            : ""
        }`}
      >
        {/* Título */}
        <Text className="text-3xl font-bold mb-2">
          Crie uma senha
        </Text>

        {/* Descrição */}
        <Text className="text-gray-500 mb-8">
          Crie uma senha com pelo menos 6 letras ou números.
          Ela deve ser algo que outras pessoas não consigam adivinhar.
        </Text>

        {/* Campo Senha */}
        <View className="border border-gray-300 rounded-xl px-4 py-4 flex-row items-center mb-4">
          <TextInput
            placeholder="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            className="flex-1 text-lg"
          />

          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Feather
              name={showPassword ? "eye" : "eye-off"}
              size={22}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        {/* Checkbox */}
        <TouchableOpacity
          onPress={() => setRemember(!remember)}
          className="flex-row items-center mb-8"
          activeOpacity={0.8}
        >
          <View
            className={`w-5 h-5 rounded-md border mr-3 items-center justify-center ${
              remember
                ? "bg-blue-600 border-blue-600"
                : "border-gray-400"
            }`}
          >
            {remember && <Feather name="check" size={14} color="#fff" />}
          </View>

          <Text className="text-gray-700">
            Lembrar minhas informações de login.{" "}
            <Text className="text-blue-600">Saiba mais</Text>
          </Text>
        </TouchableOpacity>

        {/* Botão Avançar */}
        <TouchableOpacity
          onPress={handleNext}
          disabled={password.length < 6}
          style={{
            backgroundColor: password.length >= 6 ? "#133DE9" : "#AAB4F8",
          }}
          className="rounded-full py-4 items-center mb-6"
          activeOpacity={0.9}
        >
          <Text className="text-white font-semibold text-base">
            Avançar
          </Text>
        </TouchableOpacity>

        {/* Link Entrar */}
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-center text-blue-600">
            Já tenho uma conta
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

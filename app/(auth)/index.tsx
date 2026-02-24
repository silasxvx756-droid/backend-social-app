import { useSocialAuth } from "@/hooks/useSocialAuth";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const { handleSocialAuth, isLoading: isSocialLoading } = useSocialAuth();
  const router = useRouter();

  const { width } = Dimensions.get("window");
  const isDesktop = width > 768;

  const LOGO_SIZE = isDesktop ? 140 : 180;

  // TODOS OS BOTÕES COM MESMO TAMANHO
  const BUTTON_CLASS =
    "flex-row items-center justify-center rounded-full px-4 h-12 w-full";

  async function handleLogin(provider: "oauth_google" | "oauth_apple") {
    const success = await handleSocialAuth(provider);
    if (success) router.replace("/(auth)/choose-username");
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: 40,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 900,
              flexDirection: isDesktop ? "row" : "column",
              borderRadius: 24,
              overflow: "hidden",
            }}
            className="bg-white dark:bg-zinc-900"
          >
            {/* LADO ESQUERDO */}
            <View
              style={{
                flex: 1,
                padding: isDesktop ? 40 : 20,
                justifyContent: "center",
              }}
            >
              {/* LOGO */}
              <View className="items-center mb-10">
                <Image
                  source={require("../../assets/images/logo1.png")}
                  style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
                  resizeMode="contain"
                />
              </View>

              {/* BOTÕES SOCIAIS */}
              <View className="gap-3">
                {/* APPLE */}
                <TouchableOpacity
                  className={`${BUTTON_CLASS} bg-transparent border-2 border-gray-300 dark:border-gray-600`}
                  onPress={() => handleLogin("oauth_apple")}
                  disabled={isSocialLoading}
                >
                  {isSocialLoading ? (
                    <ActivityIndicator color="#9CA3AF" />
                  ) : (
                    <View className="flex-row items-center justify-center h-full">
                      <Image
                        source={require("../../assets/images/apple.png")}
                        style={{ width: 18, height: 18 }}
                        resizeMode="contain"
                      />
                      <Text className="ml-2 text-black dark:text-white font-semibold text-base">
                        Continuar com Apple
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* GOOGLE */}
                <TouchableOpacity
                  className={`${BUTTON_CLASS} bg-transparent border-2 border-gray-300 dark:border-gray-600`}
                  onPress={() => handleLogin("oauth_google")}
                  disabled={isSocialLoading}
                >
                  {isSocialLoading ? (
                    <ActivityIndicator color="#9CA3AF" />
                  ) : (
                    <View className="flex-row items-center justify-center h-full">
                      <Image
                        source={require("../../assets/images/google.png")}
                        style={{ width: 18, height: 18 }}
                        resizeMode="contain"
                      />
                      <Text className="ml-2 text-black dark:text-white font-semibold text-base">
                        Continuar com Google
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* LADO DIREITO - DESKTOP */}
            {isDesktop && (
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#ffffff",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 40,
                }}
              >
                <Text className="text-4xl font-bold text-gray-800 dark:text-white mb-4 text-center">
                  Conecte-se. Crie. Inspire.
                </Text>
                <Text className="text-lg text-gray-600 dark:text-gray-300 mb-6 text-center">
                  Entre para nossa comunidade e compartilhe suas ideias com o
                  mundo. Experimente recursos exclusivos e colaboração em tempo
                  real.
                </Text>

                <TouchableOpacity
                  onPress={() => router.push("/(auth)/register-phone")}
                  className="bg-blue-600 px-6 py-3 rounded-full"
                >
                  <Text className="text-white font-semibold text-base text-center">
                    Comece agora
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
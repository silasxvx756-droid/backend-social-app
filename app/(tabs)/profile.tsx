// ------------------------------------------------------
// ProfileScreen.tsx — PERFIL PRÓPRIO IG STYLE + EDIT PROFILE + POST MODAL
// HEADER SCROLLÁVEL
// DARK MODE DINÂMICO
// BOTÃO EDITAR → MODAL COM FOTO DE PERFIL
// USERNAME ABAIXO DO DISPLAY NAME
// POST → ABRIR MODAL AO CLICAR
// BOTÃO SAIR ADICIONADO
// BIO + VERIFICADO ADICIONADOS
// ------------------------------------------------------

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
  Modal,
  Pressable,
  TextInput,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser, useClerk } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";

import PostsList from "@/components/PostsList";
import { useProfile } from "@/hooks/useProfile";

const HEADER_OFFSET = 10;

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { formData, updateFormField, saveProfile } = useProfile();

  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  const imageOpacity = useRef(new Animated.Value(0)).current;

  const loadFromClerk = useCallback(async () => {
    if (!user) return;

    updateFormField(
      "username",
      (user.unsafeMetadata?.username as string) || user.username || ""
    );

    updateFormField(
      "firstName",
      (user.unsafeMetadata?.displayName as string) || user.firstName || ""
    );

    updateFormField(
      "bio",
      (user.unsafeMetadata?.bio as string) || ""
    );

    updateFormField(
      "verified",
      !!user.unsafeMetadata?.verified
    );
  }, [user]);

  useEffect(() => {
    loadFromClerk();
  }, [loadFromClerk]);

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? "#000" : "#fff" }}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#000" : "#fff"}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: insets.top + HEADER_OFFSET,
            paddingHorizontal: 16,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: isDarkMode ? "#fff" : "#000",
            }}
          >
            Perfil
          </Text>
        </View>

        {/* PROFILE INFO */}
        <View style={{ paddingHorizontal: 16, marginTop: 16, alignItems: "center" }}>
          <Animated.Image
            source={{ uri: user?.imageUrl || undefined }}
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              opacity: imageOpacity,
            }}
            onLoad={() =>
              Animated.timing(imageOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }).start()
            }
          />

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: isDarkMode ? "#fff" : "#000",
              }}
            >
              {formData.firstName || "Usuário"}
            </Text>
            {formData.verified && (
              <Feather
                name="check-circle"
                size={16}
                color="#1DA1F2"
                style={{ marginLeft: 6 }}
              />
            )}
          </View>

          {formData.username ? (
            <Text
              style={{
                fontSize: 13,
                color: isDarkMode ? "#ccc" : "#666",
                marginBottom: 8,
              }}
            >
              @{formData.username}
            </Text>
          ) : null}

          {/* BIO */}
          {formData.bio ? (
            <Text
              style={{
                fontSize: 14,
                color: isDarkMode ? "#ccc" : "#444",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              {formData.bio}
            </Text>
          ) : null}

          {/* STATS */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              width: "80%",
              marginBottom: 12,
            }}
          >
            {[{ label: "posts", value: 176 }, { label: "seguidores", value: 1234 }, { label: "seguindo", value: 567 }].map(
              (item) => (
                <View key={item.label} style={{ alignItems: "center", flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: isDarkMode ? "#fff" : "#000",
                    }}
                  >
                    {item.value}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: isDarkMode ? "#aaa" : "#666",
                    }}
                  >
                    {item.label}
                  </Text>
                </View>
              )
            )}
          </View>

          {/* BOTÃO EDITAR PERFIL */}
          <TouchableOpacity
            onPress={() => setShowEditModal(true)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 24,
              borderWidth: 1,
              borderColor: isDarkMode ? "#fff" : "#000",
              borderRadius: 20,
              marginBottom: 8,
            }}
          >
            <Text style={{ color: isDarkMode ? "#fff" : "#000", fontWeight: "600" }}>
              Editar Perfil
            </Text>
          </TouchableOpacity>

          {/* BOTÃO SAIR */}
          <TouchableOpacity
            onPress={() => signOut()}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 24,
              borderWidth: 1,
              borderColor: "red",
              borderRadius: 20,
            }}
          >
            <Text style={{ color: "red", fontWeight: "600" }}>Sair</Text>
          </TouchableOpacity>
        </View>

        {/* DIVIDER */}
        <View
          style={{
            height: 1,
            backgroundColor: isDarkMode ? "#333" : "#ddd",
            marginTop: 16,
          }}
        />

        {/* FEED DE POSTS */}
        <PostsList
          username={formData.username}
          isGrid
          type="posts"
          darkMode={isDarkMode}
          onPressPost={(post) => {
            setSelectedPost(post);
            setShowPostModal(true);
          }}
        />
      </ScrollView>

      {/* MODAL EDITAR PERFIL */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={() => setShowEditModal(false)}
        >
          <View
            style={{
              position: "absolute",
              top: insets.top + 60,
              left: 20,
              right: 20,
              padding: 16,
              backgroundColor: isDarkMode ? "#111" : "#fff",
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: isDarkMode ? "#fff" : "#000",
                marginBottom: 12,
              }}
            >
              Editar Perfil
            </Text>

            <TouchableOpacity>
              <Animated.Image
                source={{ uri: user?.imageUrl || undefined }}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  marginBottom: 12,
                }}
              />
            </TouchableOpacity>

            <TextInput
              placeholder="Nome"
              placeholderTextColor={isDarkMode ? "#555" : "#aaa"}
              value={formData.firstName}
              onChangeText={(text) => updateFormField("firstName", text)}
              style={{
                borderWidth: 1,
                borderColor: isDarkMode ? "#333" : "#ddd",
                padding: 10,
                borderRadius: 8,
                color: isDarkMode ? "#fff" : "#000",
                marginBottom: 8,
                width: "100%",
              }}
            />

            <TextInput
              placeholder="Username"
              placeholderTextColor={isDarkMode ? "#555" : "#aaa"}
              value={formData.username}
              onChangeText={(text) => updateFormField("username", text)}
              style={{
                borderWidth: 1,
                borderColor: isDarkMode ? "#333" : "#ddd",
                padding: 10,
                borderRadius: 8,
                color: isDarkMode ? "#fff" : "#000",
                marginBottom: 8,
                width: "100%",
              }}
            />

            <TextInput
              placeholder="Biografia"
              placeholderTextColor={isDarkMode ? "#555" : "#aaa"}
              value={formData.bio}
              onChangeText={(text) => updateFormField("bio", text)}
              multiline
              style={{
                borderWidth: 1,
                borderColor: isDarkMode ? "#333" : "#ddd",
                padding: 10,
                borderRadius: 8,
                color: isDarkMode ? "#fff" : "#000",
                marginBottom: 12,
                width: "100%",
                minHeight: 60,
              }}
            />

            <TouchableOpacity
              onPress={async () => {
                await saveProfile();
                setShowEditModal(false);
              }}
              style={{
                paddingVertical: 10,
                backgroundColor: isDarkMode ? "#fff" : "#000",
                borderRadius: 8,
                alignItems: "center",
                width: "100%",
              }}
            >
              <Text style={{ color: isDarkMode ? "#000" : "#fff", fontWeight: "600" }}>
                Salvar
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* MODAL POST */}
      <Modal visible={showPostModal} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }}
          onPress={() => setShowPostModal(false)}
        >
          <View
            style={{
              position: "absolute",
              top: insets.top + 60,
              left: 20,
              right: 20,
              backgroundColor: isDarkMode ? "#111" : "#fff",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
            }}
          >
            {selectedPost && (
              <>
                <Animated.Image
                  source={{ uri: selectedPost.imageUrl }}
                  style={{ width: "100%", height: 300, borderRadius: 12 }}
                />

                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 16,
                    fontWeight: "600",
                    color: isDarkMode ? "#fff" : "#000",
                  }}
                >
                  {selectedPost.title || "Post"}
                </Text>

                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 14,
                    color: isDarkMode ? "#ccc" : "#444",
                  }}
                >
                  {selectedPost.description || ""}
                </Text>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
} from "react-native";
import * as MediaLibrary from "expo-media-library";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const ITEM_SIZE = width / 3;

type Props = {
  visible: boolean;
  onClose: () => void;
  onNext: (asset: MediaLibrary.Asset) => void;
};

export default function CreatePostModal({
  visible,
  onClose,
  onNext,
}: Props) {
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [selected, setSelected] = useState<MediaLibrary.Asset | null>(null);

  // ----------------------
  // CARREGAR GALERIA
  // ----------------------
  useEffect(() => {
    if (!visible) return;

    (async () => {
      // ⚠️ MediaLibrary não funciona no Web
      if (Platform.OS === "web") return;

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") return;

      const media = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: MediaLibrary.SortBy.creationTime,
        first: 80,
      });

      setAssets(media.assets);
      setSelected(media.assets[0] ?? null);
    })();
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black">
        {/* ---------------- HEADER ---------------- */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={26} color="white" />
          </TouchableOpacity>

          <Text className="text-white text-lg font-semibold">
            Novo post
          </Text>

          <TouchableOpacity
            disabled={!selected}
            onPress={() => selected && onNext(selected)}
          >
            <Text
              className={`text-base font-semibold ${
                selected ? "text-blue-500" : "text-zinc-500"
              }`}
            >
              Avançar
            </Text>
          </TouchableOpacity>
        </View>

        {/* ---------------- PREVIEW ---------------- */}
        {selected && (
          <Image
            source={{ uri: selected.uri }}
            style={{ width, height: width }}
            contentFit="cover"
          />
        )}

        {/* ---------------- GALERIA HEADER ---------------- */}
        <View className="flex-row justify-between items-center px-4 py-3">
          <Text className="text-white font-semibold">
            Recentes ▾
          </Text>

          <View className="flex-row items-center bg-zinc-800 px-3 py-1 rounded-full">
            <Ionicons name="copy-outline" size={16} color="white" />
            <Text className="text-white ml-2 text-sm">
              Selecionar
            </Text>
          </View>
        </View>

        {/* ---------------- GRID ---------------- */}
        <FlatList
          data={assets}
          keyExtractor={(item) => item.id}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => {
            const isSelected = selected?.id === item.id;

            return (
              <TouchableOpacity onPress={() => setSelected(item)}>
                <Image
                  source={{ uri: item.uri }}
                  style={{
                    width: ITEM_SIZE,
                    height: ITEM_SIZE,
                    opacity: isSelected ? 0.5 : 1,
                  }}
                />
              </TouchableOpacity>
            );
          }}
        />

        {/* ---------------- TABS FIXAS ---------------- */}
        <View className="absolute bottom-0 w-full flex-row justify-center bg-black py-3 border-t border-zinc-800">
          {["POST", "STORY", "REEL"].map((tab) => (
            <Text
              key={tab}
              className={`mx-4 font-semibold ${
                tab === "POST"
                  ? "text-white"
                  : "text-zinc-500"
              }`}
            >
              {tab}
            </Text>
          ))}
        </View>
      </View>
    </Modal>
  );
}

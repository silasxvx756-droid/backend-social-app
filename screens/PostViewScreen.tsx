import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type RouteParams = {
  post: {
    id: string;
    image: string;
    caption?: string;
    username: string;
    avatar?: string;
    likes?: number;
    isVerified?: boolean;
  };
};

const PostViewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { post } = route.params as RouteParams;

  return (
    <View className="flex-1 bg-white">
      {/* HEADER */}
      <View
        className="flex-row items-center px-4 py-3 border-b border-gray-200"
        style={{ paddingTop: insets.top }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>

        <Text className="ml-4 text-lg font-semibold">
          Publicação
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* USER */}
        <View className="flex-row items-center px-4 py-3">
          <Image
            source={{ uri: post.avatar }}
            className="w-10 h-10 rounded-full"
          />

          <View className="ml-3 flex-row items-center">
            <Text className="font-semibold">
              {post.username}
            </Text>

            {post.isVerified && (
              <Feather
                name="check-circle"
                size={14}
                color="#1DA1F2"
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>

        {/* IMAGE */}
        <Image
          source={{ uri: post.image }}
          className="w-full aspect-square bg-gray-100"
        />

        {/* ACTIONS */}
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity className="mr-4">
            <Feather name="heart" size={24} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity className="mr-4">
            <Feather name="message-circle" size={24} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity>
            <Feather name="send" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* LIKES */}
        <Text className="px-4 font-semibold">
          {post.likes ?? 0} curtidas
        </Text>

        {/* CAPTION */}
        {post.caption && (
          <Text className="px-4 mt-1">
            <Text className="font-semibold">
              {post.username}{" "}
            </Text>
            {post.caption}
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

export default PostViewScreen;

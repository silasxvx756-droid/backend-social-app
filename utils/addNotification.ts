// src/utils/addNotification.ts
import { showNotification } from "./notify";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";

type UserActor = {
  id: string;
  username: string;
  avatar?: string;
};

export const addNotification = async (
  actor: UserActor,
  type: "like" | "comment" | "follow" | "message" | "post" = "like",
  postId?: string,
  targetUserId?: string,   // 👈 QUEM DEVE RECEBER
  forceNotify: boolean = false
) => {
  try {
    // 🛡️ Nenhuma notificação deve acontecer se não houver targetUserId
    if (!targetUserId) return;

    // 🛡️ Bloqueia notificações para si mesmo (exceto forceNotify)
    if (!forceNotify && actor.id === targetUserId) return;

    let message = "";

    switch (type) {
      case "like":
        message = `@${actor.username} curtiu seu post`;
        break;
      case "comment":
        message = `@${actor.username} comentou em seu post`;
        break;
      case "follow":
        message = `@${actor.username} começou a seguir você`;
        break;
      case "message":
        message = `Nova mensagem de @${actor.username}`;
        break;
      case "post":
        message = `@${actor.username} criou uma nova publicação 🚀`;
        break;
    }

    // 🔔 Som + vibração apenas para mensagens
    if (type === "message") {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const { sound } = await Audio.Sound.createAsync(
          require("@/assets/notify.mp3"),
          { shouldPlay: true }
        );

        setTimeout(() => sound.unloadAsync(), 2000);
      } catch {}
    }

    await showNotification("Nova notificação", message);

  } catch (error) {
    console.error("Erro ao enviar notificação:", error);
  }
};

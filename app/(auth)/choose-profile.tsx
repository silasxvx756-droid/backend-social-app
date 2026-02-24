import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";

export default function VerifyCode() {
  const router = useRouter();

  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const inputs = useRef<TextInput[]>([]);

  function handleChange(text: string, index: number) {
    // Se colar o código inteiro
    if (text.length > 1) {
      const pasted = text.slice(0, 6).split("");
      const newCode = [...code];

      pasted.forEach((char, i) => {
        if (i < 6) newCode[i] = char;
      });

      setCode(newCode);
      inputs.current[pasted.length - 1]?.focus();
      return;
    }

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handleSubmit() {
    const finalCode = code.join("");

    if (finalCode.length < 6) {
      return;
    }

    console.log("Código digitado:", finalCode);

    // 👉 navega para a tela de criar senha
    router.push("/createpassword");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <Text style={styles.title}>Digite o código</Text>
      <Text style={styles.subtitle}>
        Enviamos um código de 6 dígitos para você
      </Text>

      <View style={styles.codeContainer}>
        {code.map((value, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputs.current[index] = ref!)}
            value={value}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={({ nativeEvent }) =>
              handleKeyPress(nativeEvent.key, index)
            }
            keyboardType="number-pad"
            maxLength={1}
            style={styles.input}
            textAlign="center"
            autoFocus={index === 0}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Confirmar</Text>
      </TouchableOpacity>

      <TouchableOpacity>
        <Text style={styles.resend}>Reenviar código</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 32,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  input: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    fontSize: 22,
  },
  button: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  resend: {
    textAlign: "center",
    color: "#000",
    fontWeight: "500",
  },
});

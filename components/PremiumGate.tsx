import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useThemeColors } from "../constants/theme";
import { useAuthStore } from "../stores/authStore";

interface PremiumGateProps {
  children: React.ReactNode;
  feature?: string;
}

export function PremiumGate({ children, feature = "este recurso" }: PremiumGateProps) {
  const colors = useThemeColors();
  const profile = useAuthStore((s) => s.profile);

  if (profile?.is_premium) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.muted }]}>
        <Ionicons name="lock-closed" size={32} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Recurso Premium</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Assine o Memora Premium para acessar {feature}.
      </Text>
      <Pressable
        onPress={() => router.push("/paywall")}
        style={[styles.button, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="star" size={16} color="#fff" />
        <Text style={styles.buttonText}>Ver planos Premium</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});

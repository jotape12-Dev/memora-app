import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../constants/theme";
import { useAuthStore } from "../stores/authStore";

export function GenerationLimitBadge() {
  const colors = useThemeColors();
  const profile = useAuthStore((s) => s.profile);

  if (!profile || profile.is_premium) return null;

  const today = new Date().toISOString().split("T")[0];
  const isNewDay = profile.last_generation_date !== today;
  const count = isNewDay ? 0 : profile.daily_generation_count;
  const remaining = 10 - count;

  const isLow = remaining <= 3;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isLow ? "#fef2f2" : colors.muted },
      ]}
    >
      <Ionicons
        name="sparkles"
        size={14}
        color={isLow ? "#ef4444" : colors.primary}
      />
      <Text
        style={[
          styles.text,
          { color: isLow ? "#ef4444" : colors.textSecondary },
        ]}
      >
        {remaining}/10 gerações restantes hoje
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
  },
});

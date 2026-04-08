import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../constants/theme";
import type { SM2Rating } from "../types/database";

const PRIMARY = "#01696f";

interface RatingButtonProps {
  rating: SM2Rating;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: (rating: SM2Rating) => void;
}

export function RatingButton({ rating, label, icon, color, onPress }: RatingButtonProps) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => onPress(rating)}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: color,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const ERROR_COLOR = "#e05252";
const SUCCESS_COLOR = "#01696f";

export function RatingButtons({ onRate }: { onRate: (rating: SM2Rating) => void }) {
  return (
    <View style={styles.row}>
      {/* Esquerda — erros */}
      <View style={styles.group}>
        <RatingButton rating={0} label="Errei" icon="close-circle" color={ERROR_COLOR} onPress={onRate} />
        <RatingButton rating={2} label="Difícil" icon="alert-circle" color={ERROR_COLOR} onPress={onRate} />
      </View>

      {/* Direita — acertos */}
      <View style={styles.group}>
        <RatingButton rating={3} label="Acertei" icon="checkmark-circle" color={SUCCESS_COLOR} onPress={onRate} />
        <RatingButton rating={5} label="Fácil" icon="star" color={SUCCESS_COLOR} onPress={onRate} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    width: "100%",
  },
  group: {
    flexDirection: "row",
    gap: 8,
  },
  container: {
    width: 90,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});

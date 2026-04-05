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
  onPress: (rating: SM2Rating) => void;
}

export function RatingButton({ rating, label, icon, onPress }: RatingButtonProps) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => onPress(rating)}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: PRIMARY,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={24} color={PRIMARY} />
      <Text style={[styles.label, { color: PRIMARY }]}>{label}</Text>
    </Pressable>
  );
}

export function RatingButtons({ onRate }: { onRate: (rating: SM2Rating) => void }) {
  return (
    <View style={styles.row}>
      <RatingButton rating={0} label="Errei" icon="close-circle" onPress={onRate} />
      <RatingButton rating={2} label="Difícil" icon="alert-circle" onPress={onRate} />
      <RatingButton rating={3} label="Bom" icon="checkmark-circle" onPress={onRate} />
      <RatingButton rating={5} label="Fácil" icon="star" onPress={onRate} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    width: "100%",
  },
  container: {
    flex: 1,
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

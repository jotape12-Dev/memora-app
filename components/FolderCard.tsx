import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../constants/theme";
import type { Folder } from "../types/database";

interface FolderCardProps {
  folder: Folder;
  deckCount: number;
  subfolderCount?: number;
  onPress: () => void;
  onLongPress?: () => void;
}

export function FolderCard({ folder, deckCount, subfolderCount = 0, onPress, onLongPress }: FolderCardProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderLeftColor: folder.color,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: folder.color + "22" }]}>
          <Ionicons name={(folder.icon as keyof typeof Ionicons.glyphMap) || "folder"} size={22} color={folder.color} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {folder.name}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {subfolderCount > 0
              ? `${subfolderCount} ${subfolderCount === 1 ? "pasta" : "pastas"} · ${deckCount} ${deckCount === 1 ? "deck" : "decks"}`
              : `${deckCount} ${deckCount === 1 ? "deck" : "decks"}`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  body: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  meta: { fontSize: 12 },
});

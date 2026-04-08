import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../constants/theme";
import type { Deck } from "../types/database";

interface DeckCardProps {
  deck: Deck;
  dueCount?: number;
  onPress: () => void;
}

export function DeckCard({ deck, dueCount = 0, onPress }: DeckCardProps) {
  const colors = useThemeColors();
  const isError = deck.is_error_deck;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderTopColor: deck.color,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <View style={styles.titleRow}>
          {isError && (
            <Ionicons name="alert-circle" size={18} color={deck.color} />
          )}
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {deck.title}
          </Text>
        </View>
        {deck.subject ? (
          <Text style={[styles.subject, { color: colors.textSecondary }]} numberOfLines={1}>
            {deck.subject}
          </Text>
        ) : null}
        <View style={styles.footer}>
          <View style={styles.stat}>
            <Ionicons name="layers-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {deck.card_count} {deck.card_count === 1 ? "card" : "cards"}
            </Text>
          </View>
          {dueCount > 0 && (
            <View style={[styles.badge, { backgroundColor: isError ? deck.color : colors.primary }]}>
              <Text style={styles.badgeText}>{dueCount} pendentes</Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderTopWidth: 3,
    marginBottom: 12,
    padding: 16,
  },
  pressable: {},
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  subject: {
    fontSize: 13,
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 13,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
});

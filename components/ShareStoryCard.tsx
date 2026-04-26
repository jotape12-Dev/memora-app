import React, { forwardRef } from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { Colors } from "../constants/colors";
import {
  type DailyShareStats,
  formatDurationShort,
  formatTodayPtBR,
} from "../lib/dailyShareStats";

export type ShareVariant = "light" | "dark" | "transparent";

type Props = {
  stats: DailyShareStats;
  variant: ShareVariant;
  width: number;
  height: number;
};

const MAX_DECK_LINES = 4;

export const ShareStoryCard = forwardRef<View, Props>(({ stats, variant, width, height }, ref) => {
  const palette = getPalette(variant);
  const visibleDecks = stats.deckTitles.slice(0, MAX_DECK_LINES);
  const hiddenDecks = Math.max(0, stats.deckTitles.length - MAX_DECK_LINES);

  const containerStyle: ViewStyle = {
    width,
    height,
    backgroundColor: palette.bg,
    borderColor: palette.border,
    borderWidth: variant === "transparent" ? 0 : StyleSheet.hairlineWidth,
  };

  const textShadow = variant === "transparent"
    ? { textShadowColor: "rgba(0,0,0,0.55)", textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } }
    : undefined;

  return (
    <View ref={ref} collapsable={false} style={[styles.card, containerStyle]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.brand, { color: palette.brand }, textShadow]}>Memora</Text>
        <Text style={[styles.date, { color: palette.muted }, textShadow]}>
          {formatTodayPtBR(stats.date)}
        </Text>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.statBlock}>
          <Text style={[styles.label, { color: palette.muted }, textShadow]}>Tempo na semana:</Text>
          <Text style={[styles.bigValue, { color: palette.text }, textShadow]}>
            {formatDurationShort(stats.durationSeconds)}
          </Text>
        </View>

        <View style={styles.statBlock}>
          <Text style={[styles.label, { color: palette.muted }, textShadow]}>Precisão:</Text>
          <Text style={[styles.bigValue, { color: palette.accent }, textShadow]}>
            {stats.accuracyPct}%
          </Text>
        </View>

        {visibleDecks.length > 0 && (
          <View style={styles.statBlock}>
            <Text style={[styles.label, { color: palette.muted }, textShadow]}>
              {stats.deckTitles.length === 1 ? "Deck revisado" : "Decks revisados"}
            </Text>
            {visibleDecks.map((title) => (
              <Text
                key={title}
                style={[styles.deckLine, { color: palette.text }, textShadow]}
                numberOfLines={1}
              >
                • {title}
              </Text>
            ))}
            {hiddenDecks > 0 && (
              <Text style={[styles.deckLine, { color: palette.muted }, textShadow]}>
                +{hiddenDecks} {hiddenDecks === 1 ? "deck" : "decks"}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Footer wordmark */}
      <View style={styles.footer}>
        <Text style={[styles.footerBrand, { color: palette.brand }, textShadow]}>Memora</Text>
        <Text style={[styles.footerTagline, { color: palette.muted }, textShadow]}>
          Estudo inteligente
        </Text>
      </View>
    </View>
  );
});

ShareStoryCard.displayName = "ShareStoryCard";

type Palette = {
  bg: string;
  border: string;
  text: string;
  muted: string;
  brand: string;
  accent: string;
};

function getPalette(variant: ShareVariant): Palette {
  if (variant === "dark") {
    return {
      bg: Colors.dark.background,
      border: Colors.dark.border,
      text: "#f7f6f2",
      muted: "#9d9c98",
      brand: Colors.light.primary,
      accent: "#7dd3a3",
    };
  }
  if (variant === "transparent") {
    return {
      bg: "transparent",
      border: "transparent",
      text: "#ffffff",
      muted: "rgba(255,255,255,0.85)",
      brand: "#ffffff",
      accent: "#7dd3a3",
    };
  }
  return {
    bg: Colors.light.background,
    border: Colors.light.border,
    text: Colors.light.text,
    muted: Colors.light.textSecondary,
    brand: Colors.light.primary,
    accent: Colors.light.primary,
  };
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 36,
    justifyContent: "space-between",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 14,
    fontWeight: "500",
  },
  body: {
    gap: 24,
  },
  statBlock: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  bigValue: {
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1,
  },
  deckLine: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 2,
  },
  footer: {
    alignItems: "center",
    gap: 2,
  },
  footerBrand: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
  },
  footerTagline: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
});

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "../constants/theme";

interface ProgressBarProps {
  current: number;
  total: number;
  showLabel?: boolean;
}

export function ProgressBar({ current, total, showLabel = true }: ProgressBarProps) {
  const colors = useThemeColors();
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <View style={styles.container}>
      {showLabel && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {current}/{total}
        </Text>
      )}
      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.fill,
            { width: `${Math.min(progress, 100)}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "right",
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});

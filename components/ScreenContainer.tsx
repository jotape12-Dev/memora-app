import React from "react";
import { View, StyleSheet } from "react-native";
import { useLayout } from "../hooks/useLayout";

interface Props {
  children: React.ReactNode;
}

export function ScreenContainer({ children }: Props) {
  const { isTablet, contentMaxWidth } = useLayout();
  if (!isTablet) return <>{children}</>;
  return (
    <View style={styles.outer}>
      <View style={[styles.inner, { maxWidth: contentMaxWidth }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: "center",
  },
  inner: {
    flex: 1,
    width: "100%",
  },
});

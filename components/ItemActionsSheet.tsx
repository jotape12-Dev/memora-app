import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../constants/theme";
import { useLayout, MAX_MODAL_WIDTH } from "../hooks/useLayout";

export interface ItemAction {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

interface ItemActionsSheetProps {
  visible: boolean;
  itemName: string;
  itemIcon?: keyof typeof Ionicons.glyphMap;
  itemColor?: string;
  actions: ItemAction[];
  onClose: () => void;
}

export function ItemActionsSheet({
  visible,
  itemName,
  itemIcon = "ellipsis-horizontal",
  itemColor,
  actions,
  onClose,
}: ItemActionsSheetProps) {
  const colors = useThemeColors();
  const { isTablet } = useLayout();
  const accent = itemColor ?? colors.primary;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, isTablet && styles.overlayTablet]} onPress={onClose}>
        <Pressable style={[styles.content, isTablet && styles.contentTablet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: accent + "22" }]}>
              <Ionicons name={itemIcon} size={22} color={accent} />
            </View>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {itemName}
            </Text>
          </View>

          {actions.map((a) => (
            <Pressable
              key={a.key}
              onPress={() => {
                onClose();
                setTimeout(a.onPress, 200);
              }}
              style={({ pressed }) => [
                styles.action,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons
                name={a.icon}
                size={20}
                color={a.destructive ? "#dc2626" : colors.text}
              />
              <Text
                style={[
                  styles.actionLabel,
                  { color: a.destructive ? "#dc2626" : colors.text },
                ]}
              >
                {a.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  overlayTablet: {
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 8,
  },
  contentTablet: {
    borderRadius: 20,
    maxWidth: MAX_MODAL_WIDTH,
    alignSelf: "center",
    width: "100%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { flex: 1, fontSize: 17, fontWeight: "700" },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionLabel: { fontSize: 15, fontWeight: "500" },
});

import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../constants/theme";
import { useLayout, MAX_MODAL_WIDTH } from "../hooks/useLayout";

interface CreateOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreateFolder: () => void;
  onCreateDeck: () => void;
  allowFolder?: boolean;
}

export function CreateOptionsSheet({
  visible,
  onClose,
  onCreateFolder,
  onCreateDeck,
  allowFolder = true,
}: CreateOptionsSheetProps) {
  const colors = useThemeColors();
  const { isTablet } = useLayout();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, isTablet && styles.overlayTablet]} onPress={onClose}>
        <Pressable style={[styles.content, isTablet && styles.contentTablet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.text }]}>Criar</Text>

          {allowFolder && (
            <Pressable
              onPress={onCreateFolder}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={styles.optionRow}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + "22" }]}>
                  <Ionicons name="folder" size={22} color={colors.primary} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>Nova pasta</Text>
                  <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                    Organize seus decks por matéria
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            </Pressable>
          )}

          <Pressable
            onPress={onCreateDeck}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.optionRow}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + "22" }]}>
                <Ionicons name="layers" size={22} color={colors.primary} />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Novo deck</Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                  Crie um conjunto de flashcards
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </View>
          </Pressable>
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
    gap: 10,
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
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionTextWrap: {
    flex: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  optionTitle: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  optionDesc: { fontSize: 12 },
});

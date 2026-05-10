import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../constants/theme";
import { DeckColors } from "../constants/colors";
import { Button } from "./Button";
import { useLayout, MAX_MODAL_WIDTH } from "../hooks/useLayout";
import type { Folder } from "../types/database";

const FOLDER_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  "folder",
  "school",
  "book",
  "library",
  "briefcase",
  "flask",
  "calculator",
  "globe",
  "heart",
  "star",
  "rocket",
  "language",
];

interface FolderFormModalProps {
  visible: boolean;
  initialFolder?: Folder | null;
  onClose: () => void;
  onSubmit: (name: string, color: string, icon: string) => Promise<void> | void;
  title?: string;
}

export function FolderFormModal({
  visible,
  initialFolder,
  onClose,
  onSubmit,
  title,
}: FolderFormModalProps) {
  const colors = useThemeColors();
  const { isTablet } = useLayout();

  const [name, setName] = useState("");
  const [color, setColor] = useState(DeckColors[0]);
  const [icon, setIcon] = useState<string>("folder");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialFolder?.name ?? "");
      setColor(initialFolder?.color ?? DeckColors[0]);
      setIcon(initialFolder?.icon ?? "folder");
      setSubmitting(false);
    }
  }, [visible, initialFolder]);

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(name.trim(), color, icon);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Pressable style={[styles.overlay, isTablet && styles.overlayTablet]} onPress={Keyboard.dismiss}>
          <Pressable style={[styles.content, isTablet && styles.contentTablet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              {title ?? (initialFolder ? "Editar Pasta" : "Nova Pasta")}
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nome da pasta"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              autoFocus
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Cor:</Text>
            <View style={styles.colorRow}>
              {DeckColors.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    color === c && styles.colorDotSelected,
                  ]}
                />
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Ícone:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
              <View style={styles.iconRow}>
                {FOLDER_ICONS.map((ic) => (
                  <Pressable
                    key={ic}
                    onPress={() => setIcon(ic)}
                    style={[
                      styles.iconBtn,
                      {
                        backgroundColor: icon === ic ? color + "22" : colors.background,
                        borderColor: icon === ic ? color : colors.border,
                      },
                    ]}
                  >
                    <Ionicons name={ic} size={20} color={icon === ic ? color : colors.textSecondary} />
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.buttons}>
              <Button title="Cancelar" variant="ghost" onPress={onClose} />
              <Button
                title={initialFolder ? "Salvar" : "Criar"}
                onPress={handleSubmit}
                loading={submitting}
                disabled={!name.trim()}
              />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
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
    padding: 24,
    gap: 12,
  },
  contentTablet: {
    borderRadius: 20,
    maxWidth: MAX_MODAL_WIDTH,
    alignSelf: "center",
    width: "100%",
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  label: { fontSize: 13, fontWeight: "500", marginTop: 4 },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  iconScroll: { marginTop: 4 },
  iconRow: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
});

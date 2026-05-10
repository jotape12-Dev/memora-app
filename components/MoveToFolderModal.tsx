import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../constants/theme";
import { Button } from "./Button";
import { useLayout, MAX_MODAL_WIDTH } from "../hooks/useLayout";
import type { Folder } from "../types/database";

interface MoveToFolderModalProps {
  visible: boolean;
  folders: Folder[];
  // The folder/deck currently being moved. If moving a folder, pass its id
  // so we can hide it (and its descendants) from valid targets.
  currentParentId: string | null;
  movingFolderId?: string | null;
  // If true (when moving a folder that has children), only root is allowed.
  forceRootOnly?: boolean;
  onClose: () => void;
  onSelect: (folderId: string | null) => Promise<void> | void;
  title?: string;
}

interface TreeNode {
  folder: Folder;
  children: TreeNode[];
}

function buildTree(folders: Folder[]): TreeNode[] {
  const byParent = new Map<string | null, Folder[]>();
  for (const f of folders) {
    const arr = byParent.get(f.parent_folder_id) ?? [];
    arr.push(f);
    byParent.set(f.parent_folder_id, arr);
  }
  const build = (parentId: string | null): TreeNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((folder) => ({ folder, children: build(folder.id) }));
  return build(null);
}

export function MoveToFolderModal({
  visible,
  folders,
  currentParentId,
  movingFolderId,
  forceRootOnly = false,
  onClose,
  onSelect,
  title = "Mover para...",
}: MoveToFolderModalProps) {
  const colors = useThemeColors();
  const { isTablet } = useLayout();
  const [selected, setSelected] = useState<string | null>(currentParentId);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setSelected(currentParentId);
      setSubmitting(false);
    }
  }, [visible, currentParentId]);

  const tree = useMemo(() => buildTree(folders), [folders]);

  const handleConfirm = async () => {
    if (selected === currentParentId) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await onSelect(selected);
    } finally {
      setSubmitting(false);
    }
  };

  const renderRow = (node: TreeNode, depth: number) => {
    const isMoving = movingFolderId && node.folder.id === movingFolderId;
    if (isMoving) return null; // can't move into self
    // If moving a folder, sub-folders aren't valid (would exceed depth)
    const disabled = !!movingFolderId && depth > 0;
    const isSelected = selected === node.folder.id;

    return (
      <View key={node.folder.id}>
        <Pressable
          onPress={() => !disabled && setSelected(node.folder.id)}
          disabled={disabled}
          style={({ pressed }) => [
            styles.row,
            {
              paddingLeft: 14 + depth * 20,
              backgroundColor: isSelected ? colors.primary + "1a" : "transparent",
              opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons
            name={(node.folder.icon as keyof typeof Ionicons.glyphMap) || "folder"}
            size={18}
            color={node.folder.color}
          />
          <Text style={[styles.rowText, { color: colors.text }]} numberOfLines={1}>
            {node.folder.name}
          </Text>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          )}
        </Pressable>
        {node.children.map((child) => renderRow(child, depth + 1))}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, isTablet && styles.overlayTablet]} onPress={onClose}>
        <Pressable style={[styles.content, isTablet && styles.contentTablet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          <ScrollView style={styles.list}>
            {/* Root option */}
            <Pressable
              onPress={() => setSelected(null)}
              style={({ pressed }) => [
                styles.row,
                {
                  paddingLeft: 14,
                  backgroundColor: selected === null ? colors.primary + "1a" : "transparent",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="home-outline" size={18} color={colors.text} />
              <Text style={[styles.rowText, { color: colors.text }]}>Raiz (sem pasta)</Text>
              {selected === null && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </Pressable>

            {!forceRootOnly && tree.length > 0 && (
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            )}

            {!forceRootOnly && tree.map((node) => renderRow(node, 0))}

            {forceRootOnly && (
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Esta pasta tem subpastas — só pode ser movida para a raiz.
              </Text>
            )}

            {tree.length === 0 && !forceRootOnly && (
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Você ainda não tem pastas. Crie uma para organizar seus decks.
              </Text>
            )}
          </ScrollView>

          <View style={styles.buttons}>
            <Button title="Cancelar" variant="ghost" onPress={onClose} />
            <Button
              title="Mover"
              onPress={handleConfirm}
              loading={submitting}
              disabled={selected === currentParentId}
            />
          </View>
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
    paddingBottom: 24,
    maxHeight: "80%",
    gap: 12,
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
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: "700" },
  list: { maxHeight: 360 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingRight: 14,
    borderRadius: 8,
  },
  rowText: { flex: 1, fontSize: 15 },
  divider: { height: 1, marginVertical: 4 },
  hint: { fontSize: 13, padding: 14, textAlign: "center" },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
});

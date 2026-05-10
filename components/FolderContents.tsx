import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { useThemeColors } from "../constants/theme";
import { useDecksStore } from "../stores/decksStore";
import { useFoldersStore } from "../stores/foldersStore";
import { DeckCard } from "./DeckCard";
import { FolderCard } from "./FolderCard";
import { EmptyState } from "./EmptyState";
import { FolderFormModal } from "./FolderFormModal";
import { ItemActionsSheet, type ItemAction } from "./ItemActionsSheet";
import { MoveToFolderModal } from "./MoveToFolderModal";
import type { Deck, Folder } from "../types/database";

interface FolderContentsProps {
  parentFolderId: string | null;
  /** Called by the empty-state action button — parent should open creation flow. */
  onRequestCreate?: () => void;
  /** When true, show "Crie um deck" empty-state copy (used inside sub-folders). */
  deckOnlyEmptyCopy?: boolean;
}

export function FolderContents({ parentFolderId, onRequestCreate, deckOnlyEmptyCopy }: FolderContentsProps) {
  const colors = useThemeColors();

  const { decks, dueCards, fetchDecks, fetchAllDueCards, deleteDeck, moveDeck } = useDecksStore();
  const { folders, fetchFolders, updateFolder, deleteFolder, moveFolder } = useFoldersStore();

  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [actionTarget, setActionTarget] = useState<
    | { type: "deck"; deck: Deck }
    | { type: "folder"; folder: Folder }
    | null
  >(null);
  const [movingItem, setMovingItem] = useState<
    | { type: "deck"; id: string; currentFolderId: string | null }
    | { type: "folder"; id: string; currentParentId: string | null; hasChildren: boolean }
    | null
  >(null);

  useFocusEffect(
    useCallback(() => {
      fetchDecks();
      fetchAllDueCards();
      fetchFolders();
    }, [fetchDecks, fetchAllDueCards, fetchFolders])
  );

  const dueByDeck = useMemo(
    () =>
      dueCards.reduce<Record<string, number>>((acc, card) => {
        acc[card.deck_id] = (acc[card.deck_id] || 0) + 1;
        return acc;
      }, {}),
    [dueCards]
  );

  const childFolders = useMemo(
    () =>
      folders
        .filter((f) => f.parent_folder_id === parentFolderId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [folders, parentFolderId]
  );

  const childDecks = useMemo(
    () =>
      decks
        .filter((d) => !d.is_error_deck && d.folder_id === parentFolderId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [decks, parentFolderId]
  );

  const folderDeckCount = useCallback(
    (folderId: string) => {
      const direct = decks.filter((d) => !d.is_error_deck && d.folder_id === folderId).length;
      const subIds = folders.filter((f) => f.parent_folder_id === folderId).map((f) => f.id);
      const indirect = decks.filter((d) => !d.is_error_deck && d.folder_id && subIds.includes(d.folder_id)).length;
      return direct + indirect;
    },
    [decks, folders]
  );

  const folderSubfolderCount = useCallback(
    (folderId: string) => folders.filter((f) => f.parent_folder_id === folderId).length,
    [folders]
  );

  const confirmDeleteDeck = (deck: Deck) => {
    Alert.alert(
      "Excluir deck?",
      "Todos os flashcards deste deck serão excluídos permanentemente.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => deleteDeck(deck.id) },
      ]
    );
  };

  const confirmDeleteFolder = (folder: Folder) => {
    const subCount = folderSubfolderCount(folder.id);
    const deckCount = folderDeckCount(folder.id);
    const parts: string[] = [];
    if (subCount > 0) parts.push(`${subCount} ${subCount === 1 ? "subpasta" : "subpastas"}`);
    if (deckCount > 0) parts.push(`${deckCount} ${deckCount === 1 ? "deck" : "decks"}`);
    const detail =
      parts.length === 0
        ? "Esta pasta está vazia."
        : `Esta pasta contém ${parts.join(" e ")}. Tudo dentro dela será excluído permanentemente.`;

    Alert.alert("Excluir pasta?", detail, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir tudo",
        style: "destructive",
        onPress: async () => {
          const res = await deleteFolder(folder.id);
          if (res.error) Alert.alert("Erro", "Não foi possível excluir a pasta.");
          await Promise.all([fetchDecks(), fetchFolders()]);
        },
      },
    ]);
  };

  const deckActions = (deck: Deck): ItemAction[] => [
    {
      key: "move",
      label: "Mover para pasta...",
      icon: "folder-open-outline",
      onPress: () => setMovingItem({ type: "deck", id: deck.id, currentFolderId: deck.folder_id }),
    },
    {
      key: "delete",
      label: "Excluir deck",
      icon: "trash-outline",
      destructive: true,
      onPress: () => confirmDeleteDeck(deck),
    },
  ];

  const folderActions = (folder: Folder): ItemAction[] => {
    const hasChildren = folderSubfolderCount(folder.id) > 0;
    return [
      {
        key: "edit",
        label: "Renomear / Cor / Ícone",
        icon: "create-outline",
        onPress: () => setEditingFolder(folder),
      },
      {
        key: "move",
        label: "Mover para pasta...",
        icon: "folder-open-outline",
        onPress: () =>
          setMovingItem({
            type: "folder",
            id: folder.id,
            currentParentId: folder.parent_folder_id,
            hasChildren,
          }),
      },
      {
        key: "delete",
        label: "Excluir pasta",
        icon: "trash-outline",
        destructive: true,
        onPress: () => confirmDeleteFolder(folder),
      },
    ];
  };

  const renderRightActions = (onDelete: () => void) => (
    <Pressable onPress={onDelete} style={[styles.swipeAction, styles.deleteAction]}>
      <Ionicons name="trash" size={18} color="#fff" />
      <Text style={styles.swipeActionText}>Excluir</Text>
    </Pressable>
  );

  const isEmpty = childFolders.length === 0 && childDecks.length === 0;

  return (
    <View style={styles.wrap}>
      {isEmpty ? (
        <EmptyState
          icon="folder-open-outline"
          title="Nada por aqui ainda"
          description={
            deckOnlyEmptyCopy
              ? "Crie um deck para começar a estudar."
              : "Crie uma pasta para organizar seus decks ou um deck direto."
          }
          actionLabel={onRequestCreate ? "Criar..." : undefined}
          onAction={onRequestCreate}
        />
      ) : (
        <>
          {childFolders.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Pastas</Text>
              {childFolders.map((folder) => (
                <Swipeable
                  key={folder.id}
                  renderRightActions={() => renderRightActions(() => confirmDeleteFolder(folder))}
                  overshootRight={false}
                >
                  <FolderCard
                    folder={folder}
                    deckCount={folderDeckCount(folder.id)}
                    subfolderCount={folderSubfolderCount(folder.id)}
                    onPress={() => router.push(`/folder/${folder.id}`)}
                    onLongPress={() => setActionTarget({ type: "folder", folder })}
                  />
                </Swipeable>
              ))}
            </>
          )}

          {childDecks.length > 0 && (
            <>
              {childFolders.length > 0 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Decks</Text>
              {childDecks.map((deck) => (
                <Swipeable
                  key={deck.id}
                  renderRightActions={() => renderRightActions(() => confirmDeleteDeck(deck))}
                  overshootRight={false}
                >
                  <DeckCard
                    deck={deck}
                    dueCount={dueByDeck[deck.id] || 0}
                    onPress={() => router.push(`/deck/${deck.id}`)}
                    onLongPress={() => setActionTarget({ type: "deck", deck })}
                  />
                </Swipeable>
              ))}
            </>
          )}
        </>
      )}

      <FolderFormModal
        visible={!!editingFolder}
        initialFolder={editingFolder}
        onClose={() => setEditingFolder(null)}
        onSubmit={async (name, color, icon) => {
          if (editingFolder) {
            await updateFolder(editingFolder.id, { name, color, icon });
          }
          setEditingFolder(null);
        }}
      />

      <ItemActionsSheet
        visible={!!actionTarget}
        itemName={
          actionTarget?.type === "deck"
            ? actionTarget.deck.title
            : actionTarget?.type === "folder"
              ? actionTarget.folder.name
              : ""
        }
        itemIcon={
          actionTarget?.type === "folder"
            ? ((actionTarget.folder.icon as keyof typeof Ionicons.glyphMap) || "folder")
            : "layers"
        }
        itemColor={
          actionTarget?.type === "deck"
            ? actionTarget.deck.color
            : actionTarget?.type === "folder"
              ? actionTarget.folder.color
              : undefined
        }
        actions={
          actionTarget?.type === "deck"
            ? deckActions(actionTarget.deck)
            : actionTarget?.type === "folder"
              ? folderActions(actionTarget.folder)
              : []
        }
        onClose={() => setActionTarget(null)}
      />

      <MoveToFolderModal
        visible={!!movingItem}
        folders={folders}
        currentParentId={
          movingItem?.type === "deck"
            ? movingItem.currentFolderId
            : movingItem?.type === "folder"
              ? movingItem.currentParentId
              : null
        }
        movingFolderId={movingItem?.type === "folder" ? movingItem.id : null}
        forceRootOnly={movingItem?.type === "folder" && movingItem.hasChildren}
        title={movingItem?.type === "folder" ? "Mover pasta para..." : "Mover deck para..."}
        onClose={() => setMovingItem(null)}
        onSelect={async (folderId) => {
          if (!movingItem) return;
          if (movingItem.type === "deck") {
            await moveDeck(movingItem.id, folderId);
          } else {
            const res = await moveFolder(movingItem.id, folderId);
            if (res.error === "depth_limit") {
              Alert.alert(
                "Não é possível mover",
                "Esta pasta tem subpastas e só pode ficar na raiz."
              );
            } else if (res.error) {
              Alert.alert("Erro", "Não foi possível mover a pasta.");
            }
          }
          setMovingItem(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    marginTop: 8,
    marginBottom: 12,
  },
  swipeAction: {
    width: 104,
    marginBottom: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  deleteAction: {
    backgroundColor: "#dc2626",
  },
  swipeActionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});

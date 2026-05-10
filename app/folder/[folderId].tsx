import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  RefreshControl,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../constants/theme";
import { useFoldersStore } from "../../stores/foldersStore";
import { useDecksStore } from "../../stores/decksStore";
import { ScreenContainer } from "../../components/ScreenContainer";
import { FolderContents } from "../../components/FolderContents";
import { CreateOptionsSheet } from "../../components/CreateOptionsSheet";
import { FolderFormModal } from "../../components/FolderFormModal";
import { Button } from "../../components/Button";
import { DeckColors } from "../../constants/colors";
import { useLayout, MAX_MODAL_WIDTH } from "../../hooks/useLayout";

export default function FolderDetailScreen() {
  const colors = useThemeColors();
  const { isTablet } = useLayout();
  const { folderId } = useLocalSearchParams<{ folderId: string }>();
  const { folders, createFolder, fetchFolders } = useFoldersStore();
  const { createDeck, fetchDecks, fetchAllDueCards } = useDecksStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [deckTitle, setDeckTitle] = useState("");
  const [deckSubject, setDeckSubject] = useState("");
  const [deckColor, setDeckColor] = useState(DeckColors[0]);

  const folder = folders.find((f) => f.id === folderId);
  const isRootFolder = folder ? folder.parent_folder_id === null : true;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchFolders(), fetchDecks(), fetchAllDueCards()]);
    setRefreshing(false);
  };

  const handleCreateFolder = async (name: string, color: string, icon: string) => {
    if (!folder) return;
    const created = await createFolder(name, folder.id, color, icon);
    if (!created) {
      Alert.alert("Erro", "Não foi possível criar a pasta.");
      return;
    }
    setShowFolderForm(false);
  };

  const handleCreateDeck = async () => {
    if (!folder || !deckTitle.trim()) {
      Alert.alert("Erro", "Insira o nome do deck.");
      return;
    }
    const deck = await createDeck(deckTitle.trim(), deckSubject.trim() || undefined, deckColor, folder.id);
    if (!deck) {
      Alert.alert("Erro", "Não foi possível criar o deck.");
      return;
    }
    setDeckTitle("");
    setDeckSubject("");
    setDeckColor(DeckColors[0]);
    setShowDeckModal(false);
  };

  if (!folder) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <ScreenContainer>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.title, { color: colors.text }]}>Pasta</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.notFound}>
            <Ionicons name="alert-circle" size={32} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary }}>Pasta não encontrada.</Text>
          </View>
        </ScreenContainer>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenContainer>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.titleRow}>
            <View style={[styles.iconWrap, { backgroundColor: folder.color + "22" }]}>
              <Ionicons
                name={(folder.icon as keyof typeof Ionicons.glyphMap) || "folder"}
                size={18}
                color={folder.color}
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {folder.name}
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          <FolderContents
            parentFolderId={folder.id}
            deckOnlyEmptyCopy={!isRootFolder}
            onRequestCreate={() => setShowCreateSheet(true)}
          />
        </ScrollView>

        <Pressable
          onPress={() => setShowCreateSheet(true)}
          style={[styles.fab, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>

        <CreateOptionsSheet
          visible={showCreateSheet}
          allowFolder={isRootFolder}
          onClose={() => setShowCreateSheet(false)}
          onCreateFolder={() => {
            setShowCreateSheet(false);
            setTimeout(() => setShowFolderForm(true), 200);
          }}
          onCreateDeck={() => {
            setShowCreateSheet(false);
            setTimeout(() => setShowDeckModal(true), 200);
          }}
        />

        <FolderFormModal
          visible={showFolderForm}
          onClose={() => setShowFolderForm(false)}
          onSubmit={handleCreateFolder}
        />

        <Modal visible={showDeckModal} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <Pressable style={[styles.modalOverlay, isTablet && styles.modalOverlayTablet]} onPress={Keyboard.dismiss}>
              <Pressable style={[styles.modalContent, isTablet && styles.modalContentTablet, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Novo Deck</Text>
                <TextInput
                  value={deckTitle}
                  onChangeText={setDeckTitle}
                  placeholder="Nome do deck"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                />
                <TextInput
                  value={deckSubject}
                  onChangeText={setDeckSubject}
                  placeholder="Matéria (opcional)"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                />
                <Text style={[styles.colorLabel, { color: colors.textSecondary }]}>Cor:</Text>
                <View style={styles.colorRow}>
                  {DeckColors.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setDeckColor(c)}
                      style={[
                        styles.colorDot,
                        { backgroundColor: c },
                        deckColor === c && styles.colorDotSelected,
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.modalButtons}>
                  <Button title="Cancelar" variant="ghost" onPress={() => setShowDeckModal(false)} />
                  <Button title="Criar" onPress={handleCreateDeck} />
                </View>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>
      </ScreenContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  titleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "700", flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  notFound: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalOverlayTablet: { justifyContent: "center", paddingHorizontal: 32 },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 12,
  },
  modalContentTablet: {
    borderRadius: 20,
    maxWidth: MAX_MODAL_WIDTH,
    alignSelf: "center",
    width: "100%",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  colorLabel: { fontSize: 13, fontWeight: "500", marginTop: 4 },
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
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
});

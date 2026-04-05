import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../constants/theme";
import { useDecksStore } from "../../stores/decksStore";
import { DeckCard } from "../../components/DeckCard";
import { EmptyState } from "../../components/EmptyState";
import { Button } from "../../components/Button";
import { DeckColors } from "../../constants/colors";

export default function DecksScreen() {
  const colors = useThemeColors();
  const { decks, loading, fetchDecks, createDeck } = useDecksStore();
  const { dueCards, fetchAllDueCards } = useDecksStore();
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedColor, setSelectedColor] = useState(DeckColors[0]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDecks();
    fetchAllDueCards();
  }, [fetchDecks, fetchAllDueCards]);

  const dueByDeck = dueCards.reduce<Record<string, number>>((acc, card) => {
    acc[card.deck_id] = (acc[card.deck_id] || 0) + 1;
    return acc;
  }, {});

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchDecks(), fetchAllDueCards()]);
    setRefreshing(false);
  }, [fetchDecks, fetchAllDueCards]);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Erro", "Insira o nome do deck.");
      return;
    }
    const deck = await createDeck(title.trim(), subject.trim() || undefined, selectedColor);
    if (!deck) {
      Alert.alert("Erro", "Não foi possível criar o deck. Tente novamente.");
      return;
    }
    setTitle("");
    setSubject("");
    setSelectedColor(DeckColors[0]);
    setShowModal(false);
    fetchDecks();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Meus Decks</Text>
      </View>

      <FlatList
        data={decks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="library-outline"
            title="Nenhum deck criado"
            description="Crie seu primeiro deck para organizar seus flashcards."
            actionLabel="Criar primeiro deck"
            onAction={() => setShowModal(true)}
          />
        }
        renderItem={({ item }) => (
          <DeckCard
            deck={item}
            dueCount={dueByDeck[item.id] || 0}
            onPress={() => router.push(`/deck/${item.id}`)}
          />
        )}
      />

      {/* FAB */}
      <Pressable
        onPress={() => setShowModal(true)}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Create Deck Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Novo Deck</Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Nome do deck"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            />
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="Matéria (opcional)"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            />

            <Text style={[styles.colorLabel, { color: colors.textSecondary }]}>Cor:</Text>
            <View style={styles.colorRow}>
              {DeckColors.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    selectedColor === c && styles.colorDotSelected,
                  ]}
                />
              ))}
            </View>

            <View style={styles.modalButtons}>
              <Button title="Cancelar" variant="ghost" onPress={() => setShowModal(false)} />
              <Button title="Criar" onPress={handleCreate} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: "700" },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 12,
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
  colorRow: { flexDirection: "row", gap: 10 },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
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

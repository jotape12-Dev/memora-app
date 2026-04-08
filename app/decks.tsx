import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../constants/theme";
import { useDecksStore } from "../stores/decksStore";
import { DeckCard } from "../components/DeckCard";
import { EmptyState } from "../components/EmptyState";
import { Button } from "../components/Button";
import { DeckColors } from "../constants/colors";
import type { Deck } from "../types/database";

export default function DecksScreen() {
  const colors = useThemeColors();
  const { decks, dueCards, fetchDecks, fetchAllDueCards, createDeck } = useDecksStore();

  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedColor, setSelectedColor] = useState(DeckColors[0]);

  const dueByDeck = dueCards.reduce<Record<string, number>>((acc, card) => {
    acc[card.deck_id] = (acc[card.deck_id] || 0) + 1;
    return acc;
  }, {});

  // Sort error deck to top
  const sortedDecks = [...decks].sort((a, b) => {
    if (a.is_error_deck && !b.is_error_deck) return -1;
    if (!a.is_error_deck && b.is_error_deck) return 1;
    return 0;
  });

  const filtered = search.trim()
    ? sortedDecks.filter(
        (d) =>
          d.title.toLowerCase().includes(search.toLowerCase()) ||
          d.subject?.toLowerCase().includes(search.toLowerCase())
      )
    : sortedDecks;

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
      Alert.alert("Erro", "Não foi possível criar o deck.");
      return;
    }
    setTitle("");
    setSubject("");
    setSelectedColor(DeckColors[0]);
    setShowModal(false);
  };

  const totalCards = decks.reduce((sum, d) => sum + d.card_count, 0);
  const totalDue = dueCards.length;

  const renderDeck = ({ item }: { item: Deck }) => (
    <DeckCard
      deck={item}
      dueCount={dueByDeck[item.id] || 0}
      onPress={() => router.push(`/deck/${item.id}`)}
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Meus Decks</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Summary bar */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="library" size={18} color="#7c3aed" />
          <Text style={[styles.summaryNum, { color: colors.text }]}>{decks.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>decks</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="layers" size={18} color={colors.primary} />
          <Text style={[styles.summaryNum, { color: colors.text }]}>{totalCards}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>cards totais</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="time" size={18} color="#f59e0b" />
          <Text style={[styles.summaryNum, { color: colors.text }]}>{totalDue}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>pendentes</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar deck..."
          placeholderTextColor={colors.textSecondary}
          style={[styles.searchInput, { color: colors.text }]}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderDeck}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          search.trim() ? (
            <View style={styles.noResults}>
              <Ionicons name="search" size={32} color={colors.textSecondary} />
              <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                Nenhum deck encontrado para "{search}"
              </Text>
            </View>
          ) : (
            <EmptyState
              icon="library-outline"
              title="Nenhum deck ainda"
              description="Crie seu primeiro deck e comece a estudar com flashcards inteligentes."
              actionLabel="Criar deck"
              onAction={() => setShowModal(true)}
            />
          )
        }
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable style={styles.modalOverlay} onPress={Keyboard.dismiss}>
            <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]}>
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
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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
  },
  title: { fontSize: 20, fontWeight: "700" },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 14,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
  },
  summaryNum: { fontSize: 18, fontWeight: "700" },
  summaryLabel: { fontSize: 11 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  noResults: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  noResultsText: { fontSize: 14, textAlign: "center" },
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

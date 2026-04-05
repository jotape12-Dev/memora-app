import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../constants/theme";
import { useDecksStore } from "../../stores/decksStore";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { DismissKeyboard } from "../../components/DismissKeyboard";
import type { Flashcard } from "../../types/database";

export default function DeckDetailScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const colors = useThemeColors();
  const { decks, deleteDeck } = useDecksStore();
  const {
    flashcards,
    deckDueCards,
    loading,
    fetchFlashcardsByDeck,
    fetchDueCards,
    addFlashcard,
    deleteFlashcard,
  } = useDecksStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const deck = decks.find((d) => d.id === deckId);
  const dueCount = deckDueCards.length;

  useEffect(() => {
    if (deckId) {
      fetchFlashcardsByDeck(deckId);
      fetchDueCards(deckId);
    }
  }, [deckId, fetchFlashcardsByDeck, fetchDueCards]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (deckId) {
      await Promise.all([fetchFlashcardsByDeck(deckId), fetchDueCards(deckId)]);
    }
    setRefreshing(false);
  }, [deckId, fetchFlashcardsByDeck, fetchDueCards]);

  const handleAddCard = async () => {
    if (!question.trim() || !answer.trim()) {
      Alert.alert("Erro", "Preencha pergunta e resposta.");
      return;
    }
    await addFlashcard(deckId!, question.trim(), answer.trim());
    setQuestion("");
    setAnswer("");
    setShowAddModal(false);
  };

  const handleDeleteCard = (card: Flashcard) => {
    Alert.alert("Excluir card?", `"${card.question.substring(0, 50)}..."`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => deleteFlashcard(card.id) },
    ]);
  };

  const handleDeleteDeck = () => {
    Alert.alert(
      "Excluir deck?",
      "Todos os flashcards deste deck serão excluídos permanentemente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await deleteDeck(deckId!);
            router.back();
          },
        },
      ]
    );
  };

  const renderCard = ({ item }: { item: Flashcard }) => {
    const isDue = item.next_review_at <= new Date().toISOString().split("T")[0];
    return (
      <Pressable
        onLongPress={() => handleDeleteCard(item)}
        style={[styles.cardItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardContent}>
          <Text style={[styles.cardQuestion, { color: colors.text }]} numberOfLines={2}>
            {item.question}
          </Text>
          <Text style={[styles.cardAnswer, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.answer}
          </Text>
        </View>
        {isDue && (
          <View style={[styles.dueIndicator, { backgroundColor: colors.primary }]}>
            <Text style={styles.dueText}>Pendente</Text>
          </View>
        )}
      </Pressable>
    );
  };

  if (!deck) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <Text style={{ color: colors.text }}>Deck não encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {deck.title}
          </Text>
          {deck.subject && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{deck.subject}</Text>
          )}
        </View>
        <Pressable onPress={handleDeleteDeck}>
          <Ionicons name="trash-outline" size={22} color={colors.error} />
        </Pressable>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={[styles.stat, { backgroundColor: colors.surface }]}>
          <Ionicons name="layers" size={16} color={colors.primary} />
          <Text style={[styles.statText, { color: colors.text }]}>{deck.card_count} {deck.card_count === 1 ? "card" : "cards"}</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: colors.surface }]}>
          <Ionicons name="time" size={16} color="#f59e0b" />
          <Text style={[styles.statText, { color: colors.text }]}>{dueCount} pendentes</Text>
        </View>
      </View>

      {/* Review Button */}
      {dueCount > 0 && (
        <View style={styles.reviewSection}>
          <Button
            title={`Iniciar Revisão (${dueCount} cards)`}
            onPress={() => router.push(`/review/${deckId}`)}
            icon={<Ionicons name="play" size={18} color="#fff" />}
          />
        </View>
      )}

      {/* Cards List */}
      <FlatList
        data={flashcards}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="Nenhum flashcard"
            description="Adicione cards manualmente ou gere com IA a partir de um texto ou imagem."
            actionLabel="Gerar com IA"
            onAction={() => router.push({ pathname: "/capture", params: { deckId } })}
            secondaryActionLabel="Adicionar manualmente"
            onSecondaryAction={() => setShowAddModal(true)}
          />
        }
        renderItem={renderCard}
      />

      {/* FABs */}
      <Pressable
        onPress={() => router.push({ pathname: "/capture", params: { deckId } })}
        style={[styles.fabSecondary, { backgroundColor: colors.surface, borderColor: colors.primary }]}
      >
        <Ionicons name="sparkles" size={22} color={colors.primary} />
      </Pressable>
      <Pressable
        onPress={() => setShowAddModal(true)}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Add Card Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable style={styles.modalOverlay} onPress={Keyboard.dismiss}>
            <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Novo Flashcard</Text>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="Pergunta"
                placeholderTextColor={colors.textSecondary}
                multiline
                style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              />
              <TextInput
                value={answer}
                onChangeText={setAnswer}
                placeholder="Resposta"
                placeholderTextColor={colors.textSecondary}
                multiline
                style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              />
              <View style={styles.modalButtons}>
                <Button title="Cancelar" variant="ghost" onPress={() => setShowAddModal(false)} />
                <Button title="Adicionar" onPress={handleAddCard} />
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  headerCenter: { flex: 1 },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  statsBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 12,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statText: { fontSize: 13, fontWeight: "500" },
  reviewSection: { paddingHorizontal: 20, marginBottom: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  cardItem: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  cardContent: { flex: 1 },
  cardQuestion: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  cardAnswer: { fontSize: 12 },
  dueIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  dueText: { color: "#fff", fontSize: 10, fontWeight: "600" },
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
  fabSecondary: {
    position: "absolute",
    bottom: 92,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
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
  modalTitle: { fontSize: 20, fontWeight: "700" },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
});

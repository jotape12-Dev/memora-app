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
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { useThemeColors } from "../../constants/theme";
import { useDecksStore } from "../../stores/decksStore";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import type { Flashcard, DeckStats } from "../../types/database";

export default function DeckDetailScreen() {
  const { deckId, from } = useLocalSearchParams<{ deckId: string; from?: string }>();
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
  const [stats, setStats] = useState<DeckStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const deck = decks.find((d) => d.id === deckId);
  const isErrorDeck = deck?.is_error_deck ?? false;
  const hasCards = flashcards.length > 0;
  const dueCount = deckDueCards.length;

  const handleBack = () => {
    if (from === "generated") {
      router.replace("/(tabs)");
      return;
    }
    router.back();
  };

  const fetchStats = useCallback(async () => {
    if (!deckId) return;
    setStatsLoading(true);
    const { data, error } = await supabase.rpc("get_deck_stats", { p_deck_id: deckId });
    if (!error && data) {
      setStats(data as DeckStats);
    }
    setStatsLoading(false);
  }, [deckId]);

  useEffect(() => {
    if (deckId) {
      fetchFlashcardsByDeck(deckId);
      fetchDueCards(deckId);
      fetchStats();
    }
  }, [deckId, fetchFlashcardsByDeck, fetchDueCards, fetchStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (deckId) {
      await Promise.all([fetchFlashcardsByDeck(deckId), fetchDueCards(deckId), fetchStats()]);
    }
    setRefreshing(false);
  }, [deckId, fetchFlashcardsByDeck, fetchDueCards, fetchStats]);

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

  const renderDeleteCardAction = (card: Flashcard) => (
    <Pressable
      onPress={() => handleDeleteCard(card)}
      style={[styles.swipeAction, styles.deleteAction]}
    >
      <Ionicons name="trash" size={18} color="#fff" />
      <Text style={styles.swipeActionText}>Excluir</Text>
    </Pressable>
  );

  const handleDeleteDeck = () => {
    if (isErrorDeck) return;
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
            handleBack();
          },
        },
      ]
    );
  };

  const renderCard = ({ item }: { item: Flashcard }) => {
    const isDue = item.next_review_at <= new Date().toISOString().split("T")[0];
    return (
      <Swipeable renderRightActions={() => renderDeleteCardAction(item)} overshootRight={false}>
        <Pressable style={[styles.cardItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardContent}>
            <Text style={[styles.cardQuestion, { color: colors.text }]} numberOfLines={2}>
              {item.question}
            </Text>
            <Text style={[styles.cardAnswer, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.answer}
            </Text>
          </View>
          {isDue && (
            <View style={[styles.dueIndicator, { backgroundColor: isErrorDeck ? deck?.color : colors.primary }]}>
              <Text style={styles.dueText}>Pendente</Text>
            </View>
          )}
        </Pressable>
      </Swipeable>
    );
  };

  // Build 7-day chart bars
  const maxBarHeight = 48;
  const weekDays = buildWeekChart(stats?.daily_stats ?? []);
  const maxCount = Math.max(...weekDays.map((d) => d.count), 1);

  const renderStatsSection = () => {
    if (statsLoading && !stats) {
      return (
        <View style={styles.statsLoadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    if (!stats) return null;

    return (
      <View style={styles.statsSection}>
        <Pressable
          onPress={() => setShowStats((v) => !v)}
          style={[styles.statsToggle, { borderColor: colors.border }]}
        >
          <Ionicons name="stats-chart" size={18} color={colors.primary} />
          <Text style={[styles.statsToggleText, { color: colors.text }]}>Estatísticas</Text>
          <Ionicons
            name={showStats ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>

        {showStats && (
          <View style={[styles.statsContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* KPI row */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiValue, { color: colors.text }]}>{stats.total_reviews}</Text>
                <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Revisões</Text>
              </View>
              <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiValue, { color: colors.text }]}>{stats.accuracy}%</Text>
                <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Precisão</Text>
              </View>
              <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiValue, { color: colors.text }]}>{stats.total_correct}</Text>
                <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Acertos</Text>
              </View>
            </View>

            {/* 7-day chart */}
            <Text style={[styles.chartTitle, { color: colors.textSecondary }]}>Últimos 7 dias</Text>
            <View style={styles.chartRow}>
              {weekDays.map((day) => (
                <View key={day.label} style={styles.chartCol}>
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: day.count > 0 ? Math.max((day.count / maxCount) * maxBarHeight, 4) : 4,
                        backgroundColor: day.count > 0 ? colors.primary : colors.border,
                        borderRadius: 3,
                      },
                    ]}
                  />
                  <Text style={[styles.chartLabel, { color: colors.textSecondary }]}>{day.label}</Text>
                </View>
              ))}
            </View>

            {/* Hardest cards */}
            {stats.hardest_cards.length > 0 && (
              <>
                <Text style={[styles.chartTitle, { color: colors.textSecondary, marginTop: 16 }]}>
                  Cards mais difíceis
                </Text>
                {stats.hardest_cards.map((card) => (
                  <View
                    key={card.id}
                    style={[styles.hardCard, { borderColor: colors.border }]}
                  >
                    <Ionicons name="warning" size={14} color={colors.error} />
                    <Text
                      style={[styles.hardCardText, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {card.question}
                    </Text>
                    <Text style={[styles.hardCardEase, { color: colors.textSecondary }]}>
                      {card.ease_factor.toFixed(1)}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </View>
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
        <Pressable onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.titleRow}>
            {isErrorDeck && (
              <Ionicons name="alert-circle" size={20} color={deck.color} />
            )}
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {deck.title}
            </Text>
          </View>
          {deck.subject && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{deck.subject}</Text>
          )}
        </View>
        {!isErrorDeck && (
          <Pressable onPress={handleDeleteDeck}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </Pressable>
        )}
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={[styles.stat, { backgroundColor: colors.surface }]}>
          <Ionicons name="layers" size={16} color={colors.primary} />
          <Text style={[styles.statText, { color: colors.text }]}>
            {isErrorDeck ? flashcards.length : deck.card_count} {(isErrorDeck ? flashcards.length : deck.card_count) === 1 ? "card" : "cards"}
          </Text>
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

      {/* Deck Stats (Feature 2) */}
      {renderStatsSection()}

      {/* Cards List */}
      <FlatList
        data={flashcards}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, !isErrorDeck && !hasCards && styles.listWithoutFab]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          isErrorDeck ? (
            <EmptyState
              icon="checkmark-circle-outline"
              title="Nenhum card com erro"
              description="Cards que você errar durante as revisões aparecerão aqui automaticamente."
            />
          ) : (
            <EmptyState
              icon="document-text-outline"
              title="Nenhum flashcard"
              description="Adicione cards manualmente ou gere com IA a partir de um texto ou imagem."
              actionLabel="Gerar com IA"
              onAction={() => router.push({ pathname: "/capture", params: { deckId } })}
              secondaryActionLabel="Adicionar manualmente"
              onSecondaryAction={() => setShowAddModal(true)}
            />
          )
        }
        renderItem={renderCard}
      />

      {/* FABs — hide for error deck */}
      {!isErrorDeck && hasCards && (
        <>
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
        </>
      )}

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

function buildWeekChart(dailyStats: Array<{ date: string; count: number }>): Array<{ label: string; count: number }> {
  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const result: Array<{ label: string; count: number }> = [];
  const statsMap = new Map(dailyStats.map((s) => [s.date, s.count]));

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    result.push({
      label: dayLabels[d.getDay()],
      count: statsMap.get(key) ?? 0,
    });
  }
  return result;
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: { fontSize: 20, fontWeight: "700", flex: 1 },
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
  // Stats section
  statsSection: { paddingHorizontal: 20, marginBottom: 12 },
  statsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  statsToggleText: { flex: 1, fontSize: 15, fontWeight: "600" },
  statsLoadingContainer: { paddingHorizontal: 20, paddingVertical: 16, alignItems: "center" },
  statsContent: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 4,
  },
  kpiRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  kpiItem: { alignItems: "center", flex: 1 },
  kpiValue: { fontSize: 20, fontWeight: "700" },
  kpiLabel: { fontSize: 11, marginTop: 2 },
  kpiDivider: { width: 1, height: 32 },
  chartTitle: { fontSize: 12, fontWeight: "500", marginBottom: 8 },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 64,
  },
  chartCol: { alignItems: "center", flex: 1, gap: 4 },
  chartBar: { width: 20 },
  chartLabel: { fontSize: 10 },
  hardCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  hardCardText: { flex: 1, fontSize: 13 },
  hardCardEase: { fontSize: 12 },
  // Cards list
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  listWithoutFab: { paddingBottom: 24 },
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
  swipeAction: {
    width: 104,
    marginBottom: 8,
    borderRadius: 10,
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

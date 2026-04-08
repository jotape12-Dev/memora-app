import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { useDecksStore } from "../../stores/decksStore";
import { useReviewStore } from "../../stores/reviewStore";
import { useThemeColors } from "../../constants/theme";
import { GenerationLimitBadge } from "../../components/GenerationLimitBadge";
import { EmptyState } from "../../components/EmptyState";
import { DeckCard } from "../../components/DeckCard";
import { Button } from "../../components/Button";
import { DeckColors } from "../../constants/colors";
import { supabase } from "../../lib/supabase";
import type { HomeStats } from "../../types/database";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}min`;
  return `${mins} min`;
}

export default function HomeScreen() {
  const colors = useThemeColors();
  const profile = useAuthStore((s) => s.profile);
  const { decks, fetchDecks, createDeck, ensureErrorDeck, errorDeckCardCount, fetchErrorDeckCount } = useDecksStore();
  const { dueCards, fetchAllDueCards } = useDecksStore();
  const { streak, activeDays, calculateStreak } = useReviewStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedColor, setSelectedColor] = useState(DeckColors[0]);
  const [homeStats, setHomeStats] = useState<HomeStats | null>(null);

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

  const fetchHomeStats = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_home_stats", { p_days: 7 });
    if (!error && data) {
      setHomeStats(data as HomeStats);
    }
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchDecks(),
      fetchAllDueCards(),
      calculateStreak(),
      fetchHomeStats(),
    ]);
    // Ensure error deck exists and count is loaded
    await ensureErrorDeck();
    await fetchErrorDeckCount();
  }, [fetchDecks, fetchAllDueCards, calculateStreak, fetchHomeStats, ensureErrorDeck, fetchErrorDeckCount]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Group due cards by deck
  const dueByDeck = dueCards.reduce<Record<string, number>>((acc, card) => {
    acc[card.deck_id] = (acc[card.deck_id] || 0) + 1;
    return acc;
  }, {});

  // Find deck with most due cards for "Review now" button
  const topDeckId = Object.entries(dueByDeck).sort(([, a], [, b]) => b - a)[0]?.[0];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  // Sort decks: error deck first, then by created_at desc
  const sortedDecks = [...decks].sort((a, b) => {
    if (a.is_error_deck && !b.is_error_deck) return -1;
    if (!a.is_error_deck && b.is_error_deck) return 1;
    return b.created_at.localeCompare(a.created_at);
  });

  // Error deck banner
  const errorDeck = decks.find((d) => d.is_error_deck);

  // Today's accuracy
  const todayAccuracy = homeStats && homeStats.today_reviewed > 0
    ? Math.round((homeStats.today_correct / homeStats.today_reviewed) * 100)
    : 0;

  // Streak status
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const reviewedToday = activeDays.includes(today);
  const streakLost = activeDays.length > 0 && !reviewedToday && !activeDays.includes(yesterday) && streak === 0;

  // 7-day chart data
  const chartData = buildWeekChart(homeStats?.daily_stats ?? []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Error Deck Alert Banner */}
        {errorDeck && errorDeckCardCount > 0 && (
          <Pressable
            onPress={() => router.push(`/deck/${errorDeck.id}`)}
            style={[styles.errorBanner, { backgroundColor: "#fce4ec" }]}
          >
            <Ionicons name="alert-circle" size={20} color="#a12c7b" />
            <Text style={styles.errorBannerText}>
              Você tem {errorDeckCardCount} {errorDeckCardCount === 1 ? "card" : "cards"} para revisar urgentemente
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#a12c7b" />
          </Pressable>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {greeting()},
            </Text>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]}>
                {profile?.display_name || "Estudante"}
              </Text>
              {profile?.is_premium && (
                <FontAwesome5 name="crown" size={16} color="#f59e0b" />
              )}
            </View>
            {profile?.goal_title && (
              <Text style={[styles.goalSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                Estudando para: {profile.goal_title}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <GenerationLimitBadge />
            <Pressable
              onPress={() => router.push("/profile")}
              style={[styles.profileBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.profileBtnText}>
                {(profile?.display_name || "U").charAt(0).toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Stats — horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiRow}
        >
          <Pressable
            onPress={() => router.push("/streak")}
            style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="flame" size={22} color={streakLost ? colors.error : "#f59e0b"} />
            <Text style={[styles.kpiNumber, { color: streakLost ? colors.error : colors.text }]}>{streak}</Text>
            <Text style={[styles.kpiLabel, { color: streakLost ? colors.error : colors.textSecondary }]}>
              {streakLost ? "Streak perdido" : streak === 1 ? "dia seguido" : "dias seguidos"}
            </Text>
          </Pressable>

          <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="timer-outline" size={22} color={colors.primary} />
            <Text style={[styles.kpiNumber, { color: colors.text }]}>
              {formatDuration(homeStats?.today_duration ?? 0)}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>estudado hoje</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="checkmark-done" size={22} color="#22c55e" />
            <Text style={[styles.kpiNumber, { color: colors.text }]}>{homeStats?.today_reviewed ?? 0}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>revisados hoje</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="analytics" size={22} color="#7c3aed" />
            <Text style={[styles.kpiNumber, { color: colors.text }]}>{todayAccuracy}%</Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>acerto hoje</Text>
          </View>

          <Pressable
            onPress={() => router.push("/decks")}
            style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="library" size={22} color="#7c3aed" />
            <Text style={[styles.kpiNumber, { color: colors.text }]}>{decks.filter((d) => !d.is_error_deck).length}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>decks</Text>
          </Pressable>
        </ScrollView>

        {/* Weekly Chart */}
        {chartData.maxCount > 0 && (
          <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Últimos 7 dias</Text>
            <View style={styles.chartBars}>
              {chartData.days.map((day) => {
                const barHeight = chartData.maxCount > 0
                  ? Math.max(4, (day.count / chartData.maxCount) * 80)
                  : 4;
                const isMax = day.count === chartData.maxCount && day.count > 0;
                const isToday = day.date === today;
                return (
                  <View key={day.date} style={styles.chartCol}>
                    <Text style={[styles.chartCount, { color: colors.textSecondary }]}>
                      {day.count > 0 ? day.count : ""}
                    </Text>
                    <View
                      style={[
                        styles.chartBar,
                        {
                          height: barHeight,
                          backgroundColor: isMax ? colors.primary : `${colors.primary}66`,
                          borderRadius: 4,
                        },
                      ]}
                    />
                    <Text style={[
                      styles.chartLabel,
                      { color: isToday ? colors.primary : colors.textSecondary },
                      isToday && { fontWeight: "700" },
                    ]}>
                      {isToday ? "Hoje" : day.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Review Now Button */}
        {dueCards.length > 0 && topDeckId && (
          <Pressable
            onPress={() => router.push(`/review/${topDeckId}`)}
            style={[styles.reviewButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="play-circle" size={24} color="#fff" />
            <View>
              <Text style={styles.reviewButtonTitle}>Revisar agora</Text>
              <Text style={styles.reviewButtonSub}>
                {dueCards.length} cards pendentes para hoje
              </Text>
            </View>
          </Pressable>
        )}

        {/* Premium: Generate by Topic */}
        {profile?.is_premium && (
          <Pressable
            onPress={() => router.push("/generate-topic")}
            style={[styles.topicButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
          >
            <Ionicons name="sparkles" size={20} color={colors.primary} />
            <View style={styles.topicButtonText}>
              <Text style={[styles.topicButtonTitle, { color: colors.text }]}>Gerar por nome do conteúdo</Text>
              <Text style={[styles.topicButtonSub, { color: colors.textSecondary }]}>Crie flashcards informando apenas o tópico</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        )}

        {/* Decks Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Meus Decks</Text>
          {decks.length === 0 ? (
            <EmptyState
              icon="library-outline"
              title="Nenhum deck ainda"
              description="Crie seu primeiro deck capturando texto de um livro ou digitando um conteúdo."
              actionLabel="Criar deck"
              onAction={() => setShowModal(true)}
            />
          ) : (
            <View style={styles.deckList}>
              {sortedDecks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  dueCount={dueByDeck[deck.id] || 0}
                  onPress={() => router.push(`/deck/${deck.id}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

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

// Build 7-day chart data from API response
function buildWeekChart(dailyStats: Array<{ date: string; count: number }>) {
  const days: Array<{ date: string; label: string; count: number }> = [];
  const statsMap = new Map(dailyStats.map((d) => [d.date, d.count]));

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({
      date: dateStr,
      label: WEEKDAY_LABELS[d.getDay()],
      count: statsMap.get(dateStr) ?? 0,
    });
  }

  const maxCount = Math.max(...days.map((d) => d.count), 0);
  return { days, maxCount };
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 24 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
    borderRadius: 10,
  },
  errorBannerText: {
    flex: 1,
    color: "#a12c7b",
    fontSize: 13,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  profileBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  greeting: { fontSize: 14 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 24, fontWeight: "700" },
  goalSubtitle: { fontSize: 12, marginTop: 2 },
  kpiRow: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 16,
  },
  kpiCard: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    minWidth: 100,
  },
  kpiNumber: { fontSize: 20, fontWeight: "700" },
  kpiLabel: { fontSize: 10, textAlign: "center" },
  chartCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  chartTitle: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
  chartBars: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 110,
  },
  chartCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  chartCount: { fontSize: 10 },
  chartBar: {
    width: 24,
    minHeight: 4,
  },
  chartLabel: { fontSize: 10, marginTop: 4 },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
  },
  reviewButtonTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  reviewButtonSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
  },
  topicButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  topicButtonText: { flex: 1 },
  topicButtonTitle: { fontSize: 15, fontWeight: "600" },
  topicButtonSub: { fontSize: 12, marginTop: 2 },
  section: { paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  deckList: {
    gap: 0,
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

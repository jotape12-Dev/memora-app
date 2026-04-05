import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { useDecksStore } from "../../stores/decksStore";
import { useReviewStore } from "../../stores/reviewStore";
import { useThemeColors } from "../../constants/theme";
import { GenerationLimitBadge } from "../../components/GenerationLimitBadge";
import { EmptyState } from "../../components/EmptyState";

export default function HomeScreen() {
  const colors = useThemeColors();
  const profile = useAuthStore((s) => s.profile);
  const { decks, fetchDecks } = useDecksStore();
  const { dueCards, fetchAllDueCards } = useDecksStore();
  const { streak, calculateStreak } = useReviewStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([fetchDecks(), fetchAllDueCards(), calculateStreak()]);
  }, [fetchDecks, fetchAllDueCards, calculateStreak]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
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
          </View>
          <GenerationLimitBadge />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="flame" size={24} color="#f59e0b" />
            <Text style={[styles.statNumber, { color: colors.text }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {streak === 1 ? "dia" : "dias"} seguidos
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="time" size={24} color={colors.primary} />
            <Text style={[styles.statNumber, { color: colors.text }]}>{dueCards.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>cards pendentes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="library" size={24} color="#7c3aed" />
            <Text style={[styles.statNumber, { color: colors.text }]}>{decks.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>decks</Text>
          </View>
        </View>

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

        {/* Decks Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Meus Decks</Text>
          {decks.length === 0 ? (
            <EmptyState
              icon="library-outline"
              title="Nenhum deck ainda"
              description="Crie seu primeiro deck capturando texto de um livro ou digitando um conteúdo."
              actionLabel="Criar deck"
              onAction={() => router.push("/(tabs)/capture")}
            />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deckScroll}>
              {decks.map((deck) => (
                <Pressable
                  key={deck.id}
                  onPress={() => router.push(`/deck/${deck.id}`)}
                  style={[styles.deckMini, { backgroundColor: colors.surface, borderColor: deck.color }]}
                >
                  <View style={[styles.deckColor, { backgroundColor: deck.color }]} />
                  <Text style={[styles.deckTitle, { color: colors.text }]} numberOfLines={1}>
                    {deck.title}
                  </Text>
                  <Text style={[styles.deckCount, { color: colors.textSecondary }]}>
                    {deck.card_count} cards
                  </Text>
                  {dueByDeck[deck.id] ? (
                    <View style={[styles.dueBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.dueBadgeText}>{dueByDeck[deck.id]}</Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 24 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  greeting: { fontSize: 14 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 24, fontWeight: "700" },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statNumber: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 11, textAlign: "center" },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 14,
    marginBottom: 24,
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
  section: { paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  deckScroll: { gap: 12, paddingRight: 20 },
  deckMini: {
    width: 150,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    padding: 14,
    paddingTop: 0,
  },
  deckColor: {
    height: 4,
    marginHorizontal: -14,
    marginBottom: 14,
  },
  deckTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  deckCount: { fontSize: 12 },
  dueBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  dueBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});

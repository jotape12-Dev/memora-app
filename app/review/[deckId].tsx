import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ConfettiCannon from "react-native-confetti-cannon";
import { useThemeColors } from "../../constants/theme";
import { useDecksStore } from "../../stores/decksStore";
import { useReviewStore } from "../../stores/reviewStore";
import { FlashCard } from "../../components/FlashCard";
import { RatingButtons } from "../../components/RatingButton";
import { ProgressBar } from "../../components/ProgressBar";
import type { Flashcard, SM2Rating } from "../../types/database";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ReviewScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const colors = useThemeColors();
  const { deckDueCards, fetchDueCards, reviewCard, decks } = useDecksStore();
  const deckColor = decks.find((d) => d.id === deckId)?.color ?? "#01696f";
  const { createSession } = useReviewStore();

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const [startTime] = useState(Date.now());

  const confettiRef = useRef<ConfettiCannon>(null);
  const isRatingRef = useRef(false);
  const sessionSavedRef = useRef(false);

  useEffect(() => {
    if (deckId) {
      fetchDueCards(deckId).then(() => {});
    }
  }, [deckId, fetchDueCards]);

  useEffect(() => {
    if (deckDueCards.length > 0 && cards.length === 0) {
      setCards([...deckDueCards]);
    }
  }, [deckDueCards, cards.length]);

  const totalCards = cards.length;
  const currentCard = cards[currentIndex];

  const handleFlip = useCallback(() => {
    setFlipped((prev) => !prev);
  }, []);

  const handleRate = useCallback(
    async (rating: SM2Rating) => {
      if (!currentCard || isRatingRef.current) return;
      isRatingRef.current = true;

      try {
        if (rating >= 3) {
          setCorrect((prev) => prev + 1);
        }

        await reviewCard(currentCard, rating);

        if (currentIndex + 1 >= totalCards) {
          // Session complete
          const duration = Math.round((Date.now() - startTime) / 1000);
          const finalCorrect = rating >= 3 ? correct + 1 : correct;

          if (!sessionSavedRef.current) {
            sessionSavedRef.current = true;
            await createSession(deckId!, totalCards, finalCorrect, duration);
          }

          setFinished(true);

          if (finalCorrect === totalCards) {
            confettiRef.current?.start();
          }
        } else {
          setCurrentIndex((prev) => prev + 1);
          setFlipped(false);
        }
      } finally {
        if (currentIndex + 1 < totalCards) {
          isRatingRef.current = false;
        }
      }
    },
    [currentCard, currentIndex, totalCards, correct, startTime, deckId, reviewCard, createSession]
  );

  const handleClose = () => {
    router.back();
  };

  if (cards.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Tudo em dia!</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            Nenhum card pendente para revisão neste deck.
          </Text>
          <Pressable onPress={handleClose} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.backBtnText}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (finished) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const percentage = totalCards > 0 ? Math.round((correct / totalCards) * 100) : 0;

    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <ConfettiCannon
          ref={confettiRef}
          count={100}
          origin={{ x: SCREEN_WIDTH / 2, y: -10 }}
          autoStart={false}
          fadeOut
        />
        <View style={styles.centered}>
          <Ionicons
            name={percentage === 100 ? "trophy" : "checkmark-circle"}
            size={64}
            color={percentage === 100 ? "#f59e0b" : colors.primary}
          />
          <Text style={[styles.finishTitle, { color: colors.text }]}>
            {percentage === 100 ? "Perfeito!" : "Sessão concluída!"}
          </Text>

          <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Cards revisados</Text>
              <Text style={[styles.resultValue, { color: colors.text }]}>{totalCards}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Acertos</Text>
              <Text style={[styles.resultValue, { color: "#22c55e" }]}>{correct}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Precisão</Text>
              <Text style={[styles.resultValue, { color: colors.text }]}>{percentage}%</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Tempo</Text>
              <Text style={[styles.resultValue, { color: colors.text }]}>
                {minutes > 0 ? `${minutes}m ` : ""}{seconds}s
              </Text>
            </View>
          </View>

          <Pressable onPress={handleClose} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.backBtnText}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => {
          Alert.alert("Sair da revisão?", "Seu progresso nesta sessão será perdido.", [
            { text: "Continuar", style: "cancel" },
            { text: "Sair", style: "destructive", onPress: handleClose },
          ]);
        }}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.progressContainer}>
          <ProgressBar current={currentIndex + 1} total={totalCards} />
        </View>
      </View>

      {/* Card */}
      <View style={styles.cardContainer}>
        {currentCard && (
          <FlashCard
            question={currentCard.question}
            answer={currentCard.answer}
            flipped={flipped}
            onFlip={handleFlip}
            deckColor={deckColor}
          />
        )}
      </View>

      {/* Actions */}
      <View style={[styles.actions, {
        backgroundColor: colors.background,
        borderTopColor: colors.border,
      }]}>
        {!flipped ? (
          <Pressable
            onPress={handleFlip}
            style={[styles.showAnswerBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.showAnswerText}>Ver resposta</Text>
          </Pressable>
        ) : (
          <View pointerEvents={isRatingRef.current ? "none" : "auto"} style={isRatingRef.current ? styles.disabled : undefined}>
            <RatingButtons onRate={handleRate} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  progressContainer: { flex: 1 },
  cardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  actions: {
    paddingBottom: 40,
    paddingTop: 20,
    width: "100%",
    borderTopWidth: 0.5,
  },
  showAnswerBtn: {
    marginHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 14,
    alignItems: "center",
  },
  showAnswerText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.6,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 22, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  finishTitle: { fontSize: 24, fontWeight: "700" },
  resultCard: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    marginTop: 8,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultLabel: { fontSize: 14 },
  resultValue: { fontSize: 16, fontWeight: "700" },
  backBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  backBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

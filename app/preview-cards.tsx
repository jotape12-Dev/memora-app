import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../constants/theme";
import { useDecksStore } from "../stores/decksStore";
import { Button } from "../components/Button";
import { ScreenContainer } from "../components/ScreenContainer";
import type { GeneratedFlashcard } from "../types/database";

export default function PreviewCardsScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const colors = useThemeColors();
  const { generatedCards, addFlashcards, clearGeneratedCards } = useDecksStore();

  const [cards, setCards] = useState<GeneratedFlashcard[]>([...generatedCards]);
  const [saving, setSaving] = useState(false);

  const handleBackToHome = () => {
    clearGeneratedCards();
    router.replace("/(tabs)");
  };

  const handleEditQuestion = (index: number, value: string) => {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, question: value } : c)));
  };

  const handleEditAnswer = (index: number, value: string) => {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, answer: value } : c)));
  };

  const handleDelete = (index: number) => {
    setCards((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!deckId) {
      Alert.alert("Erro", "Deck não encontrado.");
      return;
    }

    const validCards = cards.filter((c) => c.question.trim() && c.answer.trim());
    if (validCards.length === 0) {
      Alert.alert("Erro", "Nenhum card válido para salvar.");
      return;
    }

    setSaving(true);
    await addFlashcards(deckId, validCards);
    clearGeneratedCards();
    setSaving(false);

    Alert.alert(
      "Cards salvos!",
      `${validCards.length} flashcards adicionados ao deck.`,
      [{
        text: "OK",
        onPress: () =>
          router.replace({
            pathname: "/deck/[deckId]",
            params: { deckId, from: "generated" },
          }),
      }]
    );
  };

  const renderCard = ({ item, index }: { item: GeneratedFlashcard; index: number }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardNum, { color: colors.textSecondary }]}>Card {index + 1}</Text>
        <Pressable onPress={() => handleDelete(index)}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </Pressable>
      </View>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Pergunta:</Text>
      <TextInput
        value={item.question}
        onChangeText={(v) => handleEditQuestion(index, v)}
        multiline
        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
      />
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Resposta:</Text>
      <TextInput
        value={item.answer}
        onChangeText={(v) => handleEditAnswer(index, v)}
        multiline
        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenContainer>
        <View style={styles.header}>
          <Pressable onPress={handleBackToHome}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Preview dos Cards</Text>
          <Text style={[styles.count, { color: colors.textSecondary }]}>{cards.length} cards</Text>
        </View>

        <FlatList
          data={cards}
          keyExtractor={(_, i) => i.toString()}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          renderItem={renderCard}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: colors.textSecondary }}>Nenhum card gerado.</Text>
            </View>
          }
        />

        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Button
            title={`Adicionar ${cards.length} cards ao Deck`}
            onPress={handleSave}
            loading={saving}
            disabled={cards.length === 0}
            icon={<Ionicons name="checkmark" size={18} color="#fff" />}
          />
        </View>
      </ScreenContainer>
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
    gap: 12,
  },
  title: { flex: 1, fontSize: 18, fontWeight: "700" },
  count: { fontSize: 14 },
  list: { paddingHorizontal: 20, paddingBottom: 120 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardNum: { fontSize: 12, fontWeight: "600" },
  fieldLabel: { fontSize: 12, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 48,
    textAlignVertical: "top",
  },
  empty: { padding: 32, alignItems: "center" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
  },
});

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../constants/theme";
import { useDecksStore } from "../stores/decksStore";
import { PremiumGate } from "../components/PremiumGate";
import { Button } from "../components/Button";
import { Input } from "../components/Input";

const LEVELS = ["Básico", "Intermediário", "Avançado"];
const QUANTITIES = [5, 10, 15, 20, 30];

export default function GenerateTopicScreen() {
  const colors = useThemeColors();
  const { generateFromTopic, generating } = useDecksStore();
  const { decks, createDeck } = useDecksStore();

  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("Intermediário");
  const [quantity, setQuantity] = useState(10);
  const [language] = useState("Português");
  const [additionalContext, setAdditionalContext] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

  const ensureDeckId = async (): Promise<string | null> => {
    if (selectedDeckId) return selectedDeckId;
    const deck = await createDeck(topic.trim());
    if (!deck) return null;
    setSelectedDeckId(deck.id);
    return deck.id;
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      Alert.alert("Erro", "Insira o nome do conteúdo.");
      return;
    }

    const deckId = await ensureDeckId();
    if (!deckId) {
      Alert.alert("Erro", "Falha ao criar o deck.");
      return;
    }

    const result = await generateFromTopic(
      topic.trim(),
      quantity,
      level,
      language,
      additionalContext.trim() || undefined
    );

    if (result.error === "premium_required") {
      router.push("/paywall");
      return;
    }

    if (result.error === "service_unavailable") {
      Alert.alert(
        "Muita demanda agora",
        "Tente novamente em alguns minutos."
      );
      return;
    }

    if (result.error) {
      Alert.alert(
        "Não foi possível gerar os cards",
        "O serviço está temporariamente indisponível. Tente novamente em alguns minutos."
      );
      return;
    }

    router.push({ pathname: "/preview-cards", params: { deckId } });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Gerar por tópico</Text>
        <View style={[styles.premiumBadge, { backgroundColor: colors.primary }]}>
          <Ionicons name="star" size={12} color="#fff" />
          <Text style={styles.premiumText}>Premium</Text>
        </View>
      </View>

      <PremiumGate feature="geração por tópico">
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Input
            label="Nome do conteúdo"
            placeholder="Ex: Segunda Guerra Mundial, Integral por partes..."
            value={topic}
            onChangeText={setTopic}
          />

          {/* Level */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Nível</Text>
            <View style={styles.chipRow}>
              {LEVELS.map((l) => (
                <Pressable
                  key={l}
                  onPress={() => setLevel(l)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: level === l ? colors.primary : colors.muted,
                    },
                  ]}
                >
                  <Text style={{ color: level === l ? "#fff" : colors.text, fontSize: 13, fontWeight: "500" }}>
                    {l}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Quantity */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Quantidade de cards</Text>
            <View style={styles.chipRow}>
              {QUANTITIES.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => setQuantity(q)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: quantity === q ? colors.primary : colors.muted,
                    },
                  ]}
                >
                  <Text style={{ color: quantity === q ? "#fff" : colors.text, fontSize: 13, fontWeight: "500" }}>
                    {q}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Deck selector */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Deck (opcional — cria automaticamente)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {decks.map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => setSelectedDeckId(selectedDeckId === d.id ? null : d.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selectedDeckId === d.id ? colors.primary : colors.muted,
                    },
                  ]}
                >
                  <Text style={{ color: selectedDeckId === d.id ? "#fff" : colors.text, fontSize: 13 }}>
                    {d.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Additional context */}
          <Input
            label="Contexto adicional (opcional)"
            placeholder="Informações extras para guiar a geração..."
            value={additionalContext}
            onChangeText={setAdditionalContext}
            multiline
            style={{ minHeight: 80, textAlignVertical: "top" }}
          />

          <View style={styles.generateBtn}>
            <Button
              title="Gerar com IA"
              onPress={handleGenerate}
              loading={generating}
              disabled={!topic.trim()}
              icon={<Ionicons name="sparkles" size={18} color="#fff" />}
            />
          </View>
        </ScrollView>
      </PremiumGate>
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
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  premiumText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },
  section: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600" },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  generateBtn: { marginTop: 8 },
});

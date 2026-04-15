import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useThemeColors } from "../constants/theme";
import { useDecksStore } from "../stores/decksStore";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/Button";
import { GenerationLimitBadge } from "../components/GenerationLimitBadge";
import { DismissKeyboard } from "../components/DismissKeyboard";

type Tab = "camera" | "text";

export default function CaptureScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ deckId?: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("text");
  const [text, setText] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(params.deckId ?? null);
  const [showDeckPicker, setShowDeckPicker] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");

  const { generateFromText, generating } = useDecksStore();
  const { decks, createDeck, fetchDecks } = useDecksStore();
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const selectedDeck = decks.find((d) => d.id === selectedDeckId);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Precisamos de acesso à câmera.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      performOCR(result.assets[0].uri);
    }
  };

  const handlePickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      performOCR(result.assets[0].uri);
    }
  };

  const performOCR = async (uri: string) => {
    setOcrLoading(true);
    try {
      // ML Kit text recognition
      const TextRecognition = require("@react-native-ml-kit/text-recognition");
      const result = await TextRecognition.default.recognize(uri);
      if (result.text) {
        setExtractedText(result.text);
      } else {
        Alert.alert("OCR", "Nenhum texto encontrado na imagem.");
      }
    } catch {
      Alert.alert(
        "OCR indisponível",
        "Reconhecimento de texto não disponível. Cole o texto manualmente."
      );
    } finally {
      setOcrLoading(false);
    }
  };

  const handleGenerate = async () => {
    const inputText = activeTab === "camera" ? extractedText : text;
    if (!inputText.trim() || inputText.trim().length < 50) {
      Alert.alert("Texto muito curto", "O texto deve ter pelo menos 50 caracteres.");
      return;
    }

    if (!selectedDeckId) {
      Alert.alert("Selecione um deck", "Escolha ou crie um deck de destino.");
      return;
    }

    const result = await generateFromText(inputText.trim());

    if (result.error === "daily_limit_reached") {
      Alert.alert(
        "Limite diário atingido",
        "Você atingiu o limite de 10 gerações diárias. Assine o Premium para gerações ilimitadas.",
        [
          { text: "Ver Premium", onPress: () => router.push("/paywall") },
          { text: "OK" },
        ]
      );
      return;
    }

    if (result.error) {
      Alert.alert("Erro", result.error);
      return;
    }

    await fetchProfile();

    router.push({
      pathname: "/preview-cards",
      params: { deckId: selectedDeckId },
    });
  };

  const handleCreateDeck = async () => {
    if (!newDeckTitle.trim()) return;
    const deck = await createDeck(newDeckTitle.trim());
    if (deck) {
      setSelectedDeckId(deck.id);
      setNewDeckTitle("");
      setShowDeckPicker(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <DismissKeyboard>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Capturar conteúdo</Text>
        </View>
        <GenerationLimitBadge />

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.muted }]}>
          <Pressable
            onPress={() => setActiveTab("camera")}
            style={[
              styles.tab,
              activeTab === "camera" && { backgroundColor: colors.surface },
            ]}
          >
            <Ionicons
              name="camera"
              size={18}
              color={activeTab === "camera" ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "camera" ? colors.primary : colors.textSecondary },
              ]}
            >
              Câmera
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("text")}
            style={[
              styles.tab,
              activeTab === "text" && { backgroundColor: colors.surface },
            ]}
          >
            <Ionicons
              name="document-text"
              size={18}
              color={activeTab === "text" ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "text" ? colors.primary : colors.textSecondary },
              ]}
            >
              Colar texto
            </Text>
          </Pressable>
        </View>

        {/* Camera Tab */}
        {activeTab === "camera" && (
          <View style={styles.tabContent}>
            {imageUri ? (
              <View>
                <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
                <Pressable onPress={() => { setImageUri(null); setExtractedText(""); }} style={styles.retakeBtn}>
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                  <Text style={[styles.retakeText, { color: colors.primary }]}>Refazer</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.cameraButtons}>
                <Pressable onPress={handlePickImage} style={[styles.captureBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Ionicons name="camera" size={32} color={colors.primary} />
                  <Text style={[styles.captureBtnText, { color: colors.text }]}>Tirar foto</Text>
                </Pressable>
                <Pressable onPress={handlePickFromGallery} style={[styles.captureBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Ionicons name="images" size={32} color={colors.primary} />
                  <Text style={[styles.captureBtnText, { color: colors.text }]}>Galeria</Text>
                </Pressable>
              </View>
            )}

            {ocrLoading && (
              <View style={styles.ocrLoading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.ocrText, { color: colors.textSecondary }]}>
                  Extraindo texto...
                </Text>
              </View>
            )}

            {extractedText ? (
              <View>
                <Text style={[styles.label, { color: colors.text }]}>Texto extraído (editável):</Text>
                <TextInput
                  value={extractedText}
                  onChangeText={setExtractedText}
                  multiline
                  style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                />
              </View>
            ) : null}
          </View>
        )}

        {/* Text Tab */}
        {activeTab === "text" && (
          <View style={styles.tabContent}>
            <Text style={[styles.label, { color: colors.text }]}>Cole ou digite o texto:</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              placeholder="Cole aqui o texto de um livro, artigo ou anotação..."
              placeholderTextColor={colors.textSecondary}
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, minHeight: 180 }]}
            />
          </View>
        )}

        {/* Deck Picker */}
        <View style={styles.deckSection}>
          <Text style={[styles.label, { color: colors.text }]}>Deck de destino:</Text>
          <Pressable
            onPress={() => setShowDeckPicker(!showDeckPicker)}
            style={[styles.deckPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={{ color: selectedDeck ? colors.text : colors.textSecondary }}>
              {selectedDeck ? selectedDeck.title : "Selecione um deck..."}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </Pressable>

          {showDeckPicker && (
            <View style={[styles.deckList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {decks.map((deck) => (
                <Pressable
                  key={deck.id}
                  onPress={() => { setSelectedDeckId(deck.id); setShowDeckPicker(false); }}
                  style={[styles.deckOption, selectedDeckId === deck.id && { backgroundColor: colors.muted }]}
                >
                  <View style={[styles.deckDot, { backgroundColor: deck.color }]} />
                  <Text style={{ color: colors.text }}>{deck.title}</Text>
                </Pressable>
              ))}
              <View style={[styles.newDeckRow, { borderTopColor: colors.border }]}>
                <TextInput
                  value={newDeckTitle}
                  onChangeText={setNewDeckTitle}
                  placeholder="Nome do novo deck..."
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.newDeckInput, { color: colors.text }]}
                />
                <Pressable onPress={handleCreateDeck} style={[styles.newDeckBtn, { backgroundColor: colors.primary }]}>
                  <Ionicons name="add" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Generate Button */}
        <View style={styles.generateSection}>
          <Button
            title="Gerar Flashcards com IA"
            onPress={handleGenerate}
            loading={generating}
            disabled={
              (activeTab === "camera" ? !extractedText.trim() : !text.trim()) || !selectedDeckId
            }
            icon={<Ionicons name="sparkles" size={18} color="#fff" />}
          />
        </View>

        {/* Premium link */}
        {profile?.is_premium && (
          <Pressable onPress={() => router.push("/generate-topic")} style={styles.premiumLink}>
            <Ionicons name="star" size={16} color={colors.primary} />
            <Text style={[styles.premiumLinkText, { color: colors.primary }]}>
              Gerar por nome do conteúdo (Premium)
            </Text>
          </Pressable>
        )}
      </ScrollView>
      </DismissKeyboard>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "700" },
  tabs: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 4,
    marginTop: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabText: { fontSize: 14, fontWeight: "600" },
  tabContent: { marginBottom: 20 },
  cameraButtons: { flexDirection: "row", gap: 12, marginBottom: 16 },
  captureBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  captureBtnText: { fontSize: 14, fontWeight: "500" },
  preview: { width: "100%", height: 200, borderRadius: 12, marginBottom: 8 },
  retakeBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "center", padding: 8 },
  retakeText: { fontSize: 14, fontWeight: "500" },
  ocrLoading: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16 },
  ocrText: { fontSize: 14 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 120,
    textAlignVertical: "top",
  },
  deckSection: { marginBottom: 20 },
  deckPicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  deckList: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    overflow: "hidden",
  },
  deckOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  deckDot: { width: 10, height: 10, borderRadius: 5 },
  newDeckRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    padding: 8,
    gap: 8,
  },
  newDeckInput: { flex: 1, fontSize: 14, padding: 6 },
  newDeckBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  generateSection: { marginBottom: 16 },
  premiumLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  premiumLinkText: { fontSize: 14, fontWeight: "500" },
});

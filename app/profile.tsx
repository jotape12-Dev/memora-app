import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useThemeColors } from "../constants/theme";
import { useAuthStore } from "../stores/authStore";
import { useReviewStore } from "../stores/reviewStore";
import { useDecksStore } from "../stores/decksStore";
import { Button } from "../components/Button";
import { ScreenContainer } from "../components/ScreenContainer";
import { useLayout, MAX_MODAL_WIDTH } from "../hooks/useLayout";

export default function ProfileScreen() {
  const colors = useThemeColors();
  const { isTablet } = useLayout();
  const { profile, user, signOut, deleteAccount, updateProfile } = useAuthStore();
  const { streak, totalReviewed, fetchSessions, calculateStreak } = useReviewStore();
  const { decks, dueCards } = useDecksStore();

  // Goal modal state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [goalSubject, setGoalSubject] = useState("");

  // Animations for premium card
  const cardScale = useSharedValue(0.96);
  const shimmerX = useSharedValue(-120);

  useEffect(() => {
    fetchSessions();
    calculateStreak();
  }, [fetchSessions, calculateStreak]);

  useEffect(() => {
    if (profile?.is_premium) {
      cardScale.value = withSpring(1, { damping: 14, stiffness: 160 });
      shimmerX.value = withRepeat(
        withSequence(
          withDelay(600, withTiming(420, { duration: 2000, easing: Easing.out(Easing.quad) })),
          withTiming(-120, { duration: 0 })
        ),
        -1,
        false
      );
    }
  }, [profile?.is_premium]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const shimmerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }, { skewX: "-18deg" }],
  }));

  const totalCards = decks.reduce((sum, d) => sum + d.card_count, 0);

  const handleSignOut = () => {
    Alert.alert("Sair", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Excluir conta",
      "Essa ação é irreversível. Todos os seus decks e flashcards serão apagados permanentemente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir conta",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteAccount();
            if (error) {
              Alert.alert("Erro", "Não foi possível excluir sua conta. Tente novamente.");
            } else {
              router.replace("/(auth)/login");
            }
          },
        },
      ]
    );
  };

  const openGoalModal = () => {
    setGoalTitle(profile?.goal_title ?? "");
    setGoalDate(profile?.goal_date ?? "");
    setGoalSubject(profile?.goal_subject ?? "");
    setShowGoalModal(true);
  };

  const handleSaveGoal = async () => {
    await updateProfile({
      goal_title: goalTitle.trim() || null,
      goal_date: goalDate.trim() || null,
      goal_subject: goalSubject.trim() || null,
    });
    setShowGoalModal(false);
  };

  const handleClearGoal = async () => {
    await updateProfile({
      goal_title: null,
      goal_date: null,
      goal_subject: null,
    });
    setShowGoalModal(false);
  };

  // Calculate days until goal
  const daysUntilGoal = (() => {
    if (!profile?.goal_date) return null;
    const target = new Date(profile.goal_date + "T00:00:00");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - now.getTime()) / 86400000);
    return diff;
  })();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Perfil</Text>
        </View>

        {/* User Info */}
        <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {(profile?.display_name || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {profile?.display_name || "Usuário"}
              </Text>
              {profile?.is_premium && (
                <FontAwesome5 name="crown" size={14} color="#f59e0b" />
              )}
            </View>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
              {user?.email}
            </Text>
          </View>
        </View>

        {/* Premium Card */}
        <Animated.View style={profile?.is_premium ? cardAnimStyle : undefined}>
          <Pressable
            onPress={() => !profile?.is_premium && router.push("/paywall")}
            style={[
              styles.premiumCard,
              { backgroundColor: profile?.is_premium ? "#059669" : colors.primary },
            ]}
          >
            <Ionicons
              name={profile?.is_premium ? "checkmark-circle" : "star"}
              size={24}
              color="#fff"
            />
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumTitle}>
                {profile?.is_premium ? "Premium ativo" : "Seja Premium"}
              </Text>
              <Text style={styles.premiumSub}>
                {profile?.is_premium
                  ? "Aproveite todos os recursos ilimitados"
                  : "Gerações ilimitadas, flashcards por tópico e mais"}
              </Text>
            </View>
            {!profile?.is_premium && (
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            )}
            {profile?.is_premium && (
              <Animated.View style={[styles.shimmer, shimmerAnimStyle]} />
            )}
          </Pressable>
        </Animated.View>

        {/* Goal Card */}
        <Pressable
          onPress={openGoalModal}
          style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.goalHeader}>
            <Ionicons name="flag" size={20} color="#7c3aed" />
            <Text style={[styles.goalTitle, { color: colors.text }]}>Meta de Estudo</Text>
            <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
          </View>
          {profile?.goal_title ? (
            <View style={styles.goalBody}>
              <Text style={[styles.goalName, { color: colors.text }]}>{profile.goal_title}</Text>
              {profile.goal_subject && (
                <Text style={[styles.goalSubject, { color: colors.textSecondary }]}>
                  {profile.goal_subject}
                </Text>
              )}
              {daysUntilGoal !== null && (
                <View style={[styles.goalCountdown, {
                  backgroundColor: daysUntilGoal <= 7 ? "#fef2f2" : "#f0fdf4",
                }]}>
                  <Ionicons
                    name="calendar"
                    size={14}
                    color={daysUntilGoal <= 7 ? "#dc2626" : "#16a34a"}
                  />
                  <Text style={[styles.goalCountdownText, {
                    color: daysUntilGoal <= 7 ? "#dc2626" : "#16a34a",
                  }]}>
                    {daysUntilGoal <= 0
                      ? "Hoje é o dia!"
                      : daysUntilGoal === 1
                        ? "Falta 1 dia"
                        : `Faltam ${daysUntilGoal} dias`}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={[styles.goalEmpty, { color: colors.textSecondary }]}>
              Defina uma meta para manter o foco nos estudos
            </Text>
          )}
        </Pressable>

        {/* Stats */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Estatísticas</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="flame" size={22} color="#f59e0b" />
            <Text style={[styles.statNum, { color: colors.text }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Streak</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="layers" size={22} color={colors.primary} />
            <Text style={[styles.statNum, { color: colors.text }]}>{totalCards}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total de cards</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="checkmark-done" size={22} color="#22c55e" />
            <Text style={[styles.statNum, { color: colors.text }]}>{totalReviewed}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Revisados</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="time" size={22} color="#7c3aed" />
            <Text style={[styles.statNum, { color: colors.text }]}>{dueCards.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pendentes</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Sair"
            variant="outline"
            onPress={handleSignOut}
            icon={<Ionicons name="log-out-outline" size={18} color={colors.primary} />}
          />
          <Pressable onPress={handleDeleteAccount} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={[styles.deleteText, { color: colors.error }]}>Excluir conta</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Goal Edit Modal */}
      <Modal visible={showGoalModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable style={[styles.modalOverlay, isTablet && styles.modalOverlayTablet]} onPress={Keyboard.dismiss}>
            <Pressable style={[styles.modalContent, isTablet && styles.modalContentTablet, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Meta de Estudo</Text>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Objetivo</Text>
              <TextInput
                value={goalTitle}
                onChangeText={setGoalTitle}
                placeholder="Ex: Passar na prova de cálculo"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Matéria (opcional)</Text>
              <TextInput
                value={goalSubject}
                onChangeText={setGoalSubject}
                placeholder="Ex: Matemática"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Data (AAAA-MM-DD)</Text>
              <TextInput
                value={goalDate}
                onChangeText={setGoalDate}
                placeholder="Ex: 2026-06-15"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numbers-and-punctuation"
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              />

              <View style={styles.modalButtons}>
                {profile?.goal_title && (
                  <Button title="Limpar" variant="ghost" onPress={handleClearGoal} />
                )}
                <View style={{ flex: 1 }} />
                <Button title="Cancelar" variant="ghost" onPress={() => setShowGoalModal(false)} />
                <Button title="Salvar" onPress={handleSaveGoal} />
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
      </ScreenContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "700" },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { fontSize: 17, fontWeight: "600" },
  userEmail: { fontSize: 13, marginTop: 2 },
  premiumCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 14,
    gap: 14,
    marginBottom: 16,
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 70,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 4,
  },
  premiumInfo: { flex: 1 },
  premiumTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  premiumSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  goalCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 28,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  goalTitle: { fontSize: 15, fontWeight: "600", flex: 1 },
  goalBody: { gap: 4 },
  goalName: { fontSize: 16, fontWeight: "700" },
  goalSubject: { fontSize: 13 },
  goalCountdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  goalCountdownText: { fontSize: 13, fontWeight: "600" },
  goalEmpty: { fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  statItem: {
    width: "48%",
    flexBasis: "48%",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statNum: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 12 },
  actions: { gap: 12 },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  deleteText: { fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalOverlayTablet: {
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 8,
  },
  modalContentTablet: {
    borderRadius: 20,
    maxWidth: MAX_MODAL_WIDTH,
    alignSelf: "center" as const,
    width: "100%",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  inputLabel: { fontSize: 13, fontWeight: "500", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  modalButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
});

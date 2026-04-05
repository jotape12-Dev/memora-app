import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
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
import { useThemeColors } from "../../constants/theme";
import { useAuthStore } from "../../stores/authStore";
import { useReviewStore } from "../../stores/reviewStore";
import { useDecksStore } from "../../stores/decksStore";
import { Button } from "../../components/Button";

export default function ProfileScreen() {
  const colors = useThemeColors();
  const { profile, user, signOut, deleteAccount } = useAuthStore();
  const { streak, totalReviewed, fetchSessions, calculateStreak } = useReviewStore();
  const { decks } = useDecksStore();
  const { dueCards } = useDecksStore();

  // Animations for premium card
  const cardScale = useSharedValue(0.96);
  const shimmerX = useSharedValue(-120);

  useEffect(() => {
    fetchSessions();
    calculateStreak();
  }, [fetchSessions, calculateStreak]);

  useEffect(() => {
    if (profile?.is_premium) {
      // Entrance scale pop
      cardScale.value = withSpring(1, { damping: 14, stiffness: 160 });

      // Shimmer loop: slide across every ~5s
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: colors.text }]}>Perfil</Text>

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

            {/* Shimmer overlay — only when premium */}
            {profile?.is_premium && (
              <Animated.View style={[styles.shimmer, shimmerAnimStyle]} />
            )}
          </Pressable>
        </Animated.View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
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
    marginBottom: 28,
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
});

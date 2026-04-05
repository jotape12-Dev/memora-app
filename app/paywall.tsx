import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { PurchasesPackage } from "react-native-purchases";
import { useThemeColors } from "../constants/theme";
import { useAuthStore } from "../stores/authStore";
import { getOfferings, purchasePackage, restorePurchases } from "../lib/revenuecat";
import { Button } from "../components/Button";

type Plan = "monthly" | "annual";

const FEATURES = [
  { icon: "infinite" as const, text: "Geração ilimitada a partir de texto/imagem" },
  { icon: "sparkles" as const, text: "Geração completa por nome do conteúdo" },
  { icon: "ban" as const, text: "Sem limite diário de gerações" },
  { icon: "sync" as const, text: "Sincronização entre dispositivos" },
];

export default function PaywallScreen() {
  const colors = useThemeColors();
  const { updateProfile, fetchProfile } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [offeringsLoading, setOfferingsLoading] = useState(true);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    setOfferingsLoading(true);
    const offering = await getOfferings();
    if (offering) {
      for (const pkg of offering.availablePackages) {
        const type = pkg.packageType;
        if (type === "ANNUAL" || pkg.identifier.toLowerCase().includes("annual") || pkg.identifier.toLowerCase().includes("anual")) {
          setAnnualPackage(pkg);
        } else if (type === "MONTHLY" || pkg.identifier.toLowerCase().includes("monthly") || pkg.identifier.toLowerCase().includes("mensal")) {
          setMonthlyPackage(pkg);
        }
      }
    }
    setOfferingsLoading(false);
  };

  const activatePremium = async () => {
    await updateProfile({ is_premium: true });
    await fetchProfile();
    Alert.alert(
      "Bem-vindo ao Premium!",
      "Sua assinatura foi ativada com sucesso. Aproveite todos os recursos ilimitados.",
      [{ text: "Ótimo!", onPress: () => router.back() }]
    );
  };

  const handlePurchase = async () => {
    const pkg = selectedPlan === "annual" ? annualPackage : monthlyPackage;

    // RevenueCat not configured or no offerings — activate directly (dev/sandbox mode)
    if (!pkg) {
      setLoading(true);
      await activatePremium();
      setLoading(false);
      return;
    }

    setLoading(true);
    const { isPremium, error } = await purchasePackage(pkg);

    if (error === "cancelled") {
      setLoading(false);
      return;
    }

    if (error) {
      Alert.alert("Erro", "Não foi possível processar o pagamento. Tente novamente.");
      setLoading(false);
      return;
    }

    if (isPremium) {
      await activatePremium();
    }

    setLoading(false);
  };

  const handleRestore = async () => {
    setRestoring(true);
    const { isPremium, error } = await restorePurchases();

    if (error) {
      Alert.alert("Erro", "Não foi possível restaurar as compras. Tente novamente.");
      setRestoring(false);
      return;
    }

    if (isPremium) {
      await activatePremium();
    } else {
      Alert.alert("Sem assinatura ativa", "Não encontramos nenhuma assinatura Premium associada a esta conta Apple.");
    }

    setRestoring(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Close button */}
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: "#fef3c7" }]}>
            <Ionicons name="star" size={36} color="#f59e0b" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Memora Premium</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Desbloqueie todo o potencial dos seus estudos
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.checkCircle, { backgroundColor: "#dcfce7" }]}>
                <Ionicons name="checkmark" size={16} color="#16a34a" />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        {offeringsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginBottom: 24 }} />
        ) : (
          <View style={styles.plans}>
            <Pressable
              onPress={() => setSelectedPlan("annual")}
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: selectedPlan === "annual" ? colors.primary : colors.border,
                  borderWidth: selectedPlan === "annual" ? 2 : 1,
                },
              ]}
            >
              <View style={[styles.saveBadge, { backgroundColor: "#dcfce7" }]}>
                <Text style={styles.saveText}>Economize 44%</Text>
              </View>
              <Text style={[styles.planName, { color: colors.text }]}>Anual</Text>
              <Text style={[styles.planPrice, { color: colors.text }]}>
                {annualPackage?.product.priceString ?? "R$ 99,90"}
                <Text style={styles.planPeriod}>/ano</Text>
              </Text>
              <Text style={[styles.planMonthly, { color: colors.textSecondary }]}>R$ 8,33/mês</Text>
            </Pressable>

            <Pressable
              onPress={() => setSelectedPlan("monthly")}
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: selectedPlan === "monthly" ? colors.primary : colors.border,
                  borderWidth: selectedPlan === "monthly" ? 2 : 1,
                },
              ]}
            >
              <Text style={[styles.planName, { color: colors.text }]}>Mensal</Text>
              <Text style={[styles.planPrice, { color: colors.text }]}>
                {monthlyPackage?.product.priceString ?? "R$ 14,90"}
                <Text style={styles.planPeriod}>/mês</Text>
              </Text>
            </Pressable>
          </View>
        )}

        {/* CTA */}
        <Button
          title={`Assinar ${selectedPlan === "annual" ? "Anual" : "Mensal"}`}
          onPress={handlePurchase}
          loading={loading}
          disabled={offeringsLoading}
          icon={<Ionicons name="star" size={18} color="#fff" />}
        />

        <Text style={[styles.terms, { color: colors.textSecondary }]}>
          Cancele a qualquer momento. A assinatura é renovada automaticamente.
        </Text>

        {/* Restore */}
        <Pressable onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
          {restoring ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Text style={[styles.restoreText, { color: colors.textSecondary }]}>
              Restaurar compras
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  closeBtn: {
    alignSelf: "flex-end",
    padding: 4,
  },
  header: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
  },
  features: {
    gap: 14,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  plans: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  saveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  saveText: {
    color: "#16a34a",
    fontSize: 11,
    fontWeight: "700",
  },
  planName: {
    fontSize: 15,
    fontWeight: "600",
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "800",
  },
  planPeriod: {
    fontSize: 13,
    fontWeight: "400",
  },
  planMonthly: {
    fontSize: 12,
  },
  terms: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 16,
  },
  restoreBtn: {
    alignItems: "center",
    paddingVertical: 16,
  },
  restoreText: {
    fontSize: 13,
    textDecorationLine: "underline",
  },
});

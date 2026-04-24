import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { PurchasesPackage } from "react-native-purchases";
import { useThemeColors } from "../constants/theme";
import { useAuthStore } from "../stores/authStore";
import {
  isRevenueCatAvailable,
  getOfferings,
  purchasePackage,
  restorePurchases,
} from "../lib/revenuecat";
import { Button } from "../components/Button";

type Plan = "monthly" | "annual";

const FEATURES = [
  { icon: "infinite" as const, text: "Geração ilimitada a partir de texto/imagem" },
  { icon: "sparkles" as const, text: "Geração completa por nome do conteúdo" },
  { icon: "ban" as const, text: "Sem limite diário de gerações" },
  { icon: "sync" as const, text: "Sincronização entre dispositivos" },
];

const TERMS_URL = "https://west-countess-f4d.notion.site/Termos-de-Uso-EULA-33bc6b9cebbe804cb189d1bd4245201c?source=copy_link";
const PRIVACY_URL = "https://west-countess-f4d.notion.site/Pol-tica-de-Privacidade-Memora-33bc6b9cebbe80cea7abcf49d1f8c4b7?source=copy_link";

export default function PaywallScreen() {
  const colors = useThemeColors();
  const { updateProfile, fetchProfile } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [rcAvailable] = useState(() => isRevenueCatAvailable());

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    setOfferingsLoading(true);
    const offering = await getOfferings();
    if (offering) {
      for (const pkg of offering.availablePackages) {
        const id = pkg.identifier.toLowerCase();
        const type = pkg.packageType;
        if (type === "ANNUAL" || id.includes("annual") || id.includes("anual")) {
          setAnnualPackage(pkg);
        } else if (type === "MONTHLY" || id.includes("monthly") || id.includes("mensal")) {
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

    if (!pkg) {
      if (!rcAvailable) {
        Alert.alert(
          "Indisponível",
          "O sistema de pagamentos não está disponível neste ambiente. Use um build de desenvolvimento ou produção."
        );
      } else {
        Alert.alert(
          "Plano indisponível",
          "Não foi possível carregar este plano. Tente novamente."
        );
      }
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
    if (!rcAvailable) {
      Alert.alert("Indisponível", "Restauração não disponível neste ambiente.");
      return;
    }

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
      Alert.alert(
        "Sem assinatura ativa",
        "Não encontramos nenhuma assinatura Premium associada a esta conta."
      );
    }

    setRestoring(false);
  };

  const hasPackages = monthlyPackage !== null || annualPackage !== null;
  const unavailableMessage = !rcAvailable
    ? "Pagamentos não disponíveis neste ambiente. Use um build de produção."
    : __DEV__
    ? "Configuração do RevenueCat incompleta. Adicione pacotes à offering 'default' no painel do RevenueCat."
    : "Planos indisponíveis no momento. Tente novamente mais tarde.";

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
        ) : !hasPackages ? (
          <View style={[styles.unavailableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.unavailableText, { color: colors.textSecondary }]}>
                {unavailableMessage}
              </Text>
            </View>
        ) : (
          <View style={styles.plans}>
            {annualPackage && (
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
                  {annualPackage.product.priceString}
                  <Text style={styles.planPeriod}>/ano</Text>
                </Text>
                <Text style={[styles.planMonthly, { color: colors.textSecondary }]}>
                  {annualPackage.product.price && annualPackage.product.currencyCode
                    ? `${new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: annualPackage.product.currencyCode,
                      }).format(annualPackage.product.price / 12)}/mês`
                    : ""}
                </Text>
              </Pressable>
            )}

            {monthlyPackage && (
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
                  {monthlyPackage.product.priceString}
                  <Text style={styles.planPeriod}>/mês</Text>
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* CTA */}
        <Button
          title={`Assinar ${selectedPlan === "annual" ? "Anual" : "Mensal"}`}
          onPress={handlePurchase}
          loading={loading}
          disabled={offeringsLoading || !hasPackages}
          icon={<Ionicons name="star" size={18} color="#fff" />}
        />

        {/* Terms */}
        <Text style={[styles.terms, { color: colors.textSecondary }]}>
          Cancele a qualquer momento. A assinatura é renovada automaticamente ao final de cada período.
          O pagamento será cobrado na sua conta Apple/Google.
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

        {/* Legal links — required by Apple */}
        <View style={styles.legalRow}>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
            <Text style={[styles.legalText, { color: colors.textSecondary }]}>Termos de Uso</Text>
          </Pressable>
          <Text style={[styles.legalDot, { color: colors.textSecondary }]}>·</Text>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={[styles.legalText, { color: colors.textSecondary }]}>Política de Privacidade</Text>
          </Pressable>
        </View>
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
  unavailableCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  unavailableText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  terms: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 16,
  },
  restoreBtn: {
    alignItems: "center",
    paddingVertical: 16,
  },
  restoreText: {
    fontSize: 13,
    textDecorationLine: "underline",
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  legalText: {
    fontSize: 12,
    textDecorationLine: "underline",
  },
  legalDot: {
    fontSize: 12,
  },
});

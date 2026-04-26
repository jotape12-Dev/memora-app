import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import Share, { Social } from "react-native-share";
import { useThemeColors } from "../constants/theme";
import { ShareStoryCard, type ShareVariant } from "./ShareStoryCard";
import { fetchTodayShareStats, type DailyShareStats } from "../lib/dailyShareStats";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const VARIANTS: { id: ShareVariant; label: string }[] = [
  { id: "light", label: "Claro" },
  { id: "dark", label: "Escuro" },
  { id: "transparent", label: "Transparente" },
];

export function ShareStoryModal({ visible, onClose }: Props) {
  const colors = useThemeColors();
  const [stats, setStats] = useState<DailyShareStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const cardRefs = useRef<(View | null)[]>([null, null, null]);
  const captureCardRefs = useRef<(View | null)[]>([null, null, null]);
  const [igStoriesAvailable, setIgStoriesAvailable] = useState(false);

  const { cardWidth, cardHeight, pageWidth } = useMemo(() => {
    const screen = Dimensions.get("window");
    const targetWidth = Math.min(screen.width * 0.7, 320);
    return {
      cardWidth: targetWidth,
      cardHeight: targetWidth * (16 / 9),
      pageWidth: screen.width,
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setActiveIndex(0);
    fetchTodayShareStats()
      .then((s) => setStats(s))
      .finally(() => setLoading(false));

    Linking.canOpenURL("instagram-stories://share")
      .then(setIgStoriesAvailable)
      .catch(() => setIgStoriesAvailable(false));
  }, [visible]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  const captureCurrentVariant = async (): Promise<{ uri: string; isTransparent: boolean } | null> => {
    const ref = captureCardRefs.current[activeIndex] ?? cardRefs.current[activeIndex];
    if (!ref) return null;
    const isTransparent = VARIANTS[activeIndex].id === "transparent";
    const uri = await captureRef(ref, {
      format: "png",
      quality: 1,
      result: "tmpfile",
      ...(isTransparent ? { backgroundColor: "transparent" as const } : {}),
    });
    return { uri, isTransparent };
  };

  const handleShareToInstagramStories = async () => {
    if (sharing) return;
    try {
      setSharing(true);
      const captured = await captureCurrentVariant();
      if (!captured) return;

      const { uri, isTransparent } = captured;
      const fileUri = Platform.OS === "android" && !uri.startsWith("file://") ? `file://${uri}` : uri;

      if (isTransparent) {
        await Share.shareSingle({
          social: Social.InstagramStories,
          appId: "com.jotape.memora.app",
          stickerImage: fileUri,
        });
      } else {
        await Share.shareSingle({
          social: Social.InstagramStories,
          appId: "com.jotape.memora.app",
          backgroundImage: fileUri,
        });
      }
    } catch (err) {
      const msg = (err as Error)?.message ?? "";
      if (/cancel/i.test(msg) || /dismiss/i.test(msg)) return;
      Alert.alert(
        "Não foi possível abrir o Instagram",
        "Confirme se o Instagram está instalado e atualizado, ou use 'Mais opções'."
      );
    } finally {
      setSharing(false);
    }
  };

  const handleShareViaSystem = async () => {
    if (sharing) return;
    try {
      setSharing(true);
      const captured = await captureCurrentVariant();
      if (!captured) return;

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert("Compartilhamento indisponível", "Não foi possível abrir o menu de compartilhamento neste dispositivo.");
        return;
      }
      await Sharing.shareAsync(captured.uri, {
        mimeType: "image/png",
        dialogTitle: "Compartilhar progresso",
        UTI: "public.png",
      });
    } catch {
      Alert.alert("Erro", "Não foi possível gerar a imagem para compartilhar.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.headerAction, { color: colors.primary }]}>Fechar</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Compartilhar</Text>
          <View style={{ width: 56 }} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !stats || stats.reviewedCount === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Sem revisões hoje</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Revise pelo menos um deck no dia para compartilhar suas estatísticas.
            </Text>
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScrollEnd}
              style={styles.pager}
              contentContainerStyle={styles.pagerContent}
            >
              {VARIANTS.map((variant, idx) => (
                <View
                  key={variant.id}
                  style={[
                    styles.page,
                    { width: pageWidth, backgroundColor: variant.id === "transparent" ? colors.surface : "transparent" },
                  ]}
                >
                  {variant.id === "transparent" && (
                    <View
                      pointerEvents="none"
                      style={[
                        StyleSheet.absoluteFill,
                        styles.checkerHint,
                        { borderColor: colors.border },
                      ]}
                    />
                  )}
                  <ShareStoryCard
                    ref={(r) => {
                      cardRefs.current[idx] = r;
                    }}
                    stats={stats}
                    variant={variant.id}
                    width={cardWidth}
                    height={cardHeight}
                  />
                </View>
              ))}
            </ScrollView>

            {/* Isolated off-screen stage for capture — no opaque parent so transparent variant
                produces a true alpha PNG. The visible pager above is preview only. */}
            <View style={styles.captureStage} pointerEvents="none">
              {VARIANTS.map((variant, idx) => (
                <ShareStoryCard
                  key={`capture-${variant.id}`}
                  ref={(r) => {
                    captureCardRefs.current[idx] = r;
                  }}
                  stats={stats}
                  variant={variant.id}
                  width={cardWidth}
                  height={cardHeight}
                />
              ))}
            </View>

            <View style={styles.dotsRow}>
              {VARIANTS.map((variant, idx) => (
                <View
                  key={variant.id}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: idx === activeIndex ? colors.primary : colors.border,
                      width: idx === activeIndex ? 18 : 6,
                    },
                  ]}
                />
              ))}
            </View>

            <Text style={[styles.variantLabel, { color: colors.textSecondary }]}>
              {VARIANTS[activeIndex].label}
            </Text>

            <View style={styles.actions}>
              {igStoriesAvailable && (
                <Pressable
                  onPress={handleShareToInstagramStories}
                  disabled={sharing}
                  style={[styles.shareBtn, styles.igBtn, { opacity: sharing ? 0.6 : 1 }]}
                >
                  {sharing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="logo-instagram" size={20} color="#fff" />
                      <Text style={styles.shareBtnText}>Compartilhar no Story</Text>
                    </>
                  )}
                </Pressable>
              )}
              <Pressable
                onPress={handleShareViaSystem}
                disabled={sharing}
                style={[
                  styles.shareBtn,
                  igStoriesAvailable
                    ? { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border, opacity: sharing ? 0.6 : 1 }
                    : { backgroundColor: colors.primary, opacity: sharing ? 0.6 : 1 },
                ]}
              >
                {sharing && !igStoriesAvailable ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="share-outline"
                      size={20}
                      color={igStoriesAvailable ? colors.text : "#fff"}
                    />
                    <Text
                      style={[
                        styles.shareBtnText,
                        { color: igStoriesAvailable ? colors.text : "#fff" },
                      ]}
                    >
                      {igStoriesAvailable ? "Mais opções" : "Compartilhar"}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerAction: { fontSize: 16, fontWeight: "500", width: 56 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  pager: { flexGrow: 0 },
  pagerContent: { alignItems: "center" },
  captureStage: {
    position: "absolute",
    left: 10000,
    top: 0,
  },
  page: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  checkerHint: {
    margin: 24,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    opacity: 0.5,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  variantLabel: {
    textAlign: "center",
    fontSize: 13,
    marginTop: 8,
    fontWeight: "500",
  },
  actions: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    marginTop: "auto",
    gap: 8,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  igBtn: {
    backgroundColor: "#E1306C",
  },
  shareBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

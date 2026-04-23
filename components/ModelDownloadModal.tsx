import React, { useEffect } from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../constants/theme";

interface ModelDownloadModalProps {
  visible: boolean;
  downloadProgress: number;
  isDownloading: boolean;
  isModelReady: boolean;
  isNativeAvailable?: boolean;
  onDownload: () => void;
  onUseOnline: () => void;
  onDownloadComplete: () => void;
  onClose: () => void;
}

export function ModelDownloadModal({
  visible,
  downloadProgress,
  isDownloading,
  isModelReady,
  isNativeAvailable = false,
  onDownload,
  onUseOnline,
  onDownloadComplete,
  onClose,
}: ModelDownloadModalProps) {
  const colors = useThemeColors();

  useEffect(() => {
    if (isModelReady) onDownloadComplete();
  }, [isModelReady]);

  const progressPercent = Math.round(downloadProgress * 100);
  const onDeviceDisabled = !isNativeAvailable || isDownloading;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Pressable
            onPress={onClose}
            disabled={isDownloading}
            hitSlop={12}
            style={[styles.closeBtn, { backgroundColor: colors.muted }, isDownloading && styles.btnDisabled]}
            accessibilityLabel="Fechar"
          >
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>

          <Text style={[styles.header, { color: colors.text }]}>Como deseja gerar?</Text>
          <Text style={[styles.subheader, { color: colors.textSecondary }]}>
            Escolha entre rodar no seu dispositivo ou usar a versão online.
          </Text>

          {/* On-device option */}
          <View style={[styles.option, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <View style={styles.optionHeader}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primaryHighlight }]}>
                <Ionicons name="hardware-chip-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.optionTitleWrap}>
                <View style={styles.titleRow}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>No dispositivo</Text>
                  {!isNativeAvailable && (
                    <View style={[styles.badge, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.badgeText, { color: colors.textSecondary }]}>Em breve</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                  IA local — Gemma 3 4B
                </Text>
              </View>
            </View>

            <View style={styles.bullets}>
              <Bullet color={colors.success} text="Sem internet, 100% offline" textColor={colors.text} />
              <Bullet color={colors.success} text="Gerações ilimitadas — sem cota" textColor={colors.text} />
              <Bullet color={colors.success} text="Privacidade total (nada sai do aparelho)" textColor={colors.text} />
              <Bullet color={colors.warning} text="Download único de ~2,5 GB" textColor={colors.text} />
              <Bullet color={colors.warning} text="Geração mais lenta que a online" textColor={colors.text} />
            </View>

            {isDownloading && (
              <View style={styles.progressWrap}>
                <View style={[styles.track, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${progressPercent}%`, backgroundColor: colors.primary },
                    ]}
                  />
                </View>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                  {progressPercent}%
                </Text>
              </View>
            )}

            <Pressable
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary },
                onDeviceDisabled && styles.btnDisabled,
              ]}
              onPress={onDownload}
              disabled={onDeviceDisabled}
            >
              <Ionicons
                name={isDownloading ? "cloud-download-outline" : "download-outline"}
                size={18}
                color="#fff"
              />
              <Text style={styles.primaryBtnText}>
                {isDownloading
                  ? "Baixando..."
                  : isNativeAvailable
                  ? "Baixar modelo"
                  : "Indisponível por enquanto"}
              </Text>
            </Pressable>
          </View>

          {/* Online option */}
          <View style={[styles.option, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <View style={styles.optionHeader}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primaryHighlight }]}>
                <Ionicons name="cloud-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.optionTitleWrap}>
                <View style={styles.titleRow}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>Online</Text>
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.badgeText, { color: "#fff" }]}>Recomendado</Text>
                  </View>
                </View>
                <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                  IA na nuvem — Llama 3.1 8B via Groq
                </Text>
              </View>
            </View>

            <View style={styles.bullets}>
              <Bullet color={colors.success} text="Pronto para usar agora" textColor={colors.text} />
              <Bullet color={colors.success} text="Geração rápida (poucos segundos)" textColor={colors.text} />
              <Bullet color={colors.success} text="Sem download nem espaço ocupado" textColor={colors.text} />
              <Bullet color={colors.warning} text="Requer conexão com a internet" textColor={colors.text} />
            </View>

            <Pressable
              style={[styles.secondaryBtn, { borderColor: colors.primary }]}
              onPress={onUseOnline}
              disabled={isDownloading}
            >
              <Ionicons name="flash-outline" size={18} color={colors.primary} />
              <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
                Usar versão online
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Bullet({ color, text, textColor }: { color: string; text: string; textColor: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, { backgroundColor: color }]} />
      <Text style={[styles.bulletText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    paddingTop: 44,
    gap: 14,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  header: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  subheader: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  option: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  optionTitleWrap: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  optionSubtitle: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  bullets: {
    gap: 6,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bulletText: {
    fontSize: 13,
    flex: 1,
  },
  progressWrap: {
    width: "100%",
    gap: 6,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "right",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  btnDisabled: {
    opacity: 0.45,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

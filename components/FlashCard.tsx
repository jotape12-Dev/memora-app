import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { useThemeColors } from "../constants/theme";

interface FlashCardProps {
  question: string;
  answer: string;
  flipped?: boolean;
  onFlip?: () => void;
  deckColor?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48;

export function FlashCard({ question, answer, flipped = false, onFlip, deckColor }: FlashCardProps) {
  const colors = useThemeColors();
  const rotation = useSharedValue(flipped ? 180 : 0);

  React.useEffect(() => {
    rotation.value = withTiming(flipped ? 180 : 0, {
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [flipped, rotation]);

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [0, 180]);
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: "hidden" as const,
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [180, 360]);
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: "hidden" as const,
    };
  });

  const handlePress = useCallback(() => {
    onFlip?.();
  }, [onFlip]);

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <Animated.View
        style={[
          styles.card,
          frontStyle,
          { backgroundColor: colors.surface, borderColor: deckColor ?? colors.border },
        ]}
      >
        <Text style={[styles.label, { color: colors.textSecondary }]}>PERGUNTA</Text>
        <Text style={[styles.text, { color: colors.text }]}>{question}</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Toque para ver a resposta
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          styles.cardBack,
          backStyle,
          { backgroundColor: colors.surface, borderColor: deckColor ?? colors.primary },
        ]}
      >
        <Text style={[styles.label, { color: colors.primary }]}>RESPOSTA</Text>
        <Text style={[styles.text, { color: colors.text }]}>{answer}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: 300,
    alignSelf: "center",
  },
  card: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardBack: {
    borderWidth: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  text: {
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 26,
  },
  hint: {
    position: "absolute",
    bottom: 20,
    fontSize: 13,
  },
});

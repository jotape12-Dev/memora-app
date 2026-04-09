import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

interface Props {
  isReady: boolean;
  onFinish: () => void;
}

export function AppSplashScreen({ isReady, onFinish }: Props) {
  const circleOpacity = useSharedValue(0);
  const circleScale = useSharedValue(0.5);
  const textOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    circleOpacity.value = withTiming(1, { duration: 700 });
    circleScale.value = withTiming(1, { duration: 700 });
    textOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
  }, []);

  useEffect(() => {
    if (isReady) {
      containerOpacity.value = withDelay(
        400,
        withTiming(0, { duration: 400 }, (finished) => {
          if (finished) runOnJS(onFinish)();
        })
      );
    }
  }, [isReady]);

  const circleAnimStyle = useAnimatedStyle(() => ({
    opacity: circleOpacity.value,
    transform: [{ scale: circleScale.value }],
  }));

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerAnimStyle]}>
      <Animated.View style={[styles.iconWrapper, circleAnimStyle]}>
        {/* Glow rings */}
        <View style={styles.glowRingOuter} />
        <View style={styles.glowRingMid} />
        {/* Main circle */}
        <View style={styles.circle}>
          <Ionicons name="layers" size={44} color="#fff" />
        </View>
      </Animated.View>

      <Animated.View style={[styles.textWrapper, textAnimStyle]}>
        <Text style={styles.title}>MEMORA</Text>
        <Text style={styles.subtitle}>Aprenda mais, lembre sempre</Text>
      </Animated.View>
    </Animated.View>
  );
}

const CIRCLE_SIZE = 100;
const GLOW_MID = 148;
const GLOW_OUTER = 200;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#171614",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  iconWrapper: {
    width: GLOW_OUTER,
    height: GLOW_OUTER,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRingOuter: {
    position: "absolute",
    width: GLOW_OUTER,
    height: GLOW_OUTER,
    borderRadius: GLOW_OUTER / 2,
    backgroundColor: "#01696f",
    opacity: 0.1,
  },
  glowRingMid: {
    position: "absolute",
    width: GLOW_MID,
    height: GLOW_MID,
    borderRadius: GLOW_MID / 2,
    backgroundColor: "#01696f",
    opacity: 0.2,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: "#01696f",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#01696f",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 20,
  },
  textWrapper: {
    marginTop: 40,
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#cdccca",
    letterSpacing: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#7a7974",
    letterSpacing: 0.3,
  },
});

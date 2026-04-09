import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import { usePremium } from "../hooks/usePremium";
import { Colors } from "../constants/colors";
import { AppSplashScreen } from "../components/AppSplashScreen";
import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? Colors.dark : Colors.light;
  const setSession = useAuthStore((s) => s.setSession);
  const [authReady, setAuthReady] = useState(false);
  const [timerReady, setTimerReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // A splash fica visível por no mínimo 1 segundo
  const splashReady = authReady && timerReady;

  // Sync RevenueCat premium status
  usePremium();

  useEffect(() => {
    SplashScreen.hideAsync();

    // Timer mínimo de 1 segundo
    const timer = setTimeout(() => setTimerReady(true), 1000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [setSession]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      {showSplash && (
        <AppSplashScreen
          isReady={splashReady}
          onFinish={() => setShowSplash(false)}
        />
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="review/[deckId]"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="deck/[deckId]" options={{ headerShown: false }} />
        <Stack.Screen name="capture" options={{ headerShown: false }} />
        <Stack.Screen name="preview-cards" options={{ headerShown: false }} />
        <Stack.Screen name="generate-topic" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen
          name="paywall"
          options={{ headerShown: false, presentation: "modal" }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

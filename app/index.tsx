import { Redirect } from "expo-router";
import { useAuthStore } from "../stores/authStore";
import { View, ActivityIndicator } from "react-native";
import { useThemeColors } from "../constants/theme";

export default function Index() {
  const { session, loading } = useAuthStore();
  const colors = useThemeColors();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

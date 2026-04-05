import React from "react";
import { Keyboard, Pressable, StyleSheet } from "react-native";

interface DismissKeyboardProps {
  children: React.ReactNode;
}

export function DismissKeyboard({ children }: DismissKeyboardProps) {
  return (
    <Pressable style={styles.container} onPress={Keyboard.dismiss} accessible={false}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

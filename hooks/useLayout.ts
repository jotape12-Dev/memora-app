import { useWindowDimensions } from "react-native";

export const TABLET_MIN_WIDTH = 768;
export const MAX_CONTENT_WIDTH = 680;
export const MAX_MODAL_WIDTH = 520;

export function useLayout() {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_MIN_WIDTH;
  return {
    isTablet,
    screenWidth: width,
    contentMaxWidth: isTablet ? MAX_CONTENT_WIDTH : undefined,
    hp: isTablet ? 32 : 20,
  };
}

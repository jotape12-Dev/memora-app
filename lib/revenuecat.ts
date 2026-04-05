import { Platform } from "react-native";
import Purchases from "react-native-purchases";

const API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? "";

/**
 * Initialize RevenueCat SDK.
 * Call this once during app startup after the user is authenticated.
 */
export async function initRevenueCat(userId?: string) {
  if (Platform.OS !== "ios") return;

  if (!API_KEY_IOS) {
    console.warn("RevenueCat: Missing EXPO_PUBLIC_REVENUECAT_API_KEY_IOS");
    return;
  }

  Purchases.configure({ apiKey: API_KEY_IOS, appUserID: userId });
}

/**
 * Check if the current user has an active premium entitlement.
 */
export async function checkPremiumStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active["premium"] !== undefined;
  } catch {
    return false;
  }
}

/**
 * Fetch available subscription offerings.
 */
export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

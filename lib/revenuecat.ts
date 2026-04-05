import { Platform } from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";

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

/**
 * Purchase a RevenueCat package.
 * Returns isPremium=true on success, error string on failure, or null error if user cancelled.
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ isPremium: boolean; error: string | null }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium = customerInfo.entitlements.active["premium"] !== undefined;
    return { isPremium, error: null };
  } catch (e: unknown) {
    if ((e as { userCancelled?: boolean }).userCancelled) {
      return { isPremium: false, error: "cancelled" };
    }
    return { isPremium: false, error: "purchase_failed" };
  }
}

/**
 * Restore previous purchases and return premium status.
 */
export async function restorePurchases(): Promise<{ isPremium: boolean; error: string | null }> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPremium = customerInfo.entitlements.active["premium"] !== undefined;
    return { isPremium, error: null };
  } catch {
    return { isPremium: false, error: "restore_failed" };
  }
}

import { Platform } from "react-native";
import Purchases, {
  type PurchasesPackage,
  type CustomerInfo,
  LOG_LEVEL,
} from "react-native-purchases";
import Constants from "expo-constants";

const API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? "";
const API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? "";

const ENTITLEMENT_ID = "premium";

/**
 * Whether RevenueCat is available in the current environment.
 * False in Expo Go or when API keys are missing.
 */
export function isRevenueCatAvailable(): boolean {
  if (
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === "storeClient"
  ) {
    return false;
  }
  const key = Platform.OS === "ios" ? API_KEY_IOS : API_KEY_ANDROID;
  return key.length > 0;
}

/**
 * Initialize RevenueCat SDK.
 * Call once during app startup after the user is authenticated.
 */
export async function initRevenueCat(userId?: string): Promise<void> {
  if (!isRevenueCatAvailable()) return;

  const apiKey = Platform.OS === "ios" ? API_KEY_IOS : API_KEY_ANDROID;

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({ apiKey, appUserID: userId });
}

/**
 * Register a listener for customer info changes (subscription status).
 * Returns an unsubscribe function.
 */
export function onCustomerInfoUpdated(
  callback: (info: CustomerInfo) => void
): () => void {
  if (!isRevenueCatAvailable()) return () => {};

  Purchases.addCustomerInfoUpdateListener(callback);
  // The SDK doesn't return an unsubscribe handle — return a no-op
  return () => {};
}

/**
 * Check if the current user has an active premium entitlement.
 */
export async function checkPremiumStatus(): Promise<boolean | null> {
  if (!isRevenueCatAvailable()) return null;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

/**
 * Fetch available subscription offerings.
 */
export async function getOfferings() {
  if (!isRevenueCatAvailable()) return null;

  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.all["defaut1"]) {
      return offerings.all["defaut1"];
    }
    return offerings.current;
  } catch {
    return null;
  }
}

/**
 * Purchase a RevenueCat package.
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ isPremium: boolean; error: string | null }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return { isPremium, error: null };
  } catch (e: unknown) {
    const err = e as { userCancelled?: boolean };
    if (err.userCancelled) {
      return { isPremium: false, error: "cancelled" };
    }
    return { isPremium: false, error: "purchase_failed" };
  }
}

/**
 * Restore previous purchases.
 */
export async function restorePurchases(): Promise<{ isPremium: boolean; error: string | null }> {
  if (!isRevenueCatAvailable()) {
    return { isPremium: false, error: "not_available" };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return { isPremium, error: null };
  } catch {
    return { isPremium: false, error: "restore_failed" };
  }
}

/**
 * Log out from RevenueCat (call on sign out).
 */
export async function logOutRevenueCat(): Promise<void> {
  if (!isRevenueCatAvailable()) return;

  try {
    await Purchases.logOut();
  } catch {
    // ignore — user might not be logged in
  }
}

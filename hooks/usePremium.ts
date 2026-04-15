import { useEffect } from "react";
import { useAuthStore } from "../stores/authStore";
import {
  isRevenueCatAvailable,
  checkPremiumStatus,
  onCustomerInfoUpdated,
} from "../lib/revenuecat";

const ENTITLEMENT_ID = "premium";

/**
 * Hook to check premium status.
 * Syncs RevenueCat entitlement status with the Supabase profile.
 */
export function usePremium() {
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  useEffect(() => {
    if (!profile || !isRevenueCatAvailable()) return;

    // Check once on mount
    checkPremiumStatus().then((rcPremium) => {
      if (rcPremium !== null && rcPremium !== profile.is_premium) {
        updateProfile({ is_premium: rcPremium });
      }
    });

    // Listen for changes (e.g. subscription expired, renewed)
    const unsubscribe = onCustomerInfoUpdated((info) => {
      const rcPremium = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
      if (rcPremium !== profile.is_premium) {
        updateProfile({ is_premium: rcPremium });
      }
    });

    return unsubscribe;
  }, [profile?.id]);

  return {
    isPremium: profile?.is_premium ?? false,
    profile,
  };
}

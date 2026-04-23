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

    const syncPremiumFromRevenueCat = async (rcPremium: boolean | null) => {
      if (rcPremium !== true) return;

      const currentPremium = useAuthStore.getState().profile?.is_premium ?? false;
      if (!currentPremium) {
        await updateProfile({ is_premium: true });
      }
    };

    // Check once on mount
    checkPremiumStatus().then(syncPremiumFromRevenueCat);

    // Listen for changes (e.g. subscription expired, renewed)
    const unsubscribe = onCustomerInfoUpdated((info) => {
      const rcPremium = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
      void syncPremiumFromRevenueCat(rcPremium);
    });

    return unsubscribe;
  }, [profile?.id]);

  return {
    isPremium: profile?.is_premium ?? false,
    profile,
  };
}

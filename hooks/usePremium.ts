import { useAuthStore } from "../stores/authStore";

/**
 * Hook to check premium status and access premium-gated features.
 */
export function usePremium() {
  const profile = useAuthStore((s) => s.profile);

  const isPremium = profile?.is_premium ?? false;

  return {
    isPremium,
    profile,
  };
}

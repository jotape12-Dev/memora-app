import { useAuthStore } from "../stores/authStore";

const FREE_DAILY_LIMIT = 10;

/**
 * Hook to check remaining daily AI generations for free users.
 */
export function useDailyLimit() {
  const profile = useAuthStore((s) => s.profile);

  if (!profile || profile.is_premium) {
    return {
      remaining: Infinity,
      used: 0,
      limit: Infinity,
      isLimitReached: false,
      isPremium: profile?.is_premium ?? false,
    };
  }

  const today = new Date().toISOString().split("T")[0];
  const isNewDay = profile.last_generation_date !== today;
  const used = isNewDay ? 0 : profile.daily_generation_count;
  const remaining = FREE_DAILY_LIMIT - used;

  return {
    remaining: Math.max(remaining, 0),
    used,
    limit: FREE_DAILY_LIMIT,
    isLimitReached: remaining <= 0,
    isPremium: false,
  };
}

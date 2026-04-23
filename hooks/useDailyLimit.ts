import { useAuthStore } from "../stores/authStore";

const FREE_WEEKLY_LIMIT = 10;

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0];
}

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
  const currentWeekStart = getWeekStart(today);
  const lastWeekStart = profile.last_generation_date
    ? getWeekStart(profile.last_generation_date)
    : null;
  const isNewWeek = lastWeekStart !== currentWeekStart;
  const used = isNewWeek ? 0 : profile.daily_generation_count;
  const remaining = FREE_WEEKLY_LIMIT - used;

  return {
    remaining: Math.max(remaining, 0),
    used,
    limit: FREE_WEEKLY_LIMIT,
    isLimitReached: remaining <= 0,
    isPremium: false,
  };
}

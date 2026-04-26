import { supabase } from "./supabase";

export type DailyShareStats = {
  date: string;
  deckTitles: string[];
  durationSeconds: number;
  accuracyPct: number;
  reviewedCount: number;
  correctCount: number;
};

type SessionRow = {
  created_at: string;
  deck_id: string | null;
  cards_reviewed: number;
  cards_correct: number;
  duration_seconds: number;
  decks: { title: string } | { title: string }[] | null;
};

export async function fetchTodayShareStats(): Promise<DailyShareStats | null> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Last 7 days (today + 6 prior). Time is summed across the week;
  // accuracy and decks are still scoped to today.
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const { data, error } = await supabase
    .from("review_sessions")
    .select("created_at, deck_id, cards_reviewed, cards_correct, duration_seconds, decks(title)")
    .gte("created_at", weekStart.toISOString());

  if (error || !data) return null;
  const rows = data as SessionRow[];
  if (rows.length === 0) {
    return {
      date: todayStart.toISOString().split("T")[0],
      deckTitles: [],
      durationSeconds: 0,
      accuracyPct: 0,
      reviewedCount: 0,
      correctCount: 0,
    };
  }

  const todayStartISO = todayStart.toISOString();
  const titlesByDeck = new Map<string, string>();
  let weeklyDurationSeconds = 0;
  let reviewedCount = 0;
  let correctCount = 0;

  for (const row of rows) {
    weeklyDurationSeconds += row.duration_seconds ?? 0;

    if (row.created_at >= todayStartISO) {
      reviewedCount += row.cards_reviewed ?? 0;
      correctCount += row.cards_correct ?? 0;
      if (row.deck_id) {
        const deck = Array.isArray(row.decks) ? row.decks[0] : row.decks;
        const title = deck?.title;
        if (title && !titlesByDeck.has(row.deck_id)) {
          titlesByDeck.set(row.deck_id, title);
        }
      }
    }
  }

  return {
    date: todayStart.toISOString().split("T")[0],
    deckTitles: Array.from(titlesByDeck.values()),
    durationSeconds: weeklyDurationSeconds,
    accuracyPct: reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 0,
    reviewedCount,
    correctCount,
  };
}

export function formatDurationShort(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return remMin > 0 ? `${hours}h ${remMin}min` : `${hours}h`;
}

export function formatTodayPtBR(date: string): string {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

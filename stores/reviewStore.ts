import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { ReviewSession } from "../types/database";

interface ReviewState {
  sessions: ReviewSession[];
  streak: number;
  totalReviewed: number;
  activeDays: string[]; // "YYYY-MM-DD" strings of days with at least one review
  loading: boolean;
  fetchSessions: () => Promise<void>;
  createSession: (deckId: string, cardsReviewed: number, cardsCorrect: number, durationSeconds: number) => Promise<void>;
  calculateStreak: () => Promise<number>;
  reset: () => void;
}

export const useReviewStore = create<ReviewState>((set) => ({
  sessions: [],
  streak: 0,
  totalReviewed: 0,
  activeDays: [],
  loading: false,

  fetchSessions: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from("review_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      const sessions = data as ReviewSession[];
      const totalReviewed = sessions.reduce((sum, s) => sum + s.cards_reviewed, 0);
      set({ sessions, totalReviewed });
    }
    set({ loading: false });
  },

  createSession: async (deckId, cardsReviewed, cardsCorrect, durationSeconds) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("review_sessions")
      .insert({
        user_id: user.id,
        deck_id: deckId,
        cards_reviewed: cardsReviewed,
        cards_correct: cardsCorrect,
        duration_seconds: durationSeconds,
      })
      .select()
      .single();

    if (!error && data) {
      set((state) => ({
        sessions: [data as ReviewSession, ...state.sessions],
        totalReviewed: state.totalReviewed + cardsReviewed,
      }));
    }
  },

  calculateStreak: async () => {
    const { data, error } = await supabase
      .from("review_sessions")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(365);

    if (error || !data || data.length === 0) {
      set({ streak: 0 });
      return 0;
    }

    // Get unique dates
    const dates = [...new Set(
      data.map((s) => new Date(s.created_at).toISOString().split("T")[0])
    )].sort((a, b) => b.localeCompare(a));

    set({ activeDays: dates });

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Streak must start from today or yesterday
    if (dates[0] !== today && dates[0] !== yesterday) {
      set({ streak: 0 });
      return 0;
    }

    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diffDays = (prev.getTime() - curr.getTime()) / 86400000;
      if (Math.round(diffDays) === 1) {
        streak++;
      } else {
        break;
      }
    }

    set({ streak });
    return streak;
  },

  reset: () => set({
    sessions: [],
    streak: 0,
    totalReviewed: 0,
    activeDays: [],
  }),
}));

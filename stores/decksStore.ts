import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { Deck, Flashcard, GeneratedFlashcard, SM2Rating } from "../types/database";
import { calculateSM2 } from "../lib/sm2";

const MAX_CARDS_PER_SESSION = 50;

interface DecksState {
  // Decks
  decks: Deck[];
  loading: boolean;
  fetchDecks: () => Promise<void>;
  createDeck: (title: string, subject?: string, color?: string) => Promise<Deck | null>;
  updateDeck: (id: string, updates: Partial<Deck>) => Promise<void>;
  deleteDeck: (id: string) => Promise<void>;

  // Flashcards
  flashcards: Flashcard[];
  dueCards: Flashcard[];
  fetchFlashcardsByDeck: (deckId: string) => Promise<void>;
  fetchDueCards: (deckId?: string) => Promise<void>;
  fetchAllDueCards: () => Promise<void>;
  addFlashcard: (deckId: string, question: string, answer: string) => Promise<void>;
  addFlashcards: (deckId: string, cards: GeneratedFlashcard[]) => Promise<void>;
  updateFlashcard: (id: string, updates: Partial<Flashcard>) => Promise<void>;
  deleteFlashcard: (id: string) => Promise<void>;
  reviewCard: (card: Flashcard, rating: SM2Rating) => Promise<void>;

  // AI Generation
  generatedCards: GeneratedFlashcard[];
  generating: boolean;
  generateFromText: (text: string, quantity?: number) => Promise<{ error?: string }>;
  generateFromTopic: (topic: string, quantity?: number, level?: string, language?: string, additionalContext?: string) => Promise<{ error?: string }>;
  setGeneratedCards: (cards: GeneratedFlashcard[]) => void;
  clearGeneratedCards: () => void;
}

export const useDecksStore = create<DecksState>((set) => ({
  // ─── Decks ───────────────────────────────────────────────
  decks: [],
  loading: false,

  fetchDecks: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from("decks")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      set({ decks: data as Deck[] });
    }
    set({ loading: false });
  },

  createDeck: async (title, subject, color) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("decks")
      .insert({
        user_id: user.id,
        title,
        subject: subject || null,
        color: color || "#01696f",
      })
      .select()
      .single();

    if (!error && data) {
      const deck = data as Deck;
      set((state) => ({ decks: [deck, ...state.decks] }));
      return deck;
    }
    return null;
  },

  updateDeck: async (id, updates) => {
    const { error } = await supabase.from("decks").update(updates).eq("id", id);
    if (!error) {
      set((state) => ({
        decks: state.decks.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      }));
    }
  },

  deleteDeck: async (id) => {
    const { error } = await supabase.from("decks").delete().eq("id", id);
    if (!error) {
      set((state) => ({
        decks: state.decks.filter((d) => d.id !== id),
      }));
    }
  },

  // ─── Flashcards ──────────────────────────────────────────
  flashcards: [],
  dueCards: [],

  fetchFlashcardsByDeck: async (deckId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      set({ flashcards: data as Flashcard[] });
    }
    set({ loading: false });
  },

  fetchDueCards: async (deckId) => {
    const today = new Date().toISOString().split("T")[0];
    let query = supabase
      .from("flashcards")
      .select("*")
      .lte("next_review_at", today)
      .order("next_review_at", { ascending: true })
      .limit(MAX_CARDS_PER_SESSION);

    if (deckId) {
      query = query.eq("deck_id", deckId);
    }

    const { data, error } = await query;

    if (!error && data) {
      set({ dueCards: data as Flashcard[] });
    }
  },

  fetchAllDueCards: async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .lte("next_review_at", today)
      .order("next_review_at", { ascending: true })
      .limit(MAX_CARDS_PER_SESSION);

    if (!error && data) {
      set({ dueCards: data as Flashcard[] });
    }
  },

  addFlashcard: async (deckId, question, answer) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("flashcards")
      .insert({ deck_id: deckId, user_id: user.id, question, answer })
      .select()
      .single();

    if (!error && data) {
      set((state) => ({ flashcards: [data as Flashcard, ...state.flashcards] }));
    }
  },

  addFlashcards: async (deckId, cards) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const rows = cards.map((c) => ({
      deck_id: deckId,
      user_id: user.id,
      question: c.question,
      answer: c.answer,
    }));

    const { data, error } = await supabase
      .from("flashcards")
      .insert(rows)
      .select();

    if (!error && data) {
      set((state) => ({ flashcards: [...(data as Flashcard[]), ...state.flashcards] }));
    }
  },

  updateFlashcard: async (id, updates) => {
    const { error } = await supabase.from("flashcards").update(updates).eq("id", id);
    if (!error) {
      set((state) => ({
        flashcards: state.flashcards.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      }));
    }
  },

  deleteFlashcard: async (id) => {
    const { error } = await supabase.from("flashcards").delete().eq("id", id);
    if (!error) {
      set((state) => ({
        flashcards: state.flashcards.filter((f) => f.id !== id),
        dueCards: state.dueCards.filter((f) => f.id !== id),
      }));
    }
  },

  reviewCard: async (card, rating) => {
    const result = calculateSM2(card, rating);

    const { error } = await supabase
      .from("flashcards")
      .update({
        interval: result.interval,
        ease_factor: result.ease_factor,
        repetitions: result.repetitions,
        next_review_at: result.next_review_at,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("id", card.id);

    if (!error) {
      set((state) => ({
        dueCards: state.dueCards.filter((f) => f.id !== card.id),
      }));
    }
  },

  // ─── AI Generation ───────────────────────────────────────
  generatedCards: [],
  generating: false,

  generateFromText: async (text, quantity = 10) => {
    set({ generating: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { error: "Not authenticated" };

      const response = await supabase.functions.invoke("generate-from-text", {
        body: { text, quantity },
      });

      if (response.error) {
        return { error: response.error.message };
      }

      const data = response.data;

      if (data.error === "daily_limit_reached") {
        return { error: "daily_limit_reached" };
      }

      if (data.flashcards && Array.isArray(data.flashcards)) {
        set({ generatedCards: data.flashcards });
        return {};
      }

      return { error: "Invalid response from AI" };
    } catch {
      return { error: "Failed to generate flashcards" };
    } finally {
      set({ generating: false });
    }
  },

  generateFromTopic: async (topic, quantity = 10, level = "Intermediário", language = "Português", additionalContext) => {
    set({ generating: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { error: "Not authenticated" };

      const response = await supabase.functions.invoke("generate-from-topic", {
        body: { topic, quantity, level, language, additionalContext },
      });

      if (response.error) {
        return { error: response.error.message };
      }

      const data = response.data;

      if (data.error === "premium_required") {
        return { error: "premium_required" };
      }

      if (data.flashcards && Array.isArray(data.flashcards)) {
        set({ generatedCards: data.flashcards });
        return {};
      }

      return { error: "Invalid response from AI" };
    } catch {
      return { error: "Failed to generate flashcards" };
    } finally {
      set({ generating: false });
    }
  },

  setGeneratedCards: (cards) => set({ generatedCards: cards }),
  clearGeneratedCards: () => set({ generatedCards: [] }),
}));

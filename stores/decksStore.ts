import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { normalizeDisplayName } from "../lib/displayName";
import type { Deck, Flashcard, GeneratedFlashcard, SM2Rating, ErrorDeckCard } from "../types/database";
import { calculateSM2 } from "../lib/sm2";

interface ErrorDeckRow {
  flashcard_id: string;
  flashcards: Flashcard;
}

const MAX_CARDS_PER_SESSION = 50;
const ERROR_DECK_COLOR = "#a12c7b";
const ERROR_DECK_TITLE = "Revisão Urgente";

function normalizeDeckList(allDecks: Deck[]): Deck[] {
  const errorDecks = allDecks.filter((d) => d.is_error_deck);
  if (errorDecks.length === 0) return allDecks;

  const canonicalErrorDeck = errorDecks.reduce((oldest, current) =>
    current.created_at < oldest.created_at ? current : oldest
  );

  return allDecks.filter((d) => !d.is_error_deck || d.id === canonicalErrorDeck.id);
}

interface DecksState {
  // Decks
  decks: Deck[];
  loading: boolean;
  fetchDecks: () => Promise<void>;
  createDeck: (title: string, subject?: string, color?: string) => Promise<Deck | null>;
  updateDeck: (id: string, updates: Partial<Deck>) => Promise<void>;
  deleteDeck: (id: string) => Promise<void>;

  // Error deck
  errorDeck: Deck | null;
  errorDeckCardCount: number;
  ensureErrorDeck: () => Promise<Deck | null>;
  handleErrorDeckAfterReview: (card: Flashcard, rating: SM2Rating) => Promise<void>;
  fetchErrorDeckCount: () => Promise<void>;

  // Flashcards
  flashcards: Flashcard[];
  dueCards: Flashcard[];
  deckDueCards: Flashcard[];
  fetchFlashcardsByDeck: (deckId: string) => Promise<void>;
  fetchDueCards: (deckId: string) => Promise<void>;
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
  reset: () => void;
}

export const useDecksStore = create<DecksState>((set, get) => ({
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
      const normalizedDecks = normalizeDeckList(data as Deck[]);
      const errDeck = normalizedDecks.find((d) => d.is_error_deck) ?? null;
      set({ decks: normalizedDecks, errorDeck: errDeck });
    }
    set({ loading: false });
  },

  createDeck: async (title, subject, color) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return null;

    const payload = {
      user_id: user.id,
      title,
      subject: subject || null,
      color: color || "#01696f",
    };

    let { data, error } = await supabase
      .from("decks")
      .insert(payload)
      .select()
      .single();

    // Recovery for users without a profile row (FK on decks.user_id -> profiles.id)
    if (error?.code === "23503") {
      const fallbackDisplayName = normalizeDisplayName(
        (user.user_metadata?.display_name as string | undefined) ??
        (user.user_metadata?.full_name as string | undefined) ??
        user.email?.split("@")[0] ??
        null
      );

      await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            display_name: fallbackDisplayName,
          },
          { onConflict: "id" }
        );

      const retry = await supabase
        .from("decks")
        .insert(payload)
        .select()
        .single();

      data = retry.data;
      error = retry.error;
    }

    if (!error && data) {
      const deck = data as Deck;
      set((state) => ({ decks: [deck, ...state.decks] }));
      return deck;
    }
    return null;
  },

  updateDeck: async (id, updates) => {
    // Prevent renaming error deck
    const deck = get().decks.find((d) => d.id === id);
    if (deck?.is_error_deck && updates.title) return;

    const { error } = await supabase.from("decks").update(updates).eq("id", id);
    if (!error) {
      set((state) => ({
        decks: state.decks.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      }));
    }
  },

  deleteDeck: async (id) => {
    // Prevent deleting error deck
    const deck = get().decks.find((d) => d.id === id);
    if (deck?.is_error_deck) return;

    const { error } = await supabase.from("decks").delete().eq("id", id);
    if (!error) {
      set((state) => ({
        decks: state.decks.filter((d) => d.id !== id),
      }));
    }
  },

  // ─── Error Deck ─────────────────────────────────────────
  errorDeck: null,
  errorDeckCardCount: 0,

  ensureErrorDeck: async () => {
    const existing = get().errorDeck;
    if (existing) return existing;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check DB first
    const { data: found } = await supabase
      .from("decks")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_error_deck", true)
      .order("created_at", { ascending: true })
      .limit(1);

    if (found && found.length > 0) {
      const deck = found[0] as Deck;
      set((state) => ({
        errorDeck: deck,
        decks: state.decks.some((d) => d.id === deck.id) ? state.decks : [deck, ...state.decks],
      }));
      return deck;
    }

    // Create it
    const { data: created, error } = await supabase
      .from("decks")
      .insert({
        user_id: user.id,
        title: ERROR_DECK_TITLE,
        color: ERROR_DECK_COLOR,
        is_error_deck: true,
      })
      .select()
      .single();

    if (!error && created) {
      const deck = created as Deck;
      set((state) => ({
        errorDeck: deck,
        decks: state.decks.some((d) => d.id === deck.id) ? state.decks : [deck, ...state.decks],
      }));
      return deck;
    }
    return null;
  },

  handleErrorDeckAfterReview: async (card, rating) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const shouldAddToErrorDeck = rating === 0 || rating === 2;
    const shouldHandleRecovery = rating === 3 || rating === 5;
    if (!shouldAddToErrorDeck && !shouldHandleRecovery) return;

    let errDeck = get().errorDeck;

    if (shouldAddToErrorDeck) {
      errDeck = await get().ensureErrorDeck();
    } else if (!errDeck) {
      const { data: found } = await supabase
        .from("decks")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_error_deck", true)
        .order("created_at", { ascending: true })
        .limit(1);

      if (found && found.length > 0) {
        const deck = found[0] as Deck;
        errDeck = deck;
        set((state) => ({
          errorDeck: deck,
          decks: state.decks.some((d) => d.id === deck.id) ? state.decks : [deck, ...state.decks],
        }));
      }
    }

    if (!errDeck) return;
    // Skip if the card is already IN the error deck
    if (card.deck_id === errDeck.id) return;

    if (rating === 0 || rating === 2) {
      // Add to error deck if not present, reset consecutive_correct
      const { data: existing } = await supabase
        .from("error_deck_cards")
        .select("id")
        .eq("flashcard_id", card.id)
        .eq("error_deck_id", errDeck.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("error_deck_cards")
          .update({ consecutive_correct: 0 })
          .eq("id", existing.id);
      } else {
        await supabase.from("error_deck_cards").insert({
          user_id: user.id,
          flashcard_id: card.id,
          error_deck_id: errDeck.id,
          consecutive_correct: 0,
        });
      }
    } else if (rating === 3 || rating === 5) {
      // Increment consecutive_correct; remove at 2
      const { data: existing } = await supabase
        .from("error_deck_cards")
        .select("*")
        .eq("flashcard_id", card.id)
        .eq("error_deck_id", errDeck.id)
        .maybeSingle();

      if (existing) {
        const entry = existing as ErrorDeckCard;
        const newCount = entry.consecutive_correct + 1;
        if (newCount >= 2) {
          await supabase.from("error_deck_cards").delete().eq("id", entry.id);
        } else {
          await supabase
            .from("error_deck_cards")
            .update({ consecutive_correct: newCount })
            .eq("id", entry.id);
        }
      }
    }

    // Refresh the count
    await get().fetchErrorDeckCount();
  },

  fetchErrorDeckCount: async () => {
    const errDeck = get().errorDeck;
    if (!errDeck) {
      set({ errorDeckCardCount: 0 });
      return;
    }

    const { count, error } = await supabase
      .from("error_deck_cards")
      .select("id", { count: "exact", head: true })
      .eq("error_deck_id", errDeck.id);

    if (error || count === null) return;

    if (count === 0) {
      const { error: deleteError } = await supabase
        .from("decks")
        .delete()
        .eq("id", errDeck.id)
        .eq("is_error_deck", true);

      if (!deleteError) {
        set((state) => ({
          errorDeck: null,
          errorDeckCardCount: 0,
          decks: state.decks.filter((d) => d.id !== errDeck.id),
        }));
        return;
      }
    }

    set({ errorDeckCardCount: count });
  },

  // ─── Flashcards ──────────────────────────────────────────
  flashcards: [],
  dueCards: [],
  deckDueCards: [],

  fetchFlashcardsByDeck: async (deckId) => {
    set({ loading: true });

    // Check if this is the error deck — show linked cards instead
    const deck = get().decks.find((d) => d.id === deckId);
    if (deck?.is_error_deck) {
      const { data, error } = await supabase
        .from("error_deck_cards")
        .select("flashcard_id, flashcards(*)")
        .eq("error_deck_id", deckId)
        .returns<ErrorDeckRow[]>();

      if (!error && data) {
        const cards = data.map((row) => row.flashcards).filter(Boolean);
        set({ flashcards: cards });
      }
      set({ loading: false });
      return;
    }

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

    // Check if error deck — fetch due cards from linked flashcards
    const deck = get().decks.find((d) => d.id === deckId);
    if (deck?.is_error_deck) {
      const { data } = await supabase
        .from("error_deck_cards")
        .select("flashcard_id, flashcards(*)")
        .eq("error_deck_id", deckId)
        .returns<ErrorDeckRow[]>();

      if (data) {
        const allLinked = data.map((row) => row.flashcards).filter(Boolean);
        const due = allLinked
          .filter((c) => c.next_review_at <= today)
          .sort((a, b) => a.next_review_at.localeCompare(b.next_review_at))
          .slice(0, MAX_CARDS_PER_SESSION);
        set({ deckDueCards: due });
      }
      return;
    }

    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("deck_id", deckId)
      .lte("next_review_at", today)
      .order("next_review_at", { ascending: true })
      .limit(MAX_CARDS_PER_SESSION);

    if (!error && data) {
      set({ deckDueCards: data as Flashcard[] });
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
      set((state) => ({
        flashcards: [data as Flashcard, ...state.flashcards],
        decks: state.decks.map((d) =>
          d.id === deckId ? { ...d, card_count: d.card_count + 1 } : d
        ),
      }));
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
      set((state) => ({
        flashcards: [...(data as Flashcard[]), ...state.flashcards],
        decks: state.decks.map((d) =>
          d.id === deckId ? { ...d, card_count: d.card_count + rows.length } : d
        ),
      }));
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
    const card = get().flashcards.find((f) => f.id === id);
    const { error } = await supabase.from("flashcards").delete().eq("id", id);
    if (!error) {
      set((state) => ({
        flashcards: state.flashcards.filter((f) => f.id !== id),
        dueCards: state.dueCards.filter((f) => f.id !== id),
        deckDueCards: state.deckDueCards.filter((f) => f.id !== id),
        decks: card
          ? state.decks.map((d) =>
              d.id === card.deck_id ? { ...d, card_count: Math.max(0, d.card_count - 1) } : d
            )
          : state.decks,
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
        deckDueCards: state.deckDueCards.filter((f) => f.id !== card.id),
      }));

      // Error deck logic — runs in background
      get().handleErrorDeckAfterReview(card, rating);
    }
  },

  // ─── AI Generation ───────────────────────────────────────
  generatedCards: [],
  generating: false,

  generateFromText: async (text, quantity = 10) => {
    set({ generating: true });
    try {
      const { data, error } = await supabase.functions.invoke<{ flashcards?: GeneratedFlashcard[]; error?: string }>(
        "generate-from-text",
        { body: { text, quantity } }
      );

      if (error) {
        let errMsg = "AI generation failed";
        try {
          const body = await (error as { context?: Response }).context?.json();
          if (body?.error) errMsg = body.error;
          else if (body?.message) errMsg = body.message;
        } catch { /* ignore */ }

        if (errMsg === "daily_limit_reached") return { error: "daily_limit_reached" };
        return { error: errMsg };
      }

      if (data?.flashcards && Array.isArray(data.flashcards)) {
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
      const { data, error } = await supabase.functions.invoke<{ flashcards?: GeneratedFlashcard[]; error?: string }>(
        "generate-from-topic",
        { body: { topic, quantity, level, language, additionalContext } }
      );

      if (error) {
        let errMsg = "AI generation failed";
        try {
          const body = await (error as { context?: Response }).context?.json();
          if (body?.error) errMsg = body.error;
          else if (body?.message) errMsg = body.message;
        } catch { /* ignore */ }

        if (errMsg === "premium_required") return { error: "premium_required" };
        return { error: errMsg };
      }

      if (data?.flashcards && Array.isArray(data.flashcards)) {
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

  reset: () => set({
    decks: [],
    flashcards: [],
    dueCards: [],
    deckDueCards: [],
    errorDeck: null,
    errorDeckCardCount: 0,
    generatedCards: [],
    loading: false,
  }),
}));

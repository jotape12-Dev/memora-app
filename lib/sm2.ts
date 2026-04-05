import { Card, Scheduler } from "@open-spaced-repetition/sm-2";
import type { Flashcard, SM2Rating } from "../types/database";

interface SM2Result {
  interval: number;
  ease_factor: number;
  repetitions: number;
  next_review_at: string;
}

/**
 * Wrapper around @open-spaced-repetition/sm-2.
 * Converts our Flashcard DB model to/from the library's Card model.
 *
 * UI rating mapping:
 *   Errei = 0, Difícil = 2, Bom = 3, Fácil = 5
 */
export function calculateSM2(flashcard: Flashcard, rating: SM2Rating): SM2Result {
  const card = new Card(
    undefined,
    flashcard.repetitions,
    flashcard.ease_factor,
    flashcard.interval,
    new Date(flashcard.next_review_at),
  );

  const { card: updated } = Scheduler.reviewCard(card, rating);

  const next_review_at = updated.due.toISOString().split("T")[0];

  return {
    interval: updated.I,
    ease_factor: Math.round(updated.EF * 100) / 100,
    repetitions: updated.n,
    next_review_at,
  };
}

export function isCardDueToday(card: Flashcard): boolean {
  const today = new Date().toISOString().split("T")[0];
  return card.next_review_at <= today;
}

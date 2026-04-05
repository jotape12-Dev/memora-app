export interface Profile {
  id: string;
  display_name: string | null;
  is_premium: boolean;
  daily_generation_count: number;
  last_generation_date: string | null;
  created_at: string;
}

export interface Deck {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  color: string;
  card_count: number;
  created_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  user_id: string;
  question: string;
  answer: string;
  interval: number;
  ease_factor: number;
  repetitions: number;
  next_review_at: string;
  last_reviewed_at: string | null;
  created_at: string;
}

export interface ReviewSession {
  id: string;
  user_id: string;
  deck_id: string | null;
  cards_reviewed: number;
  cards_correct: number;
  duration_seconds: number;
  created_at: string;
}

export interface GeneratedFlashcard {
  question: string;
  answer: string;
}

export type SM2Rating = 0 | 1 | 2 | 3 | 4 | 5;

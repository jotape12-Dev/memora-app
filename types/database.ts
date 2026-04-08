export interface Profile {
  id: string;
  display_name: string | null;
  is_premium: boolean;
  daily_generation_count: number;
  last_generation_date: string | null;
  goal_title: string | null;
  goal_date: string | null;
  goal_subject: string | null;
  created_at: string;
}

export interface Deck {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  color: string;
  card_count: number;
  is_error_deck: boolean;
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

export interface ErrorDeckCard {
  id: string;
  user_id: string;
  flashcard_id: string;
  error_deck_id: string;
  consecutive_correct: number;
  created_at: string;
}

export interface GeneratedFlashcard {
  question: string;
  answer: string;
}

export type SM2Rating = 0 | 1 | 2 | 3 | 4 | 5;

export interface DeckStats {
  total_reviews: number;
  total_correct: number;
  accuracy: number;
  daily_stats: Array<{ date: string; count: number }>;
  hardest_cards: Array<{ id: string; question: string; ease_factor: number }>;
}

export interface HomeStats {
  today_reviewed: number;
  today_correct: number;
  today_duration: number;
  today_sessions: number;
  daily_stats: Array<{ date: string; count: number }>;
}

-- ============================================
-- Memora — Initial Database Schema
-- ============================================

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  is_premium boolean default false,
  daily_generation_count integer default 0,
  last_generation_date date,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- Decks
-- ============================================

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  subject text,
  color text default '#01696f',
  card_count integer default 0,
  created_at timestamptz default now()
);

alter table public.decks enable row level security;

create policy "Users can view own decks"
  on public.decks for select
  using (auth.uid() = user_id);

create policy "Users can insert own decks"
  on public.decks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own decks"
  on public.decks for update
  using (auth.uid() = user_id);

create policy "Users can delete own decks"
  on public.decks for delete
  using (auth.uid() = user_id);

-- ============================================
-- Flashcards
-- ============================================

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid references public.decks(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  question text not null,
  answer text not null,
  -- SM-2 fields
  interval integer default 1,
  ease_factor float default 2.5,
  repetitions integer default 0,
  next_review_at date default current_date,
  last_reviewed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.flashcards enable row level security;

create policy "Users can view own flashcards"
  on public.flashcards for select
  using (auth.uid() = user_id);

create policy "Users can insert own flashcards"
  on public.flashcards for insert
  with check (auth.uid() = user_id);

create policy "Users can update own flashcards"
  on public.flashcards for update
  using (auth.uid() = user_id);

create policy "Users can delete own flashcards"
  on public.flashcards for delete
  using (auth.uid() = user_id);

-- Trigger to update deck card_count
create or replace function public.update_deck_card_count()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    update public.decks set card_count = card_count + 1 where id = NEW.deck_id;
  elsif TG_OP = 'DELETE' then
    update public.decks set card_count = card_count - 1 where id = OLD.deck_id;
  end if;
  return coalesce(NEW, OLD);
end;
$$;

create trigger on_flashcard_change
  after insert or delete on public.flashcards
  for each row execute procedure public.update_deck_card_count();

-- ============================================
-- Review Sessions
-- ============================================

create table public.review_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  deck_id uuid references public.decks(id) on delete set null,
  cards_reviewed integer default 0,
  cards_correct integer default 0,
  duration_seconds integer default 0,
  created_at timestamptz default now()
);

alter table public.review_sessions enable row level security;

create policy "Users can view own review sessions"
  on public.review_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own review sessions"
  on public.review_sessions for insert
  with check (auth.uid() = user_id);

-- ============================================
-- Indexes
-- ============================================

create index idx_flashcards_deck_id on public.flashcards(deck_id);
create index idx_flashcards_next_review on public.flashcards(user_id, next_review_at);
create index idx_decks_user_id on public.decks(user_id);
create index idx_review_sessions_user_id on public.review_sessions(user_id);

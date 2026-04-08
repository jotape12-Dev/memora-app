-- ============================================
-- Migration 002: Error Deck + Goals + Home Stats
-- ============================================

-- 1) Add is_error_deck flag to decks
alter table public.decks add column if not exists is_error_deck boolean default false;

-- 2) Error deck cards tracking table
create table if not exists public.error_deck_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  flashcard_id uuid references public.flashcards(id) on delete cascade not null,
  error_deck_id uuid references public.decks(id) on delete cascade not null,
  consecutive_correct integer default 0,
  created_at timestamptz default now(),
  unique(flashcard_id, error_deck_id)
);

alter table public.error_deck_cards enable row level security;

create policy "Users can view own error_deck_cards"
  on public.error_deck_cards for select
  using (auth.uid() = user_id);

create policy "Users can insert own error_deck_cards"
  on public.error_deck_cards for insert
  with check (auth.uid() = user_id);

create policy "Users can update own error_deck_cards"
  on public.error_deck_cards for update
  using (auth.uid() = user_id);

create policy "Users can delete own error_deck_cards"
  on public.error_deck_cards for delete
  using (auth.uid() = user_id);

create index if not exists idx_error_deck_cards_user on public.error_deck_cards(user_id);
create index if not exists idx_error_deck_cards_flashcard on public.error_deck_cards(flashcard_id);

-- 3) Goal fields on profiles
alter table public.profiles add column if not exists goal_title text;
alter table public.profiles add column if not exists goal_date date;
alter table public.profiles add column if not exists goal_subject text;

-- 4) RPC: get_deck_stats — returns performance data for a single deck
create or replace function public.get_deck_stats(p_deck_id uuid)
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  result json;
  v_user_id uuid;
begin
  -- Enforce RLS: only owner can call
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Verify deck ownership
  if not exists (select 1 from public.decks where id = p_deck_id and user_id = v_user_id) then
    raise exception 'Deck not found';
  end if;

  select json_build_object(
    'total_reviews', coalesce(rs.total_reviews, 0),
    'total_correct', coalesce(rs.total_correct, 0),
    'accuracy', case when coalesce(rs.total_reviews, 0) > 0
      then round((coalesce(rs.total_correct, 0)::numeric / rs.total_reviews) * 100, 1)
      else 0 end,
    'daily_stats', coalesce(ds.daily, '[]'::json),
    'hardest_cards', coalesce(hc.cards, '[]'::json)
  ) into result
  from (
    select sum(cards_reviewed) as total_reviews, sum(cards_correct) as total_correct
    from public.review_sessions
    where deck_id = p_deck_id and user_id = v_user_id
  ) rs,
  (
    select json_agg(
      json_build_object('date', d.day, 'count', d.cnt)
      order by d.day
    ) as daily
    from (
      select date_trunc('day', created_at)::date as day, sum(cards_reviewed) as cnt
      from public.review_sessions
      where deck_id = p_deck_id and user_id = v_user_id
        and created_at >= (current_date - interval '6 days')
      group by day
    ) d
  ) ds,
  (
    select json_agg(
      json_build_object('id', f.id, 'question', f.question, 'ease_factor', f.ease_factor)
      order by f.ease_factor asc
    ) as cards
    from (
      select id, question, ease_factor
      from public.flashcards
      where deck_id = p_deck_id and user_id = v_user_id
        and ease_factor < 2.0
      order by ease_factor asc
      limit 3
    ) f
  ) hc;

  return result;
end;
$$;

-- 5) RPC: get_home_stats — returns aggregated review stats for the dashboard
create or replace function public.get_home_stats(p_days integer default 7)
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  result json;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select json_build_object(
    'today_reviewed', coalesce(td.reviewed, 0),
    'today_correct', coalesce(td.correct, 0),
    'today_duration', coalesce(td.duration, 0),
    'today_sessions', coalesce(td.sess_count, 0),
    'daily_stats', coalesce(ds.daily, '[]'::json)
  ) into result
  from (
    select
      sum(cards_reviewed) as reviewed,
      sum(cards_correct) as correct,
      sum(duration_seconds) as duration,
      count(*) as sess_count
    from public.review_sessions
    where user_id = v_user_id
      and created_at::date = current_date
  ) td,
  (
    select json_agg(
      json_build_object('date', d.day, 'count', d.cnt)
      order by d.day
    ) as daily
    from (
      select created_at::date as day, sum(cards_reviewed) as cnt
      from public.review_sessions
      where user_id = v_user_id
        and created_at >= (current_date - (p_days - 1) * interval '1 day')
      group by day
    ) d
  ) ds;

  return result;
end;
$$;

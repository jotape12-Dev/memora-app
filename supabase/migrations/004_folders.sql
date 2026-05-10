-- ============================================
-- Migration 004: Folders for organizing decks
-- ============================================
-- Folders can contain decks and one level of sub-folders.
-- Max depth: 2 (root folder > sub-folder > decks).
-- Deleting a folder cascades to sub-folders, decks, and flashcards inside.

-- 1) Folders table
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  parent_folder_id uuid references public.folders(id) on delete cascade,
  name text not null,
  color text default '#01696f',
  icon text default 'folder',
  created_at timestamptz default now()
);

alter table public.folders enable row level security;

create policy "Users can view own folders"
  on public.folders for select
  using (auth.uid() = user_id);

create policy "Users can insert own folders"
  on public.folders for insert
  with check (auth.uid() = user_id);

create policy "Users can update own folders"
  on public.folders for update
  using (auth.uid() = user_id);

create policy "Users can delete own folders"
  on public.folders for delete
  using (auth.uid() = user_id);

create index if not exists idx_folders_user on public.folders(user_id);
create index if not exists idx_folders_parent on public.folders(parent_folder_id);

-- 2) Enforce max depth of 2 levels (root > sub-folder; no grand-children)
create or replace function public.enforce_folder_max_depth()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  parent_parent uuid;
begin
  if NEW.parent_folder_id is null then
    return NEW;
  end if;

  -- Reject self-reference
  if NEW.parent_folder_id = NEW.id then
    raise exception 'Folder cannot be its own parent';
  end if;

  select parent_folder_id into parent_parent
  from public.folders
  where id = NEW.parent_folder_id;

  -- If the parent already has a parent, we'd be at depth 3 — reject.
  if parent_parent is not null then
    raise exception 'Folder depth limit reached (max 2 levels)';
  end if;

  return NEW;
end;
$$;

drop trigger if exists folders_max_depth on public.folders;
create trigger folders_max_depth
  before insert or update on public.folders
  for each row execute procedure public.enforce_folder_max_depth();

-- 3) Add folder_id to decks (nullable — decks can live at root)
alter table public.decks add column if not exists folder_id uuid references public.folders(id) on delete cascade;

create index if not exists idx_decks_folder on public.decks(folder_id);

-- 4) The depth-enforcement function is a trigger only — not meant to be callable
-- as an RPC. Revoke execute so it doesn't appear in the public PostgREST API.
revoke execute on function public.enforce_folder_max_depth() from anon, authenticated, public;

-- ============================================
-- Migration 003: Manual premium grant helpers
-- ============================================

-- Admin helper: set premium directly by user id.
-- This is useful for owner/test accounts that should stay premium permanently
-- without depending on App Store/Play Store purchases.
create or replace function public.set_account_premium(
  p_user_id uuid,
  p_is_premium boolean default true
)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, is_premium)
  values (p_user_id, p_is_premium)
  on conflict (id) do update
    set is_premium = excluded.is_premium;
end;
$$;

-- Convenience helper: resolve user by email, then apply premium flag.
create or replace function public.set_account_premium_by_email(
  p_email text,
  p_is_premium boolean default true
)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  select id
    into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'User not found for email %', p_email;
  end if;

  perform public.set_account_premium(v_user_id, p_is_premium);
  return v_user_id;
end;
$$;

revoke all on function public.set_account_premium(uuid, boolean) from public, anon, authenticated;
revoke all on function public.set_account_premium_by_email(text, boolean) from public, anon, authenticated;

grant execute on function public.set_account_premium(uuid, boolean) to service_role;
grant execute on function public.set_account_premium_by_email(text, boolean) to service_role;

-- Ensure gen_random_uuid is available
create extension if not exists pgcrypto;

-- Helper function to seed defaults for a single user
create or replace function public.seed_default_categories_for_user(target_user_id uuid)
returns void
language plpgsql
as $$
begin
  insert into public.categories (user_id, name, icon)
  select target_user_id, n, i
  from unnest(array[
    'Food',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Health',
    'Travel',
    'Education',
    'Other'
  ]) as n,
  unnest(array[
    '🍽️',
    '🚌',
    '🛒',
    '🎬',
    '🏥',
    '✈️',
    '📚',
    '📦'
  ]) as i
  on conflict (user_id, name) do nothing;
end;
$$;

-- Backfill existing users (based on profiles)
select public.seed_default_categories_for_user(p.user_id)
from public.profiles p
where not exists (
  select 1 from public.categories c where c.user_id = p.user_id
);

-- Trigger to seed defaults when a profile is created
create or replace function public.handle_profile_insert_seed_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_categories_for_user(new.user_id);
  return new;
end;
$$;

drop trigger if exists trg_seed_categories_on_profile on public.profiles;
create trigger trg_seed_categories_on_profile
after insert on public.profiles
for each row execute function public.handle_profile_insert_seed_categories();

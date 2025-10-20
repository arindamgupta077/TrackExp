-- Create categories table for user-customizable categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone not null default now(),
  unique(user_id, name)
);

-- Enable RLS
alter table public.categories enable row level security;

-- Policies
create policy if not exists "Users can view own categories"
  on public.categories for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update own categories"
  on public.categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users can delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

-- PC Builder — Supabase schema
-- Run this once in: Supabase Dashboard → SQL Editor → New query

create table if not exists public.components (
  id          text primary key,
  category    text not null,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at on every UPDATE
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists components_set_updated_at on public.components;
create trigger components_set_updated_at
before update on public.components
for each row execute function public.set_updated_at();

-- Enable Row Level Security
alter table public.components enable row level security;

-- Anonymous full access (personal-tool mode)
-- ⚠️ This means anyone with your anon key + URL can read/write inventory.
-- For multi-user or public deployments, replace with auth-based policies.
drop policy if exists "anon select" on public.components;
drop policy if exists "anon insert" on public.components;
drop policy if exists "anon update" on public.components;
drop policy if exists "anon delete" on public.components;

create policy "anon select" on public.components for select to anon using (true);
create policy "anon insert" on public.components for insert to anon with check (true);
create policy "anon update" on public.components for update to anon using (true) with check (true);
create policy "anon delete" on public.components for delete to anon using (true);

create index if not exists components_category_idx on public.components (category);

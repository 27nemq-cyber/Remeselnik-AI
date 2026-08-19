-- Remeselnik AI: learning history
-- The estimates table already exists in the connected Supabase project.
-- This migration documents the RLS policies required by the prototype.

alter table public.estimates enable row level security;

drop policy if exists "Public can read estimates" on public.estimates;
drop policy if exists "Public can create estimates" on public.estimates;
drop policy if exists "Public can approve estimates" on public.estimates;

create policy "Public can read estimates"
on public.estimates
for select
to anon, authenticated
using (true);

create policy "Public can create estimates"
on public.estimates
for insert
to anon, authenticated
with check (true);

create policy "Public can approve estimates"
on public.estimates
for update
to anon, authenticated
using (true)
with check (true);

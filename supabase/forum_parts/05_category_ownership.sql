create or replace function public.forum_is_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(
    nullif(auth.jwt() ->> 'email', ''),
    nullif(auth.jwt() #>> '{user_metadata,email}', ''),
    nullif(auth.jwt() #>> '{app_metadata,email}', ''),
    ''
  )) in ('koki142@gmail.com');
$$;

alter table public.forum_categories
add column if not exists author_id uuid references auth.users(id) on delete set null;

alter table public.forum_categories enable row level security;

drop policy if exists "Active forum categories are public" on public.forum_categories;
create policy "Active forum categories are public"
on public.forum_categories
for select
to anon, authenticated
using (is_active or public.forum_is_admin());

drop policy if exists "Authenticated users create forum categories" on public.forum_categories;
drop policy if exists "Admins create forum categories" on public.forum_categories;
drop policy if exists "Admins manage forum categories" on public.forum_categories;
drop policy if exists "Admins insert forum categories" on public.forum_categories;
drop policy if exists "Admins update forum categories" on public.forum_categories;
drop policy if exists "Admins delete forum categories" on public.forum_categories;
drop policy if exists "Users insert forum categories" on public.forum_categories;
drop policy if exists "Owners and admins update forum categories" on public.forum_categories;
drop policy if exists "Owners and admins delete forum categories" on public.forum_categories;

create policy "Users insert forum categories"
on public.forum_categories
for insert
to authenticated
with check (
  author_id = auth.uid()
  and sort_order between 0 and 10000
  and char_length(trim(title)) between 2 and 60
  and (description is null or char_length(description) <= 1000)
);

create policy "Owners and admins update forum categories"
on public.forum_categories
for update
to authenticated
using (author_id = auth.uid() or public.forum_is_admin())
with check (
  (author_id = auth.uid() or public.forum_is_admin())
  and sort_order between 0 and 10000
  and char_length(trim(title)) between 2 and 60
  and (description is null or char_length(description) <= 1000)
);

create policy "Owners and admins delete forum categories"
on public.forum_categories
for delete
to authenticated
using (author_id = auth.uid() or public.forum_is_admin());

notify pgrst, 'reload schema';

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

drop policy if exists "Authors and admins delete forum topics" on public.forum_topics;
drop policy if exists "Admins delete forum topics" on public.forum_topics;

create policy "Admins delete forum topics"
on public.forum_topics
for delete
to authenticated
using (public.forum_is_admin());

drop policy if exists "Admins delete forum posts" on public.forum_posts;
drop policy if exists "Authors and admins delete forum posts" on public.forum_posts;

create policy "Authors and admins delete forum posts"
on public.forum_posts
for delete
to authenticated
using (author_id = auth.uid() or public.forum_is_admin());

notify pgrst, 'reload schema';

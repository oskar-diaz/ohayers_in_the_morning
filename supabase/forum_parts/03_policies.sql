alter table public.forum_categories add column if not exists author_id uuid references auth.users(id) on delete set null;
drop policy if exists "Forum profiles are public" on public.forum_profiles;
create policy "Forum profiles are public"
on public.forum_profiles
for select
to anon, authenticated
using (true);

drop policy if exists "Users insert their forum profile" on public.forum_profiles;
create policy "Users insert their forum profile"
on public.forum_profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users update their forum profile" on public.forum_profiles;
create policy "Users update their forum profile"
on public.forum_profiles
for update
to authenticated
using (user_id = auth.uid() or public.forum_is_admin())
with check (user_id = auth.uid() or public.forum_is_admin());

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
  and (description is null or char_length(description) <= 180)
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
  and (description is null or char_length(description) <= 180)
);

create policy "Owners and admins delete forum categories"
on public.forum_categories
for delete
to authenticated
using (author_id = auth.uid() or public.forum_is_admin());

drop policy if exists "Visible forum topics are public" on public.forum_topics;
create policy "Visible forum topics are public"
on public.forum_topics
for select
to anon, authenticated
using (
  hidden_at is null
  or author_id = auth.uid()
  or public.forum_is_admin()
);

drop policy if exists "Authenticated users create forum topics" on public.forum_topics;
create policy "Authenticated users create forum topics"
on public.forum_topics
for insert
to authenticated
with check (
  author_id = auth.uid()
  and hidden_at is null
  and exists (
    select 1
    from public.forum_categories
    where forum_categories.id = category_id
      and forum_categories.is_active
  )
);

drop policy if exists "Admins moderate forum topics" on public.forum_topics;
create policy "Admins moderate forum topics"
on public.forum_topics
for update
to authenticated
using (public.forum_is_admin())
with check (public.forum_is_admin());

drop policy if exists "Authors and admins delete forum topics" on public.forum_topics;
create policy "Authors and admins delete forum topics"
on public.forum_topics
for delete
to authenticated
using (author_id = auth.uid() or public.forum_is_admin());

drop policy if exists "Visible forum posts are public" on public.forum_posts;
create policy "Visible forum posts are public"
on public.forum_posts
for select
to anon, authenticated
using (
  hidden_at is null
  or author_id = auth.uid()
  or public.forum_is_admin()
);

drop policy if exists "Authenticated users create forum posts" on public.forum_posts;
create policy "Authenticated users create forum posts"
on public.forum_posts
for insert
to authenticated
with check (
  author_id = auth.uid()
  and hidden_at is null
  and exists (
    select 1
    from public.forum_topics
    where forum_topics.id = topic_id
      and forum_topics.hidden_at is null
      and (not forum_topics.is_locked or public.forum_is_admin())
  )
);

drop policy if exists "Authors and admins update forum posts" on public.forum_posts;
create policy "Authors and admins update forum posts"
on public.forum_posts
for update
to authenticated
using (author_id = auth.uid() or public.forum_is_admin())
with check (author_id = auth.uid() or public.forum_is_admin());

drop policy if exists "Admins delete forum posts" on public.forum_posts;
drop policy if exists "Authors and admins delete forum posts" on public.forum_posts;
create policy "Authors and admins delete forum posts"
on public.forum_posts
for delete
to authenticated
using (author_id = auth.uid() or public.forum_is_admin());

drop policy if exists "Users and admins read forum reports" on public.forum_post_reports;
create policy "Users and admins read forum reports"
on public.forum_post_reports
for select
to authenticated
using (reporter_id = auth.uid() or public.forum_is_admin());

drop policy if exists "Authenticated users create forum reports" on public.forum_post_reports;
create policy "Authenticated users create forum reports"
on public.forum_post_reports
for insert
to authenticated
with check (reporter_id = auth.uid());

drop policy if exists "Admins update forum reports" on public.forum_post_reports;
create policy "Admins update forum reports"
on public.forum_post_reports
for update
to authenticated
using (public.forum_is_admin())
with check (public.forum_is_admin());

drop policy if exists "Authors and admins delete forum topics" on public.forum_topics;
drop policy if exists "Admins delete forum topics" on public.forum_topics;

create policy "Admins delete forum topics"
on public.forum_topics
for delete
to authenticated
using (public.forum_is_admin());

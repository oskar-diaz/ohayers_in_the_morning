create or replace function public.guard_forum_topic_author_update()
returns trigger
language plpgsql
as $$
begin
  if public.forum_is_admin() then
    return new;
  end if;

  if current_setting('app.forum_refreshing_topic_stats', true) = 'on' then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.category_id is distinct from old.category_id
    or new.slug is distinct from old.slug
    or new.author_id is distinct from old.author_id
    or new.author_name is distinct from old.author_name
    or new.author_avatar_url is distinct from old.author_avatar_url
    or new.reply_count is distinct from old.reply_count
    or new.post_count is distinct from old.post_count
    or new.is_locked is distinct from old.is_locked
    or new.is_pinned is distinct from old.is_pinned
    or new.hidden_at is distinct from old.hidden_at
    or new.hidden_by is distinct from old.hidden_by
    or new.created_at is distinct from old.created_at
    or new.last_post_at is distinct from old.last_post_at
  then
    raise exception 'Only forum admins can moderate forum topics.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_forum_topics_author_update on public.forum_topics;
create trigger guard_forum_topics_author_update
before update on public.forum_topics
for each row
execute function public.guard_forum_topic_author_update();

create or replace function public.refresh_forum_topic_stats(target_topic_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  visible_post_count integer;
  newest_post_at timestamptz;
begin
  select count(*), max(created_at)
  into visible_post_count, newest_post_at
  from public.forum_posts
  where topic_id = target_topic_id
    and hidden_at is null;

  perform set_config('app.forum_refreshing_topic_stats', 'on', true);

  update public.forum_topics
  set
    post_count = coalesce(visible_post_count, 0),
    reply_count = greatest(coalesce(visible_post_count, 0) - 1, 0),
    last_post_at = coalesce(newest_post_at, created_at)
  where id = target_topic_id;

  perform set_config('app.forum_refreshing_topic_stats', 'off', true);
end;
$$;

drop policy if exists "Authors update forum topic content" on public.forum_topics;
create policy "Authors update forum topic content"
on public.forum_topics
for update
to authenticated
using (author_id = auth.uid() and hidden_at is null)
with check (author_id = auth.uid() and hidden_at is null);

drop policy if exists "Topic authors update opening forum posts" on public.forum_posts;
create policy "Topic authors update opening forum posts"
on public.forum_posts
for update
to authenticated
using (
  parent_id is null
  and hidden_at is null
  and exists (
    select 1
    from public.forum_topics
    where forum_topics.id = topic_id
      and forum_topics.author_id = auth.uid()
  )
)
with check (
  parent_id is null
  and hidden_at is null
  and exists (
    select 1
    from public.forum_topics
    where forum_topics.id = topic_id
      and forum_topics.author_id = auth.uid()
  )
);

create or replace function public.set_forum_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_forum_profiles_updated_at on public.forum_profiles;
create trigger set_forum_profiles_updated_at
before update on public.forum_profiles
for each row
execute function public.set_forum_updated_at();

drop trigger if exists set_forum_topics_updated_at on public.forum_topics;
create trigger set_forum_topics_updated_at
before update on public.forum_topics
for each row
execute function public.set_forum_updated_at();

drop trigger if exists set_forum_posts_updated_at on public.forum_posts;
create trigger set_forum_posts_updated_at
before update on public.forum_posts
for each row
execute function public.set_forum_updated_at();

create or replace function public.guard_forum_post_author_update()
returns trigger
language plpgsql
as $$
begin
  if public.forum_is_admin() then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.topic_id is distinct from old.topic_id
    or new.parent_id is distinct from old.parent_id
    or new.author_id is distinct from old.author_id
    or new.author_name is distinct from old.author_name
    or new.author_avatar_url is distinct from old.author_avatar_url
    or new.hidden_at is distinct from old.hidden_at
    or new.hidden_by is distinct from old.hidden_by
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Only forum admins can moderate forum posts.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_forum_posts_author_update on public.forum_posts;
create trigger guard_forum_posts_author_update
before update on public.forum_posts
for each row
execute function public.guard_forum_post_author_update();

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

create or replace function public.sync_forum_topic_stats()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_forum_topic_stats(old.topic_id);
    return old;
  end if;

  perform public.refresh_forum_topic_stats(new.topic_id);
  return new;
end;
$$;

drop trigger if exists sync_forum_topic_stats_insert on public.forum_posts;
create trigger sync_forum_topic_stats_insert
after insert on public.forum_posts
for each row
execute function public.sync_forum_topic_stats();

drop trigger if exists sync_forum_topic_stats_update on public.forum_posts;
create trigger sync_forum_topic_stats_update
after update of hidden_at on public.forum_posts
for each row
execute function public.sync_forum_topic_stats();

drop trigger if exists sync_forum_topic_stats_delete on public.forum_posts;
create trigger sync_forum_topic_stats_delete
after delete on public.forum_posts
for each row
execute function public.sync_forum_topic_stats();

alter table public.forum_profiles enable row level security;
alter table public.forum_categories enable row level security;
alter table public.forum_topics enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_post_reports enable row level security;

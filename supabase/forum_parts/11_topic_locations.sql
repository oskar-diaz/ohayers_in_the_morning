alter table public.forum_topics
  add column if not exists event_location text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'forum_topics_event_location_length'
      and conrelid = 'public.forum_topics'::regclass
  ) then
    alter table public.forum_topics
      add constraint forum_topics_event_location_length check (
        event_location is null
        or char_length(trim(event_location)) between 1 and 120
      );
  end if;
end $$;

alter table public.forum_topics
  add column if not exists event_start_date date,
  add column if not exists event_end_date date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'forum_topics_event_dates_order'
      and conrelid = 'public.forum_topics'::regclass
  ) then
    alter table public.forum_topics
      add constraint forum_topics_event_dates_order check (
        event_end_date is null
        or (
          event_start_date is not null
          and event_end_date >= event_start_date
        )
      );
  end if;
end $$;

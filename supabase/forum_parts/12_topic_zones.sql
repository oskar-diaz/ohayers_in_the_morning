alter table public.forum_topics
  add column if not exists event_zone text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'forum_topics_event_zone_value'
      and conrelid = 'public.forum_topics'::regclass
  ) then
    alter table public.forum_topics
      add constraint forum_topics_event_zone_value check (
        event_zone is null
        or event_zone in (
          'Hokkaido',
          'Tohoku',
          'Kanto',
          'Chubu',
          'Kansai',
          'Chugoku',
          'Shikoku',
          'Kyushu',
          'Okinawa'
        )
      );
  end if;
end $$;

update public.forum_topics
set event_zone = 'Kanto'
where event_start_date is not null
  and event_zone is null;

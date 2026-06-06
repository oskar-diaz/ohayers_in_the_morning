do $$
begin
  if to_regclass('public.forum_posts') is not null then
    alter table public.forum_posts
      drop constraint if exists forum_posts_content_length;

    alter table public.forum_posts
      add constraint forum_posts_content_length check (
        char_length(trim(content)) between 2 and 50000
      );
  end if;
end $$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'forum-images',
  'forum-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Forum images are public" on storage.objects;
drop policy if exists "Users upload forum images" on storage.objects;
drop policy if exists "Users update own forum images" on storage.objects;
drop policy if exists "Users delete own forum images" on storage.objects;

create policy "Forum images are public"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'forum-images');

create policy "Users upload forum images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'forum-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users update own forum images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'forum-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.forum_is_admin()
  )
)
with check (
  bucket_id = 'forum-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.forum_is_admin()
  )
);

create policy "Users delete own forum images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'forum-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.forum_is_admin()
  )
);

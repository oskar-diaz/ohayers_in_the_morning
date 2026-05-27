create index if not exists forum_categories_sort_order_idx
on public.forum_categories (sort_order, title);

create index if not exists forum_topics_category_last_post_idx
on public.forum_topics (category_id, is_pinned desc, last_post_at desc);

create index if not exists forum_topics_author_idx
on public.forum_topics (author_id, created_at desc);

create index if not exists forum_posts_topic_created_idx
on public.forum_posts (topic_id, created_at asc);

create index if not exists forum_posts_parent_idx
on public.forum_posts (parent_id);

create index if not exists forum_post_reports_post_idx
on public.forum_post_reports (post_id, created_at desc);

insert into public.forum_categories (slug, title, description, color, sort_order)
values
  (
    'japon',
    'Japón',
    'Actualidad, vida diaria y rarezas japonesas para comentar con calma.',
    '#d93e3e',
    10
  ),
  (
    'off-topic',
    'Off-topic',
    'La barra libre: preguntas, memes, recomendaciones y divagues varios.',
    '#8f6a2a',
    20
  ),
  (
    'ideas',
    'Ideas para noticias',
    'Pistas, enlaces y ocurrencias para futuras piezas de Ohayers.',
    '#2f6f5f',
    30
  )
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  color = excluded.color,
  sort_order = excluded.sort_order,
  is_active = true;

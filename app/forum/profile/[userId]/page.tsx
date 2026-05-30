import type { Metadata } from "next";
import Link from "next/link";

import ForumClient from "@/app/components/forum/ForumClient";
import ForumEditProfileLink from "@/app/components/forum/ForumEditProfileLink";
import {
  FORUM_SMILIE_MAP,
  FORUM_SMILIE_PATTERN,
  formatForumDate,
} from "@/lib/forum";
import { absoluteUrl } from "@/lib/seo";
import { siteName } from "@/lib/site";
import { supabase } from "@/lib/supabase";

type PublicForumProfile = {
  avatar_url: string | null;
  bio: string | null;
  display_name: string;
  user_id: string;
};

type ForumAuthorFallback = {
  author_avatar_url: string | null;
  author_name: string;
};

type PublicForumActivityCategory = {
  slug: string;
  title: string;
};

type PublicForumActivityPost = {
  content: string;
  created_at: string;
  id: number;
  parent_id: number | null;
  topic_id: number;
};

type PublicForumActivityTopic = {
  forum_categories?: PublicForumActivityCategory | PublicForumActivityCategory[] | null;
  hidden_at: string | null;
  id: number;
  slug: string;
  title: string;
};

type PublicForumActivityItem = PublicForumActivityPost & {
  category: PublicForumActivityCategory;
  excerpt: string;
  excerptHtml: string;
  topic: PublicForumActivityTopic;
  url: string;
};

function getPublicForumCategory(
  topic: PublicForumActivityTopic,
): PublicForumActivityCategory | null {
  const category = Array.isArray(topic.forum_categories)
    ? topic.forum_categories[0]
    : topic.forum_categories;

  return category?.slug && category.title ? category : null;
}

function getForumActivityExcerpt(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|blockquote)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function escapeForumActivityHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderForumActivitySmilies(value: string) {
  return value.split(FORUM_SMILIE_PATTERN).map((part) => {
    const smilie = FORUM_SMILIE_MAP[part];

    if (!smilie) {
      return escapeForumActivityHtml(part);
    }

    if (smilie.src) {
      return `<img src="${escapeForumActivityHtml(
        smilie.src,
      )}" alt="${escapeForumActivityHtml(
        smilie.label,
      )}" title="${escapeForumActivityHtml(
        part,
      )}" class="forum-smilie inline-block h-auto w-auto -translate-y-[2px] object-contain" />`;
    }

    return `<span class="inline-block -translate-y-px font-mono text-[0.92em]" aria-label="${escapeForumActivityHtml(
      part,
    )}">${escapeForumActivityHtml(smilie.value)}</span>`;
  }).join("");
}

async function getPublicForumProfile(userId: string) {
  const { data: profile } = await supabase
    .from("forum_profiles")
    .select("user_id, display_name, avatar_url, bio")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile) {
    return profile as PublicForumProfile;
  }

  const { data: fallbackPost } = await supabase
    .from("forum_posts")
    .select("author_name, author_avatar_url")
    .eq("author_id", userId)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (!fallbackPost) {
    return null;
  }

  const fallback = fallbackPost as ForumAuthorFallback;

  return {
    avatar_url: fallback.author_avatar_url,
    bio: null,
    display_name: fallback.author_name,
    user_id: userId,
  } satisfies PublicForumProfile;
}

async function getPublicForumActivity(userId: string) {
  const { data: postRows } = await supabase
    .from("forum_posts")
    .select("id, topic_id, parent_id, content, created_at")
    .eq("author_id", userId)
    .is("hidden_at", null)
    .order("created_at", {
      ascending: false,
    })
    .limit(20);

  const posts = (postRows ?? []) as PublicForumActivityPost[];
  const topicIds = [...new Set(posts.map((post) => post.topic_id))];

  if (topicIds.length === 0) {
    return [];
  }

  const { data: topicRows } = await supabase
    .from("forum_topics")
    .select("id, slug, title, hidden_at, forum_categories(slug, title)")
    .in("id", topicIds)
    .is("hidden_at", null);

  const topicsById = new Map(
    ((topicRows ?? []) as PublicForumActivityTopic[]).map((topic) => [
      topic.id,
      topic,
    ]),
  );

  return posts.flatMap((post) => {
    const topic = topicsById.get(post.topic_id);

    if (!topic) {
      return [];
    }

    const category = getPublicForumCategory(topic);

    if (!category) {
      return [];
    }

    const excerpt = getForumActivityExcerpt(post.content);

    return [
      {
        ...post,
        category,
        excerpt,
        excerptHtml: renderForumActivitySmilies(excerpt),
        topic,
        url: `/forum/${category.slug}/${topic.slug}#forum-post-${post.id}`,
      },
    ];
  }).slice(0, 10) satisfies PublicForumActivityItem[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const profile = await getPublicForumProfile(userId);
  const title = profile?.display_name
    ? `${profile.display_name} | Foro`
    : "Perfil del foro";

  return {
    title,
    description: profile?.bio || "Perfil público del foro de Ohayers.",
    alternates: {
      canonical: absoluteUrl(`/forum/profile/${userId}`),
    },
    openGraph: {
      title: `${title} | ${siteName}`,
      description: profile?.bio || "Perfil público del foro de Ohayers.",
      url: absoluteUrl(`/forum/profile/${userId}`),
      siteName,
      type: "profile",
    },
  };
}

export default async function PublicForumProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const [profile, activity] = await Promise.all([
    getPublicForumProfile(userId),
    getPublicForumActivity(userId),
  ]);

  return (
    <>
      <ForumClient chromeOnly />

      <main className="min-h-screen bg-[#f8f6f2]">
        <section className="mx-auto max-w-3xl px-6 py-12">
          <div className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/forum" className="editorial-link-button">
                Volver al foro
              </Link>
              <ForumEditProfileLink userId={userId} />
            </div>

            <div className="mt-6">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-red-700">
                Comunidad
              </p>
              <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
                Perfil del foro
              </h1>
            </div>
          </div>

          {profile ? (
            <article className="editorial-card mt-8 rounded-[2rem] px-6 py-7 sm:px-8">
            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  width={80}
                  height={80}
                  className="h-20 w-20 shrink-0 rounded-full object-cover ring-1 ring-black/10"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/75 text-xl font-black text-[#111111]">
                  {profile.display_name.trim().slice(0, 1).toUpperCase() || "F"}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-700">
                  Autor
                </p>
                <h2 className="mt-1 break-words text-2xl font-black leading-tight text-[#111111]">
                  {profile.display_name}
                </h2>
              </div>
            </div>

            {profile.bio && (
              <p className="mt-7 whitespace-pre-wrap text-base leading-7 text-[#4f4a44]">
                {profile.bio}
              </p>
            )}

            <div className="mt-9 border-t border-[#d6d1c8] pt-7">
              <h3 className="text-base font-black uppercase tracking-[0.16em] text-[#111111]">
                Últimos posts y respuestas
              </h3>

              {activity.length > 0 ? (
                <div className="mt-5 space-y-4">
                  {activity.map((item) => (
                    <Link
                      key={item.id}
                      href={item.url}
                      className="block rounded-2xl border border-[#d6d1c8] bg-[#fffdf8] px-4 py-4 transition hover:bg-[#f5efe4]"
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-red-700">
                        <span>{item.parent_id ? "Respuesta" : "Post"}</span>
                        <span className="text-[#7a746b]">{item.category.title}</span>
                      </div>
                      <h4 className="mt-2 text-base font-black leading-tight text-[#111111]">
                        {item.parent_id
                          ? `Respuesta en ${item.topic.title}`
                          : item.topic.title}
                      </h4>
                      {item.excerpt && (
                        <p
                          className="mt-2 line-clamp-2 text-sm leading-6 text-[#5f5952]"
                          dangerouslySetInnerHTML={{
                            __html: item.excerptHtml,
                          }}
                        />
                      )}
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#7a746b]">
                        {formatForumDate(item.created_at)}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-6 text-[#6a645c]">
                  Todavía no hay posts o respuestas visibles.
                </p>
              )}
            </div>
            </article>
          ) : (
            <div className="editorial-card mt-8 rounded-[2rem] px-6 py-8 text-center">
              <p className="text-base leading-7 text-[#5f5952]">
                No he encontrado este perfil del foro.
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

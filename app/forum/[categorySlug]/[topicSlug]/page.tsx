import type { Metadata } from "next";

import ForumClient from "@/app/components/forum/ForumClient";
import {
  forumDefaultDescription,
  getForumPostShareImageUrl,
  getForumShareMetadata,
} from "@/lib/forum-seo";
import { resolveSeoDescription } from "@/lib/seo";
import { supabase } from "@/lib/supabase";

type ForumTopicMetadata = {
  event_end_date: string | null;
  event_location: string | null;
  event_start_date: string | null;
  excerpt: string | null;
  id: number;
  imageUrl: string | null;
  title: string;
};

type ForumTopicRow = {
  event_end_date?: string | null;
  event_location?: string | null;
  event_start_date?: string | null;
  excerpt: string | null;
  id: number;
  title: string;
};

type ForumPostContentRow = {
  content: string;
};

async function getForumTopicMetadata(categorySlug: string, topicSlug: string) {
  const { data: category } = await supabase
    .from("forum_categories")
    .select("id")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (!category) {
    return null;
  }

  let topic: unknown = null;
  let topicError: { code?: string } | null = null;
  const topicWithDatesResponse = await supabase
    .from("forum_topics")
    .select("id, title, excerpt, event_start_date, event_end_date, event_location")
    .eq("category_id", category.id)
    .eq("slug", topicSlug)
    .maybeSingle();

  topic = topicWithDatesResponse.data;
  topicError = topicWithDatesResponse.error;

  if (topicError?.code === "42703") {
    const topicFallbackResponse = await supabase
      .from("forum_topics")
      .select("id, title, excerpt")
      .eq("category_id", category.id)
      .eq("slug", topicSlug)
      .maybeSingle();

    topic = topicFallbackResponse.data;
    topicError = topicFallbackResponse.error;
  }

  if (topicError) {
    return null;
  }

  if (!topic) {
    return null;
  }

  const topicRow = topic as ForumTopicRow;
  const { data: postRows } = await supabase
    .from("forum_posts")
    .select("content")
    .eq("topic_id", topicRow.id)
    .is("hidden_at", null)
    .order("created_at", {
      ascending: true,
    })
    .limit(50);
  const imageUrl =
    ((postRows ?? []) as ForumPostContentRow[])
      .map((post) => getForumPostShareImageUrl(post.content))
      .find((nextImageUrl): nextImageUrl is string => Boolean(nextImageUrl)) ??
    null;

  return {
    ...topicRow,
    event_end_date: topicRow.event_end_date ?? null,
    event_location: topicRow.event_location ?? null,
    event_start_date: topicRow.event_start_date ?? null,
    imageUrl,
  } satisfies ForumTopicMetadata;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; topicSlug: string }>;
}): Promise<Metadata> {
  const { categorySlug, topicSlug } = await params;
  const topic = await getForumTopicMetadata(categorySlug, topicSlug);
  const title = topic?.title ? `Foro: ${topic.title}` : "Foro";
  const description = resolveSeoDescription(
    topic?.excerpt,
    forumDefaultDescription,
  );

  return {
    title,
    ...getForumShareMetadata({
      description,
      imageAlt: topic?.title,
      imageUrl: topic?.imageUrl,
      path: `/forum/${categorySlug}/${topicSlug}`,
      title,
      type: "article",
    }),
  };
}

export default async function ForumTopicPage({
  params,
}: {
  params: Promise<{ categorySlug: string; topicSlug: string }>;
}) {
  const { categorySlug, topicSlug } = await params;
  const topic = await getForumTopicMetadata(categorySlug, topicSlug);

  return (
    <ForumClient
      categorySlug={categorySlug}
      initialTopicEventEndDate={topic?.event_end_date ?? null}
      initialTopicEventLocation={topic?.event_location ?? null}
      initialTopicEventStartDate={topic?.event_start_date ?? null}
      topicSlug={topicSlug}
    />
  );
}

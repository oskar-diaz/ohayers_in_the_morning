import type { Metadata } from "next";

import ForumClient from "@/app/components/forum/ForumClient";
import {
  forumDefaultDescription,
  getForumShareMetadata,
} from "@/lib/forum-seo";
import { resolveSeoDescription } from "@/lib/seo";
import { supabase } from "@/lib/supabase";

type ForumTopicMetadata = {
  excerpt: string | null;
  title: string;
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

  const { data: topic } = await supabase
    .from("forum_topics")
    .select("title, excerpt")
    .eq("category_id", category.id)
    .eq("slug", topicSlug)
    .maybeSingle();

  return topic as ForumTopicMetadata | null;
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

  return <ForumClient categorySlug={categorySlug} topicSlug={topicSlug} />;
}

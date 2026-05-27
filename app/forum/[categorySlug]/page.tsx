import type { Metadata } from "next";

import ForumClient from "@/app/components/forum/ForumClient";
import {
  forumDefaultDescription,
  getForumShareMetadata,
} from "@/lib/forum-seo";
import { resolveSeoDescription } from "@/lib/seo";
import { supabase } from "@/lib/supabase";

type ForumCategoryMetadata = {
  description: string | null;
  title: string;
};

async function getForumCategoryMetadata(categorySlug: string) {
  const { data } = await supabase
    .from("forum_categories")
    .select("title, description")
    .eq("slug", categorySlug)
    .maybeSingle();

  return data as ForumCategoryMetadata | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await getForumCategoryMetadata(categorySlug);
  const title = category?.title ? `Foro: ${category.title}` : "Foro";
  const description = resolveSeoDescription(
    category?.description,
    forumDefaultDescription,
  );

  return {
    title,
    ...getForumShareMetadata({
      description,
      path: `/forum/${categorySlug}`,
      title,
    }),
  };
}

export default async function ForumCategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;

  return <ForumClient categorySlug={categorySlug} />;
}

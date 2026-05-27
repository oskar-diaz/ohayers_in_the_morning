import type { Metadata } from "next";

import ForumClient from "@/app/components/forum/ForumClient";
import { absoluteUrl } from "@/lib/seo";
import { siteName } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; topicSlug: string }>;
}): Promise<Metadata> {
  const { categorySlug, topicSlug } = await params;
  const title = `Foro: ${topicSlug}`;

  return {
    title,
    description: "Hilo del foro de Ohayers in the Morning.",
    alternates: {
      canonical: absoluteUrl(`/forum/${categorySlug}/${topicSlug}`),
    },
    openGraph: {
      title: `${title} | ${siteName}`,
      description: "Hilo y respuestas de la comunidad de Ohayers.",
      url: absoluteUrl(`/forum/${categorySlug}/${topicSlug}`),
      siteName,
      type: "article",
    },
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

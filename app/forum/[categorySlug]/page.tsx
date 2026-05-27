import type { Metadata } from "next";

import ForumClient from "@/app/components/forum/ForumClient";
import { absoluteUrl } from "@/lib/seo";
import { siteName } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
  const { categorySlug } = await params;
  const title = `Foro: ${categorySlug}`;

  return {
    title,
    description: "Categoría del foro de Ohayers in the Morning.",
    alternates: {
      canonical: absoluteUrl(`/forum/${categorySlug}`),
    },
    openGraph: {
      title: `${title} | ${siteName}`,
      description: "Posts y respuestas de la comunidad de Ohayers.",
      url: absoluteUrl(`/forum/${categorySlug}`),
      siteName,
      type: "website",
    },
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

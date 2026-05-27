import type { Metadata } from "next";

import { absoluteUrl } from "./seo";
import { siteLocale, siteName } from "./site";

export const forumShareImage = {
  alt: "Foro Ohayers",
  height: 1254,
  url: absoluteUrl("/daruma-foros.png"),
  width: 1254,
};

export const forumDefaultDescription =
  "Categorías, posts y respuestas de la comunidad de Ohayers in the Morning.";

export function getForumShareMetadata({
  description = forumDefaultDescription,
  path,
  title,
  type = "website",
}: {
  description?: string;
  path: string;
  title: string;
  type?: "article" | "website";
}): Pick<Metadata, "alternates" | "description" | "openGraph" | "twitter"> {
  const url = absoluteUrl(path);

  return {
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      description,
      images: [forumShareImage],
      locale: siteLocale,
      siteName,
      title: `${title} | ${siteName}`,
      type,
      url,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: [forumShareImage.url],
      title,
    },
  };
}

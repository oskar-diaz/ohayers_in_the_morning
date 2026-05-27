import type { Metadata } from "next";

import { absoluteUrl } from "./seo";
import { siteLocale, siteName } from "./site";

export const forumShareImage = {
  alt: "Foro Ohayers",
  height: 1254,
  url: absoluteUrl("/daruma-foros.png"),
  width: 1254,
};

export const forumTwitterShareImage = {
  alt: "Foro Ohayers",
  height: 628,
  url: absoluteUrl("/daruma-foros-twitter.png"),
  width: 1200,
};

export const forumDefaultDescription =
  "Categorías, posts y respuestas de la comunidad de Ohayers in the Morning.";

function decodeForumSeoHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function getForumSeoTagAttribute(tag: string, name: string) {
  const pattern = new RegExp(
    `\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const match = tag.match(pattern);

  return decodeForumSeoHtmlEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

function normalizeForumShareImageUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (/^\/(?!\/)/.test(trimmedValue)) {
    return absoluteUrl(trimmedValue);
  }

  try {
    const url = new URL(trimmedValue);

    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getForumPostShareImageUrl(content?: string | null) {
  if (!content) {
    return null;
  }

  for (const match of content.matchAll(/<img\b[^>]*>/gi)) {
    const imageUrl = normalizeForumShareImageUrl(
      getForumSeoTagAttribute(match[0], "src"),
    );

    if (imageUrl) {
      return imageUrl;
    }
  }

  return null;
}

export function getForumShareMetadata({
  description = forumDefaultDescription,
  imageAlt,
  imageUrl,
  path,
  title,
  type = "website",
}: {
  description?: string;
  imageAlt?: string;
  imageUrl?: string | null;
  path: string;
  title: string;
  type?: "article" | "website";
}): Pick<Metadata, "alternates" | "description" | "openGraph" | "twitter"> {
  const url = absoluteUrl(path);
  const postShareImage = imageUrl
    ? {
        alt: imageAlt ?? title,
        url: imageUrl,
      }
    : null;

  return {
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      description,
      images: [postShareImage ?? forumShareImage],
      locale: siteLocale,
      siteName,
      title: `${title} | ${siteName}`,
      type,
      url,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: [postShareImage ?? forumTwitterShareImage],
      title,
    },
  };
}

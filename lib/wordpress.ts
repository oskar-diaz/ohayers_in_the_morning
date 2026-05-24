import { absoluteUrl } from "./seo";
import { siteName } from "./site";

export const wordpressPostsUrl =
  "https://www.ikublog.com/wp-json/wp/v2/posts?_embed=1&per_page=24";

export const blogCategory = {
  title: "BLOG",
  slug: "blog",
  description:
    "Editoriales y textos del blog de WordPress enlazados directamente desde Ikublog.",
};

type WordpressApiPost = {
  id: number;
  date: string;
  modified?: string;
  link: string;
  slug: string;
  title?: {
    rendered?: string;
  };
  excerpt?: {
    rendered?: string;
  };
  jetpack_featured_media_url?: string;
};

export type WordpressPost = {
  id: string;
  titleHtml: string;
  excerptHtml: string;
  publishedAt: string;
  modifiedAt: string;
  url: string;
  slug: string;
  imageUrl?: string;
};

function sanitizeHtml(value?: string) {
  return value?.trim() || "";
}

function cleanWordpressExcerptHtml(value?: string) {
  return sanitizeHtml(value)
    .replace(/<a\b[^>]*class="more-link"[^>]*>[\s\S]*?<\/a>/gi, "")
    .replace(/(<p[^>]*>\s*)(\d+\s+)/i, "$1")
    .trim();
}

export async function getWordpressPosts(): Promise<WordpressPost[]> {
  const response = await fetch(wordpressPostsUrl, {
    next: {
      revalidate: 1800,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Wordpress posts");
  }

  const data = (await response.json()) as WordpressApiPost[];

  return data.map((post) => ({
    id: String(post.id),
    titleHtml: sanitizeHtml(post.title?.rendered),
    excerptHtml: cleanWordpressExcerptHtml(post.excerpt?.rendered),
    publishedAt: post.date,
    modifiedAt: post.modified || post.date,
    url: post.link,
    slug: post.slug,
    imageUrl: post.jetpack_featured_media_url || undefined,
  }));
}

export function getWordpressCategoryMetadata(posts: WordpressPost[]) {
  const latestPost = posts[0];
  const imageUrl = latestPost?.imageUrl;

  return {
    title: `${blogCategory.title} | ${siteName}`,
    description: blogCategory.description,
    alternates: {
      canonical: absoluteUrl(`/category/${blogCategory.slug}`),
    },
    openGraph: {
      type: "website" as const,
      title: `${blogCategory.title} | ${siteName}`,
      description: blogCategory.description,
      url: absoluteUrl(`/category/${blogCategory.slug}`),
      images: imageUrl ? [{ url: imageUrl, alt: blogCategory.title }] : undefined,
    },
    twitter: {
      card: imageUrl ? ("summary_large_image" as const) : ("summary" as const),
      title: `${blogCategory.title} | ${siteName}`,
      description: blogCategory.description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

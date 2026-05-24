import { absoluteUrl } from "./seo";
import { siteName } from "./site";

export const wordpressPostsUrl =
  "https://public-api.wordpress.com/rest/v1.1/sites/www.ikublog.com/posts/?number=24";

export const blogCategory = {
  title: "BLOG",
  slug: "blog",
  description:
    "Editoriales y textos del blog de WordPress enlazados directamente desde Ikublog.",
};

type WordpressApiPost = {
  ID: number;
  date: string;
  modified?: string;
  URL: string;
  slug: string;
  title?: string;
  excerpt?: string;
  featured_image?: string;
  post_thumbnail?: {
    URL?: string;
  };
};

type WordpressApiResponse = {
  posts?: WordpressApiPost[];
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
  try {
    const response = await fetch(wordpressPostsUrl, {
      next: {
        revalidate: 1800,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Wordpress posts: ${response.status}`);
    }

    const data = (await response.json()) as WordpressApiResponse;
    const posts = data.posts || [];

    return posts.map((post) => ({
      id: String(post.ID),
      titleHtml: sanitizeHtml(post.title),
      excerptHtml: cleanWordpressExcerptHtml(post.excerpt),
      publishedAt: post.date,
      modifiedAt: post.modified || post.date,
      url: post.URL,
      slug: post.slug,
      imageUrl: post.featured_image || post.post_thumbnail?.URL || undefined,
    }));
  } catch (error) {
    console.error("Failed to fetch Wordpress posts", error);
    return [];
  }
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

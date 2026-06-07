import { absoluteUrl } from "./seo";
import { siteName } from "./site";

export const wordpressPostsUrl =
  "https://public-api.wordpress.com/rest/v1.1/sites/www.ikublog.com/posts/";

export const WORDPRESS_POSTS_PER_PAGE = 24;

export const blogCategory = {
  title: "BLOG",
  slug: "blog",
  description: "",
};

type WordpressApiPost = {
  ID: number;
  content?: string;
  date: string;
  discussion?: {
    comment_count?: number;
  };
  like_count?: number;
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
  found?: number;
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
  commentCount: number;
  likeCount: number;
};

export type WordpressPostsPage = {
  posts: WordpressPost[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
};

type WordpressPostsOptions = {
  page?: number;
  perPage?: number;
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

function getWordpressLikeCount(post: WordpressApiPost) {
  const pluginLikeMatch = sanitizeHtml(post.content).match(
    /class="[^"]*\bpld-like-count-wrap\b[^"]*"[^>]*>\s*([0-9]+)/i,
  );
  const pluginLikeCount = Number(pluginLikeMatch?.[1]);

  if (Number.isFinite(pluginLikeCount) && pluginLikeCount > 0) {
    return pluginLikeCount;
  }

  return Number(post.like_count ?? 0);
}

function normalizeWordpressPost(post: WordpressApiPost): WordpressPost {
  return {
    id: String(post.ID),
    titleHtml: sanitizeHtml(post.title),
    excerptHtml: cleanWordpressExcerptHtml(post.excerpt),
    publishedAt: post.date,
    modifiedAt: post.modified || post.date,
    url: post.URL,
    slug: post.slug,
    imageUrl: post.featured_image || post.post_thumbnail?.URL || undefined,
    commentCount: Number(post.discussion?.comment_count ?? 0),
    likeCount: getWordpressLikeCount(post),
  };
}

function getPositiveInteger(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

export async function getWordpressPostPage(
  options: WordpressPostsOptions = {},
): Promise<WordpressPostsPage> {
  const page = getPositiveInteger(options.page, 1);
  const perPage = getPositiveInteger(
    options.perPage,
    WORDPRESS_POSTS_PER_PAGE,
  );
  const url = new URL(wordpressPostsUrl);

  url.searchParams.set("number", String(perPage));
  url.searchParams.set("page", String(page));

  try {
    const response = await fetch(url.toString(), {
      next: {
        revalidate: 1800,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Wordpress posts: ${response.status}`);
    }

    const data = (await response.json()) as WordpressApiResponse;
    const posts = data.posts || [];
    const total = Number(data.found ?? posts.length);

    return {
      posts: posts.map(normalizeWordpressPost),
      total,
      page,
      perPage,
      hasMore: posts.length > 0 && page * perPage < total,
    };
  } catch (error) {
    console.error("Failed to fetch Wordpress posts", error);
    return {
      posts: [],
      total: 0,
      page,
      perPage,
      hasMore: false,
    };
  }
}

export async function getWordpressPosts(
  options?: WordpressPostsOptions,
): Promise<WordpressPost[]> {
  const page = await getWordpressPostPage(options);

  return page.posts;
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

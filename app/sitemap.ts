import type { MetadataRoute } from "next";
import type { SanityImageSource } from "@sanity/image-url";

import { absoluteUrl } from "@/lib/seo";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";

export const revalidate = 1800;

type SitemapImage = SanityImageSource;

type SitemapPost = {
  slug?: {
    current?: string;
  };
  mainImage?: SitemapImage;
  _updatedAt?: string;
  publishedAt?: string;
};

type SitemapCategory = {
  slug?: {
    current?: string;
  };
  _updatedAt?: string;
};

async function getSitemapPosts() {
  return client.fetch<SitemapPost[]>(`
    *[_type == "post"] | order(publishedAt desc) {
      slug,
      mainImage,
      publishedAt,
      _updatedAt
    }
  `);
}

async function getSitemapCategories() {
  return client.fetch<SitemapCategory[]>(`
    *[_type == "category"] | order(title asc) {
      slug,
      _updatedAt
    }
  `);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories] = await Promise.all([
    getSitemapPosts(),
    getSitemapCategories(),
  ]);
  const latestPostDate =
    posts[0]?._updatedAt || posts[0]?.publishedAt || new Date().toISOString();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: latestPostDate,
      changeFrequency: "daily",
      priority: 1,
    },
    ...categories
      .filter((category) => category.slug?.current)
      .map((category) => ({
        url: absoluteUrl(`/category/${category.slug?.current}`),
        lastModified: category._updatedAt || latestPostDate,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
    ...posts
      .filter((post) => post.slug?.current)
      .map((post) => ({
        url: absoluteUrl(`/post/${post.slug?.current}`),
        lastModified:
          post._updatedAt || post.publishedAt || latestPostDate,
        changeFrequency: "weekly" as const,
        priority: 0.7,
        images: post.mainImage
          ? [urlFor(post.mainImage).width(1200).height(630).fit("crop").url()]
          : undefined,
      })),
  ];
}

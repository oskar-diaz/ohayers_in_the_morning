import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";
import type { SanityImageSource } from "@sanity/image-url";
import type { TypedObject } from "@portabletext/types";
import { cache } from "react";

import Comments from "@/app/components/Comments";
import PostShareButtons from "@/app/components/PostShareButtons";
import ZoomableImage from "@/app/components/ZoomableImage";
import { getDisplayAuthor } from "@/lib/display-author";
import { formatPublicationDateTime } from "@/lib/format-date";
import { getLikes } from "@/lib/likes";
import {
  absoluteUrl,
  getSanityOgImageUrl,
  resolveSeoDescription,
  toJsonLd,
} from "@/lib/seo";
import {
  siteDescription,
  siteLocale,
  siteName,
  siteUrl,
} from "@/lib/site";
import { getViews } from "@/lib/views";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import PostLikes from "./PostLikes";
import PostViews from "./PostViews";

export const revalidate = 300;

type PostImage = SanityImageSource & {
  alt?: string;
};

type PostCategory = {
  title: string;
  slug?: {
    current?: string;
  };
};

type Post = {
  title: string;
  slug?: {
    current?: string;
  };
  publishedAt: string;
  excerpt?: string;
  body?: TypedObject[];
  mainImage?: PostImage;
  categories?: PostCategory[];
  author?: {
    name?: string;
    slug?: {
      current?: string;
    };
    image?: PostImage;
  };
  _updatedAt?: string;
};

const getPost = cache(async (slug: string) => {
  return client.fetch<Post | null>(
    `
    *[_type == "post" && slug.current == $slug][0]{
      title,
      slug,
      publishedAt,
      excerpt,
      body,
      mainImage,
      _updatedAt,
      categories[]->{
        title,
        slug
      },
      author->{
        name,
        slug,
        image
      }
    }
  `,
    { slug },
  );
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: "Articulo no encontrado",
      description: siteDescription,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const url = absoluteUrl(`/post/${slug}`);
  const description = resolveSeoDescription(post.excerpt, siteDescription);
  const imageUrl = getSanityOgImageUrl(post.mainImage);
  const authorName = getDisplayAuthor(slug, post.author).name;
  const categoryTitles = post.categories?.map((category) => category.title) ?? [];

  return {
    title: post.title,
    description,
    keywords: [
      "noticias de Japón",
      "actualidad japonesa",
      ...categoryTitles,
    ],
    authors: [{ name: authorName }],
    creator: authorName,
    publisher: siteName,
    category: categoryTitles[0],
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "article",
      locale: siteLocale,
      url,
      siteName,
      title: post.title,
      description,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: post.mainImage?.alt || post.title,
            },
          ]
        : undefined,
      publishedTime: post.publishedAt,
      modifiedTime: post._updatedAt || post.publishedAt,
      authors: [authorName],
      section: categoryTitles[0],
      tags: categoryTitles,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: post.title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const [views, likes] = await Promise.all([getViews(slug), getLikes(slug)]);
  const displayAuthor = getDisplayAuthor(slug, post.author);
  const canonicalUrl = absoluteUrl(`/post/${slug}`);
  const description = resolveSeoDescription(post.excerpt, siteDescription);
  const imageUrl = getSanityOgImageUrl(post.mainImage);
  const categoryTitle = post.categories?.[0]?.title;
  const postKeywords = [
    "noticias de Japón",
    "actualidad japonesa",
    ...(post.categories?.map((category) => category.title) ?? []),
  ];
  const postJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Inicio",
            item: absoluteUrl("/"),
          },
          ...(categoryTitle && post.categories?.[0]?.slug?.current
            ? [
                {
                  "@type": "ListItem",
                  position: 2,
                  name: categoryTitle,
                  item: absoluteUrl(
                    `/category/${post.categories[0].slug.current}`,
                  ),
                },
              ]
            : []),
          {
            "@type": "ListItem",
            position: categoryTitle && post.categories?.[0]?.slug?.current ? 3 : 2,
            name: post.title,
            item: canonicalUrl,
          },
        ],
      },
      {
        "@type": "NewsArticle",
        headline: post.title,
        description,
        datePublished: post.publishedAt,
        dateModified: post._updatedAt || post.publishedAt,
        mainEntityOfPage: canonicalUrl,
        inLanguage: "es",
        articleSection: categoryTitle,
        keywords: postKeywords,
        image: imageUrl ? [imageUrl] : undefined,
        author: [
          {
            "@type": "Person",
            name: displayAuthor.name,
          },
        ],
        publisher: {
          "@type": "Organization",
          name: siteName,
          url: siteUrl,
        },
      },
    ],
  };

  return (
    <main className="bg-[#f8f6f2] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(postJsonLd) }}
      />

      {/* HERO IMAGE */}
      {post.mainImage && (
        <div className="w-full bg-[#ece8df] border-b newspaper-border">
          <div className="max-w-7xl mx-auto px-6 py-10">
            <ZoomableImage
              src={urlFor(post.mainImage).url()}
              alt={post.mainImage.alt || post.title}
              width={1600}
              height={900}
              priority
              sizes="(min-width: 1280px) 1280px, 100vw"
              className="w-full h-auto object-contain max-h-[85vh]"
            />
          </div>
        </div>
      )}

      {/* ARTICLE */}
      <article className="max-w-5xl mx-auto px-6 py-16">
        {/* CATEGORY */}
        <div className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold uppercase tracking-wide text-red-700">
          {post.categories?.[0]?.slug?.current && (
            <Link
              href={`/category/${post.categories[0].slug.current}`}
              className="hover:opacity-60 transition"
            >
              {post.categories[0].title}
            </Link>
          )}
          <Link href="/forum" className="hover:opacity-60 transition">
            Foros
          </Link>
        </div>

        {/* TITLE */}
        <h1 className="text-5xl md:text-7xl font-black leading-none newspaper-title">
          {post.title}
        </h1>

        <div className="mt-8">
          <PostLikes slug={slug} initialLikes={likes} />
        </div>

        {/* EXCERPT */}
        {post.excerpt && (
          <p className="mt-10 text-2xl text-gray-700 leading-relaxed font-light max-w-4xl">
            {post.excerpt}
          </p>
        )}

        {/* META */}
        <div className="flex items-center justify-between mt-12 pb-10 border-b newspaper-border">
          {/* AUTHOR */}
          <div>
            <div>
              <p className="font-semibold text-lg">
                {displayAuthor.slug ? (
                  <Link
                    href={`/author/${displayAuthor.slug}`}
                    className="hover:text-[#111111] hover:underline"
                  >
                    {displayAuthor.name}
                  </Link>
                ) : (
                  displayAuthor.name
                )}
              </p>

              <p className="text-gray-500 text-sm">Redaccion Ohayers</p>
            </div>
          </div>

          {/* DATE */}
          <div className="text-right">
            <p className="text-gray-500">
              {formatPublicationDateTime(post.publishedAt)}
            </p>

            <p className="text-gray-400 text-sm mt-1">
              <PostViews slug={slug} initialViews={views} />
            </p>
          </div>
        </div>

        {/* BODY */}
        <div className="mt-16 max-w-[850px] mx-auto">
          <PortableText
            value={post.body}
            components={{
              types: {
                image: ({ value }) => (
                  <figure className="md:float-right w-full md:w-[320px] md:ml-8 md:mb-4 my-8">
                    <div className="relative overflow-hidden rounded-sm bg-[#ece8df]">
                      <ZoomableImage
                        src={urlFor(value).url()}
                        alt={value.alt || "Article image"}
                        width={800}
                        height={1200}
                        sizes="(min-width: 768px) 320px, 100vw"
                        buttonClassName="rounded-sm"
                        className="w-full h-auto object-contain"
                      />
                    </div>

                    {value.alt && (
                      <figcaption className="text-xs text-gray-500 mt-2 italic leading-relaxed">
                        {value.alt}
                      </figcaption>
                    )}
                  </figure>
                ),
              },

              block: {
                h1: ({ children }) => (
                  <h1 className="text-5xl font-black newspaper-title mt-16 mb-8 leading-none">
                    {children}
                  </h1>
                ),

                h2: ({ children }) => (
                  <h2 className="text-4xl font-black newspaper-title mt-14 mb-6 leading-tight">
                    {children}
                  </h2>
                ),

                normal: ({ children }) => (
                  <p className="text-[1.15rem] md:text-[1.3rem] leading-[2] text-[#222] mb-7 font-light">
                    {children}
                  </p>
                ),

                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-black pl-6 italic text-3xl leading-relaxed newspaper-title py-4 my-10">
                    {children}
                  </blockquote>
                ),
              },

              marks: {
                link: ({ children, value }) => {
                  const href =
                    typeof value?.href === "string" ? value.href : undefined;

                  if (!href) {
                    return <>{children}</>;
                  }

                  const isExternal = /^https?:\/\//.test(href);

                  return (
                    <a
                      href={href}
                      className="editorial-inline-link"
                      {...(isExternal
                        ? {
                            target: "_blank",
                            rel: "noopener noreferrer",
                          }
                        : {})}
                    >
                      {children}
                    </a>
                  );
                },
              },
            }}
          />

          <div className="clear-both" />
        </div>

        {/* SHARE */}
        <div className="mt-24 pt-10 border-t newspaper-border">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <PostShareButtons title={post.title} url={canonicalUrl} />
          </div>
        </div>
        <Comments slug={slug} />
      </article>
    </main>
  );
}

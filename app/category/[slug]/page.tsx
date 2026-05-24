import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { SanityImageSource } from "@sanity/image-url";
import { cache } from "react";

import { getDisplayAuthorName } from "@/lib/display-author";
import { formatPublicationDateTime } from "@/lib/format-date";
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
} from "@/lib/site";
import { getViewsBySlug } from "@/lib/views";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";

export const revalidate = 0;

type Category = {
  title?: string;
  description?: string;
};

type CategoryImage = SanityImageSource & {
  alt?: string;
};

type PostCategory = {
  title: string;
  slug?: {
    current?: string;
  };
};

type CategoryPost = {
  _id: string;
  title: string;
  excerpt?: string;
  publishedAt: string;
  mainImage?: CategoryImage;
  slug?: {
    current?: string;
  };
  categories?: PostCategory[];
};

const getCategory = cache(async (slug: string) => {
  return client.fetch<Category | null>(
    `
    *[
      _type == "category" &&
      slug.current == $slug
    ][0]{
      title,
      description
    }
  `,
    { slug },
  );
});

const getCategoryPosts = cache(async (slug: string) => {
  return client.fetch<CategoryPost[]>(
    `
    *[
      _type == "post" &&
      $slug in categories[]->slug.current
    ] | order(publishedAt desc) {
      _id,
      title,
      slug,
      excerpt,
      publishedAt,
      mainImage,
      categories[]->{
        title,
        slug
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
  const [category, posts] = await Promise.all([
    getCategory(slug),
    getCategoryPosts(slug),
  ]);

  if (!category?.title) {
    return {
      title: "Categoria no encontrada",
      description: siteDescription,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description = resolveSeoDescription(
    category.description,
    `Noticias de Japón sobre ${category.title}, actualidad japonesa y articulos relacionados en ${siteName}.`,
  );
  const imageUrl = getSanityOgImageUrl(posts[0]?.mainImage);
  const url = absoluteUrl(`/category/${slug}`);

  return {
    title: category.title,
    description,
    keywords: [
      "noticias de Japón",
      "actualidad japonesa",
      `${category.title} Japón`,
      category.title,
    ],
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      locale: siteLocale,
      url,
      siteName,
      title: `${category.title} en Japón | ${siteName}`,
      description,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: category.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: `${category.title} en Japón | ${siteName}`,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [category, posts] = await Promise.all([
    getCategory(slug),
    getCategoryPosts(slug),
  ]);

  if (!category?.title) {
    notFound();
  }

  const validPosts = posts.filter(
    (post): post is CategoryPost & { slug: { current: string } } =>
      Boolean(post.slug?.current),
  );
  const views = await getViewsBySlug(validPosts.map((post) => post.slug.current));
  const categoryUrl = absoluteUrl(`/category/${slug}`);
  const categoryJsonLd = {
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
          {
            "@type": "ListItem",
            position: 2,
            name: category.title,
            item: categoryUrl,
          },
        ],
      },
      {
        "@type": "CollectionPage",
        name: `${category.title} | ${siteName}`,
        url: categoryUrl,
        description: resolveSeoDescription(
          category.description,
          `Noticias de Japón sobre ${category.title} y actualidad japonesa relacionada.`,
        ),
        inLanguage: "es",
        mainEntity: {
          "@type": "ItemList",
          itemListOrder: "https://schema.org/ItemListOrderDescending",
          numberOfItems: validPosts.length,
          itemListElement: validPosts.slice(0, 24).map((post, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(`/post/${post.slug.current}`),
            name: post.title,
          })),
        },
      },
    ],
  };

  return (
    <main className="bg-[#f8f6f2] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(categoryJsonLd) }}
      />

      {/* TOP */}
      <div className="max-w-7xl mx-auto px-6 py-10 border-b newspaper-border">
        <Link href="/">
          <h1 className="newspaper-title text-5xl font-black">
            OHAYERS IN THE MORNING
          </h1>
        </Link>

        <p className="uppercase text-red-700 tracking-[0.3em] text-xs mt-4">
          Categoria: {category.title}
        </p>

        {category.description && (
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[#4f4a43]">
            {category.description}
          </p>
        )}
      </div>

      {/* POSTS */}
      <section className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-2 gap-10">
        {validPosts.map((post) => {
          const postSlug = post.slug.current;
          const displayAuthorName = getDisplayAuthorName(postSlug);

          return (
            <article key={post._id} className="border-b newspaper-border pb-10">
              {/* IMAGE */}
              <Link href={`/post/${postSlug}`}>
                <div className="relative aspect-[16/10] overflow-hidden mb-5">
                  {post.mainImage && (
                    <Image
                      src={urlFor(post.mainImage).url()}
                      alt={post.mainImage.alt || post.title}
                      fill
                      className="object-cover hover:scale-[1.02] transition duration-500"
                    />
                  )}
                </div>
              </Link>

              {/* CATEGORY */}
              {post.categories?.[0] && (
                <p className="uppercase text-red-700 font-semibold tracking-wide text-xs mb-3">
                  {post.categories[0].title}
                </p>
              )}

              {/* TITLE */}
              <Link href={`/post/${postSlug}`}>
                <h2 className="newspaper-title text-[clamp(2rem,3vw,3rem)] font-black leading-[0.95] hover:opacity-70 transition">
                  {post.title}
                </h2>
              </Link>

              {/* EXCERPT */}
              <p className="mt-4 text-gray-700 leading-relaxed text-lg">
                {post.excerpt}
              </p>

              {/* AUTHOR */}
              <div className="mt-6">
                <div>
                  <p className="font-medium text-sm">{displayAuthorName}</p>

                  <p className="text-gray-500 text-xs">
                    {formatPublicationDateTime(post.publishedAt)}
                    {" · "}
                    {(views[postSlug] ?? 0).toLocaleString()} vistas
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
